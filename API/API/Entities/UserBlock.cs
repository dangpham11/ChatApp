public class UserBlock
{
    public int Id { get; set; }
    public int BlockerId { get; set; }
    public int BlockedId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
