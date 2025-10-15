namespace API.DTOs;

public class UserDto
{
    public int Id { get; set; }
    public string Email { get; set; } = null!;
    public string? FullName { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Gender { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Location { get; set; }
    public string? Bio { get; set; }  // tiểu sử
    public string? AvatarUrl { get; set; }
    public string? Token { get; set; } 
}