using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.Entities;

public class Message
{
    public int Id { get; set; }
    public string Content { get; set; }
    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    public int GroupChatId { get; set; }
    public GroupChat GroupChat { get; set; }

    public int SenderId { get; set; }
    public AppUser Sender { get; set; }
}

