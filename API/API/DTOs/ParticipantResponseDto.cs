using System;

namespace API.DTOs
{
    public class ParticipantResponseDto
    {
        public int UserId { get; set; }
        public string? Username { get; set; }
        public string? AvatarUrl { get; set; }
        public bool IsOnline { get; set; }
        public string? Location { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Bio { get; set; }
        public DateTime? DateBirth { get; set; }
        public DateTime? JoinedAt { get; set; }
    }
}
