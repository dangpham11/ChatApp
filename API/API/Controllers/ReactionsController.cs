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
    public class ReactionsController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly IHubContext<ChatHub> _hubContext;

        public ReactionsController(DataContext context, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddReaction([FromBody] ReactionDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user id" });
            }

            var message = await _context.Messages
                .Include(m => m.Conversation)
                    .ThenInclude(c => c.Participants)
                .FirstOrDefaultAsync(m => m.Id == dto.MessageId);

            if (message == null || message.IsDeleted)
            {
                return NotFound(new { message = "Message not found" });
            }

            if (!message.Conversation.Participants.Any(p => p.UserId == userId))
            {
                return Forbid();
            }

            var existingReaction = await _context.MessageReactions
                .FirstOrDefaultAsync(r => r.MessageId == dto.MessageId && r.UserId == userId && r.Emoji == dto.Emoji);

            if (existingReaction != null)
            {
                return BadRequest(new { message = "Reaction already exists" });
            }

            var reaction = new MessageReaction
            {
                MessageId = dto.MessageId,
                UserId = userId,
                Emoji = dto.Emoji,
                CreatedAt = DateTime.UtcNow
            };

            _context.MessageReactions.Add(reaction);
            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(userId);
            var participantIds = message.Conversation.Participants.Select(p => p.UserId.ToString()).ToList();

            await _hubContext.Clients.Users(participantIds)
                .SendAsync("ReactionAdded", new
                {
                    messageId = dto.MessageId,
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

        [HttpDelete("{reactionId}")]
        public async Task<IActionResult> RemoveReaction(int reactionId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user id" });
            }

            var reaction = await _context.MessageReactions
                .Include(r => r.Message)
                    .ThenInclude(m => m.Conversation)
                        .ThenInclude(c => c.Participants)
                .FirstOrDefaultAsync(r => r.Id == reactionId);

            if (reaction == null)
            {
                return NotFound(new { message = "Reaction not found" });
            }

            if (reaction.UserId != userId)
            {
                return Forbid();
            }

            _context.MessageReactions.Remove(reaction);
            await _context.SaveChangesAsync();

            var participantIds = reaction.Message.Conversation.Participants.Select(p => p.UserId.ToString()).ToList();
            await _hubContext.Clients.Users(participantIds)
                .SendAsync("ReactionRemoved", new { messageId = reaction.MessageId, userId, emoji = reaction.Emoji });

            return Ok(new { message = "Reaction removed successfully" });
        }
    }
}


