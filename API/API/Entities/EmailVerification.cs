using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.Entities
{
    public class EmailVerification
    {
        public int Id { get; set; }
        public string Email { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string PasswordHash { get; set; } = null!;

        public string Token { get; set; } = null!;
        public DateTime ExpiredAt { get; set; }
    }
}
