using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ChatApi.Controllers
{
    // ==========================================
    // 1️⃣ AUTHENTICATION CONTROLLER
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            {
                return BadRequest(new { message = "Email already exists" });
            }

            if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
            {
                return BadRequest(new { message = "Username already exists" });
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            var user = new User
            {
                Username = dto.Username,
                Email = dto.Email,
                PasswordHash = passwordHash,
                DisplayName = dto.DisplayName ?? dto.Username,
                AvatarUrl = dto.AvatarUrl ?? "https://via.placeholder.com/150",
                CreatedAt = DateTime.UtcNow,
                LastSeenAt = DateTime.UtcNow,
                IsOnline = true
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);

            return Ok(new
            {
                token,
                user = new UserResponseDto
                {
                    Id = user.Id,
                    Username = user.Username,
                    Email = user.Email,
                    DisplayName = user.DisplayName,
                    AvatarUrl = user.AvatarUrl,
                    IsOnline = user.IsOnline,
                    LastSeenAt = user.LastSeenAt
                }
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                return Unauthorized(new { message = "Invalid email or password" });
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
                    Username = user.Username,
                    Email = user.Email,
                    DisplayName = user.DisplayName,
                    AvatarUrl = user.AvatarUrl,
                    IsOnline = user.IsOnline,
                    LastSeenAt = user.LastSeenAt
                }
            });
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(new UserResponseDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                DisplayName = user.DisplayName,
                AvatarUrl = user.AvatarUrl,
                Bio = user.Bio,
                IsOnline = user.IsOnline,
                LastSeenAt = user.LastSeenAt
            });
        }

        [Authorize]
        [HttpPut("update-profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            if (!string.IsNullOrEmpty(dto.DisplayName))
                user.DisplayName = dto.DisplayName;

            if (!string.IsNullOrEmpty(dto.Bio))
                user.Bio = dto.Bio;

            if (!string.IsNullOrEmpty(dto.AvatarUrl))
                user.AvatarUrl = dto.AvatarUrl;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Profile updated successfully" });
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
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
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var user = await _context.Users.FindAsync(userId);

            if (user != null)
            {
                user.IsOnline = false;
                user.LastSeenAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Logged out successfully" });
        }

        private string GenerateJwtToken(User user)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Username)
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

    // ==========================================
    // 2️⃣ FILES CONTROLLER (Cloudinary)
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FilesController : ControllerBase
    {
        private readonly ICloudinaryService _cloudinaryService;

        public FilesController(ICloudinaryService cloudinaryService)
        {
            _cloudinaryService = cloudinaryService;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded" });
            }

            var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "video/mp4", "audio/mpeg", "audio/wav", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };

            if (!allowedTypes.Contains(file.ContentType))
            {
                return BadRequest(new { message = "File type not allowed" });
            }

            if (file.Length > 50 * 1024 * 1024)
            {
                return BadRequest(new { message = "File size exceeds 50MB limit" });
            }

            try
            {
                var uploadResult = await _cloudinaryService.UploadFileAsync(file);

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
                return StatusCode(500, new { message = "Upload failed", error = ex.Message });
            }
        }

        [HttpDelete("delete/{publicId}")]
        public async Task<IActionResult> DeleteFile(string publicId)
        {
            try
            {
                var result = await _cloudinaryService.DeleteFileAsync(publicId);

                if (result)
                {
                    return Ok(new { message = "File deleted successfully" });
                }

                return BadRequest(new { message = "Failed to delete file" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Delete failed", error = ex.Message });
            }
        }
    }

    // ==========================================
    // 3️⃣ CONVERSATIONS CONTROLLER
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ConversationsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;

        public ConversationsController(AppDbContext context, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet("my-conversations")]
        public async Task<IActionResult> GetMyConversations()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var conversations = await _context.ConversationParticipants
                .Where(cp => cp.UserId == userId)
                .Include(cp => cp.Conversation)
                    .ThenInclude(c => c.Participants)
                        .ThenInclude(p => p.User)
                .Include(cp => cp.Conversation)
                    .ThenInclude(c => c.Messages)
                        .ThenInclude(m => m.Sender)
                .Select(cp => new ConversationResponseDto
                {
                    Id = cp.Conversation.Id,
                    Name = cp.Conversation.Name,
                    IsGroup = cp.Conversation.IsGroup,
                    AvatarUrl = cp.Conversation.AvatarUrl,
                    CreatedAt = cp.Conversation.CreatedAt,
                    LastMessage = cp.Conversation.Messages
                        .OrderByDescending(m => m.SentAt)
                        .Select(m => new MessageResponseDto
                        {
                            Id = m.Id,
                            Content = m.Content,
                            MessageType = m.MessageType,
                            SentAt = m.SentAt,
                            SenderId = m.SenderId,
                            SenderName = m.Sender.DisplayName,
                            SenderAvatar = m.Sender.AvatarUrl
                        })
                        .FirstOrDefault(),
                    Participants = cp.Conversation.Participants
                        .Select(p => new ParticipantResponseDto
                        {
                            UserId = p.UserId,
                            Username = p.User.Username,
                            DisplayName = p.User.DisplayName,
                            AvatarUrl = p.User.AvatarUrl,
                            IsOnline = p.User.IsOnline,
                            Role = p.Role
                        })
                        .ToList(),
                    UnreadCount = _context.Messages
                        .Count(m => m.ConversationId == cp.ConversationId &&
                                   m.SenderId != userId &&
                                   !_context.MessageReadReceipts.Any(r => r.MessageId == m.Id && r.UserId == userId))
                })
                .OrderByDescending(c => c.LastMessage.SentAt)
                .ToListAsync();

            return Ok(conversations);
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateConversation([FromBody] CreateConversationDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            if (dto.ParticipantIds == null || !dto.ParticipantIds.Any())
            {
                return BadRequest(new { message = "At least one participant is required" });
            }

            if (!dto.ParticipantIds.Contains(userId))
            {
                dto.ParticipantIds.Add(userId);
            }

            var conversation = new Conversation
            {
                Name = dto.Name,
                IsGroup = dto.IsGroup,
                AvatarUrl = dto.AvatarUrl ?? "https://via.placeholder.com/150",
                CreatedAt = DateTime.UtcNow,
                CreatedById = userId
            };

            _context.Conversations.Add(conversation);
            await _context.SaveChangesAsync();

            foreach (var participantId in dto.ParticipantIds)
            {
                var participant = new ConversationParticipant
                {
                    ConversationId = conversation.Id,
                    UserId = participantId,
                    JoinedAt = DateTime.UtcNow,
                    Role = participantId == userId ? "Admin" : "Member"
                };

                _context.ConversationParticipants.Add(participant);
            }

            await _context.SaveChangesAsync();

            await _hubContext.Clients.Users(dto.ParticipantIds.Select(id => id.ToString()))
                .SendAsync("ConversationCreated", new { conversationId = conversation.Id });

            return Ok(new { conversationId = conversation.Id, message = "Conversation created successfully" });
        }

        [HttpPost("{conversationId}/add-participants")]
        public async Task<IActionResult> AddParticipants(int conversationId, [FromBody] AddParticipantsDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var conversation = await _context.Conversations
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conversation == null)
            {
                return NotFound(new { message = "Conversation not found" });
            }

            var currentParticipant = conversation.Participants.FirstOrDefault(p => p.UserId == userId);

            if (currentParticipant == null)
            {
                return Forbid();
            }

            if (conversation.IsGroup && currentParticipant.Role != "Admin")
            {
                return Forbid();
            }

            foreach (var participantId in dto.ParticipantIds)
            {
                if (!conversation.Participants.Any(p => p.UserId == participantId))
                {
                    var participant = new ConversationParticipant
                    {
                        ConversationId = conversationId,
                        UserId = participantId,
                        JoinedAt = DateTime.UtcNow,
                        Role = "Member"
                    };

                    _context.ConversationParticipants.Add(participant);
                }
            }

            await _context.SaveChangesAsync();

            var allParticipantIds = conversation.Participants.Select(p => p.UserId.ToString()).ToList();
            await _hubContext.Clients.Users(allParticipantIds)
                .SendAsync("ParticipantsAdded", new { conversationId, newParticipantIds = dto.ParticipantIds });

            return Ok(new { message = "Participants added successfully" });
        }

        [HttpPost("{conversationId}/leave")]
        public async Task<IActionResult> LeaveConversation(int conversationId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var participant = await _context.ConversationParticipants
                .FirstOrDefaultAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

            if (participant == null)
            {
                return NotFound(new { message = "You are not a participant in this conversation" });
            }

            _context.ConversationParticipants.Remove(participant);
            await _context.SaveChangesAsync();

            var remainingParticipantIds = await _context.ConversationParticipants
                .Where(cp => cp.ConversationId == conversationId)
                .Select(cp => cp.UserId.ToString())
                .ToListAsync();

            await _hubContext.Clients.Users(remainingParticipantIds)
                .SendAsync("ParticipantLeft", new { conversationId, userId });

            return Ok(new { message = "Left conversation successfully" });
        }

        [HttpGet("{conversationId}/details")]
        public async Task<IActionResult> GetConversationDetails(int conversationId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var participant = await _context.ConversationParticipants
                .FirstOrDefaultAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

            if (participant == null)
            {
                return Forbid();
            }

            var conversation = await _context.Conversations
                .Include(c => c.Participants)
                    .ThenInclude(p => p.User)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conversation == null)
            {
                return NotFound(new { message = "Conversation not found" });
            }

            return Ok(new ConversationDetailsResponseDto
            {
                Id = conversation.Id,
                Name = conversation.Name,
                IsGroup = conversation.IsGroup,
                AvatarUrl = conversation.AvatarUrl,
                CreatedAt = conversation.CreatedAt,
                Participants = conversation.Participants
                    .Select(p => new ParticipantResponseDto
                    {
                        UserId = p.UserId,
                        Username = p.User.Username,
                        DisplayName = p.User.DisplayName,
                        AvatarUrl = p.User.AvatarUrl,
                        IsOnline = p.User.IsOnline,
                        Role = p.Role,
                        JoinedAt = p.JoinedAt
                    })
                    .ToList()
            });
        }
    }

    // ==========================================
    // 4️⃣ MESSAGES CONTROLLER
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MessagesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;

        public MessagesController(AppDbContext context, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet("conversation/{conversationId}")]
        public async Task<IActionResult> GetMessages(int conversationId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var participant = await _context.ConversationParticipants
                .FirstOrDefaultAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

            if (participant == null)
            {
                return Forbid();
            }

            var messages = await _context.Messages
                .Where(m => m.ConversationId == conversationId && !m.IsDeleted)
                .Include(m => m.Sender)
                .Include(m => m.ReadReceipts)
                .Include(m => m.Reactions)
                    .ThenInclude(r => r.User)
                .OrderByDescending(m => m.SentAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(m => new MessageResponseDto
                {
                    Id = m.Id,
                    ConversationId = m.ConversationId,
                    SenderId = m.SenderId,
                    SenderName = m.Sender.DisplayName,
                    SenderAvatar = m.Sender.AvatarUrl,
                    Content = m.Content,
                    MessageType = m.MessageType,
                    FileUrl = m.FileUrl,
                    FileName = m.FileName,
                    FileSize = m.FileSize,
                    ThumbnailUrl = m.ThumbnailUrl,
                    Duration = m.Duration,
                    SentAt = m.SentAt,
                    IsEdited = m.IsEdited,
                    EditedAt = m.EditedAt,
                    IsPinned = _context.PinnedMessages.Any(pm => pm.MessageId == m.Id),
                    ReplyToMessageId = m.ReplyToMessageId,
                    ReadReceipts = m.ReadReceipts.Select(rr => new ReadReceiptResponseDto
                    {
                        UserId = rr.UserId,
                        ReadAt = rr.ReadAt
                    }).ToList(),
                    Reactions = m.Reactions.Select(r => new ReactionResponseDto
                    {
                        Id = r.Id,
                        Emoji = r.Emoji,
                        UserId = r.UserId,
                        Username = r.User.DisplayName,
                        CreatedAt = r.CreatedAt
                    }).ToList()
                })
                .ToListAsync();

            messages.Reverse();

            return Ok(messages);
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendMessage([FromBody] CreateMessageDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var participant = await _context.ConversationParticipants
                .FirstOrDefaultAsync(cp => cp.ConversationId == dto.ConversationId && cp.UserId == userId);

            if (participant == null)
            {
                return Forbid();
            }

            var message = new Message
            {
                ConversationId = dto.ConversationId,
                SenderId = userId,
                Content = dto.Content,
                MessageType = dto.MessageType,
                FileUrl = dto.FileUrl,
                FileName = dto.FileName,
                FileSize = dto.FileSize,
                ThumbnailUrl = dto.ThumbnailUrl,
                Duration = dto.Duration,
                ReplyToMessageId = dto.ReplyToMessageId,
                SentAt = DateTime.UtcNow,
                IsDeleted = false,
                IsEdited = false
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            var sender = await _context.Users.FindAsync(userId);

            var messageResponse = new MessageResponseDto
            {
                Id = message.Id,
                ConversationId = message.ConversationId,
                SenderId = message.SenderId,
                SenderName = sender.DisplayName,
                SenderAvatar = sender.AvatarUrl,
                Content = message.Content,
                MessageType = message.MessageType,
                FileUrl = message.FileUrl,
                FileName = message.FileName,
                FileSize = message.FileSize,
                ThumbnailUrl = message.ThumbnailUrl,
                Duration = message.Duration,
                SentAt = message.SentAt,
                IsEdited = false,
                IsPinned = false,
                ReplyToMessageId = message.ReplyToMessageId,
                ReadReceipts = new List<ReadReceiptResponseDto>(),
                Reactions = new List<ReactionResponseDto>()
            };

            var participantIds = await _context.ConversationParticipants
                .Where(cp => cp.ConversationId == dto.ConversationId)
                .Select(cp => cp.UserId.ToString())
                .ToListAsync();

            await _hubContext.Clients.Users(participantIds)
                .SendAsync("NewMessage", messageResponse);

            return Ok(messageResponse);
        }

        [HttpPut("{messageId}/edit")]
        public async Task<IActionResult> EditMessage(int messageId, [FromBody] EditMessageDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var message = await _context.Messages.FindAsync(messageId);

            if (message == null || message.IsDeleted)
            {
                return NotFound(new { message = "Message not found" });
            }

            if (message.SenderId != userId)
            {
                return Forbid();
            }

            var editHistory = new MessageEditHistory
            {
                MessageId = messageId,
                OldContent = message.Content,
                EditedAt = DateTime.UtcNow
            };

            _context.MessageEditHistories.Add(editHistory);

            message.Content = dto.NewContent;
            message.IsEdited = true;
            message.EditedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var participantIds = await _context.ConversationParticipants
                .Where(cp => cp.ConversationId == message.ConversationId)
                .Select(cp => cp.UserId.ToString())
                .ToListAsync();

            await _hubContext.Clients.Users(participantIds)
                .SendAsync("MessageEdited", new { messageId, newContent = dto.NewContent, editedAt = message.EditedAt });

            return Ok(new { message = "Message edited successfully" });
        }

        [HttpDelete("{messageId}/recall")]
        public async Task<IActionResult> RecallMessage(int messageId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var message = await _context.Messages.FindAsync(messageId);

            if (message == null || message.IsDeleted)
            {
                return NotFound(new { message = "Message not found" });
            }

            if (message.SenderId != userId)
            {
                return Forbid();
            }

            message.IsDeleted = true;
            message.Content = "Message was recalled";
            await _context.SaveChangesAsync();

            var participantIds = await _context.ConversationParticipants
                .Where(cp => cp.ConversationId == message.ConversationId)
                .Select(cp => cp.UserId.ToString())
                .ToListAsync();

            await _hubContext.Clients.Users(participantIds)
                .SendAsync("MessageRecalled", new { messageId });

            return Ok(new { message = "Message recalled successfully" });
        }

        [HttpPost("{messageId}/react")]
        public async Task<IActionResult> ReactToMessage(int messageId, [FromBody] ReactDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var message = await _context.Messages
                .Include(m => m.Conversation)
                    .ThenInclude(c => c.Participants)
                .FirstOrDefaultAsync(m => m.Id == messageId);

            if (message == null || message.IsDeleted)
            {
                return NotFound(new { message = "Message not found" });
            }

            if (!message.Conversation.Participants.Any(p => p.UserId == userId))
            {
                return Forbid();
            }

            var existingReaction = await _context.MessageReactions
                .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId && r.Emoji == dto.Emoji);

            if (existingReaction != null)
            {
                _context.MessageReactions.Remove(existingReaction);
                await _context.SaveChangesAsync();

                var participantIds = message.Conversation.Participants.Select(p => p.UserId.ToString()).ToList();
                await _hubContext.Clients.Users(participantIds)
                    .SendAsync("ReactionRemoved", new { messageId, userId, emoji = dto.Emoji });

                return Ok(new { message = "Reaction removed" });
            }

            var reaction = new MessageReaction
            {
                MessageId = messageId,
                UserId = userId,
                Emoji = dto.Emoji,
                CreatedAt = DateTime.UtcNow
            };

            _context.MessageReactions.Add(reaction);
            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(userId);

            var participantIdsForReaction = message.Conversation.Participants.Select(p => p.UserId.ToString()).ToList();
            await _hubContext.Clients.Users(participantIdsForReaction)
                .SendAsync("ReactionAdded", new
                {
                    messageId,
                    reaction = new ReactionResponseDto
                    {
                        Id = reaction.Id,
                        Emoji = reaction.Emoji,
                        UserId = userId,
                        Username = user.DisplayName,
                        CreatedAt = reaction.CreatedAt
                    }
                });

            return Ok(new { message = "Reaction added successfully" });
        }

        [HttpPost("forward")]
        public async Task<IActionResult> ForwardMessage([FromBody] ForwardDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var originalMessage = await _context.Messages.FindAsync(dto.MessageId);

            if (originalMessage == null || originalMessage.IsDeleted)
            {
                return NotFound(new { message = "Original message not found" });
            }

            foreach (var conversationId in dto.TargetConversationIds)
            {
                var participant = await _context.ConversationParticipants
                    .FirstOrDefaultAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

                if (participant == null)
                {
                    continue;
                }

                var forwardedMessage = new Message
                {
                    ConversationId = conversationId,
                    SenderId = userId,
                    Content = originalMessage.Content,
                    MessageType = originalMessage.MessageType,
                    FileUrl = originalMessage.FileUrl,
                    FileName = originalMessage.FileName,
                    FileSize = originalMessage.FileSize,
                    ThumbnailUrl = originalMessage.ThumbnailUrl,
                    Duration = originalMessage.Duration,
                    SentAt = DateTime.UtcNow,
                    IsDeleted = false,
                    IsEdited = false
                };

                _context.Messages.Add(forwardedMessage);
                await _context.SaveChangesAsync();

                var participantIds = await _context.ConversationParticipants
                    .Where(cp => cp.ConversationId == conversationId)
                    .Select(cp => cp.UserId.ToString())
                    .ToListAsync();

                var sender = await _context.Users.FindAsync(userId);

                await _hubContext.Clients.Users(participantIds)
                    .SendAsync("NewMessage", new MessageResponseDto
                    {
                        Id = forwardedMessage.Id,
                        ConversationId = forwardedMessage.ConversationId,
                        SenderId = forwardedMessage.SenderId,
                        SenderName = sender.DisplayName,
                        SenderAvatar = sender.AvatarUrl,
                        Content = forwardedMessage.Content,
                        MessageType = forwardedMessage.MessageType,
                        FileUrl = forwardedMessage.FileUrl,
                        FileName = forwardedMessage.FileName,
                        SentAt = forwardedMessage.SentAt
                    });
            }

            return Ok(new { message = "Message forwarded successfully" });
        }

        [HttpPost("{messageId}/pin")]
        public async Task<IActionResult> PinMessage(int messageId, [FromBody] PinMessageDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var message = await _context.Messages
                .Include(m => m.Conversation)
                    .ThenInclude(c => c.Participants)
                .FirstOrDefaultAsync(m => m.Id == messageId);

            if (message == null || message.IsDeleted)
            {
                return NotFound(new { message = "Message not found" });
            }

            var participant = message.Conversation.Participants.FirstOrDefault(p => p.UserId == userId);

            if (participant == null || (message.Conversation.IsGroup && participant.Role != "Admin"))
            {
                return Forbid();
            }

            var existingPin = await _context.PinnedMessages
                .FirstOrDefaultAsync(pm => pm.MessageId == messageId);

            if (dto.IsPinned)
            {
                if (existingPin == null)
                {
                    var pinnedMessage = new PinnedMessage
                    {
                        MessageId = messageId,
                        ConversationId = message.ConversationId,
                        PinnedById = userId,
                        PinnedAt = DateTime.UtcNow
                    };

                    _context.PinnedMessages.Add(pinnedMessage);
                    await _context.SaveChangesAsync();

                    var participantIds = message.Conversation.Participants.Select(p => p.UserId.ToString()).ToList();
                    await _hubContext.Clients.Users(participantIds)
                        .SendAsync("MessagePinned", new { messageId, conversationId = message.ConversationId });
                }
            }
            else
            {
                if (existingPin != null)
                {
                    _context.PinnedMessages.Remove(existingPin);
                    await _context.SaveChangesAsync();

                    var participantIds = message.Conversation.Participants.Select(p => p.UserId.ToString()).ToList();
                    await _hubContext.Clients.Users(participantIds)
                        .SendAsync("MessageUnpinned", new { messageId, conversationId = message.ConversationId });
                }
            }

            return Ok(new { message = dto.IsPinned ? "Message pinned successfully" : "Message unpinned successfully" });
        }

        [HttpGet("conversation/{conversationId}/pinned")]
        public async Task<IActionResult> GetPinnedMessages(int conversationId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var participant = await _context.ConversationParticipants
                .FirstOrDefaultAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId);

            if (participant == null)
            {
                return Forbid();
            }

            var pinnedMessages = await _context.PinnedMessages
                .Where(pm => pm.ConversationId == conversationId)
                .Include(pm => pm.Message)
                    .ThenInclude(m => m.Sender)
                .Include(pm => pm.PinnedBy)
                .Select(pm => new PinnedMessageResponseDto
                {
                    MessageId = pm.MessageId,
                    Content = pm.Message.Content,
                    MessageType = pm.Message.MessageType,
                    SenderName = pm.Message.Sender.DisplayName,
                    PinnedByName = pm.PinnedBy.DisplayName,
                    PinnedAt = pm.PinnedAt
                })
                .ToListAsync();

            return Ok(pinnedMessages);
        }
    }

    // ==========================================
    // 5️⃣ MESSAGE READ RECEIPTS CONTROLLER
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MessageReadReceiptsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;

        public MessageReadReceiptsController(AppDbContext context, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpPost("{messageId}/mark-read")]
        public async Task<IActionResult> MarkAsRead(int messageId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var message = await _context.Messages
                .Include(m => m.Conversation)
                    .ThenInclude(c => c.Participants)
                .FirstOrDefaultAsync(m => m.Id == messageId);

            if (message == null || message.IsDeleted)
            {
                return NotFound(new { message = "Message not found" });
            }

            if (!message.Conversation.Participants.Any(p => p.UserId == userId))
            {
                return Forbid();
            }

            var existingReceipt = await _context.MessageReadReceipts
                .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId);

            if (existingReceipt != null)
            {
                return Ok(new { message = "Already marked as read" });
            }

            var readReceipt = new MessageReadReceipt
            {
                MessageId = messageId,
                UserId = userId,
                ReadAt = DateTime.UtcNow
            };

            _context.MessageReadReceipts.Add(readReceipt);
            await _context.SaveChangesAsync();

            var participantIds = message.Conversation.Participants.Select(p => p.UserId.ToString()).ToList();
            await _hubContext.Clients.Users(participantIds)
                .SendAsync("MessageRead", new { messageId, userId, readAt = readReceipt.ReadAt });

            return Ok(new { message = "Message marked as read" });
        }

        [HttpGet("{messageId}/receipts")]
        public async Task<IActionResult> GetReadReceipts(int messageId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var message = await _context.Messages
                .Include(m => m.Conversation)
                    .ThenInclude(c => c.Participants)
                .FirstOrDefaultAsync(m => m.Id == messageId);

            if (message == null)
            {
                return NotFound(new { message = "Message not found" });
            }

            if (!message.Conversation.Participants.Any(p => p.UserId == userId))
            {
                return Forbid();
            }

            var receipts = await _context.MessageReadReceipts
                .Where(r => r.MessageId == messageId)
                .Include(r => r.User)
                .Select(r => new ReadReceiptResponseDto
                {
                    UserId = r.UserId,
                    Username = r.User.DisplayName,
                    AvatarUrl = r.User.AvatarUrl,
                    ReadAt = r.ReadAt
                })
                .ToListAsync();

            return Ok(receipts);
        }
    }

    // ==========================================
    // 6️⃣ REACTIONS CONTROLLER
    // ==========================================
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReactionsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;

        public ReactionsController(AppDbContext context, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddReaction([FromBody] ReactionDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var message = await _context.Messages
                .Include(m => m.Conversation)
                    .ThenInclude(c => c.Participants)
                .FirstOrDefaultAsync(m => m.Id == dto.MessageId);

            if (message == null || message.IsDeleted)
            {
                return NotFound(new { message = "Message not found" });
            }

            if (!message.Conversation.Participants.Any(p => p.UserId == userId))
            {
                return Forbid();
            }

            var existingReaction = await _context.MessageReactions
                .FirstOrDefaultAsync(r => r.MessageId == dto.MessageId && r.UserId == userId && r.Emoji == dto.Emoji);

            if (existingReaction != null)
            {
                return BadRequest(new { message = "Reaction already exists" });
            }

            var reaction = new MessageReaction
            {
                MessageId = dto.MessageId,
                UserId = userId,
                Emoji = dto.Emoji,
                CreatedAt = DateTime.UtcNow
            };

            _context.MessageReactions.Add(reaction);
            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(userId);
            var participantIds = message.Conversation.Participants.Select(p => p.UserId.ToString()).ToList();

            await _hubContext.Clients.Users(participantIds)
                .SendAsync("ReactionAdded", new
                {
                    messageId = dto.MessageId,
                    reaction = new ReactionResponseDto
                    {
                        Id = reaction.Id,
                        Emoji = reaction.Emoji,
                        UserId = userId,
                        Username = user.DisplayName,
                        CreatedAt = reaction.CreatedAt
                    }
                });

            return Ok(new { message = "Reaction added successfully" });
        }

        [HttpDelete("{reactionId}")]
        public async Task<IActionResult> RemoveReaction(int reactionId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var reaction = await _context.MessageReactions
                .Include(r => r.Message)
                    .ThenInclude(m => m.Conversation)
                        .ThenInclude(c => c.Participants)
                .FirstOrDefaultAsync(r => r.Id == reactionId);

            if (reaction == null)
            {
                return NotFound(new { message = "Reaction not found" });
            }

            if (reaction.UserId != userId)
            {
                return Forbid();
            }

            _context.MessageReactions.Remove(reaction);
            await _context.SaveChangesAsync();

            var participantIds = reaction.Message.Conversation.Participants.Select(p => p.UserId.ToString()).ToList();
            await _hubContext.Clients.Users(participantIds)
                .SendAsync("ReactionRemoved", new { messageId = reaction.MessageId, userId, emoji = reaction.Emoji });

            return Ok(new { message = "Reaction removed successfully" });
        }
    }
}
