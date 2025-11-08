using System;

namespace API.Entities
{
    public class PinnedMessage
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }
        public int MessageId { get; set; }
        public int PinnedByUserId { get; set; }
        public DateTime PinnedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Conversation Conversation { get; set; } = null!;
        public Message Message { get; set; } = null!;
        public User PinnedByUser { get; set; } = null!;
    }
}
