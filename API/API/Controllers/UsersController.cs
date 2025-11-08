using API.Data;
using API.DTOs;
using API.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly DataContext _context;

        public UsersController(DataContext context)
        {
            _context = context;
        }

        // =========================
        // 🔍 SEARCH USERS
        // GET: /api/Users/search?query=abc
        // =========================
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<UserSearchDto>>> SearchUsers([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query))
                return BadRequest(new { message = "Query cannot be empty." });

            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var currentUserId))
            {
                return Unauthorized(new { message = "Invalid or missing user ID in token." });
            }

            // ✅ Lấy danh sách userId đã có cuộc trò chuyện 1-1 với current user
            var existingUserIds = await _context.ConversationParticipants
                .Where(cp1 => _context.ConversationParticipants
                    .Any(cp2 => cp2.ConversationId == cp1.ConversationId && cp2.UserId == currentUserId))
                .Select(cp1 => cp1.UserId)
                .Where(uid => uid != currentUserId)
                .Distinct()
                .ToListAsync();

            // ✅ Tìm kiếm user chưa có cuộc trò chuyện 1-1 với current user
            var users = await _context.Users
                .Where(u => u.Id != currentUserId &&
                            !existingUserIds.Contains(u.Id) &&
                            (u.Name.Contains(query) || u.Email.Contains(query)))
                .Select(u => new UserSearchDto
                {
                    Id = u.Id,
                    Email = u.Email,
                    Name = u.Name,
                    Avatar = u.Avatar,
                    IsOnline = u.IsOnline
                })
                .Take(20)
                .ToListAsync();

            return Ok(users);
        }

        // =========================
        // 📧 GET USER BY EMAIL
        // GET: /api/Users/by-email?email=abc@gmail.com
        // =========================
        [HttpGet("by-email")]
        public async Task<ActionResult<UserSearchDto>> GetUserByEmail([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { message = "Email is required." });

            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var currentUserId))
            {
                return Unauthorized(new { message = "Invalid or missing user ID in token." });
            }

            // ✅ Kiểm tra xem đã có cuộc trò chuyện 1-1 chưa
            var hasConversation = await _context.Conversations
                .AnyAsync(c =>
                    c.Participants.Any(p => p.UserId == currentUserId) &&
                    c.Participants.Any(p => p.User.Email == email)
                );

            if (hasConversation)
                return NotFound(new { message = "You already have a private conversation with this user." });

            var user = await _context.Users
                .Where(u => u.Email == email && u.Id != currentUserId)
                .Select(u => new UserSearchDto
                {
                    Id = u.Id,
                    Email = u.Email,
                    Name = u.Name,
                    Avatar = u.Avatar,
                    IsOnline = u.IsOnline
                })
                .FirstOrDefaultAsync();

            if (user == null)
                return NotFound(new { message = "User not found." });

            return Ok(user);
        }
    }
}
