using System;
using System.Collections.Generic;

namespace API.DTOs
{
    public class MessageResponseDto
    {
        public int Id { get; set; }
        public int ConversationId { get; set; }
        public int SenderId { get; set; }
        public string? SenderName { get; set; } 
        public string? SenderAvatar { get; set; }
        public string? Content { get; set; }
        public string? MessageType { get; set; }
        public string? FileUrl { get; set; }
        public string? FileName { get; set; }
        public long? FileSize { get; set; }
        public string? ThumbnailUrl { get; set; }
        public double? Duration { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsEdited { get; set; }
        public DateTime? EditedAt { get; set; }
        public bool IsPinned { get; set; }
        public int? ReplyToMessageId { get; set; }
        public MessageResponseDto? ReplyToMessage { get; set; }
        public List<ReadReceiptResponseDto> ReadReceipts { get; set; } = new();
        public List<ReactionResponseDto> Reactions { get; set; } = new();
    }

    public class ReadReceiptResponseDto
    {
        public int UserId { get; set; }
        public string? Name { get; set; }
        public string? Avatar { get; set; }
        public DateTime ReadAt { get; set; }
    }

    public class ReactionResponseDto
    {
        public int Id { get; set; }
        public string Emoji { get; set; } = null!;
        public int UserId { get; set; }
        public string? Username { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
