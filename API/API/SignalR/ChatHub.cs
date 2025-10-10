using API.Data;
using API.DTOs;
using API.Entities;
using API.Interfaces;
using API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[Authorize] // JWT auth cho SignalR client
public class ChatHub : Hub
{
    private readonly IMessageService _messageService;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly DataContext _db;

    public ChatHub(IMessageService messageService, ICloudinaryService cloudinaryService, DataContext db)
    {
        _messageService = messageService;
        _cloudinaryService = cloudinaryService;
        _db = db;
    }

    // Khi client kết nối, thêm họ vào group theo user id
    public override async Task OnConnectedAsync()
    {
        var userIdStr = Context.UserIdentifier; // ClaimTypes.NameIdentifier
        if (!string.IsNullOrEmpty(userIdStr))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"u_{userIdStr}");
        }
        await base.OnConnectedAsync();
    }

    // Gửi tin nhắn riêng, hỗ trợ nhiều file
    public async Task SendPrivateMessage(
        int receiverId,
        string content,
        string messageType = "text",
        IFormFile[]? files = null
    )
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            throw new HubException("Unauthorized: UserId claim not found.");

        int senderId = int.Parse(userIdClaim.Value);

        // Tạo message entity
        var message = new Message
        {
            SenderId = senderId,
            ReceiverId = receiverId,
            Content = content,
            MessageType = messageType
        };

        // Lưu message vào DB
        var savedMessage = await _messageService.CreateMessageAsync(message);

        // Upload file nếu có
        List<MessageFileDto> fileDtos = new();
        if (files != null && files.Any())
        {
            foreach (var file in files)
            {
                string folder = messageType == "image" ? "chat_images" : "chat_files";
                var fileUrl = await _cloudinaryService.UploadFileAsync(file, folder);

                var msgFile = new MessageFile
                {
                    MessageId = savedMessage.Id,
                    FileUrl = fileUrl,
                    FileType = messageType,
                    FileName = file.FileName
                };

                _db.MessageFiles.Add(msgFile);

                fileDtos.Add(new MessageFileDto
                {
                    FileUrl = fileUrl,
                    FileType = messageType,
                    FileName = file.FileName
                });
            }
            await _db.SaveChangesAsync();
        }

        // Tạo DTO gửi client
        var dto = new MessageDto
        {
            Id = savedMessage.Id,
            SenderId = savedMessage.SenderId,
            SenderUserName = Context.User?.Identity?.Name ?? string.Empty,
            ReceiverId = savedMessage.ReceiverId,
            Content = savedMessage.Content,
            MessageType = savedMessage.MessageType,
            IsRead = savedMessage.IsRead,
            CreatedAt = savedMessage.CreatedAt,
            Files = fileDtos
        };

        // Gửi realtime tới receiver và sender
        await Clients.Group($"u_{receiverId}").SendAsync("ReceivePrivateMessage", dto);
        await Clients.Caller.SendAsync("ReceivePrivateMessage", dto);
    }
}
