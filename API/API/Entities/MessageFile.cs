using System;

namespace API.Entities
{
    public class MessageFile
    {
        public int Id { get; set; }
        public int MessageId { get; set; }
        public Message Message { get; set; } = null!;

        public string FileUrl { get; set; } = string.Empty;
        public string FileType { get; set; } = "image"; // image | file
        public string FileName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
