using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace API.SignaIR
{
    public class ChatHub : Hub
    {
        // Khi client kết nối
        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                // ✅ Không cần Groups nữa, vì SignalR đã biết userId qua IUserIdProvider
                await Clients.All.SendAsync("UserConnected", userId);
            }
            Console.WriteLine($"[HUB CONNECT] userId = {userId ?? "null"}");
            await base.OnConnectedAsync();
        }

        // Khi client ngắt kết nối
        public override async Task OnDisconnectedAsync(System.Exception? exception)
        {
            var userId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                await Clients.All.SendAsync("UserDisconnected", userId);
            }

            await base.OnDisconnectedAsync(exception);
        }

        // ============================
        // Các phương thức gửi realtime
        // ============================

        // Tin nhắn mới
        public async Task SendMessageToUsers(string[] userIds, object message)
        {
            foreach (var userId in userIds)
            {
                await Clients.User(userId).SendAsync("NewMessage", message);
            }
        }

        // Tin nhắn được chỉnh sửa
        public async Task SendMessageEdited(string[] userIds, object message)
        {
            foreach (var userId in userIds)
            {
                await Clients.User(userId).SendAsync("MessageEdited", message);
            }
        }

        // Tin nhắn bị thu hồi
        public async Task SendMessageRecalled(string[] userIds, int messageId)
        {
            foreach (var userId in userIds)
            {
                await Clients.User(userId).SendAsync("MessageRecalled", new { messageId });
            }
        }

        // Reaction thêm hoặc xóa
        public async Task SendReactionUpdate(string[] userIds, object reaction, bool added)
        {
            foreach (var userId in userIds)
            {
                await Clients.User(userId)
                    .SendAsync(added ? "ReactionAdded" : "ReactionRemoved", reaction);
            }
        }

        // Pin / Unpin message
        public async Task SendPinnedUpdate(string[] userIds, int messageId, int conversationId, bool pinned)
        {
            foreach (var userId in userIds)
            {
                await Clients.User(userId)
                    .SendAsync(pinned ? "MessagePinned" : "MessageUnpinned", new { messageId, conversationId });
            }
        }

        // Conversation mới
        public async Task SendConversationCreated(string[] userIds, object conversation)
        {
            foreach (var userId in userIds)
            {
                await Clients.User(userId).SendAsync("ConversationCreated", conversation);
            }
        }

        // Thêm người tham gia
        public async Task SendParticipantsAdded(string[] userIds, object data)
        {
            foreach (var userId in userIds)
            {
                await Clients.User(userId).SendAsync("ParticipantsAdded", data);
            }
        }

        // Người tham gia rời đi
        public async Task SendParticipantLeft(string[] userIds, object data)
        {
            foreach (var userId in userIds)
            {
                await Clients.User(userId).SendAsync("ParticipantLeft", data);
            }
        }

        // Cập nhật danh sách cuộc trò chuyện
        public async Task SendConversationUpdated(string[] userIds, object conversation)
        {
            foreach (var userId in userIds)
            {
                await Clients.User(userId).SendAsync("ConversationUpdated", conversation);
            }
        }

        public async Task SendFileUploading(string[] userIds, object fileInfo)
        {
            foreach (var userId in userIds)
            {
                await Clients.User(userId).SendAsync("FileUploading", fileInfo);
            }
        }

        public async Task SendFileUploaded(string[] userIds, object fileInfo)
        {
            foreach (var userId in userIds)
            {
                await Clients.User(userId).SendAsync("FileUploaded", fileInfo);
            }
        }

        public async Task SendFileUploadFailed(string[] userIds, string errorMessage)
        {
            foreach (var userId in userIds)
            {
                await Clients.User(userId).SendAsync("FileUploadFailed", new { message = errorMessage });
            }
        }

        public async Task SendFileDeleted(string[] userIds, string publicId)
        {
            foreach (var userId in userIds)
            {
                await Clients.User(userId).SendAsync("FileDeleted", new { publicId });
            }
        }

        public async Task SendFileDeleteFailed(string[] userIds, string errorMessage)
        {
            foreach (var userId in userIds)
            {
                await Clients.User(userId).SendAsync("FileDeleteFailed", new { error = errorMessage });
            }
        }
    }
}
