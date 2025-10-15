using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class ReplyMessageDto
    {
        public int ConversationId { get; set; }
        public string Content { get; set; } = string.Empty;
        public string MessageType { get; set; } = "text"; // text|image|file
        public int? ReplyToMessageId { get; set; }
        public IFormFile[]? Files { get; set; } // thêm mảng file
    }
}
