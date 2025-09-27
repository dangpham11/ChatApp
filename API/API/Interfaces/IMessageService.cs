// Interfaces/IMessageService.cs
public interface IMessageService
{
    Task<Message> CreateMessageAsync(Message message);
    Task<IEnumerable<Message>> GetConversationAsync(int userId, int otherUserId, int take = 50);
    Task<IEnumerable<Message>> GetGroupMessagesAsync(int groupId, int take = 50);
}
