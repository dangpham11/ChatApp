using System;
using System.Collections.Generic;

namespace API.Entities;

public class AppUser
{
    public int Id { get; set; }

    // Đăng nhập bằng email
    public string Email { get; set; } = null!;
    public byte[] PasswordHash { get; set; } = null!;
    public byte[] PasswordSalt { get; set; } = null!;

    // Thông tin cá nhân
    public string FullName { get; set; } = null!;
    public string? AvatarUrl { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Gender { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Location { get; set; }
    public string? Bio { get; set; }  // tiểu sử

    // Trạng thái hoạt động 
    public DateTime LastActive { get; set; } = DateTime.UtcNow;   // thời điểm cuối cùng user hoạt động
    public bool IsOnline { get; set; }          // đang online hay không

    // Quan hệ
    public ICollection<Message> SentMessages { get; set; } = new List<Message>();
    public ICollection<Conversation> ConversationsAsUser1 { get; set; } = new List<Conversation>();
    public ICollection<Conversation> ConversationsAsUser2 { get; set; } = new List<Conversation>();
}
