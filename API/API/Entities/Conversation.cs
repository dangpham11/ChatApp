using System;
using System.Collections.Generic;

namespace API.Entities
{
    public class Conversation
    {
        public int Id { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        public ICollection<ConversationParticipant> Participants { get; set; } = new List<ConversationParticipant>();
        public ICollection<Message> Messages { get; set; } = new List<Message>();
        public ICollection<PinnedMessage> PinnedMessages { get; set; } = new List<PinnedMessage>();
    }
}
