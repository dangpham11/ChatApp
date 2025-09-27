public class MessageDto
{
    public int Id { get; set; }
    public int SenderId { get; set; }
    public string SenderUserName { get; set; } = null!;
    public int? ReceiverId { get; set; }
    public int? GroupId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string MessageType { get; set; } = "text";
    public string? FileUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
