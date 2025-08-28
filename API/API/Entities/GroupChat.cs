using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.Entities;

public class GroupChat
{
    public int Id { get; set; }
    public string Name { get; set; }

    public ICollection<GroupChatMember> Members { get; set; }
    public ICollection<Message> Messages { get; set; }
}

