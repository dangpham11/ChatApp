using System.Collections.Generic;

namespace API.DTOs
{
    public class CreateConversationDto
    {
        public List<int> ParticipantIds { get; set; } = new(); // danh sách userId tham gia
    }
}
