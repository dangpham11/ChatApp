using Microsoft.AspNetCore.Http;

public class CreateMessageDto
{
    public int ConversationId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string MessageType { get; set; } = "text"; // text|image|file
    public IFormFile[]? Files { get; set; } // thêm mảng file
}