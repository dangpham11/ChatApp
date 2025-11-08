using API.Data;
using API.Services;
using API.SignaIR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FilesController : ControllerBase
    {
        private readonly ICloudinaryService _cloudinaryService;
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly DataContext _context; // 🔹 thêm nếu bạn có EF DbContext để truy user trong conversation

        public FilesController(
            ICloudinaryService cloudinaryService,
            IHubContext<ChatHub> hubContext,
            DataContext context) // inject DbContext
        {
            _cloudinaryService = cloudinaryService;
            _hubContext = hubContext;
            _context = context;
        }

        // ================================
        // 📤 Upload file lên Cloudinary
        // ================================
        [HttpPost("upload")]
        public async Task<IActionResult> UploadFile(
    IFormFile file,
    [FromForm] string[] receiverIds,
    [FromForm] int conversationId)
        {
            Console.WriteLine($"[UPLOAD] Bắt đầu upload file {file?.FileName}, conversationId={conversationId}");
            Console.WriteLine($"[UPLOAD] receiverIds = {string.Join(",", receiverIds)}");

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded" });

            var allowedTypes = new[]
{
    "image/jpeg", "image/png", "image/jpg", "image/gif",
    "video/mp4",
    "audio/mpeg", "audio/wav", "audio/mp3",
    "audio/webm", "audio/ogg", // ✅ thêm 2 dòng này
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
};

            if (!allowedTypes.Contains(file.ContentType))
                return BadRequest(new { message = "File type not allowed" });

            if (file.Length > 50 * 1024 * 1024)
                return BadRequest(new { message = "File size exceeds 50MB limit" });

            try
            {
                var senderId = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "unknown";
                Console.WriteLine($"[UPLOAD] senderId = {senderId}");

                // 🔹 Upload lên Cloudinary
                var uploadResult = await _cloudinaryService.UploadFileAsync(file);
                Console.WriteLine($"[UPLOAD] Upload thành công: {uploadResult.Url}");

                var allUserIds = receiverIds.Append(senderId).Distinct().ToArray();
                Console.WriteLine($"[UPLOAD] Gửi sự kiện FileUploaded đến: {string.Join(",", allUserIds)}");

                await _hubContext.Clients.Users(allUserIds)
                    .SendAsync("FileUploaded", new
                    {
                        senderId,
                        conversationId,
                        fileName = file.FileName,
                        url = uploadResult.Url,
                        publicId = uploadResult.PublicId,
                        format = uploadResult.Format,
                        resourceType = uploadResult.ResourceType,
                        bytes = uploadResult.Bytes,
                        timestamp = DateTime.UtcNow
                    });

                Console.WriteLine("[UPLOAD] Sự kiện FileUploaded đã gửi xong ✅");

                return Ok(new
                {
                    url = uploadResult.Url,
                    publicId = uploadResult.PublicId,
                    format = uploadResult.Format,
                    resourceType = uploadResult.ResourceType,
                    bytes = uploadResult.Bytes
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UPLOAD] LỖI: {ex.Message}");
                await _hubContext.Clients.All.SendAsync("FileUploadFailed", new
                {
                    message = "Upload failed",
                    error = ex.Message
                });

                return StatusCode(500, new { message = "Upload failed", error = ex.Message });
            }
        }

        // ================================
        // 🗑️ Xóa file khỏi Cloudinary
        // ================================
        [HttpDelete("delete/{publicId}")]
        public async Task<IActionResult> DeleteFile(string publicId, [FromQuery] int conversationId)
        {
            try
            {
                var result = await _cloudinaryService.DeleteFileAsync(publicId);

                if (result)
                {
                    // Lấy danh sách user trong cuộc trò chuyện
                    var participantIds = _context.ConversationParticipants
                        .Where(p => p.ConversationId == conversationId)
                        .Select(p => p.UserId.ToString())
                        .Distinct()
                        .ToArray();

                    await _hubContext.Clients.Users(participantIds)
                        .SendAsync("FileDeleted", new { publicId, conversationId });

                    return Ok(new { message = "File deleted successfully" });
                }

                return BadRequest(new { message = "Failed to delete file" });
            }
            catch (Exception ex)
            {
                await _hubContext.Clients.All.SendAsync("FileDeleteFailed", new { error = ex.Message });
                return StatusCode(500, new { message = "Delete failed", error = ex.Message });
            }
        }
    }
}
