using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class VoiceMessageDto
    {
        public int ConversationId { get; set; }
        public IFormFile AudioFile { get; set; } = null!;
    }
}
