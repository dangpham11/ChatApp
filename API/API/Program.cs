using API.Services;
using API.SignaIR;
using ChatApi.Extensions;
using ChatApi.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Diagnostics;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ===============================
// 1️⃣ Add Controllers + DbContext
// ===============================
builder.Services.AddControllers();
builder.Services.AddAppServices(builder.Configuration);

// ===============================
// 2️⃣ Cấu hình JWT Authentication
// ===============================
var jwtSection = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtSection["Key"] ?? throw new Exception("JWT Key is missing in configuration"));

builder.Services.AddAuthorization();
builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();
builder.Services.AddSingleton<IUserIdProvider, CustomUserIdProvider>();

// ===============================
// 4️⃣ SignalR
// ===============================
builder.Services.AddSignalR();

// ===============================
// 5️⃣ Swagger cấu hình đầy đủ
// ===============================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Chat API", Version = "v1" });

    // ✅ JWT Auth cho Swagger UI
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: 'Bearer {token}'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
    c.MapType<IFormFile>(() => new OpenApiSchema { Type = "string", Format = "binary" });
    c.MapType<IFormFileCollection>(() => new OpenApiSchema { Type = "array", Items = new OpenApiSchema { Type = "string", Format = "binary" } });

});

// ===============================
// 6️⃣ Build App
// ===============================
var app = builder.Build();

// ===============================
// 7️⃣ Middleware pipeline
// ===============================
app.UseRouting();
app.UseCors("CorsPolicy");

// ✅ Authentication phải trước Authorization
app.UseAuthentication();
app.UseAuthorization();

// ✅ Swagger UI
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Chat API V1");
    options.RoutePrefix = string.Empty;
});

// ✅ Auto-open Swagger khi khởi động
var url = app.Urls.FirstOrDefault() ?? "http://localhost:5000";
app.Lifetime.ApplicationStarted.Register(() =>
{
    try
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = url,
            UseShellExecute = true
        });
    }
    catch { }
});

// ✅ Map routes và SignalR
app.MapControllers();
app.MapHub<ChatHub>("/api/chathub");

// ===============================
// 8️⃣ Run
// ===============================
app.Run();
