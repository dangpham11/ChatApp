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
    public string DisplayName { get; set; } = null!;
    public string? AvatarUrl { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Gender { get; set; }
    public string? PhoneNumber { get; set; }

    // Quan hệ
    public ICollection<Message> SentMessages { get; set; } = new List<Message>();
    public ICollection<Message> ReceivedMessages { get; set; } = new List<Message>();
    public ICollection<MessageDeletion> MessageDeletions { get; set; } = new List<MessageDeletion>();
}
