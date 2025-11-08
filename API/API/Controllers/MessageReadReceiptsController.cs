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

    [HttpPost("{messageId}/mark-read")]
    public async Task<IActionResult> MarkAsRead(int messageId)
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

        var existingReceipt = await _context.MessageReadReceipts
            .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId);

        if (existingReceipt != null)
        {
            return Ok(new { message = "Already marked as read" });
        }

        var readReceipt = new MessageReadReceipt
        {
            MessageId = messageId,
            UserId = userId,
            ReadAt = DateTime.UtcNow
        };

        _context.MessageReadReceipts.Add(readReceipt);
        await _context.SaveChangesAsync();

        var participantIds = message.Conversation.Participants.Select(p => p.UserId.ToString()).ToList();
        await _hubContext.Clients.Users(participantIds)
            .SendAsync("MessageRead", new { messageId, userId, readAt = readReceipt.ReadAt });

        return Ok(new { message = "Message marked as read" });
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