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
    public async Task EditMessage(int messageId, string newContent)
    {
        int userId = int.Parse(Context.User!.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        var message = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId);
        if (message == null) throw new HubException("Tin nhắn không tồn tại.");
        if (message.SenderId != userId) throw new HubException("Không thể sửa tin nhắn của người khác.");

        var history = new MessageEditHistory
        {
            MessageId = message.Id,
            OldContent = message.Content,
            NewContent = newContent,
            EditedAt = DateTime.UtcNow
        };
        _db.MessageEditHistories.Add(history);

        message.Content = newContent;
        message.EditedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        await Clients.Group($"u_{message.ReceiverId}").SendAsync("MessageEdited", new
        {
            message.Id,
            message.Content,
            message.EditedAt
        });

        await Clients.Group($"u_{message.SenderId}").SendAsync("MessageEdited", new
        {
            message.Id,
            message.Content,
            message.EditedAt
        });
    }
    public async Task SendVoiceMessage(int receiverId, IFormFile voiceFile, double duration)
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            throw new HubException("Unauthorized");

        int senderId = int.Parse(userIdClaim.Value);

        // Upload lên Cloudinary (folder chat_voices)
        string voiceUrl = await _cloudinaryService.UploadFileAsync(voiceFile, "chat_voices");

        // Tạo entity
        var message = new Message
        {
            SenderId = senderId,
            ReceiverId = receiverId,
            MessageType = "voice",
            VoiceUrl = voiceUrl,
            VoiceDuration = duration
        };

        // Lưu DB
        var saved = await _messageService.CreateMessageAsync(message);

        // Chuẩn bị DTO
        var dto = new MessageDto
        {
            Id = saved.Id,
            SenderId = saved.SenderId,
            SenderUserName = Context.User?.Identity?.Name ?? "",
            ReceiverId = saved.ReceiverId,
            MessageType = saved.MessageType,
            CreatedAt = saved.CreatedAt,
            VoiceUrl = saved.VoiceUrl,
            VoiceDuration = saved.VoiceDuration
        };

        // Gửi realtime cho cả 2 bên
        await Clients.Group($"u_{receiverId}").SendAsync("ReceivePrivateMessage", dto);
        await Clients.Group($"u_{senderId}").SendAsync("ReceivePrivateMessage", dto);
    }
    public async Task SendLocation(int receiverId, double latitude, double longitude)
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            throw new HubException("Unauthorized");

        int senderId = int.Parse(userIdClaim.Value);

        var receiver = await _db.Users.FirstOrDefaultAsync(u => u.Id == receiverId);
        if (receiver == null)
            throw new HubException($"Không tìm thấy người nhận có ID = {receiverId}");

        string googleMapsUrl = $"https://www.google.com/maps?q={latitude},{longitude}";
        string content = $"📍 Vị trí hiện tại (chỉ hiển thị 1 tiếng): {googleMapsUrl}";

        var message = new Message
        {
            SenderId = senderId,
            ReceiverId = receiverId,
            Content = content,
            MessageType = "location",
            Latitude = latitude,
            Longitude = longitude,
            CreatedAt = DateTime.UtcNow
        };

        var saved = await _messageService.CreateMessageAsync(message);

        var dto = new MessageDto
        {
            Id = saved.Id,
            SenderId = saved.SenderId,
            SenderUserName = Context.User?.Identity?.Name ?? "",
            ReceiverId = saved.ReceiverId,
            MessageType = "location",
            Content = content,
            CreatedAt = saved.CreatedAt,
            Latitude = latitude,
            Longitude = longitude,
            GoogleMapsUrl = googleMapsUrl
        };

        await Clients.Group($"u_{receiverId}").SendAsync("ReceivePrivateMessage", dto);
        await Clients.Group($"u_{senderId}").SendAsync("ReceivePrivateMessage", dto);

        // 🕒 Sau 1 tiếng, tự động "ẩn" vị trí
        _ = Task.Run(async () =>
        {
            await Task.Delay(TimeSpan.FromHours(1));

            var msg = await _db.Messages.FirstOrDefaultAsync(m => m.Id == saved.Id);
            if (msg != null && msg.MessageType == "location")
            {
                _db.Messages.Remove(msg);
                await _db.SaveChangesAsync();

                await Clients.Group($"u_{receiverId}").SendAsync("LocationExpired", new { MessageId = saved.Id });
                await Clients.Group($"u_{senderId}").SendAsync("LocationExpired", new { MessageId = saved.Id });
            }
        });
    }
}
