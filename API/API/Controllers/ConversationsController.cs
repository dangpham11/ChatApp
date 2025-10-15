using API.Data;
using API.DTOs;
using API.Entities;
using API.SignalR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ConversationsController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly DataContext _db;

        public ConversationsController(DataContext context, DataContext db)
        {
            _context = context;
            _db = db;
        }

        private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpPost("{conversationId}/unblock")]
        public async Task<IActionResult> UnblockUser(int conversationId, [FromBody] BlockUserDto dto)
        {
            int currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var conversation = await _context.Conversations
                .Include(c => c.BlockedUsers)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conversation == null)
                return NotFound("Cuộc trò chuyện không tồn tại.");

            var block = conversation.BlockedUsers.FirstOrDefault(b => b.BlockedUserId == dto.BlockedUserId);
            if (block == null)
                return BadRequest("Người dùng chưa bị chặn.");

            conversation.BlockedUsers.Remove(block);
            await _context.SaveChangesAsync();
            return Ok("Người dùng đã được bỏ chặn.");
        }

        [HttpPost("{conversationId}/block")]
        public async Task<IActionResult> BlockUser(int conversationId, [FromBody] BlockUserDto dto)
        {
            int currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var conversation = await _context.Conversations
                .Include(c => c.BlockedUsers)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conversation == null)
                return NotFound("Cuộc trò chuyện không tồn tại.");

            if (dto.BlockedUserId != conversation.User1Id && dto.BlockedUserId != conversation.User2Id)
                return BadRequest("Người dùng không thuộc conversation này.");

            if (conversation.BlockedUsers.Any(b => b.BlockedUserId == dto.BlockedUserId))
                return BadRequest("Người dùng đã bị chặn.");

            conversation.BlockedUsers.Add(new ConversationBlock
            {
                BlockedUserId = dto.BlockedUserId,
                BlockedByUserId = currentUserId,
                ConversationId = conversation.Id
            });

            await _context.SaveChangesAsync();
            return Ok("Người dùng đã bị chặn.");
        }

        // =============================
        // Lấy danh sách conversation của user hiện tại
        // =============================
        [HttpGet("my-conversations")]
        public async Task<ActionResult<IEnumerable<ConversationDto>>> GetMyConversations()
        {
            var conversations = await _db.Conversations
                .Include(c => c.Messages)
                .Include(c => c.User1)
                .Include(c => c.User2)
                .Where(c => c.User1Id == CurrentUserId || c.User2Id == CurrentUserId)
                .ToListAsync();

            var result = conversations
                .Where(c =>
                {
                    // 🧩 Xác định user hiện tại là user1 hay user2
                    bool isUser1 = c.User1Id == CurrentUserId;
                    bool isUser2 = c.User2Id == CurrentUserId;

                    // 🧩 Lấy thời điểm xóa (nếu có)
                    DateTime? deletedAt = null;
                    if (isUser1 && c.User1Deleted) deletedAt = c.DeletedAtUser1;
                    else if (isUser2 && c.User2Deleted) deletedAt = c.DeletedAtUser2;

                    // 🧩 Nếu chưa từng xóa => hiển thị bình thường
                    if (!deletedAt.HasValue) return true;

                    // 🧩 Nếu đã xóa => chỉ hiển thị lại nếu có tin nhắn mới hơn thời điểm xóa
                    var latestMsg = c.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
                    return latestMsg != null && latestMsg.CreatedAt > deletedAt.Value;
                })
                .Select(c =>
                {
                    var lastMessage = c.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault();

                    bool isCurrentUserUser1 = c.User1Id == CurrentUserId;
                    var otherUser = isCurrentUserUser1 ? c.User2 : c.User1;

                    // 🧩 Xác định tên hiển thị giống như trước
                    string conversationName = isCurrentUserUser1
                        ? (!string.IsNullOrEmpty(c.NicknameUser2) ? c.NicknameUser2 : c.User2.FullName)
                        : (!string.IsNullOrEmpty(c.NicknameUser1) ? c.NicknameUser1 : c.User1.FullName);

                    // 🧩 Lấy avatar người đối diện
                    string? conversationAvatarUrl = isCurrentUserUser1 ? c.User2.AvatarUrl : c.User1.AvatarUrl;

                    bool isMuted = isCurrentUserUser1 ? c.User1Muted : c.User2Muted;

                    return new ConversationDto
                    {
                        Id = c.Id,
                        ConversationName = conversationName,
                        ConversationAvatarUrl = conversationAvatarUrl,
                        User1Id = c.User1Id,
                        User1Name = c.User1.FullName,
                        NicknameUser1 = c.NicknameUser1,
                        User2Id = c.User2Id,
                        User2Name = c.User2.FullName,
                        NicknameUser2 = c.NicknameUser2,
                        LastMessageId = lastMessage?.Id,
                        LastMessageContent = lastMessage?.Content,
                        LastMessageCreatedAt = lastMessage?.CreatedAt,
                        IsMutedForCurrentUser = isMuted,
                        IsUserOnline = PresenceHub.IsUserOnline(otherUser.Id),
                        LastActive = otherUser.LastActive
                    };
                })
                .OrderByDescending(c => c.LastMessageCreatedAt)
                .ToList();

            return Ok(result);
        }

        // =============================
        // Lấy tin nhắn trong conversation
        // =============================
        [HttpGet("{conversationId}/messages")]
        public async Task<ActionResult<ConversationDto>> GetConversationMessages(int conversationId)
        {
            var conversation = await _db.Conversations
                .Include(c => c.User1)
                .Include(c => c.User2)
                .Include(c => c.Messages)
                    .ThenInclude(m => m.MessageFiles)
                .Include(c => c.Messages)
                    .ThenInclude(m => m.ForwardedFrom)
                .Include(c => c.Messages)
                    .ThenInclude(m => m.ReplyToMessage)
                .Include(c => c.Messages)
                    .ThenInclude(m => m.Reactions)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conversation == null)
                return NotFound("Cuộc trò chuyện không tồn tại.");

            var currentUserId = CurrentUserId;

            // ✅ Nếu user hiện tại từng xóa, chỉ hiển thị tin nhắn được gửi SAU thời điểm đó
            DateTime? deletedAt = null;
            if (conversation.User1Id == currentUserId && conversation.User1Deleted)
                deletedAt = conversation.DeletedAtUser1;
            else if (conversation.User2Id == currentUserId && conversation.User2Deleted)
                deletedAt = conversation.DeletedAtUser2;

            // ✅ Lọc tin nhắn phù hợp (nếu có DeletedAt)
            var visibleMessages = conversation.Messages
                .Where(m => !deletedAt.HasValue || m.CreatedAt > deletedAt.Value)
                .OrderBy(m => m.CreatedAt)
                .ToList();

            // ✅ Lấy tên hiển thị cuộc trò chuyện
            string conversationName = currentUserId == conversation.User1Id
                ? (!string.IsNullOrEmpty(conversation.NicknameUser2)
                    ? conversation.NicknameUser2
                    : conversation.User2.FullName)
                : (!string.IsNullOrEmpty(conversation.NicknameUser1)
                    ? conversation.NicknameUser1
                    : conversation.User1.FullName);

            // ✅ Map thông tin người gửi
            var senderIds = visibleMessages.Select(m => m.SenderId).Distinct().ToList();
            var senders = await _db.Users
                .Where(u => senderIds.Contains(u.Id))
                .Select(u => new { u.Id, u.Email, u.FullName })
                .ToDictionaryAsync(u => u.Id, u => u);

            // ✅ Tạo danh sách tin nhắn DTO
            var messages = visibleMessages.Select(m => new MessageDto
            {
                Id = m.Id,
                SenderId = m.SenderId,
                SenderUserName = senders.ContainsKey(m.SenderId) ? senders[m.SenderId].Email : string.Empty,
                ConversationId = m.ConversationId,
                Content = m.Content,
                MessageType = m.MessageType,
                VoiceUrl = m.VoiceUrl,
                VoiceDuration = m.VoiceDuration,
                IsRead = m.IsRead,
                CreatedAt = m.CreatedAt,
                Files = m.MessageFiles.Select(f => new MessageFileDto
                {
                    FileUrl = f.FileUrl,
                    FileType = f.FileType,
                    FileName = f.FileName
                }).ToList(),

                // ✅ Forward
                ForwardedFromId = m.ForwardedFromId,
                ForwardedFrom = m.ForwardedFrom != null ? m.ForwardedFrom.FullName : null,

                // ✅ Reply
                ReplyToMessageId = m.ReplyToMessageId,
                ReplyContent = m.ReplyToMessage?.Content,
                ReplySenderName = m.ReplyToMessage != null
                    ? (conversation.User1Id == m.ReplyToMessage.SenderId
                        ? conversation.User1.FullName
                        : conversation.User2.FullName)
                    : null,
                ReactionType = m.Reactions
                .Where(r => r.UserId == currentUserId)
                .Select(r => r.ReactionType)
                .FirstOrDefault()

            }).ToList();

            var lastMessage = messages.LastOrDefault();

            // ✅ Trả về DTO
            return Ok(new ConversationDto
            {
                Id = conversation.Id,
                ConversationName = conversationName,
                User1Id = conversation.User1Id,
                User1Name = conversation.User1.FullName,
                NicknameUser1 = conversation.NicknameUser1,
                User2Id = conversation.User2Id,
                User2Name = conversation.User2.FullName,
                NicknameUser2 = conversation.NicknameUser2,
                Messages = messages,
            });
        }

        [HttpGet("{conversationId}/images")]
        public async Task<ActionResult<IEnumerable<MessageFileDto>>> GetConversationImages(int conversationId)
        {
            int currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var conversation = await _db.Conversations
                .Include(c => c.Messages)
                .ThenInclude(m => m.MessageFiles)
                .FirstOrDefaultAsync(c => c.Id == conversationId
                    && (c.User1Id == currentUserId || c.User2Id == currentUserId));

            if (conversation == null)
                return NotFound("Cuộc trò chuyện không tồn tại hoặc bạn không tham gia.");

            // Danh sách đuôi ảnh hợp lệ
            var imageExtensions = new[] { ".JPG", ".JPEG", ".PNG", ".GIF", ".TIFF", ".BMP" };

            var images = conversation.Messages
                .SelectMany(m => m.MessageFiles)
                .Where(f => imageExtensions.Contains(System.IO.Path.GetExtension(f.FileName).ToUpper()))
                .Select(f => new MessageFileDto
                {
                    FileUrl = f.FileUrl,
                    FileType = f.FileType,
                    FileName = f.FileName
                })
                .ToList();

            return Ok(images);
        }
        [HttpGet("{conversationId}/files")]
        public async Task<ActionResult<IEnumerable<MessageFileDto>>> GetConversationFiles(int conversationId)
        {
            int currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var conversation = await _db.Conversations
                .Include(c => c.Messages)
                .ThenInclude(m => m.MessageFiles)
                .FirstOrDefaultAsync(c => c.Id == conversationId
                    && (c.User1Id == currentUserId || c.User2Id == currentUserId));

            if (conversation == null)
                return NotFound("Cuộc trò chuyện không tồn tại hoặc bạn không tham gia.");

            // Danh sách đuôi file hợp lệ
            var fileExtensions = new[] { ".ZIP", ".DOCX", ".DOC", ".RAR", ".EXE", ".PDF" };

            var files = conversation.Messages
                .SelectMany(m => m.MessageFiles)
                .Where(f => fileExtensions.Contains(System.IO.Path.GetExtension(f.FileName).ToUpper()))
                .Select(f => new MessageFileDto
                {
                    FileUrl = f.FileUrl,
                    FileType = f.FileType,
                    FileName = f.FileName
                })
                .ToList();

            return Ok(files);
        }

        [HttpGet("{conversationId}/mute-status")]
        public async Task<ActionResult<bool>> GetMuteStatus(int conversationId)
        {
            int currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var conversation = await _db.Conversations.FindAsync(conversationId);
            if (conversation == null) return NotFound("Cuộc trò chuyện không tồn tại.");

            if (currentUserId != conversation.User1Id && currentUserId != conversation.User2Id)
                return Forbid("Bạn không tham gia cuộc trò chuyện này."); // dùng Forbid() thay vì ForbidException

            bool isMuted = currentUserId == conversation.User1Id ? conversation.User1Muted
                          : conversation.User2Muted;

            return Ok(new { conversation.Id, IsMuted = isMuted });
        }

        // =============================
        // Cập nhật nickname (của chính mình hoặc của người còn lại)
        // =============================
        [HttpPut("{conversationId}/nickname")]
        public async Task<IActionResult> SetNickname(int conversationId, [FromBody] SetNicknameDto dto)
        {
            int currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var conversation = await _context.Conversations.FindAsync(conversationId);
            if (conversation == null) return NotFound("Cuộc trò chuyện không tồn tại.");

            if (dto.TargetUserId == conversation.User1Id)
            {
                conversation.NicknameUser1 = dto.Nickname;
            }
            else if (dto.TargetUserId == conversation.User2Id)
            {
                conversation.NicknameUser2 = dto.Nickname;
            }
            else
            {
                return BadRequest("User không thuộc conversation này.");
            }

            await _context.SaveChangesAsync();
            return Ok(new
            {
                conversation.Id,
                conversation.NicknameUser1,
                conversation.NicknameUser2
            });
        }
        
        [HttpPut("{conversationId}/mute")]
        public async Task<IActionResult> MuteConversation(int conversationId, [FromBody] bool mute)
        {
            int currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var conversation = await _db.Conversations.FindAsync(conversationId);
            if (conversation == null) return NotFound("Cuộc trò chuyện không tồn tại.");

            if (currentUserId == conversation.User1Id)
                conversation.User1Muted = mute;
            else if (currentUserId == conversation.User2Id)
                conversation.User2Muted = mute;
            else
                return Forbid("Bạn không tham gia cuộc trò chuyện này.");

            await _db.SaveChangesAsync();
            return Ok(new { conversation.Id, IsMuted = mute });
        }

        [HttpDelete("{conversationId}")]
        public async Task<IActionResult> DeleteConversationForUser(int conversationId)
        {
            var conversation = await _db.Conversations.FindAsync(conversationId);

            if (conversation == null)
                return NotFound("Cuộc trò chuyện không tồn tại.");

            if (conversation.User1Id != CurrentUserId && conversation.User2Id != CurrentUserId)
                return Forbid("Bạn không có quyền xóa cuộc trò chuyện này.");

            if (conversation.User1Id == CurrentUserId)
                {
                conversation.User1Deleted = true;
                conversation.DeletedAtUser1 = DateTime.UtcNow;
                }
            else if (conversation.User2Id == CurrentUserId)
            {
                conversation.User2Deleted = true;
                conversation.DeletedAtUser2 = DateTime.UtcNow;
            }
                
            if (conversation.User1Deleted && conversation.User2Deleted)
            {
                _db.Conversations.Remove(conversation);
            }

            await _db.SaveChangesAsync();

            return Ok(new { message = "Đã xóa cuộc trò chuyện khỏi danh sách của bạn." });
        }

    }
}
