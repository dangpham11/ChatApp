using System;

namespace API.DTOs
{
    public class PinnedMessageResponseDto
    {
        public int MessageId { get; set; }
        public string? Content { get; set; }
        public string? MessageType { get; set; }
        public string? SenderName { get; set; }
        public string? PinnedByName { get; set; }
        public DateTime PinnedAt { get; set; }
    }
}
