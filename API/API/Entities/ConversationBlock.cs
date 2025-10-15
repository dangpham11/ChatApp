using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.Entities
{
    public class ConversationBlock
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }
        public Conversation Conversation { get; set; } = null!;

        public int BlockedUserId { get; set; } // user bị chặn
        public AppUser BlockedUser { get; set; } = null!;

        public DateTime BlockedAt { get; set; } = DateTime.UtcNow;
        public int BlockedByUserId { get; set; } // user thực hiện chặn
    }
}
