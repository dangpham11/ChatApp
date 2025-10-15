using API.Data;
using API.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;

namespace API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class FriendsController : ControllerBase
    {
        private readonly DataContext _db;
        private readonly IHubContext<ChatHub> _hubContext;

        public FriendsController(DataContext db, IHubContext<ChatHub> hubContext)
        {
            _db = db;
            _hubContext = hubContext;
        }

        private int CurrentUserId =>
                    int.Parse(User.FindFirst(JwtRegisteredClaimNames.NameId)?.Value ?? "0");

        [HttpPost("add/{email}")]
        public async Task<IActionResult> AddFriend(string email)
        {
            var userIdClaim = User.FindFirst("nameid")?.Value ??
                              User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out var currentUserId))
                return BadRequest("Không lấy được ID người dùng từ token");

            var currentUser = await _db.Users.FindAsync(currentUserId);
            if (currentUser == null)
                return NotFound("Người dùng hiện tại không tồn tại.");

            var friend = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (friend == null)
                return NotFound("Không tìm thấy người dùng có email này.");

            // 🔹 Kiểm tra trùng lặp bạn bè
            var existingFriendship = await _db.Friendships.FirstOrDefaultAsync(f =>
                (f.UserId == currentUserId && f.FriendId == friend.Id) ||
                (f.UserId == friend.Id && f.FriendId == currentUserId));

            if (existingFriendship != null)
                return BadRequest("Hai người đã là bạn bè.");

            // 🔹 Tạo mới friendship
            var friendship = new Friendship
            {
                UserId = currentUserId,
                FriendId = friend.Id,
                CreatedAt = DateTime.UtcNow
            };
            _db.Friendships.Add(friendship);
            await _db.SaveChangesAsync();

            // ==============================
            // 🔹 Tạo hoặc lấy conversation
            // ==============================
            var conversation = await _db.Conversations
                .FirstOrDefaultAsync(c =>
                    (c.User1Id == currentUserId && c.User2Id == friend.Id) ||
                    (c.User1Id == friend.Id && c.User2Id == currentUserId));

            if (conversation == null)
            {
                conversation = new Conversation
                {
                    User1Id = currentUserId,
                    User2Id = friend.Id,
                    ConversationName = $"Chat giữa {currentUser.FullName} và {friend.FullName}",
                    CreatedAt = DateTime.UtcNow
                };

                _db.Conversations.Add(conversation);
                await _db.SaveChangesAsync();
            }

            // ==============================
            // 🔹 Tạo tin nhắn “Xin chào 👋”
            // ==============================
            var message = new Message
            {
                SenderId = currentUserId,
                ReceiverId = friend.Id,
                ConversationId = conversation.Id,
                Content = "Xin chào 👋! Rất vui được làm quen với bạn.",
                MessageType = "text",
                CreatedAt = DateTime.UtcNow
            };

            _db.Messages.Add(message);
            await _db.SaveChangesAsync();

            // ==============================
            // 🔹 Cập nhật tin nhắn cuối trong conversation
            // ==============================
            conversation.LastMessageId = message.Id;
            conversation.UpdatedAt = DateTime.UtcNow;
            _db.Conversations.Update(conversation);
            await _db.SaveChangesAsync();

            // ==============================
            // 🔹 (Tuỳ chọn) Gửi realtime qua SignalR
            // ==============================
            await _hubContext.Clients.User(friend.Id.ToString())
                .SendAsync("ReceiveMessage", new {
                     conversationId = conversation.Id,
                     senderId = currentUserId,
                     content = message.Content,
                     createdAt = message.CreatedAt
                 });

            return Ok(new
            {
                Message = "Đã thêm bạn và gửi lời chào thành công!",
                ConversationId = conversation.Id,
                FriendId = friend.Id
            });
        }
        // ================================
        // 🧩 1️⃣b. Thêm bạn bè bằng ID + tạo conversation tự động
        // ================================
        [HttpPost("add-by-id/{friendId}")]
        public async Task<IActionResult> AddFriendById(int friendId)
        {
            var userIdClaim = User.FindFirst("nameid")?.Value ??
                              User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (!int.TryParse(userIdClaim, out var currentUserId))
                return BadRequest("Không lấy được ID người dùng từ token");

            if (currentUserId == friendId)
                return BadRequest("Không thể tự thêm chính mình làm bạn.");

            var currentUser = await _db.Users.FindAsync(currentUserId);
            if (currentUser == null)
                return NotFound("Người dùng hiện tại không tồn tại.");

            var friend = await _db.Users.FindAsync(friendId);
            if (friend == null)
                return NotFound("Không tìm thấy người dùng này.");

            // 🔹 Kiểm tra trùng lặp bạn bè
            var existingFriendship = await _db.Friendships.FirstOrDefaultAsync(f =>
                (f.UserId == currentUserId && f.FriendId == friend.Id) ||
                (f.UserId == friend.Id && f.FriendId == currentUserId));

            if (existingFriendship != null)
                return BadRequest("Hai người đã là bạn bè.");

            // 🔹 Tạo mới friendship
            var friendship = new Friendship
            {
                UserId = currentUserId,
                FriendId = friend.Id,
                CreatedAt = DateTime.UtcNow
            };
            _db.Friendships.Add(friendship);
            await _db.SaveChangesAsync();

            // ==============================
            // 🔹 Tạo hoặc lấy conversation
            // ==============================
            var conversation = await _db.Conversations
                .FirstOrDefaultAsync(c =>
                    (c.User1Id == currentUserId && c.User2Id == friend.Id) ||
                    (c.User1Id == friend.Id && c.User2Id == currentUserId));

            if (conversation == null)
            {
                conversation = new Conversation
                {
                    User1Id = currentUserId,
                    User2Id = friend.Id,
                    ConversationName = $"Chat giữa {currentUser.FullName} và {friend.FullName}",
                    CreatedAt = DateTime.UtcNow
                };

                _db.Conversations.Add(conversation);
                await _db.SaveChangesAsync();
            }

            // ==============================
            // 🔹 Tạo tin nhắn “Xin chào 👋”
            // ==============================
            var message = new Message
            {
                SenderId = currentUserId,
                ReceiverId = friend.Id,
                ConversationId = conversation.Id,
                Content = "Xin chào 👋! Rất vui được làm quen với bạn.",
                MessageType = "text",
                CreatedAt = DateTime.UtcNow
            };

            _db.Messages.Add(message);
            await _db.SaveChangesAsync();

            // ==============================
            // 🔹 Cập nhật tin nhắn cuối trong conversation
            // ==============================
            conversation.LastMessageId = message.Id;
            conversation.UpdatedAt = DateTime.UtcNow;
            _db.Conversations.Update(conversation);
            await _db.SaveChangesAsync();

            // ==============================
            // 🔹 (Tuỳ chọn) Gửi realtime qua SignalR
            // ==============================
            await _hubContext.Clients.User(friend.Id.ToString())
                .SendAsync("ReceiveMessage", new
                {
                    conversationId = conversation.Id,
                    senderId = currentUserId,
                    content = message.Content,
                    createdAt = message.CreatedAt
                });

            return Ok(new
            {
                Message = "Đã thêm bạn và gửi lời chào thành công!",
                ConversationId = conversation.Id,
                FriendId = friend.Id
            });
        }

        // ================================
        // 🧩 2️⃣ Lấy danh sách bạn bè hiện tại
        // ================================
        [HttpGet("list")]
        public async Task<ActionResult<IEnumerable<object>>> GetFriends()
        {
            var friends = await _db.Friendships
                .Include(f => f.User)
                .Include(f => f.Friend)
                .Where(f => f.UserId == CurrentUserId || f.FriendId == CurrentUserId)
                .Select(f => f.UserId == CurrentUserId ? f.Friend : f.User)
                .Select(u => new
                {
                    u.Id,
                    u.FullName,
                    u.Email,
                    u.LastActive
                })
                .ToListAsync();

            return Ok(friends);
        }

        // ================================
        // 🧩 3️⃣ Lấy danh sách người dùng chưa kết bạn
        // ================================
        [HttpGet("suggestions")]
        public async Task<ActionResult<IEnumerable<object>>> GetFriendSuggestions()
        {
            var friendIds = await _db.Friendships
                .Where(f => f.UserId == CurrentUserId || f.FriendId == CurrentUserId)
                .Select(f => f.UserId == CurrentUserId ? f.FriendId : f.UserId)
                .ToListAsync();

            var users = await _db.Users
                .Where(u => u.Id != CurrentUserId && !friendIds.Contains(u.Id))
                .Select(u => new
                {
                    u.Id,
                    u.FullName,
                    u.Email,
                    IsOnline = SignalR.PresenceHub.IsUserOnline(u.Id),
                    u.LastActive
                })
                .ToListAsync();

            return Ok(users);
        }
    }
}
