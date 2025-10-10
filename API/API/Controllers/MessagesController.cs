using API.Data;
using API.DTOs;
using API.Entities;
using API.Interfaces;
using API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IMessageService _messageService;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly DataContext _db;

    public MessagesController(IMessageService messageService, ICloudinaryService cloudinaryService, DataContext db)
    {
        _messageService = messageService;
        _cloudinaryService = cloudinaryService;
        _db = db;
    }

    // =============================
    // Gửi tin nhắn (có thể kèm nhiều file)
    // =============================
    [HttpPost]
    public async Task<IActionResult> CreateMessage([FromForm] CreateMessageDto dto)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        if (dto.ReceiverId <= 0)
            return BadRequest("Phải có ReceiverId cho tin nhắn riêng.");

        var message = new Message
        {
            SenderId = userId,
            ReceiverId = dto.ReceiverId,
            Content = dto.Content,
            MessageType = dto.MessageType
        };

        var savedMessage = await _messageService.CreateMessageAsync(message);

        // Upload file nếu có
        if (dto.Files != null && dto.Files.Any())
        {
            foreach (var file in dto.Files)
            {
                string folder = dto.MessageType == "image" ? "chat_images" : "chat_files";
                var fileUrl = await _cloudinaryService.UploadFileAsync(file, folder);

                var msgFile = new MessageFile
                {
                    MessageId = savedMessage.Id,
                    FileUrl = fileUrl,
                    FileType = dto.MessageType,
                    FileName = file.FileName
                };

                _db.MessageFiles.Add(msgFile);
            }
            await _db.SaveChangesAsync();
        }

        var resultDto = new MessageDto
        {
            Id = savedMessage.Id,
            SenderId = savedMessage.SenderId,
            SenderUserName = User.Identity?.Name ?? string.Empty,
            ReceiverId = savedMessage.ReceiverId,
            Content = savedMessage.Content,
            MessageType = savedMessage.MessageType,
            IsRead = savedMessage.IsRead,
            CreatedAt = savedMessage.CreatedAt,
            Files = await _db.MessageFiles
                        .Where(f => f.MessageId == savedMessage.Id)
                        .Select(f => new MessageFileDto
                        {
                            FileUrl = f.FileUrl,
                            FileType = f.FileType,
                            FileName = f.FileName
                        })
                        .ToListAsync()
        };

        return CreatedAtAction(nameof(GetMessage), new { id = savedMessage.Id }, resultDto);
    }

    // =======================================
    // GỬI ÂM THOẠI
    // =======================================
    [HttpPost("send-voice")]
    [Consumes("multipart/form-data")] // ✅ Cần để Swagger hiểu multipart form
    public async Task<IActionResult> SendVoiceMessage([FromForm] VoiceMessageDto dto)
    {
        // ✅ Lấy ID người gửi từ JWT
        int senderId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // ✅ Kiểm tra dữ liệu
        if (dto.AudioFile == null || dto.AudioFile.Length == 0)
            return BadRequest("Không có file âm thanh hợp lệ.");

        if (dto.ReceiverId <= 0)
            return BadRequest("Vui lòng nhập ID người nhận hợp lệ.");

        // ✅ Kiểm tra người nhận có tồn tại trong DB chưa
        var receiver = await _db.Users.FindAsync(dto.ReceiverId);
        if (receiver == null)
            return BadRequest($"Người nhận (ID={dto.ReceiverId}) không tồn tại trong hệ thống.");

        // ✅ Upload file lên Cloudinary
        var audioUrl = await _cloudinaryService.UploadFileAsync(dto.AudioFile, "chat_voice");

        // ✅ Lấy độ dài file âm thanh
        var voiceDuration = await _cloudinaryService.GetAudioDurationAsync(dto.AudioFile);

        // ✅ Tạo mới tin nhắn loại "voice"
        var message = new Message
        {
            SenderId = senderId,
            ReceiverId = dto.ReceiverId,
            MessageType = "voice",
            VoiceUrl = audioUrl,
            VoiceDuration = voiceDuration,
            CreatedAt = DateTime.UtcNow,
            IsRead = false,
            IsPinned = false
        };

        // ✅ Lưu message vào DB
        var saved = await _messageService.CreateMessageAsync(message);

        // ✅ Lưu file đính kèm (nếu muốn lưu riêng)
        _db.MessageFiles.Add(new MessageFile
        {
            MessageId = saved.Id,
            FileUrl = audioUrl,
            FileType = "voice",
            FileName = dto.AudioFile.FileName
        });
        await _db.SaveChangesAsync();

        // ✅ Trả về response
        return Ok(new
        {
            MessageId = saved.Id,
            SenderId = senderId,
            dto.ReceiverId,
            VoiceUrl = audioUrl,
            VoiceDuration = voiceDuration,
            dto.AudioFile.FileName,
            MessageType = "voice",
            message.CreatedAt
        });
    }

    // =======================================
    // Gửi vị trí hiện tại
    // =======================================
    [HttpPost("send-location")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SendLocation([FromForm] LocationMessageDto dto)
    {
        // ✅ Lấy ID người gửi từ JWT
        int senderId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // ✅ Kiểm tra dữ liệu hợp lệ
        if (dto.ReceiverId <= 0)
            return BadRequest("Vui lòng nhập ID người nhận hợp lệ.");

        if (dto.Latitude == 0 && dto.Longitude == 0)
            return BadRequest("Vui lòng cung cấp tọa độ hợp lệ.");

        // ✅ Kiểm tra người nhận có tồn tại trong hệ thống
        var receiver = await _db.Users.FindAsync(dto.ReceiverId);
        if (receiver == null)
            return BadRequest($"Người nhận (ID={dto.ReceiverId}) không tồn tại trong hệ thống.");

        // ✅ Tạo mới tin nhắn loại "location"
        var message = new Message
        {
            SenderId = senderId,
            ReceiverId = dto.ReceiverId,
            MessageType = "location",
            Content = $"Vị trí hiện tại: ({dto.Latitude}, {dto.Longitude})",
            CreatedAt = DateTime.UtcNow,
            IsRead = false,
            IsPinned = false
        };

        // ✅ Lưu vào DB
        var saved = await _messageService.CreateMessageAsync(message);

        // ✅ Trả về response
        return Ok(new
        {
            MessageId = saved.Id,
            SenderId = senderId,
            ReceiverId = dto.ReceiverId,
            MessageType = "location",
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            GoogleMapsUrl = $"https://www.google.com/maps?q={dto.Latitude},{dto.Longitude}",
            CreatedAt = message.CreatedAt
        });
    }

    // =============================
    // Lấy tin nhắn theo ID
    // =============================
    [HttpGet("{id}")]
    public async Task<IActionResult> GetMessage(int id)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var msg = await _db.Messages.FindAsync(id);
        if (msg == null) return NotFound();

        bool deleted = await _db.MessageDeletions
            .AnyAsync(md => md.UserId == userId && md.MessageId == id);
        if (deleted) return NotFound();

        var files = await _db.MessageFiles
            .Where(f => f.MessageId == id)
            .Select(f => new MessageFileDto
            {
                FileUrl = f.FileUrl,
                FileType = f.FileType,
                FileName = f.FileName
            })
            .ToListAsync();

        return Ok(new MessageDto
        {
            Id = msg.Id,
            SenderId = msg.SenderId,
            SenderUserName = (await _db.Users.FindAsync(msg.SenderId))?.Email ?? string.Empty,
            ReceiverId = msg.ReceiverId,
            Content = msg.Content,
            MessageType = msg.MessageType,
            IsRead = msg.IsRead,
            CreatedAt = msg.CreatedAt,
            Files = files
        });
    }

    // =============================
    // Lấy hội thoại giữa 2 user
    // =============================
    [HttpGet("with/{otherUserId}")]
    public async Task<IActionResult> GetConversation(int otherUserId)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var msgs = await _messageService.GetConversationAsync(userId, otherUserId);

        var deletedIds = await _db.MessageDeletions
            .Where(md => md.UserId == userId)
            .Select(md => md.MessageId)
            .ToListAsync();

        msgs = msgs.Where(m => !deletedIds.Contains(m.Id)).ToList();

        var dtos = new List<MessageDto>();
        foreach (var m in msgs)
        {
            var files = await _db.MessageFiles
                .Where(f => f.MessageId == m.Id)
                .Select(f => new MessageFileDto
                {
                    FileUrl = f.FileUrl,
                    FileType = f.FileType,
                    FileName = f.FileName
                })
                .ToListAsync();

            dtos.Add(new MessageDto
            {
                Id = m.Id,
                SenderId = m.SenderId,
                SenderUserName = _db.Users.Find(m.SenderId)?.Email ?? string.Empty,
                ReceiverId = m.ReceiverId,
                Content = m.Content,
                VoiceUrl = m.VoiceUrl,
                VoiceDuration = m.VoiceDuration,
                MessageType = m.MessageType,
                IsRead = m.IsRead,
                IsPinned = m.IsPinned,
                CreatedAt = m.CreatedAt,
                Files = files

            });
        }

        return Ok(dtos);
    }

    // =============================
    // Thu hồi tin nhắn (mọi người đều mất)
    // =============================
    [HttpDelete("recall/{id}")]
    public async Task<IActionResult> RecallMessage(int id)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var message = await _db.Messages.FirstOrDefaultAsync(m => m.Id == id);
        if (message == null) return NotFound("Tin nhắn không tồn tại.");
        if (message.SenderId != userId) return Forbid("Bạn chỉ có thể thu hồi tin nhắn của mình.");
        if ((DateTime.UtcNow - message.CreatedAt).TotalMinutes > 10)
            return BadRequest("Bạn chỉ có thể thu hồi tin nhắn trong vòng 10 phút.");

        _db.Messages.Remove(message);
        await _db.SaveChangesAsync();

        return Ok("Tin nhắn đã được thu hồi (mọi người đều không thấy nữa).");
    }

    // =============================
    // Xóa tin nhắn (cục bộ)
    // =============================
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMessage(int id)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var message = await _db.Messages.FindAsync(id);
        if (message == null) return NotFound("Tin nhắn không tồn tại.");

        bool alreadyDeleted = await _db.MessageDeletions
            .AnyAsync(md => md.MessageId == id && md.UserId == userId);

        if (alreadyDeleted) return BadRequest("Bạn đã xóa tin nhắn này rồi.");

        var deletion = new MessageDeletion
        {
            MessageId = id,
            UserId = userId
        };

        _db.MessageDeletions.Add(deletion);
        await _db.SaveChangesAsync();

        return Ok("Tin nhắn đã được xóa (chỉ bạn không thấy nữa).");
    }

    // =============================
    // Xóa toàn bộ cuộc hội thoại (cục bộ)
    // =============================
    [HttpDelete("conversation/{otherUserId}")]
    public async Task<IActionResult> DeleteConversation(int otherUserId)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var messages = await _db.Messages
            .Where(m =>
                (m.SenderId == userId && m.ReceiverId == otherUserId) ||
                (m.SenderId == otherUserId && m.ReceiverId == userId))
            .Select(m => m.Id)
            .ToListAsync();

        if (!messages.Any()) return NotFound("Không có tin nhắn nào.");

        foreach (var msgId in messages)
        {
            if (!await _db.MessageDeletions.AnyAsync(md => md.MessageId == msgId && md.UserId == userId))
            {
                _db.MessageDeletions.Add(new MessageDeletion
                {
                    MessageId = msgId,
                    UserId = userId
                });
            }
        }

        await _db.SaveChangesAsync();

        return Ok("Đã xóa toàn bộ cuộc hội thoại (chỉ bạn không thấy).");
    }
    // =======================================
    // Ghim tin nhắn
    // =======================================
    [HttpPut("pin/{id}")]
    public async Task<IActionResult> PinMessage(int id)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var msg = await _db.Messages.FindAsync(id);
        if (msg == null) return NotFound("Tin nhắn không tồn tại.");
        if (msg.SenderId != userId && msg.ReceiverId != userId)
            return Forbid("Không có quyền ghim tin nhắn này.");

        msg.IsPinned = true;
        await _db.SaveChangesAsync();
        return Ok("Đã ghim tin nhắn.");
    }

    // =======================================
    // Hủy ghim tin nhắn
    // =======================================
    [HttpPut("unpin/{id}")]
    public async Task<IActionResult> UnpinMessage(int id)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var msg = await _db.Messages.FindAsync(id);
        if (msg == null) return NotFound("Tin nhắn không tồn tại.");
        if (msg.SenderId != userId && msg.ReceiverId != userId)
            return Forbid("Không có quyền hủy ghim tin nhắn này.");

        msg.IsPinned = false;
        await _db.SaveChangesAsync();
        return Ok("Đã hủy ghim tin nhắn.");
    }

    // =======================================
    // Lấy tin nhắn đã ghim
    // =======================================
    [HttpGet("pinned")]
    public async Task<IActionResult> GetPinnedMessages()
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var pinned = await _db.Messages
            .Where(m => m.IsPinned && (m.SenderId == userId || m.ReceiverId == userId))
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => new MessageDto
            {
                Id = m.Id,
                SenderId = m.SenderId,
                SenderUserName = _db.Users.FirstOrDefault(u => u.Id == m.SenderId)!.Email,
                ReceiverId = m.ReceiverId,
                Content = m.Content,
                VoiceUrl = m.VoiceUrl,
                VoiceDuration = m.VoiceDuration,
                MessageType = m.MessageType,
                IsRead = m.IsRead,
                CreatedAt = m.CreatedAt
            })
            .ToListAsync();

        return Ok(pinned);
    }

    // =======================================
    // Sửa tin nhắn & lưu lịch sử
    // =======================================
    [HttpPut("{id}")]
    public async Task<IActionResult> EditMessage(int id, [FromBody] UpdateMessageDto dto)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var msg = await _db.Messages.FirstOrDefaultAsync(m => m.Id == id);
        if (msg == null) return NotFound("Tin nhắn không tồn tại.");
        if (msg.SenderId != userId) return Forbid("Chỉ người gửi được sửa tin nhắn.");

        if ((DateTime.UtcNow - msg.CreatedAt).TotalMinutes > 15)
            return BadRequest("Chỉ được sửa trong vòng 15 phút.");

        var history = new MessageEditHistory
        {
            MessageId = msg.Id,
            OldContent = msg.Content,
            NewContent = dto.Content,
            EditedAt = DateTime.UtcNow
        };

        _db.MessageEditHistories.Add(history);
        msg.Content = dto.Content;
        msg.EditedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            msg.Id,
            msg.Content,
            msg.EditedAt
        });
    }

    // =======================================
    // Lấy lịch sử sửa tin nhắn
    // =======================================
    [HttpGet("{id}/history")]
    public async Task<IActionResult> GetEditHistory(int id)
    {
        var history = await _db.MessageEditHistories
            .Where(h => h.MessageId == id)
            .OrderByDescending(h => h.EditedAt)
            .Select(h => new
            {
                h.OldContent,
                h.NewContent,
                h.EditedAt
            })
            .ToListAsync();

        if (!history.Any())
            return NotFound("Tin nhắn chưa từng được sửa.");

        return Ok(history);
    }
}
