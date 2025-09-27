using Microsoft.Extensions.Hosting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.Entities;

public class AppUser
{
    public int Id { get; set; }
    public string UserName { get; set; } = null!;
    public byte[] PasswordHash { get; set; } = null!;
    public byte[] PasswordSalt { get; set; } = null!;
    public string DisplayName { get; set; } = null!;
    public string? AvatarUrl { get; set; } 
    // ... các trường khác (email, password hash, ...)
    public ICollection<Message> SentMessages { get; set; } = new List<Message>();
    public ICollection<GroupMember> GroupMembers { get; set; } = new List<GroupMember>();

}

