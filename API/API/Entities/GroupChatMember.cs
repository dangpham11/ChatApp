using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.Entities;

public class GroupChatMember
{
    public int Id { get; set; }

    public int AppUserId { get; set; }
    public AppUser AppUser { get; set; }

    public int GroupChatId { get; set; }
    public GroupChat GroupChat { get; set; }
}

