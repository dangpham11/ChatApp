using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;

namespace API.Entities
{
    public class Message
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }
        public int SenderId { get; set; }
        public string Content { get; set; } = null!;
        public string MessageType { get; set; } = "text";
        public string? FileUrl { get; set; }
        public long? FileSize { get; set; }
        public string? ThumbnailUrl { get; set; }
        public double? Duration { get; set; }
        public string? FileName { get; set; }
        public int? VoiceDuration { get; set; }
        [Precision(9, 6)]
        public decimal LocationLatitude { get; set; }

        [Precision(9, 6)]
        public decimal LocationLongitude { get; set; }
        public string? LocationAddress { get; set; }
        public bool IsEdited { get; set; } = false;
        public bool IsRecalled { get; set; } = false;
        public bool IsDeleted { get; set; } = false;
        public int? ReplyToMessageId { get; set; }
        public int? ForwardedFromUserId { get; set; }
        public DateTime? ForwardedFromTimestamp { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation
        public Conversation Conversation { get; set; } = null!;
        public User Sender { get; set; } = null!;
        public Message? ReplyToMessage { get; set; }
        public User? ForwardedFromUser { get; set; }

        public ICollection<Message> Replies { get; set; } = new List<Message>();
        public ICollection<MessageReadReceipt> ReadReceipts { get; set; } = new List<MessageReadReceipt>();
        public ICollection<MessageReaction> Reactions { get; set; } = new List<MessageReaction>();
        public ICollection<PinnedMessage> PinnedMessages { get; set; } = new List<PinnedMessage>();
        public ICollection<MessageEditHistory> EditHistory { get; set; } = new List<MessageEditHistory>();
    }
}
