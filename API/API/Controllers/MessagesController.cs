using API.Data;
using API.DTOs;
using API.Entities;
using API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace API.Controllers
{   
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
        private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);


        [HttpPost]
        public async Task<IActionResult> SendMessage([FromForm] CreateMessageDto dto)
        {
            if (dto.ConversationId <= 0)
                return BadRequest("Phải có ConversationId cho tin nhắn riêng.");
            

            // Tìm hoặc tạo cuộc trò chuyện
            var conversation = await _db.Conversations
                .Include(c => c.BlockedUsers)
                .Include(c => c.User1)
                .Include(c => c.User2)
                .FirstOrDefaultAsync(c => c.Id == dto.ConversationId);

            // Xác định người nhận trong cuộc trò chuyện
            int receiverId;

            if (conversation != null)
            {
                receiverId = conversation.User1Id == CurrentUserId
                    ? conversation.User2Id
                    : conversation.User1Id;
            }
            else
            {
                return BadRequest("Thiếu ReceiverId khi tạo cuộc trò chuyện mới.");
            }

            if (conversation == null)
            {
                var receiver = await _db.Users.FindAsync(receiverId);
                if (receiver == null)
                    return BadRequest("Người nhận không tồn tại.");

                conversation = new Conversation
                {
                    User1Id = CurrentUserId,
                    User2Id = receiverId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    ConversationName = receiver.FullName
                };

                _db.Conversations.Add(conversation);
                await _db.SaveChangesAsync();
            }

            if (conversation.BlockedUsers.Any(b => b.BlockedUserId == CurrentUserId))
                return BadRequest("Bạn không thể gửi tin nhắn vì bạn đã bị chặn.");
            // Sau khi tìm hoặc tạo Conversation
            if (conversation.User1Id == CurrentUserId && conversation.User1Deleted)
            {
                conversation.User1Deleted = false;
                conversation.DeletedAtUser1 = null;
            }

            if (conversation.User2Id == CurrentUserId && conversation.User2Deleted)
            {
                conversation.User2Deleted = false;
                conversation.DeletedAtUser2 = null;
            }

            // Tạo tin nhắn
            var message = new Message
            {
                SenderId = CurrentUserId,
                ReceiverId = receiverId,
                Content = dto.Content,
                MessageType = dto.MessageType,
                CreatedAt = DateTime.UtcNow,
                ConversationId = conversation.Id
            };

            var savedMessage = await _messageService.CreateMessageAsync(message);

            // Upload file (nếu có)
            if (dto.Files != null && dto.Files.Any())
            {
                foreach (var file in dto.Files)
                {
                    string folder = dto.MessageType switch
                    {
                        "image" => "chat_images",
                        "voice" => "chat_voices",
                        _ => "chat_files"
                    };

                    var fileUrl = await _cloudinaryService.UploadFileAsync(file, folder);

                    _db.MessageFiles.Add(new MessageFile
                    {
                        MessageId = savedMessage.Id,
                        FileUrl = fileUrl,
                        FileType = dto.MessageType,
                        FileName = file.FileName
                    });
                }
                await _db.SaveChangesAsync();
            }

            // Kết quả
            var resultDto = new MessageDto
            {
                Id = savedMessage.Id,
                ConversationId = conversation.Id,
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
                    }).ToListAsync()
            };

            return CreatedAtAction(nameof(GetMessage), new { id = savedMessage.Id }, resultDto);
        }

        [HttpPost("reply")]
        public async Task<IActionResult> ReplyMessage([FromForm] ReplyMessageDto dto)
        {
            if (!dto.ReplyToMessageId.HasValue)
                return BadRequest("Thiếu ID tin nhắn cần trả lời.");

            var repliedMsg = await _db.Messages
                .Include(m => m.Sender)
                .FirstOrDefaultAsync(m => m.Id == dto.ReplyToMessageId);

            if (repliedMsg == null)
                return NotFound("Tin nhắn được trả lời không tồn tại.");

            // Lấy conversation hiện tại
            var conversation = await _db.Conversations
                .Include(c => c.BlockedUsers)
                .FirstOrDefaultAsync(c => c.Id == repliedMsg.ConversationId);

            if (conversation == null)
                return NotFound("Cuộc trò chuyện không tồn tại.");

            if (conversation.BlockedUsers.Any(b => b.BlockedUserId == CurrentUserId))
                return BadRequest("Bạn không thể gửi tin nhắn vì bạn đã bị chặn.");

            // Tạo tin nhắn trả lời
            var message = new Message
            {
                SenderId = CurrentUserId,
                ReceiverId = repliedMsg.SenderId == CurrentUserId ? repliedMsg.ReceiverId : repliedMsg.SenderId,
                Content = dto.Content,
                MessageType = dto.MessageType,
                CreatedAt = DateTime.UtcNow,
                ConversationId = conversation.Id,
                ReplyToMessageId = dto.ReplyToMessageId
            };

            var savedMessage = await _messageService.CreateMessageAsync(message);

            // Upload file (nếu có)
            if (dto.Files != null && dto.Files.Any())
            {
                foreach (var file in dto.Files)
                {
                    string folder = dto.MessageType switch
                    {
                        "image" => "chat_images",
                        "voice" => "chat_voices",
                        _ => "chat_files"
                    };

                    var fileUrl = await _cloudinaryService.UploadFileAsync(file, folder);

                    _db.MessageFiles.Add(new MessageFile
                    {
                        MessageId = savedMessage.Id,
                        FileUrl = fileUrl,
                        FileType = dto.MessageType,
                        FileName = file.FileName
                    });
                }
                await _db.SaveChangesAsync();
            }

            // Tạo DTO trả về
            var resultDto = new MessageDto
            {
                Id = savedMessage.Id,
                ConversationId = conversation.Id,
                SenderId = savedMessage.SenderId,
                SenderUserName = User.Identity?.Name ?? string.Empty,
                ReceiverId = savedMessage.ReceiverId,
                Content = savedMessage.Content,
                MessageType = savedMessage.MessageType,
                IsRead = savedMessage.IsRead,
                CreatedAt = savedMessage.CreatedAt,
                ReplyToMessageId = repliedMsg.Id,
                ReplyContent = repliedMsg.Content,
                ReplySenderName = repliedMsg.Sender.FullName,
                Files = await _db.MessageFiles
                    .Where(f => f.MessageId == savedMessage.Id)
                    .Select(f => new MessageFileDto
                    {
                        FileUrl = f.FileUrl,
                        FileType = f.FileType,
                        FileName = f.FileName
                    }).ToListAsync()
            };

            return CreatedAtAction(nameof(GetMessage), new { id = savedMessage.Id }, resultDto);
        }

        // =======================================
        // Gửi âm thanh
        // =======================================
        [HttpPost("send-voice")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> SendVoiceMessage([FromForm] VoiceMessageDto dto)
        {
            int senderId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            if (dto.AudioFile == null || dto.AudioFile.Length == 0)
                return BadRequest("Không có file âm thanh hợp lệ.");

            if (dto.ConversationId <= 0)
                return BadRequest("Vui lòng cung cấp ConversationId hợp lệ.");

            // 🔹 Tìm cuộc trò chuyện
            var conversation = await _db.Conversations
                .Include(c => c.BlockedUsers)
                .Include(c => c.User1)
                .Include(c => c.User2)
                .FirstOrDefaultAsync(c => c.Id == dto.ConversationId);

            if (conversation == null)
                return BadRequest("Cuộc trò chuyện không tồn tại.");

            // 🔹 Xác định người nhận
            int receiverId = conversation.User1Id == senderId
                ? conversation.User2Id
                : conversation.User1Id;

            // 🔹 Kiểm tra chặn
            if (conversation.BlockedUsers.Any(b => b.BlockedUserId == senderId))
                return BadRequest("Bạn không thể gửi tin nhắn vì bạn đã bị chặn.");

            // 🔹 Upload file âm thanh
            var audioUrl = await _cloudinaryService.UploadFileAsync(dto.AudioFile, "chat_voices");
            var voiceDuration = await _cloudinaryService.GetAudioDurationAsync(dto.AudioFile);

            // 🔹 Tạo tin nhắn mới
            var message = new Message
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                MessageType = "voice",
                VoiceUrl = audioUrl,
                VoiceDuration = voiceDuration,
                CreatedAt = DateTime.UtcNow,
                IsRead = false,
                IsPinned = false,
                ConversationId = conversation.Id
            };

            var saved = await _messageService.CreateMessageAsync(message);

            _db.MessageFiles.Add(new MessageFile
            {
                MessageId = saved.Id,
                FileUrl = audioUrl,
                FileType = "voice",
                FileName = dto.AudioFile.FileName
            });

            // 🔹 Cập nhật thời gian hoạt động cuộc trò chuyện
            conversation.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // 🔹 Trả kết quả
            return Ok(new
            {
                saved.Id,
                SenderId = senderId,
                ReceiverId = receiverId,
                AudioUrl = audioUrl,
                VoiceDuration = voiceDuration,
                FileName = dto.AudioFile.FileName,
                message.CreatedAt,
                message.MessageType,
                ConversationId = conversation.Id
            });
        }


        // =======================================
        // Gửi vị trí
        // =======================================
        [HttpPost("send-location")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> SendLocation([FromForm] LocationMessageDto dto)
        {
            int senderId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            if (dto.ConversationId <= 0)
                return BadRequest("Vui lòng cung cấp ConversationId hợp lệ.");
            if (dto.Latitude == 0 && dto.Longitude == 0)
                return BadRequest("Vui lòng cung cấp tọa độ hợp lệ.");

            // 🔹 Tìm cuộc trò chuyện
            var conversation = await _db.Conversations
                .Include(c => c.BlockedUsers)
                .Include(c => c.User1)
                .Include(c => c.User2)
                .FirstOrDefaultAsync(c => c.Id == dto.ConversationId);

            if (conversation == null)
                return BadRequest("Cuộc trò chuyện không tồn tại.");

            // 🔹 Xác định người nhận
            int receiverId = conversation.User1Id == senderId
                ? conversation.User2Id
                : conversation.User1Id;

            // 🔹 Kiểm tra block
            if (conversation.BlockedUsers.Any(b => b.BlockedUserId == senderId))
                return BadRequest("Bạn không thể gửi tin nhắn vì bạn đã bị chặn.");

            // 🔹 Tạo tin nhắn dạng "location"
            var message = new Message
            {
                SenderId = senderId,
                ReceiverId = receiverId,
                MessageType = "location",
                Content = $"Vị trí hiện tại: ({dto.Latitude}, {dto.Longitude})",
                CreatedAt = DateTime.UtcNow,
                IsRead = false,
                IsPinned = false,
                ConversationId = conversation.Id
            };

            var saved = await _messageService.CreateMessageAsync(message);

            // 🔹 Cập nhật thời gian cập nhật cuộc trò chuyện
            conversation.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // 🔹 Trả kết quả
            return Ok(new
            {
                saved.Id,
                SenderId = senderId,
                ReceiverId = receiverId,
                dto.Latitude,
                dto.Longitude,
                GoogleMapsUrl = $"https://www.google.com/maps?q={dto.Latitude},{dto.Longitude}",
                message.CreatedAt,
                message.MessageType,
                ConversationId = conversation.Id
            });
        }

        // =============================
        // Chuyển tiếp tin nhắn
        // =============================
        [HttpPost("forward")]
        public async Task<IActionResult> ForwardMessage([FromBody] ForwardMessageDto dto)
        {
            int senderId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            if (dto.ConversationIds == null || !dto.ConversationIds.Any())
                return BadRequest("Vui lòng cung cấp danh sách ConversationId hợp lệ.");

            // 🔹 Lấy tin nhắn gốc
            var original = await _db.Messages
                .Include(m => m.MessageFiles)
                .Include(m => m.Sender)
                .FirstOrDefaultAsync(m => m.Id == dto.OriginalMessageId);

            if (original == null)
                return NotFound("Tin nhắn gốc không tồn tại.");

            var results = new List<object>();

            foreach (var conversationId in dto.ConversationIds.Distinct())
            {
                // 🔹 Tìm cuộc trò chuyện
                var conversation = await _db.Conversations
                    .Include(c => c.BlockedUsers)
                    .Include(c => c.User1)
                    .Include(c => c.User2)
                    .FirstOrDefaultAsync(c => c.Id == conversationId);

                if (conversation == null)
                {
                    results.Add(new { ConversationId = conversationId, Status = "Cuộc trò chuyện không tồn tại" });
                    continue;
                }

                // 🔹 Xác định người nhận
                int receiverId = conversation.User1Id == senderId
                    ? conversation.User2Id
                    : conversation.User1Id;

                // 🔹 Kiểm tra block
                if (conversation.BlockedUsers.Any(b => b.BlockedUserId == senderId))
                {
                    results.Add(new { ConversationId = conversationId, Status = "Bạn bị chặn, không thể gửi" });
                    continue;
                }

                // 🔹 Tạo tin nhắn chuyển tiếp
                var forwarded = new Message
                {
                    SenderId = senderId,
                    ReceiverId = receiverId,
                    ConversationId = conversation.Id,
                    ForwardedFromId = original.SenderId,
                    ForwardedFrom = original.Sender,
                    Content = original.Content,
                    MessageType = original.MessageType,
                    FileUrl = original.FileUrl,
                    VoiceUrl = original.VoiceUrl,
                    VoiceDuration = original.VoiceDuration,
                    Latitude = original.Latitude,
                    Longitude = original.Longitude,
                    CreatedAt = DateTime.UtcNow,
                    IsRead = false,
                    IsPinned = false
                };

                var saved = await _messageService.CreateMessageAsync(forwarded);

                // 🔹 Sao chép file đính kèm (nếu có)
                if (original.MessageFiles != null && original.MessageFiles.Any())
                {
                    foreach (var file in original.MessageFiles)
                    {
                        _db.MessageFiles.Add(new MessageFile
                        {
                            MessageId = saved.Id,
                            FileUrl = file.FileUrl,
                            FileType = file.FileType,
                            FileName = file.FileName
                        });
                    }
                }

                // 🔹 Cập nhật thời gian hội thoại
                conversation.UpdatedAt = DateTime.UtcNow;

                results.Add(new
                {
                    ConversationId = conversation.Id,
                    ReceiverId = receiverId,
                    Status = "Đã gửi thành công",
                    MessageId = saved.Id
                });
            }

            await _db.SaveChangesAsync();

            return Ok(results);
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
                }).ToListAsync();

            var senderUser = await _db.Users.FindAsync(msg.SenderId);
            var forwardedFrom = msg.ForwardedFromId != null
                ? await _db.Users.FindAsync(msg.ForwardedFromId)
                : null;

            return Ok(new MessageDto
            {
                Id = msg.Id,
                SenderId = msg.SenderId,
                SenderUserName = senderUser?.Email ?? string.Empty,
                ReceiverId = msg.ReceiverId,
                Content = msg.Content,
                MessageType = msg.MessageType,
                VoiceUrl = msg.VoiceUrl,
                VoiceDuration = msg.VoiceDuration,
                IsRead = msg.IsRead,
                CreatedAt = msg.CreatedAt,
                Files = files,
                ForwardedFromId = msg.ForwardedFromId,
                ForwardedFrom = forwardedFrom?.FullName
            });
        }

        // =============================
        // Lấy tin nhắn đã ghim
        // =============================
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
                }).ToListAsync();

            return Ok(pinned);
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

        // =============================
        // Ghim / Hủy ghim tin nhắn
        // =============================
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

        // =============================
        // Sửa tin nhắn & lưu lịch sử
        // =============================
        [HttpPut("{id}")]
        public async Task<IActionResult> EditMessage(int id, [FromBody] UpdateMessageDto dto)
        {
            int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var msg = await _db.Messages.FirstOrDefaultAsync(m => m.Id == id);
            if (msg == null) return NotFound("Tin nhắn không tồn tại.");
            if (msg.SenderId != userId) return Forbid("Chỉ người gửi được sửa tin nhắn.");
            if ((DateTime.UtcNow - msg.CreatedAt).TotalMinutes > 15)
                return BadRequest("Chỉ được sửa trong vòng 15 phút.");

            _db.MessageEditHistories.Add(new MessageEditHistory
            {
                MessageId = msg.Id,
                OldContent = msg.Content,
                NewContent = dto.Content,
                EditedAt = DateTime.UtcNow
            });

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

        // =============================
        // Thu hồi tin nhắn
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
        // Xóa tin nhắn cục bộ
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

            _db.MessageDeletions.Add(new MessageDeletion
            {
                MessageId = id,
                UserId = userId
            });
            await _db.SaveChangesAsync();

            return Ok("Tin nhắn đã được xóa (chỉ bạn không thấy nữa).");
        }

        [HttpPost("{messageId}/reaction")]
        public async Task<IActionResult> AddReaction(int messageId, [FromQuery] string reactionType = "like")
        {
            var userIdClaim = User.FindFirst("nameid")?.Value
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();

            int userId = int.Parse(userIdClaim);

            var message = await _db.Messages.FindAsync(messageId);
            if (message == null) return NotFound("Message not found");

            var existing = await _db.MessageReactions
                .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId);

            if (existing != null)
            {
                existing.ReactionType = reactionType;
                await _db.SaveChangesAsync();
                return Ok(new { message = "Reaction updated" });
            }

            var reaction = new MessageReaction
            {
                UserId = userId,
                MessageId = messageId,
                ReactionType = reactionType
            };

            _db.MessageReactions.Add(reaction);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Reaction added" });
        }
    }
}
