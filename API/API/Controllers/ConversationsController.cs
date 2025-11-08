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
    public class ConversationsController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly IHubContext<ChatHub> _hubContext;

        public ConversationsController(DataContext context, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet("my-conversations")]
        public async Task<IActionResult> GetMyConversations()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user id" });
            }

            var conversations = await _context.ConversationParticipants
                .Where(cp => cp.UserId == userId)
                .Include(cp => cp.Conversation)
                    .ThenInclude(c => c.Participants)
                        .ThenInclude(p => p.User)
                .Include(cp => cp.Conversation)
                    .ThenInclude(c => c.Messages)
                        .ThenInclude(m => m.Sender)
                .Select(cp => new ConversationResponseDto
                {
                    Id = cp.Conversation.Id,
                    CreatedAt = cp.Conversation.CreatedAt,
                    LastMessage = cp.Conversation.Messages
                        .OrderByDescending(m => m.CreatedAt)
                        .Select(m => new MessageResponseDto
                        {
                            Id = m.Id,
                            Content = m.Content,
                            MessageType = m.MessageType,
                            CreatedAt = m.CreatedAt,
                            SenderId = m.SenderId,
                            SenderAvatar = m.Sender.Avatar
                        })
                        .FirstOrDefault(),
                    Participants = cp.Conversation.Participants
                        .Select(p => new ParticipantResponseDto
                        {
                            UserId = p.UserId,
                            Username = p.User.Name,
                            AvatarUrl = p.User.Avatar,
                            IsOnline = p.User.IsOnline,
                            JoinedAt = p.JoinedAt,
                            Email = p.User.Email,
                            Location = p.User.Location,
                            Bio = p.User.Bio,
                            PhoneNumber = p.User.PhoneNumber,
                            DateBirth = p.User.DateBirth
                        })
                        .ToList(),
                    UnreadCount = _context.Messages
                        .Count(m => m.ConversationId == cp.ConversationId &&
                                   m.SenderId != userId &&
                                   !_context.MessageReadReceipts.Any(r => r.MessageId == m.Id && r.UserId == userId))
                })
                .OrderByDescending(c => c.LastMessage.CreatedAt)
                .ToListAsync();

            return Ok(conversations);
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateConversation([FromBody] CreateConversationDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user id" });
            }

            if (dto.ParticipantIds == null || !dto.ParticipantIds.Any())
            {
                return BadRequest(new { message = "At least one participant is required" });
            }

            // Thêm bản thân người tạo vào danh sách nếu chưa có
            if (!dto.ParticipantIds.Contains(userId))
            {
                dto.ParticipantIds.Add(userId);
            }

            // ✅ Kiểm tra nếu đã tồn tại cuộc trò chuyện 1-1 giữa 2 người (không phải group)
            if (dto.ParticipantIds.Count == 2)
            {
                var existingConversation = await _context.Conversations
                    .Include(c => c.Participants)
                    .Where(c => c.Participants.Count == 2 &&
                                c.Participants.All(p => dto.ParticipantIds.Contains(p.UserId)))
                    .FirstOrDefaultAsync();

                if (existingConversation != null)
                {
                    return Ok(new
                    {
                        conversationId = existingConversation.Id,
                        message = "Conversation already exists"
                    });
                }
            }

            // ✅ Nếu không tồn tại thì tạo mới
            var conversation = new Conversation
            {
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Conversations.Add(conversation);
            await _context.SaveChangesAsync();

            foreach (var participantId in dto.ParticipantIds)
            {
                var participant = new ConversationParticipant
                {
                    ConversationId = conversation.Id,
                    UserId = participantId,
                    JoinedAt = DateTime.UtcNow,
                };

                _context.ConversationParticipants.Add(participant);
            }

            await _context.SaveChangesAsync();

            // Gửi sự kiện SignalR cho tất cả người tham gia
            await _hubContext.Clients.Users(dto.ParticipantIds.Select(id => id.ToString()))
                .SendAsync("ConversationCreated", new { conversationId = conversation.Id });

            return Ok(new
            {
                conversationId = conversation.Id,
                message = "Conversation created successfully"
            });
        }


        [HttpPost("{conversationId}/add-participants")]
        public async Task<IActionResult> AddParticipants(int conversationId, [FromBody] AddParticipantsDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user id" });
            }

            var conversation = await _context.Conversations
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conversation == null)
            {
                return NotFound(new { message = "Conversation not found" });
            }

            var currentParticipant = conversation.Participants.FirstOrDefault(p => p.UserId == userId);

            if (currentParticipant == null)
            {
                return Forbid();
            }

            foreach (var participantId in dto.ParticipantIds)
            {
                if (!conversation.Participants.Any(p => p.UserId == participantId))
                {
                    var participant = new ConversationParticipant
                    {
                        ConversationId = conversationId,
                        UserId = participantId,
                        JoinedAt = DateTime.UtcNow,
                    };

                    _context.ConversationParticipants.Add(participant);
                }
            }

            await _context.SaveChangesAsync();

            var allParticipantIds = conversation.Participants
    .Select(p => p.UserId)
    .Concat(dto.ParticipantIds)
    .Distinct()
    .Select(id => id.ToString())
    .ToList();
            await _hubContext.Clients.Users(allParticipantIds)
                .SendAsync("ParticipantsAdded", new { conversationId, newParticipantIds = dto.ParticipantIds });

            return Ok(new { message = "Participants added successfully" });
        }

        [HttpPost("{conversationId}/leave")]
        public async Task<IActionResult> LeaveConversation(int conversationId)
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
                return NotFound(new { message = "You are not a participant in this conversation" });
            }

            _context.ConversationParticipants.Remove(participant);
            await _context.SaveChangesAsync();

            var remainingParticipantIds = await _context.ConversationParticipants
                .Where(cp => cp.ConversationId == conversationId)
                .Select(cp => cp.UserId.ToString())
                .ToListAsync();

            await _hubContext.Clients.Users(remainingParticipantIds)
                .SendAsync("ParticipantLeft", new { conversationId, userId });

            return Ok(new { message = "Left conversation successfully" });
        }

        [HttpGet("{conversationId}/details")]
        public async Task<IActionResult> GetConversationDetails(int conversationId)
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

            var conversation = await _context.Conversations
                .Include(c => c.Participants)
                    .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conversation == null)
            {
                return NotFound(new { message = "Conversation not found" });
            }

            return Ok(new ConversationDetailsResponseDto
            {
                Id = conversation.Id,
                CreatedAt = conversation.CreatedAt,
                Participants = conversation.Participants
                    .Select(p => new ParticipantResponseDto
                    {
                        UserId = p.UserId,
                        Username = p.User.Name,
                        AvatarUrl = p.User.Avatar,
                        IsOnline = p.User.IsOnline,
                        JoinedAt = p.JoinedAt,
                        Email = p.User.Email,
                        Location = p.User.Location,
                        Bio = p.User.Bio,
                        PhoneNumber = p.User.PhoneNumber,
                        DateBirth = p.User.DateBirth
                    })
                    .ToList()
            });
        }

        [HttpPut("{conversationId}/nickname")]
        public async Task<IActionResult> UpdateNickname(int conversationId, [FromBody] UpdateNicknameDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user id" });
            }

            // ✅ Kiểm tra người dùng có trong cuộc trò chuyện hay không
            var participant = await _context.ConversationParticipants
                .FirstOrDefaultAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

            if (participant == null)
            {
                return Forbid();
            }

            // ✅ Cập nhật biệt danh
            participant.Nickname = string.IsNullOrWhiteSpace(dto.Nickname) ? null : dto.Nickname.Trim();
            await _context.SaveChangesAsync();

            // ✅ Gửi tín hiệu real-time qua SignalR (tùy chọn)
            await _hubContext.Clients.User(conversationId.ToString())
                .SendAsync("NicknameUpdated", new
                {
                    conversationId,
                    userId,
                    nickname = participant.Nickname
                });

            return Ok(new
            {
                message = "Nickname updated successfully",
                nickname = participant.Nickname
            });
        }
    }
}
