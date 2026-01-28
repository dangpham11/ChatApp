using API.Data;
using API.DTOs;
using API.Entities;
using API.Interfaces;
using API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace API.Controllers
{
    // ==========================================
    // 1️⃣ AUTHENTICATION CONTROLLER
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly DataContext _context;
        private readonly IConfiguration _configuration;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly IEmailService _emailService;

        public AuthController(DataContext context, IConfiguration configuration, IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _cloudinaryService = new CloudinaryService(configuration);
            _emailService = emailService;
        }

    

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }
            if (!user.IsEmailVerified)
            {
                return Unauthorized(new { message = "Email chưa được xác thực" });
            }

            user.IsOnline = true;
            user.LastSeenAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);

            return Ok(new
            {
                token,
                user = new UserResponseDto
                {
                    Id = user.Id,
                    Name = user.Name,
                    Email = user.Email,
                    AvatarUrl = user.Avatar,
                    Bio = user.Bio,
                    PhoneNumber = user.PhoneNumber,
                    Location = user.Location,
                    DateBirth = user.DateBirth,
                    IsOnline = user.IsOnline,
                    LastSeenAt = (DateTime)user.LastSeenAt
                }
            });
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user id" });
            }
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(new UserResponseDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                AvatarUrl = user.Avatar,
                Bio = user.Bio,
                PhoneNumber = user.PhoneNumber,
                Location = user.Location,
                DateBirth = user.DateBirth,
                IsOnline = user.IsOnline,
                LastSeenAt = user.LastSeenAt ?? DateTime.UtcNow
            });
        }

        // ==========================================
        // ✏️ UPDATE PROFILE (CÓ UPLOAD CLOUDINARY)
        // ==========================================
        [Authorize]
        [HttpPut("update-profile")]
        public async Task<IActionResult> UpdateProfile([FromForm] UpdateProfileDto dto, IFormFile? avatarFile)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { message = "Invalid user id" });

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new { message = "User not found" });

            // Cập nhật avatar nếu có file
            if (avatarFile != null && avatarFile.Length > 0)
            {
                var uploadResult = await _cloudinaryService.UploadFileAsync(avatarFile);
                user.Avatar = uploadResult.Url;
            }

            // Cập nhật các trường còn lại nếu có dữ liệu
            user.Name = dto.Name ?? user.Name;
            user.Bio = dto.Bio ?? user.Bio;
            user.PhoneNumber = dto.PhoneNumber ?? user.PhoneNumber;
            user.Location = dto.Location ?? user.Location;
            user.DateBirth = dto.DateBirth ?? user.DateBirth;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Profile updated successfully",
                user = new
                {
                    user.Id,
                    user.Name,
                    user.Bio,
                    user.PhoneNumber,
                    user.Location,
                    user.DateBirth,
                    user.Avatar
                }
            });
        }


        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user id" });
            }
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            {
                return BadRequest(new { message = "Current password is incorrect" });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password changed successfully" });
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid user id" });
            }
            var user = await _context.Users.FindAsync(userId);

            if (user != null)
            {
                user.IsOnline = false;
                user.LastSeenAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Logged out successfully" });
        }

        [HttpPost("send-verification")]
        public async Task<IActionResult> SendVerification(RegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest(new { message = "Email already registered" });

            var token = Guid.NewGuid().ToString();

            var verification = new EmailVerification
            {
                Email = dto.Email,
                Name = dto.Name,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Token = token,
                ExpiredAt = DateTime.UtcNow.AddMinutes(15)
            };

            _context.EmailVerifications.Add(verification);
            await _context.SaveChangesAsync();

            var verifyUrl =
                $"{_configuration["ClientUrl"]}/verify-email?token={token}";

            await _emailService.SendAsync(
                dto.Email,
                "Xác thực email đăng ký",
                $"<p>Click link để xác thực:</p><a href='{verifyUrl}'>Xác thực</a>"
            );

            return Ok(new
            {
                message = "Vui lòng kiểm tra email để xác thực"
            });
        }

        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromQuery] string token)
        {
            if (string.IsNullOrEmpty(token))
                return BadRequest(new { message = "Token không hợp lệ" });

            // Lấy bản ghi xác thực
            var verification = await _context.EmailVerifications
                .FirstOrDefaultAsync(x => x.Token == token);

            if (verification == null)
                return BadRequest(new { message = "Token không tồn tại" });

            if (verification.ExpiredAt < DateTime.UtcNow)
                return BadRequest(new { message = "Token đã hết hạn" });

            // Phòng trường hợp user đã tồn tại (double click link)
            var existingUser = await _context.Users
                .AnyAsync(u => u.Email == verification.Email);

            if (existingUser)
            {
                _context.EmailVerifications.Remove(verification);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Email đã được xác thực trước đó, bạn có thể đăng nhập"
                });
            }

            // Tạo user CHỈ SAU KHI VERIFY
            var user = new User
            {
                Name = verification.Name,
                Email = verification.Email,
                PasswordHash = verification.PasswordHash,
                CreatedAt = DateTime.UtcNow,
                IsEmailVerified = true,
                IsOnline = false,
                LastSeenAt = null
            };

            // Transaction để đảm bảo an toàn dữ liệu
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _context.Users.Add(user);
                _context.EmailVerifications.Remove(verification);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                var cloudConversation = new Conversation
                {
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Conversations.Add(cloudConversation);
                await _context.SaveChangesAsync();

                _context.ConversationParticipants.Add(new ConversationParticipant
                {
                    ConversationId = cloudConversation.Id,
                    UserId = user.Id,
                    JoinedAt = DateTime.UtcNow
                });

                await _context.SaveChangesAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            return Ok(new
            {
                message = "Xác thực email thành công. Bạn có thể đăng nhập ngay"
            });
        }


        private string GenerateJwtToken(User user)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? throw new Exception("JWT Key is missing in configuration")));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Name)
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddDays(7),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

    }
}