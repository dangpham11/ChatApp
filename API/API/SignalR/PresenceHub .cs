using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace API.SignalR
{
    public class PresenceHub : Hub
    {
        // 📦 Lưu nhiều connection cho mỗi user (mỗi tab = 1 connection)
        private static readonly ConcurrentDictionary<string, HashSet<string>> OnlineUsers = new();

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst("nameid")?.Value;
            if (userId == null) return;

            // 🔗 Thêm connection vào danh sách của user
            OnlineUsers.AddOrUpdate(userId,
                _ => new HashSet<string> { Context.ConnectionId },
                (_, existing) =>
                {
                    existing.Add(Context.ConnectionId);
                    return existing;
                });

            // 🔥 Gửi cho client khác biết user này online
            await Clients.Others.SendAsync("UserIsOnline", int.Parse(userId));

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst("nameid")?.Value;
            if (userId == null) return;

            // ❌ Xóa connection khỏi danh sách
            if (OnlineUsers.TryGetValue(userId, out var connections))
            {
                connections.Remove(Context.ConnectionId);

                // Nếu user không còn connection nào → coi như offline
                if (connections.Count == 0)
                {
                    OnlineUsers.TryRemove(userId, out _);
                    await Clients.Others.SendAsync("UserIsOffline", int.Parse(userId));
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        // ✅ Kiểm tra xem user có online không
        public static bool IsUserOnline(int userId)
        {
            return OnlineUsers.ContainsKey(userId.ToString());
        }

        // ✅ Lấy danh sách ID của các user đang online
        public static IEnumerable<int> GetOnlineUsers()
        {
            return OnlineUsers.Keys.Select(int.Parse);
        }
    }
}
