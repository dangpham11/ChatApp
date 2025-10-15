using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.Entities
{
    public class Conversation
    {
        public int Id { get; set; }
        public string ConversationName { get; set; } = null!;
        public string ConversationAvatarUrl { get; set; } = null!;
        // User 1
        public int User1Id { get; set; }
        public AppUser User1 { get; set; } = null!;

        // User 2
        public int User2Id { get; set; }
        public AppUser User2 { get; set; } = null!;

        public int? LastMessageId { get; set; }
        public Message LastMessage { get; set; } = null!;

        public string? NicknameUser1 { get; set; } // Hiển thị tên của user1
        public string? NicknameUser2 { get; set; }

        public bool User1Muted { get; set; } = false;
        public bool User2Muted { get; set; } = false;

        public bool User1Deleted { get; set; } = false;
        public bool User2Deleted { get; set; } = false;
        public DateTime? DeletedAtUser1 { get; set; }  // thời điểm user1 xóa
        public DateTime? DeletedAtUser2 { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Các tin nhắn trong conversation
        public ICollection<Message> Messages { get; set; } = new List<Message>();
        public ICollection<ConversationBlock> BlockedUsers { get; set; } = new List<ConversationBlock>();
    }
}
