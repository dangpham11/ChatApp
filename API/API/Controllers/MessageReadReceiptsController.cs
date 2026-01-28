using API.Data;
using API.DTOs;
using API.Entities;
using API.SignaIR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessageReadReceiptsController : ControllerBase
{
    private readonly DataContext _context;
    private readonly IHubContext<ChatHub> _hubContext;

    public MessageReadReceiptsController(DataContext context, IHubContext<ChatHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpPost("conversation/{conversationId}/mark-read")]
    public async Task<IActionResult> MarkConversationAsRead(int conversationId)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var participant = await _context.ConversationParticipants
            .AnyAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

        if (!participant)
            return Forbid();

        var unreadMessages = await _context.Messages
            .Where(m =>
                m.ConversationId == conversationId &&
                m.SenderId != userId &&
                !m.ReadReceipts.Any(rr => rr.UserId == userId))
            .Select(m => m.Id)
            .ToListAsync();

        if (!unreadMessages.Any())
            return Ok();

        foreach (var messageId in unreadMessages)
        {
            _context.MessageReadReceipts.Add(new MessageReadReceipt
            {
                MessageId = messageId,
                UserId = userId
            });
        }

        await _context.SaveChangesAsync();

        var participantIds = await _context.ConversationParticipants
            .Where(cp => cp.ConversationId == conversationId)
            .Select(cp => cp.UserId.ToString())
            .ToListAsync();

        await _hubContext.Clients.Users(participantIds)
            .SendAsync("MessagesRead", new
            {
                conversationId,
                userId,
                messageIds = unreadMessages
            });

        return Ok();
    }

    [HttpGet("{messageId}/receipts")]
    public async Task<IActionResult> GetReadReceipts(int messageId)
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

        if (message == null)
        {
            return NotFound(new { message = "Message not found" });
        }

        if (!message.Conversation.Participants.Any(p => p.UserId == userId))
        {
            return Forbid();
        }

        var receipts = await _context.MessageReadReceipts
            .Where(r => r.MessageId == messageId)
            .Include(r => r.User)
            .Select(r => new ReadReceiptResponseDto
            {
                UserId = r.UserId,
                Name = r.User.Name,
                Avatar = r.User.Avatar,
                ReadAt = r.ReadAt
            })
            .ToListAsync();

        return Ok(receipts);
    }
}