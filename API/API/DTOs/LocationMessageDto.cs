using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class LocationMessageDto
    {
        public int ConversationId { get; set; }
        public double Latitude { get; set; }   // Vĩ độ
        public double Longitude { get; set; }  // Kinh độ
    }
}
