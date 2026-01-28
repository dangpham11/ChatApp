using API.Data;
using API.DTOs;
using API.Entities;
using API.SignaIR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MessagesController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly IHubContext<ChatHub> _hubContext;

        public MessagesController(DataContext context, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet("conversation/{conversationId}")]
        public async Task<IActionResult> GetMessages(int conversationId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user id" });
            }

            var participant = await _context.ConversationParticipants
                .FirstOrDefaultAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

            if (participant == null)
            {
                return Forbid();
            }

            var clearedAt = await _context.ConversationClears
        .Where(c => c.ConversationId == conversationId && c.UserId == userId)
        .Select(c => (DateTime?)c.ClearedAt)
        .FirstOrDefaultAsync();

            // ✅ QUERY GỐC
            var query = _context.Messages
                .Where(m => m.ConversationId == conversationId && !m.IsDeleted);

            // ✅ FILTER THEO CLEARED AT
            if (clearedAt != null)
            {
                query = query.Where(m => m.CreatedAt > clearedAt.Value);
            }

            var messages = await _context.Messages
    .Where(m => m.ConversationId == conversationId && !m.IsDeleted)
    .Include(m => m.Sender)
    .Include(m => m.ReadReceipts)
    .Include(m => m.Reactions)
        .ThenInclude(r => r.User)
    .Include(m => m.ReplyToMessage)
        .ThenInclude(rt => rt.Sender)
    .OrderByDescending(m => m.CreatedAt)
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    .Select(m => new MessageResponseDto
    {
        Id = m.Id,
        ConversationId = m.ConversationId,
        SenderId = m.SenderId,
        SenderName = m.Sender.Name,
        SenderAvatar = m.Sender.Avatar,
        Content = m.Content,
        MessageType = m.MessageType,
        FileUrl = m.FileUrl,
        FileName = m.FileName,
        FileSize = m.FileSize,
        ThumbnailUrl = m.ThumbnailUrl,
        Duration = m.Duration,
        Location = m.MessageType == "location"
            ? new LocationDto
            {
                Latitude = (double)m.LocationLatitude,
                Longitude = (double)m.LocationLongitude,
                Address = m.LocationAddress
            }
            : null,
        CreatedAt = m.CreatedAt,
        IsEdited = m.IsEdited,
        EditedAt = m.UpdatedAt,
        IsPinned = _context.PinnedMessages.Any(pm => pm.MessageId == m.Id),
        ReplyToMessageId = m.ReplyToMessageId,
        ReplyToMessage = m.ReplyToMessage != null
            ? new MessageResponseDto
            {
                Id = m.ReplyToMessage.Id,
                Content = m.ReplyToMessage.Content,
                MessageType = m.ReplyToMessage.MessageType,
                SenderId = m.ReplyToMessage.SenderId,
                SenderName = m.ReplyToMessage.Sender.Name,
                SenderAvatar = m.ReplyToMessage.Sender.Avatar
            }
            : null,
        ReadReceipts = m.ReadReceipts.Select(rr => new ReadReceiptResponseDto
        {
            UserId = rr.UserId,
            ReadAt = rr.ReadAt
        }).ToList(),
        Reactions = m.Reactions.Select(r => new ReactionResponseDto
        {
            Id = r.Id,
            Emoji = r.Emoji,
            UserId = r.UserId,
            Username = r.User.Name,
            CreatedAt = r.CreatedAt
        }).ToList()
    })
    .ToListAsync();

            messages.Reverse();

            return Ok(messages);
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] CreateMessageDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { message = "Invalid user id" });

            var participant = await _context.ConversationParticipants
                .FirstOrDefaultAsync(cp => cp.ConversationId == dto.ConversationId && cp.UserId == userId);

            if (participant == null)
                return Forbid();

            // Nếu reply, kiểm tra message gốc có tồn tại
            int? replyToMessageId = null;
            if (dto.ReplyToMessageId.HasValue)
            {
                var parentExists = await _context.Messages
                    .AnyAsync(m => m.Id == dto.ReplyToMessageId.Value);
                if (parentExists)
                    replyToMessageId = dto.ReplyToMessageId;
                // Nếu không tồn tại, để null (không lỗi)
            }


            var message = new Message
            {
                ConversationId = dto.ConversationId,
                SenderId = userId,
                Content = dto.Content,
                MessageType = dto.MessageType,
                FileUrl = dto.FileUrl,
                FileName = dto.FileName,
                FileSize = dto.FileSize,
                ThumbnailUrl = dto.ThumbnailUrl,
                Duration = dto.Duration,
                ReplyToMessageId = replyToMessageId, // <-- gán nullable
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false,
                IsEdited = false
            };
            if (dto.MessageType == "location" && dto.Location != null)
            {
                message.LocationLatitude = (decimal)dto.Location.Latitude;
                message.LocationLongitude = (decimal)dto.Location.Longitude;
                message.LocationAddress = dto.Location.Address;
            }


            _context.Messages.Add(message);
            await _context.SaveChangesAsync();
            Message? replyToMessage = null;

            if (message.ReplyToMessageId.HasValue)
            {
                replyToMessage = await _context.Messages
                    .Include(m => m.Sender)
                    .FirstOrDefaultAsync(m => m.Id == message.ReplyToMessageId.Value);
            }

            var sender = await _context.Users.FindAsync(userId);

            var messageResponse = new MessageResponseDto
            {
                Id = message.Id,
                ConversationId = message.ConversationId,
                SenderId = message.SenderId,
                SenderName = sender!.Name,
                SenderAvatar = sender.Avatar,
                Content = message.Content,
                MessageType = message.MessageType,
                FileUrl = message.FileUrl,
                FileName = message.FileName,
                FileSize = message.FileSize,
                ThumbnailUrl = message.ThumbnailUrl,
                Duration = message.Duration,
                CreatedAt = message.CreatedAt,
                IsEdited = false,
                IsPinned = false,
                ReplyToMessageId = message.ReplyToMessageId,
                ReplyToMessage = replyToMessage != null
        ? new MessageResponseDto
        {
            Id = replyToMessage.Id,
            Content = replyToMessage.Content,
            MessageType = replyToMessage.MessageType,
            SenderId = replyToMessage.SenderId,
            SenderName = replyToMessage.Sender.Name,
            SenderAvatar = replyToMessage.Sender.Avatar
        }
        : null,
                ReadReceipts = new List<ReadReceiptResponseDto>(),
                Reactions = new List<ReactionResponseDto>()
            };

            var participantIds = await _context.ConversationParticipants
                .Where(cp => cp.ConversationId == dto.ConversationId)
                .Select(cp => cp.UserId.ToString())
                .ToListAsync();

            await _hubContext.Clients.Users(participantIds)
    .SendAsync("NewMessage", messageResponse);
            await _hubContext.Clients.Users(participantIds)
                .SendAsync("ConversationUpdated", new
        {
            conversationId = message.ConversationId,
            lastMessage = message.Content,
            lastMessageTime = message.CreatedAt,
            senderId = message.SenderId,
            senderName = sender.Name,
            senderAvatar = sender.Avatar
        });
            return Ok(messageResponse);
        }

        [HttpPut("{messageId}/edit")]
        public async Task<IActionResult> EditMessage(int messageId, [FromBody] EditMessageDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user id" });
            }

            var message = await _context.Messages.FindAsync(messageId);

            if (message == null || message.IsDeleted)
            {
                return NotFound(new { message = "Message not found" });
            }

            if (message.SenderId != userId)
            {
                return Forbid();
            }

            var editHistory = new MessageEditHistory
            {
                MessageId = messageId,
                PreviousContent = message.Content,
                UpdatedAt = DateTime.UtcNow
            };

            _context.MessageEditHistories.Add(editHistory);

            message.Content = dto.NewContent;
            message.IsEdited = true;
            message.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var participantIds = await _context.ConversationParticipants
                .Where(cp => cp.ConversationId == message.ConversationId)
                .Select(cp => cp.UserId.ToString())
                .ToListAsync();

            await _hubContext.Clients.Users(participantIds)
                .SendAsync("MessageEdited", new { messageId, newContent = dto.NewContent, editedAt = message.UpdatedAt });

            return Ok(new { message = "Message edited successfully" });
        }

        [HttpDelete("{messageId}/recall")]
        public async Task<IActionResult> RecallMessage(int messageId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user id" });
            }

            var message = await _context.Messages.FindAsync(messageId);

            if (message == null || message.IsDeleted)
            {
                return NotFound(new { message = "Message not found" });
            }

            if (message.SenderId != userId)
            {
                return Forbid();
            }

            message.IsDeleted = true;
            message.Content = "Message was recalled";
            await _context.SaveChangesAsync();

            var participantIds = await _context.ConversationParticipants
                .Where(cp => cp.ConversationId == message.ConversationId)
                .Select(cp => cp.UserId.ToString())
                .ToListAsync();

            await _hubContext.Clients.Users(participantIds)
                .SendAsync("MessageRecalled", new { messageId });

            return Ok(new { message = "Message recalled successfully" });
        }

        [HttpPost("{messageId}/react")]
        public async Task<IActionResult> ReactToMessage(int messageId, [FromBody] ReactDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { message = "Invalid user id" });

            var message = await _context.Messages
                .Include(m => m.Conversation)
                    .ThenInclude(c => c.Participants)
                .FirstOrDefaultAsync(m => m.Id == messageId);

            if (message == null || message.IsDeleted)
                return NotFound(new { message = "Message not found" });

            if (!message.Conversation.Participants.Any(p => p.UserId == userId))
                return Forbid();

            // 🔥 STEP 2: check existing reaction
            var existingReaction = await _context.MessageReactions
                .FirstOrDefaultAsync(r =>
                    r.MessageId == messageId &&
                    r.UserId == userId &&
                    r.Emoji == dto.Emoji
                );

            // 🔥 STEP 3: toggle
            if (existingReaction != null)
            {
                _context.MessageReactions.Remove(existingReaction);
            }
            else
            {
                _context.MessageReactions.Add(new MessageReaction
                {
                    MessageId = messageId,
                    UserId = userId,
                    Emoji = dto.Emoji,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            // 🔥 reload reactions
            var reactions = await _context.MessageReactions
                .Where(r => r.MessageId == messageId)
                .Include(r => r.User)
                .Select(r => new ReactionResponseDto
                {
                    Id = r.Id,
                    Emoji = r.Emoji,
                    UserId = r.UserId,
                    Username = r.User.Name,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();

            var participantIds = message.Conversation.Participants
                .Select(p => p.UserId.ToString())
                .ToList();

            await _hubContext.Clients.Users(participantIds)
                .SendAsync("MessageReactionUpdated", new
                {
                    messageId,
                    reactions
                });

            return Ok();
        }

        [HttpPost("forward")]
public async Task<IActionResult> ForwardMessage([FromBody] ForwardDto dto)
{
    var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        return Unauthorized();

    var sender = await _context.Users.FindAsync(userId);
    if (sender == null) return Unauthorized();

    var originalMessage = await _context.Messages.FindAsync(dto.MessageId);
    if (originalMessage == null || originalMessage.IsDeleted)
        return NotFound("Original message not found");

    foreach (var conversationId in dto.TargetConversationIds)
    {
        // ✅ check participant
        var isParticipant = await _context.ConversationParticipants
            .AnyAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

        if (!isParticipant) continue;

        // =========================
        // 1️⃣ CREATE NEW MESSAGE (copy)
        // =========================
        var message = new Message
        {
            ConversationId = conversationId,
            SenderId = userId,

            Content = originalMessage.Content,
            MessageType = originalMessage.MessageType,
            FileUrl = originalMessage.FileUrl,
            FileName = originalMessage.FileName,
            FileSize = originalMessage.FileSize,
            ThumbnailUrl = originalMessage.ThumbnailUrl,
            Duration = originalMessage.Duration,

            ForwardedFromUserId = originalMessage.SenderId,
            ForwardedFromTimestamp = originalMessage.CreatedAt,

            CreatedAt = DateTime.UtcNow,
            IsDeleted = false,
            IsEdited = false
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        // =========================
        // 2️⃣ BUILD DTO (giống SendMessage)
        // =========================
        var messageDto = new MessageResponseDto
        {
            Id = message.Id,
            ConversationId = conversationId,
            SenderId = userId,
            SenderName = sender.Name,
            SenderAvatar = sender.Avatar,

            Content = message.Content,
            MessageType = message.MessageType,
            FileUrl = message.FileUrl,
            FileName = message.FileName,
            FileSize = message.FileSize,
            ThumbnailUrl = message.ThumbnailUrl,

            CreatedAt = message.CreatedAt,
            IsEdited = false,
            IsPinned = false,

            ForwardedFromUserId = message.ForwardedFromUserId,
            ForwardedFromTimestamp = message.ForwardedFromTimestamp,

            ReadReceipts = new(),
            Reactions = new()
        };

        // =========================
        // 3️⃣ SIGNALR (Y HỆT SEND)
        // =========================
        var participantIds = await _context.ConversationParticipants
            .Where(p => p.ConversationId == conversationId)
            .Select(p => p.UserId.ToString())
            .ToListAsync();

        await _hubContext.Clients.Users(participantIds)
            .SendAsync("NewMessage", messageDto);

        await _hubContext.Clients.Users(participantIds)
            .SendAsync("ConversationUpdated", new
            {
                conversationId,
                lastMessage = message.Content,
                lastMessageTime = message.CreatedAt,
                senderId = sender.Id,
                senderName = sender.Name,
                senderAvatar = sender.Avatar
            });
    }

    return Ok(new { message = "Message forwarded successfully" });
}



        [HttpPost("{messageId}/pin")]
        public async Task<IActionResult> PinMessage(int messageId, [FromBody] PinMessageDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user id" });
            }

            var message = await _context.Messages
                .Include(m => m.Conversation)
                    .ThenInclude(c => c.Participants)
                .FirstOrDefaultAsync(m => m.Id == messageId);

            if (message == null || message.IsDeleted)
            {
                return NotFound(new { message = "Message not found" });
            }

            var participant = message.Conversation.Participants.FirstOrDefault(p => p.UserId == userId);

            var existingPin = await _context.PinnedMessages
                .FirstOrDefaultAsync(pm => pm.MessageId == messageId);

            if (dto.IsPinned)
            {
                if (existingPin == null)
                {
                    var pinnedMessage = new PinnedMessage
                    {
                        MessageId = messageId,
                        ConversationId = message.ConversationId,
                        PinnedByUserId = userId,
                        PinnedAt = DateTime.UtcNow
                    };

                    _context.PinnedMessages.Add(pinnedMessage);
                    await _context.SaveChangesAsync();

                    var participantIds = message.Conversation.Participants.Select(p => p.UserId.ToString()).ToList();
                    await _hubContext.Clients.Users(participantIds)
                        .SendAsync("MessagePinned", new { messageId, conversationId = message.ConversationId });
                }
            }
            else
            {
                if (existingPin != null)
                {
                    _context.PinnedMessages.Remove(existingPin);
                    await _context.SaveChangesAsync();

                    var participantIds = message.Conversation.Participants.Select(p => p.UserId.ToString()).ToList();
                    await _hubContext.Clients.Users(participantIds)
                        .SendAsync("MessageUnpinned", new { messageId, conversationId = message.ConversationId });
                }
            }

            return Ok(new { message = dto.IsPinned ? "Message pinned successfully" : "Message unpinned successfully" });
        }

        [HttpGet("conversation/{conversationId}/pinned")]
        public async Task<IActionResult> GetPinnedMessages(int conversationId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user id" });
            }

            var participant = await _context.ConversationParticipants
                .FirstOrDefaultAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

            if (participant == null)
            {
                return Forbid();
            }

            var pinnedMessages = await _context.PinnedMessages
                .Where(pm => pm.ConversationId == conversationId)
                .Include(pm => pm.Message)
                    .ThenInclude(m => m.Sender)
                .Include(pm => pm.PinnedByUser)
                .Select(pm => new PinnedMessageResponseDto
                {
                    MessageId = pm.MessageId,
                    Content = pm.Message.Content,
                    MessageType = pm.Message.MessageType,
                    SenderName = pm.Message.Sender.Name,
                    PinnedByName = pm.PinnedByUser.Name,
                    PinnedAt = pm.PinnedAt
                })
                .ToListAsync();

            return Ok(pinnedMessages);
        }
    }
}
