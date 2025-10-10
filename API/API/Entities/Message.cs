using API.Entities;
using System;

public class Message
{
    public int Id { get; set; }
    public int SenderId { get; set; }
    public AppUser Sender { get; set; } = null!;

    public int ReceiverId { get; set; }
    public AppUser Receiver { get; set; } = null!;

    public string Content { get; set; } = string.Empty;
    public string MessageType { get; set; } = "text"; // text | image | file
    public string? FileUrl { get; set; } // nếu file/ảnh
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
