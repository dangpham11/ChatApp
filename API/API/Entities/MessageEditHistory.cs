using System;

namespace API.Entities
{
    public class MessageEditHistory
    {
        public int Id { get; set; }
        public int MessageId { get; set; }
        public string PreviousContent { get; set; } = null!;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Message Message { get; set; } = null!;
    }
}
