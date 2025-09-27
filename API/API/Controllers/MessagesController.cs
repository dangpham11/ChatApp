using API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using API.Entities;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IMessageService _messageService;
    private readonly DataContext _db;

    public MessagesController(IMessageService messageService, DataContext db)
    {
        _messageService = messageService;
        _db = db;
    }

    // =============================
    // 1. Gửi tin nhắn
    // =============================
    [HttpPost]
    public async Task<IActionResult> CreateMessage([FromBody] CreateMessageDto dto)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        if ((dto.ReceiverId == null && dto.GroupId == null) ||
            (dto.ReceiverId != null && dto.GroupId != null))
        {
            return BadRequest("Chỉ được chọn ReceiverId (chat riêng) hoặc GroupId (chat nhóm).");
        }

        if (dto.GroupId.HasValue)
        {
            var groupExists = await _db.Groups.FindAsync(dto.GroupId.Value);
            if (groupExists == null)
                return BadRequest("Group không tồn tại.");
        }

        var message = new Message
        {
            SenderId = userId,
            ReceiverId = dto.ReceiverId,
            GroupId = dto.GroupId,
            Content = dto.Content,
            MessageType = dto.MessageType,
            FileUrl = dto.FileUrl
        };

        var saved = await _messageService.CreateMessageAsync(message);

        var resultDto = new MessageDto
        {
            Id = saved.Id,
            SenderId = saved.SenderId,
            SenderUserName = User.Identity?.Name ?? string.Empty,
            ReceiverId = saved.ReceiverId,
            GroupId = saved.GroupId,
            Content = saved.Content,
            MessageType = saved.MessageType,
            FileUrl = saved.FileUrl,
            IsRead = saved.IsRead,
            CreatedAt = saved.CreatedAt
        };

        return CreatedAtAction(nameof(GetMessage), new { id = saved.Id }, resultDto);
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

        // Nếu user đã xóa thì không thấy nữa
        bool deleted = await _db.MessageDeletions
            .AnyAsync(md => md.UserId == userId && md.MessageId == id);
        if (deleted) return NotFound();

        return Ok(new MessageDto
        {
            Id = msg.Id,
            SenderId = msg.SenderId,
            SenderUserName = (await _db.Users.FindAsync(msg.SenderId))?.UserName ?? string.Empty,
            ReceiverId = msg.ReceiverId,
            GroupId = msg.GroupId,
            Content = msg.Content,
            MessageType = msg.MessageType,
            FileUrl = msg.FileUrl,
            IsRead = msg.IsRead,
            CreatedAt = msg.CreatedAt
        });
    }

    // =============================
    // 3. Lấy hội thoại giữa 2 user
    // =============================
    [HttpGet("with/{otherUserId}")]
    public async Task<IActionResult> GetConversation(int otherUserId)
    {
        int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var msgs = await _messageService.GetConversationAsync(userId, otherUserId);

        var deletedIds = await _db.MessageDeletions
            .Where(md => md.UserId == userId)
            .Select(md => md.MessageId)
            .ToListAsync();

        msgs = msgs.Where(m => !deletedIds.Contains(m.Id)).ToList();

        var dtos = msgs.Select(m => new MessageDto
        {
            Id = m.Id,
            SenderId = m.SenderId,
            SenderUserName = _db.Users.Find(m.SenderId)?.UserName ?? string.Empty,
            ReceiverId = m.ReceiverId,
            GroupId = m.GroupId,
            Content = m.Content,
            MessageType = m.MessageType,
            FileUrl = m.FileUrl,
            IsRead = m.IsRead,
            CreatedAt = m.CreatedAt
        });

        return Ok(dtos);
    }

    // =============================
    // 4. Lấy tin nhắn nhóm
    // =============================
    [HttpGet("group/{groupId}")]
    public async Task<IActionResult> GetGroupMessages(int groupId, int take = 50)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var msgs = await _messageService.GetGroupMessagesAsync(groupId, take);

        var deletedIds = await _db.MessageDeletions
            .Where(md => md.UserId == userId)
            .Select(md => md.MessageId)
            .ToListAsync();

        msgs = msgs.Where(m => !deletedIds.Contains(m.Id)).ToList();

        var dtos = msgs.Select(m => new MessageDto
        {
            Id = m.Id,
            SenderId = m.SenderId,
            SenderUserName = _db.Users.Find(m.SenderId)?.UserName ?? string.Empty,
            ReceiverId = m.ReceiverId,
            GroupId = m.GroupId,
            Content = m.Content,
            MessageType = m.MessageType,
            FileUrl = m.FileUrl,
            IsRead = m.IsRead,
            CreatedAt = m.CreatedAt
        });

        return Ok(dtos);
    }

    // =============================
    // 5. Thu hồi tin nhắn (mọi người đều mất)
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
    // 6. Xóa tin nhắn (cục bộ)
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
    // 7. Xóa toàn bộ cuộc hội thoại (cục bộ)
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

    // =============================
    // 8. Xóa toàn bộ tin nhắn nhóm (cục bộ)
    // =============================
    [HttpDelete("group/{groupId}")]
    public async Task<IActionResult> DeleteGroupMessages(int groupId)
    {
        int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var messages = await _db.Messages
            .Where(m => m.GroupId == groupId)
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

        return Ok("Đã xóa toàn bộ tin nhắn trong nhóm (chỉ bạn không thấy).");
    }
}
