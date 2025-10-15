using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.Entities
{
    public class MessageReaction
    {
        public int Id { get; set; }

        // Người bày tỏ cảm xúc
        public int UserId { get; set; }
        public AppUser User { get; set; } = null!;

        // Tin nhắn được bày tỏ cảm xúc
        public int MessageId { get; set; }
        public Message Message { get; set; } = null!;

        // Loại cảm xúc (ví dụ: like, love, haha, wow, sad, angry)
        public string ReactionType { get; set; } = "like";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
