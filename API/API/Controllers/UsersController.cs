using API.Data;
using API.DTOs;
using API.Entities;
using API.Interfaces;
using API.Services;
using API.SignalR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly DataContext _db;


        public UsersController(DataContext context, ICloudinaryService cloudinaryService, DataContext db)
        {
            _context = context;
            _cloudinaryService = cloudinaryService;
            _db = db;
        }

        // =============================
        // 1. Lấy thông tin người dùng hiện tại
        // =============================
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("Người dùng không tồn tại.");

            return Ok(new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                BirthDate = user.BirthDate,
                Gender = user.Gender,
                PhoneNumber = user.PhoneNumber,
                Location = user.Location,
                Bio = user.Bio,
                AvatarUrl = user.AvatarUrl
            });
        }

        // =============================
        // 📡 GET: /api/users/online-status/{id}
        // =============================
        [HttpGet("online-status/{id}")]
        public async Task<ActionResult<object>> GetUserOnlineStatus(int id)
        {
            var user = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return NotFound(new { message = "User not found" });

            // 🧠 Kiểm tra user có đang online trong SignalR không
            bool isOnline = PresenceHub.IsUserOnline(id);

            return Ok(new
            {
                user.Id,
                user.FullName,
                IsOnline = isOnline,
                user.LastActive
            });
        }

        // =============================
        // 2. Cập nhật thông tin người dùng
        // =============================
        [HttpPut("update")]
        public async Task<IActionResult> UpdateUser([FromForm] UpdateUserDto dto)
        {
            int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("Người dùng không tồn tại.");

            // Cập nhật các trường cơ bản
            if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName;
            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber)) user.PhoneNumber = dto.PhoneNumber;
            if (dto.BirthDate != null) user.BirthDate = dto.BirthDate;
            if (!string.IsNullOrWhiteSpace(dto.Gender)) user.Gender = dto.Gender;
            if (!string.IsNullOrWhiteSpace(dto.Location)) user.Location = dto.Location;
            if (!string.IsNullOrWhiteSpace(dto.Bio)) user.Bio = dto.Bio;

            // Cập nhật avatar nếu có file
            if (dto.Avatar != null)
            {
                string avatarUrl = await _cloudinaryService.UploadFileAsync(dto.Avatar, "avatars");
                user.AvatarUrl = avatarUrl;
            }

            await _context.SaveChangesAsync();

            return Ok(new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                BirthDate = user.BirthDate,
                Gender = user.Gender,
                PhoneNumber = user.PhoneNumber,
                Location = user.Location,
                Bio = user.Bio,
                AvatarUrl = user.AvatarUrl
            });
        }
    }
}
