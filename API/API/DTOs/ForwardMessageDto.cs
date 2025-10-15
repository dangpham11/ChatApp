using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class ForwardMessageDto
    {
        public int? ForwardedFromId { get; set; }
        public string? ForwardedFrom { get; set; } 
        public int OriginalMessageId { get; set; } // ID tin nhắn gốc
        public List<int> ConversationIds { get; set; } = new();
    }
}
