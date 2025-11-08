using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace API.SignaIR
{
    public class CustomUserIdProvider : IUserIdProvider
    {
        public string? GetUserId(HubConnectionContext connection)
        {
            // Lấy userId từ Claim trong JWT token
            return connection.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }
    }
}
