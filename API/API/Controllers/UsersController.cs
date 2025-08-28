using API.Data;
using API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly DataContext _context;

        public UsersController(DataContext context)
        {
            _context = context;
        }

        [HttpGet]
        public ActionResult<IEnumerable<AppUser>> GetUsers()
        {
            try
            {
                var users = _context.Users.ToList();
                return users;
            }
            catch (Exception ex)
            {
                // Return the error message for debugging
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
        [HttpGet("{id}")]
        public ActionResult<AppUser> GetUser(int id)
        {
            try
            {
                var user = _context.Users.Find(id);
                if (user == null)
                {
                    return NotFound($"User with ID {id} not found.");
                }
                return user;
            }
            catch (Exception ex)
            {
                // Return the error message for debugging
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost]
        public ActionResult<AppUser> CreateUser(AppUser user)
        {
            try
            {
                _context.Users.Add(user);
                _context.SaveChanges();
                return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
            }
            catch (Exception ex)
            {
                // Return the error message for debugging
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
