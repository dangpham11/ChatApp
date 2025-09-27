public class CreateMessageDto
{
    public int? ReceiverId { get; set; } // private chat
    public int? GroupId { get; set; } // group chat
    public string Content { get; set; } = string.Empty;
    public string MessageType { get; set; } = "text"; // text|image|file
    public string? FileUrl { get; set; } // nếu image/file
}
