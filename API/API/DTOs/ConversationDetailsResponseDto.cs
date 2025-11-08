using System;
using System.Collections.Generic;

namespace API.DTOs
{
    public class ConversationDetailsResponseDto
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public bool IsGroup { get; set; }
        public string? AvatarUrl { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<ParticipantResponseDto> Participants { get; set; } = new();
    }
}
