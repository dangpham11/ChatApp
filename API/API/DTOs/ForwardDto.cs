using System.Collections.Generic;

namespace API.DTOs
{
    public class ForwardDto
    {
        public int MessageId { get; set; }
        public List<int> TargetConversationIds { get; set; } = new();
    }
}
