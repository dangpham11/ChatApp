using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class SetNicknameDto
    {
        public int TargetUserId { get; set; } // user muốn đổi nickname (có thể là chính mình hoặc đối phương)
        public string Nickname { get; set; } = string.Empty;
    }
}
