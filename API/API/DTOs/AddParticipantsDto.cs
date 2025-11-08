using System.Collections.Generic;

namespace API.DTOs
{
    public class AddParticipantsDto
    {
        public List<int> ParticipantIds { get; set; } = new();
    }
}
