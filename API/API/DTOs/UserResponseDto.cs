namespace API.DTOs
{
    public class UserResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? AvatarUrl { get; set; }
        public string? Bio { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Location { get; set; }
        public DateTime? DateBirth { get; set; }
        public bool IsOnline { get; set; }
        public DateTime LastSeenAt { get; set; }
    }
}
