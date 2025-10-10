using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class MessageFileDto
    {
        public string FileUrl { get; set; } = string.Empty;
        public string FileType { get; set; } = "image";
        public string FileName { get; set; } = string.Empty;
    }
}
