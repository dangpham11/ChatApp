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

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

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
                ReadReceipts = new List<ReadReceiptResponseDto>(),
                Reactions = new List<ReactionResponseDto>()
            };

            var participantIds = await _context.ConversationParticipants
                .Where(cp => cp.ConversationId == dto.ConversationId)
                .Select(cp => cp.UserId.ToString())
                .ToListAsync();

            var senderId = message.SenderId.ToString();
            var recipients = participantIds.Where(id => id != senderId).ToList();
            await _hubContext.Clients.Users(recipients).SendAsync("NewMessage", messageResponse);
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

            if (!message.Conversation.Participants.Any(p => p.UserId == userId))
            {
                return Forbid();
            }

            var existingReaction = await _context.MessageReactions
                .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId && r.Emoji == dto.Emoji);

            if (existingReaction != null)
            {
                _context.MessageReactions.Remove(existingReaction);
                await _context.SaveChangesAsync();

                var participantIds = message.Conversation.Participants.Select(p => p.UserId.ToString()).ToList();
                await _hubContext.Clients.Users(participantIds)
                    .SendAsync("ReactionRemoved", new { messageId, userId, emoji = dto.Emoji });

                return Ok(new { message = "Reaction removed" });
            }

            var reaction = new MessageReaction
            {
                MessageId = messageId,
                UserId = userId,
                Emoji = dto.Emoji,
                CreatedAt = DateTime.UtcNow
            };

            _context.MessageReactions.Add(reaction);
            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(userId);

            var participantIdsForReaction = message.Conversation.Participants.Select(p => p.UserId.ToString()).ToList();
            await _hubContext.Clients.Users(participantIdsForReaction)
                .SendAsync("ReactionAdded", new
                {
                    messageId,
                    reaction = new ReactionResponseDto
                    {
                        Id = reaction.Id,
                        Emoji = reaction.Emoji,
                        UserId = userId,
                        Username = user!.Name,
                        CreatedAt = reaction.CreatedAt
                    }
                });

            return Ok(new { message = "Reaction added successfully" });
        }

        [HttpPost("forward")]
        public async Task<IActionResult> ForwardMessage([FromBody] ForwardDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user id" });
            }

            var originalMessage = await _context.Messages.FindAsync(dto.MessageId);

            if (originalMessage == null || originalMessage.IsDeleted)
            {
                return NotFound(new { message = "Original message not found" });
            }

            foreach (var conversationId in dto.TargetConversationIds)
            {
                var participant = await _context.ConversationParticipants
                    .FirstOrDefaultAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

                if (participant == null)
                {
                    continue;
                }

                var forwardedMessage = new Message
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
                    CreatedAt = DateTime.UtcNow,
                    IsDeleted = false,
                    IsEdited = false
                };

                _context.Messages.Add(forwardedMessage);
                await _context.SaveChangesAsync();

                var participantIds = await _context.ConversationParticipants
                    .Where(cp => cp.ConversationId == conversationId)
                    .Select(cp => cp.UserId.ToString())
                    .ToListAsync();

                var sender = await _context.Users.FindAsync(userId);

                var senderIdStr = userId.ToString();
                var recipients = participantIds.Where(id => id != senderIdStr).ToList();

                await _hubContext.Clients.Users(recipients).SendAsync("NewMessage", new MessageResponseDto
                {
                        Id = forwardedMessage.Id,
                        ConversationId = forwardedMessage.ConversationId,
                        SenderId = forwardedMessage.SenderId,
                        SenderName = sender!.Name,
                        SenderAvatar = sender.Avatar,
                        Content = forwardedMessage.Content,
                        MessageType = forwardedMessage.MessageType,
                        FileUrl = forwardedMessage.FileUrl,
                        FileName = forwardedMessage.FileName,
                        CreatedAt = forwardedMessage.CreatedAt
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
