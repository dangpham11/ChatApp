// Hubs/ChatHub.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

[Authorize] // ensure JWT SignalR auth configured on client
public class ChatHub : Hub
{
    private readonly IMessageService _messageService;
    public ChatHub(IMessageService messageService)
    {
        _messageService = messageService;
    }

    // When client connects, you can add them to groups named by user id for direct messages
    public override async Task OnConnectedAsync()
    {
        var userIdStr = Context.UserIdentifier; // ensure ClaimTypes.NameIdentifier used
        if (!string.IsNullOrEmpty(userIdStr))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"u_{userIdStr}");
        }
        await base.OnConnectedAsync();
    }

    // send private message
    public async Task SendPrivateMessage(int receiverId, string content, string messageType = "text", string? fileUrl = null)
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            throw new HubException("Unauthorized: UserId claim not found.");
        }
        int senderId = int.Parse(userIdClaim.Value);

        // Build message entity
        var msg = new Message
        {
            SenderId = senderId,
            ReceiverId = receiverId,
            Content = content,
            MessageType = messageType,
            FileUrl = fileUrl
        };

        // Persist
        var saved = await _messageService.CreateMessageAsync(msg);

        // Notify receiver (to group u_{receiverId}) and sender clients
        var dto = new MessageDto
        {
            Id = saved.Id,
            SenderId = saved.SenderId,
            SenderUserName = Context.User?.Identity?.Name ?? string.Empty,
            ReceiverId = saved.ReceiverId,
            Content = saved.Content,
            MessageType = saved.MessageType,
            FileUrl = saved.FileUrl,
            IsRead = saved.IsRead,
            CreatedAt = saved.CreatedAt
        };

        // to receiver
        await Clients.Group($"u_{receiverId}").SendAsync("ReceivePrivateMessage", dto);
        // to sender (so sender sees message delivered)
        await Clients.Caller.SendAsync("ReceivePrivateMessage", dto);
    }

    // send group message
    public async Task SendGroupMessage(int groupId, string content, string messageType = "text", string? fileUrl = null)
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
        {
            throw new HubException("Unauthorized: UserId claim not found.");
        }
        int senderId = int.Parse(userIdClaim.Value);

        var msg = new Message
        {
            SenderId = senderId,
            GroupId = groupId,
            Content = content,
            MessageType = messageType,
            FileUrl = fileUrl
        };

        var saved = await _messageService.CreateMessageAsync(msg);

        var dto = new MessageDto
        {
            Id = saved.Id,
            SenderId = saved.SenderId,
            SenderUserName = Context.User?.Identity?.Name ?? string.Empty,
            GroupId = saved.GroupId,
            Content = saved.Content,
            MessageType = saved.MessageType,
            FileUrl = saved.FileUrl,
            IsRead = saved.IsRead,
            CreatedAt = saved.CreatedAt
        };

        // Broadcast to group channel name "g_{groupId}"
        await Clients.Group($"g_{groupId}").SendAsync("ReceiveGroupMessage", dto);
    }

    // Utility: join group room (call when user opens group chat)
    public Task JoinGroupRoom(long groupId)
    {
        return Groups.AddToGroupAsync(Context.ConnectionId, $"g_{groupId}");
    }

    public Task LeaveGroupRoom(long groupId)
    {
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, $"g_{groupId}");
    }
}
