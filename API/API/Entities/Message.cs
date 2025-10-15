using System;

namespace API.Entities
{
    public class Message
    {
        public int Id { get; set; }
        public int SenderId { get; set; }
        public AppUser Sender { get; set; } = null!;

        public int ReceiverId { get; set; }
        public AppUser Receiver { get; set; } = null!;

        public int ConversationId { get; set; }
        public Conversation Conversation { get; set; } = null!;

        public string Content { get; set; } = string.Empty;
        public string MessageType { get; set; } = "text"; // text | image | file
        public string? FileUrl { get; set; } // nếu là file hoặc ảnh

        public bool IsRead { get; set; } = false;
        public bool IsPinned { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? EditedAt { get; set; }

        public string? VoiceUrl { get; set; }
        public double? VoiceDuration { get; set; }

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }

        public int? ForwardedFromId { get; set; }
        public AppUser? ForwardedFrom { get; set; }

        public int? ReplyToMessageId { get; set; }         // FK
        public Message? ReplyToMessage { get; set; }

        public ICollection<MessageDeletion> MessageDeletions { get; set; } = new List<MessageDeletion>();
        public ICollection<MessageEditHistory> EditHistories { get; set; } = new List<MessageEditHistory>();
        public ICollection<MessageFile> MessageFiles { get; set; } = new List<MessageFile>();
        public ICollection<MessageReaction> Reactions { get; set; } = new List<MessageReaction>();
    }
}
