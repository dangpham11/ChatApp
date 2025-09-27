namespace API.DTOs;

public class UserDto
{
    public int Id { get; set; }
    public string Username { get; set; } = null!;
    public string DisplayName { get; set; } = null!;
    public string? AvatarUrl { get; set; } 
    public string Token { get; set; } = null!;
}
