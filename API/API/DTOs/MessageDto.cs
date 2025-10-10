using API.DTOs;

public class MessageDto
{
    public int Id { get; set; }
    public int SenderId { get; set; }
    public string SenderUserName { get; set; } = null!;
    public int ReceiverId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string MessageType { get; set; } = "text";
    public bool IsRead { get; set; }
    public bool IsPinned { get; set; }
    public DateTime CreatedAt { get; set; }

    public List<MessageFileDto> Files { get; set; } = new();
    public string? VoiceUrl { get; set; }
    public double? VoiceDuration { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? GoogleMapsUrl { get; set; }
}
