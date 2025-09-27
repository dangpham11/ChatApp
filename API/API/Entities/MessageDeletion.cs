namespace API.Entities
{
    public class MessageDeletion
    {
        public int Id { get; set; }

        public int MessageId { get; set; }
        public Message Message { get; set; } = null!;

        public int UserId { get; set; }
        public AppUser User { get; set; } = null!;

        public DateTime DeletedAt { get; set; } = DateTime.UtcNow;
    }
}
