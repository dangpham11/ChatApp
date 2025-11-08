using System;

namespace API.DTOs
{
    public class CreateMessageDto
    {
        public int ConversationId { get; set; }
        public string Content { get; set; } = null!; // text content or caption for media
        public string MessageType { get; set; } = null!; // text, image, file, etc
        public string? FileUrl { get; set; }
        public string? FileName { get; set; }
        public long? FileSize { get; set; }
        public string? ThumbnailUrl { get; set; }
        public double? Duration { get; set; } // for audio/video messages
        public int? ReplyToMessageId { get; set; } 
    }
}
