using API.Data;
using Microsoft.EntityFrameworkCore;
using API.Entities;

public class MessageService : IMessageService
{
    private readonly DataContext _db;

    public MessageService(DataContext db)
    {
        _db = db;
    }

    // Tạo tin nhắn mới
    public async Task<Message> CreateMessageAsync(Message message)
    {
        _db.Messages.Add(message);
        await _db.SaveChangesAsync();
        return message;
    }
}
