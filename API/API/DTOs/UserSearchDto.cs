namespace API.DTOs
{
    public class UserSearchDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Avatar { get; set; }
        public bool IsOnline { get; set; }
    }
}
