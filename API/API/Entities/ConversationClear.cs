public class ConversationClear
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public int UserId { get; set; }
    public DateTime ClearedAt { get; set; } = DateTime.UtcNow;
}
