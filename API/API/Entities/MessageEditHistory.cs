using System;

namespace API.Entities
{
    public class MessageEditHistory
    {
        public int Id { get; set; }
        public int MessageId { get; set; }
        public Message Message { get; set; } = null!;
        public string OldContent { get; set; } = string.Empty;
        public string NewContent { get; set; } = string.Empty;
        public DateTime EditedAt { get; set; } = DateTime.UtcNow;
    }
}
