using API.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface IMessageService
{
    Task<Message> CreateMessageAsync(Message message);
}
