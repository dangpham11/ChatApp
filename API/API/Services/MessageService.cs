// Services/MessageService.cs
using API.Data;
using Microsoft.EntityFrameworkCore;

public class MessageService : IMessageService
{
    private readonly DataContext _db;

    public MessageService(DataContext db)
    {
        _db = db;
    }

    public async Task<Message> CreateMessageAsync(Message message)
    {
        _db.Messages.Add(message);
        await _db.SaveChangesAsync();
        return message;
    }

    public async Task<IEnumerable<Message>> GetConversationAsync(int userId, int otherUserId, int take = 50)
    {
        return await _db.Messages
            .Where(m =>
                (m.SenderId == userId && m.ReceiverId == otherUserId) ||
                (m.SenderId == otherUserId && m.ReceiverId == userId))
            .OrderByDescending(m => m.CreatedAt)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<Message>> GetGroupMessagesAsync(int groupId, int take = 50)
    {
        return await _db.Messages
            .Where(m => m.GroupId == groupId)
            .OrderByDescending(m => m.CreatedAt)
            .Take(take)
            .ToListAsync();
    }
}
