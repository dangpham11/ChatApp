using API.Entities;

public class Message
{
    public int Id { get; set; }
    public int SenderId { get; set; }
    public AppUser Sender { get; set; } = null!;

    // Nếu private message giữa 2 user -> set ReceiverId
    public int? ReceiverId { get; set; }
    public AppUser? Receiver { get; set; }

    // Nếu group message -> set GroupId
    public int? GroupId { get; set; }
    public Group? Group { get; set; }

    public string Content { get; set; } = string.Empty;
    public string MessageType { get; set; } = "text"; // text | image | file
    public string? FileUrl { get; set; } // nếu file/ảnh
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
