using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using API.Data;

namespace API.Middleware
{
    public class ActivityTrackerMiddleware
    {
        private readonly RequestDelegate _next;

        public ActivityTrackerMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, DataContext db)
        {
            // 🧠 Kiểm tra người dùng đã đăng nhập chưa
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
            {
                var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
                if (user != null)
                {
                    // 🕒 Cập nhật thời gian hoạt động gần nhất
                    user.LastActive = DateTime.UtcNow;
                    await db.SaveChangesAsync();
                }
            }

            // Tiếp tục request pipeline
            await _next(context);
        }
    }
}
