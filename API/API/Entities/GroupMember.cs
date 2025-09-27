using API.Entities;

public class GroupMember
{
    public int Id { get; set; }
    public int? GroupId { get; set; }
    public Group Group { get; set; } = null!;
    public int UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public string Role { get; set; } = "member"; // member|admin
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}