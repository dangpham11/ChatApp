using API.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface IMessageService
{
    Task<Message> CreateMessageAsync(Message message);
    Task<IEnumerable<Message>> GetConversationAsync(int userId, int otherUserId, int take = 50);
}
