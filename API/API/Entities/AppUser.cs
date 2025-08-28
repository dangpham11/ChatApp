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
    public string UserName { get; set; }
    public byte[] PasswordHash { get; set; }
    public byte[] PasswordSalt { get; set; }

    public ICollection<Post> Posts { get; set; }
    public ICollection<GroupChatMember> GroupChatMembers { get; set; }
    public ICollection<Notification> Notifications { get; set; }
}

