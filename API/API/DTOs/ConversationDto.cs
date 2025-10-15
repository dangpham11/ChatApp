public class ConversationDto
{
    public int Id { get; set; }
    public string ConversationName { get; set; } = null!;
    public string? ConversationAvatarUrl { get; set; }
    public int User1Id { get; set; }
    public string User1Name { get; set; } = string.Empty;
    public string? NicknameUser1 { get; set; } 
    public int User2Id { get; set; }
    public string User2Name { get; set; } = string.Empty;
    public string? NicknameUser2 { get; set; } 
    public int? LastMessageId { get; set; }
    public string? LastMessageContent { get; set; }
    public DateTime? LastMessageCreatedAt { get; set; } // Thời gian tin nhắn cuối cùng
    public bool IsMutedForCurrentUser { get; set; }
    public bool IsUserOnline { get; set; }
    public DateTime LastActive { get; set; }
    public List<MessageDto> Messages { get; set; } = new List<MessageDto>();

}
