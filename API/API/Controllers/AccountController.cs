using API.Data;
using API.DTOs;
using API.Entities;
using API.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AccountController : ControllerBase
{
    private readonly DataContext _context;
    private readonly ITokenService _tokenService;

    public AccountController(DataContext context, ITokenService tokenService)
    {
        _context = context;
        _tokenService = tokenService;
    }

    // Đăng ký
    [HttpPost("register")]
    public async Task<ActionResult<UserDto>> Register(UserRegisterDto dto)
    {
        if (await UserExists(dto.Email))
            return BadRequest("Email is already registered");

        using var hmac = new HMACSHA512();

        var user = new AppUser
        {
            Email = dto.Email.ToLower(),
            FullName = dto.FullName,
            DisplayName = dto.DisplayName,
            BirthDate = dto.BirthDate,
            Gender = dto.Gender,
            PhoneNumber = dto.PhoneNumber,
            AvatarUrl = dto.AvatarUrl, // có thể null
            PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dto.Password)),
            PasswordSalt = hmac.Key
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            AvatarUrl = user.AvatarUrl,
            Token = _tokenService.CreateToken(user)
        };
    }


    // Đăng nhập
    [HttpPost("login")]
    public async Task<ActionResult<UserDto>> Login(UserLoginDto dto)
    {
        var user = await _context.Users
            .SingleOrDefaultAsync(x => x.Email == dto.Email.ToLower());

        if (user == null) return Unauthorized("Invalid email");

        using var hmac = new HMACSHA512(user.PasswordSalt);
        var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dto.Password));

        for (int i = 0; i < computedHash.Length; i++)
        {
            if (computedHash[i] != user.PasswordHash[i])
                return Unauthorized("Invalid password");
        }

        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            AvatarUrl = user.AvatarUrl,
            Token = _tokenService.CreateToken(user)
        };
    }

    private async Task<bool> UserExists(string email)
    {
        return await _context.Users.AnyAsync(x => x.Email == email.ToLower());
    }
}
