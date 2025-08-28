using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.Entities;

public class Notification
{
    public int Id { get; set; }
    public string Message { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int AppUserId { get; set; }
    public AppUser AppUser { get; set; }
}

