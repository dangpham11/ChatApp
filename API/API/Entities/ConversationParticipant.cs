using System;

namespace API.Entities
{
    public class ConversationParticipant
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }
        public int UserId { get; set; }
        public string? Nickname { get; set; }
        public bool IsMuted { get; set; } = false;
        public DateTime? MutedUntil { get; set; }
        public bool IsBlocked { get; set; } = false;
        public int UnreadCount { get; set; } = 0;
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Conversation Conversation { get; set; } = null!;
        public User User { get; set; } = null!;
    }
}
