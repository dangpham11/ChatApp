using API.Entities;

public class Group
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int OwnerId { get; set; }
    public AppUser Owner { get; set; } = null!;
    public ICollection<GroupMember> Members { get; set; } = new List<GroupMember>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}