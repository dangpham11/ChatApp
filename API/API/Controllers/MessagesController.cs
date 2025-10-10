using API.Data;
using API.DTOs;
using API.Entities;
using API.Interfaces;
using API.Services;
using Microsoft.AspNetCore.Authorization;
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
    // 1. Gửi tin nhắn (có thể kèm nhiều file)
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

    // =============================
    // 2. Lấy tin nhắn theo ID
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
    // 3. Lấy hội thoại giữa 2 user
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
                MessageType = m.MessageType,
                IsRead = m.IsRead,
                CreatedAt = m.CreatedAt,
                Files = files
            });
        }

        return Ok(dtos);
    }

    // =============================
    // 4. Thu hồi tin nhắn (mọi người đều mất)
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
    // 5. Xóa tin nhắn (cục bộ)
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
    // 6. Xóa toàn bộ cuộc hội thoại (cục bộ)
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
}
