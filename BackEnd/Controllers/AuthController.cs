using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TaskCRUD.Data;
using TaskCRUD.DTOs;
using TaskCRUD.Models;
using TaskCRUD.Services;

namespace TaskCRUD.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly JwtService _jwtService;

        public AuthController(ApplicationDbContext dbContext, JwtService jwtService)
        {
            _dbContext = dbContext;
            _jwtService = jwtService;
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<ActionResult<LoginResponseDto>> Register(RegisterRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Name) ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Name, email and password are required.");
            }

            var email = request.Email.Trim().ToLower();
            var existedUser = await _dbContext.Users.AnyAsync(u => u.Email.ToLower() == email);
            if (existedUser)
            {
                return Conflict("Email already exists.");
            }

            // Default role after register is USER.
            var newUser = new User
            {
                Name = request.Name.Trim(),
                Email = email,
                Password = request.Password,
                Role = "USER"
            };

            _dbContext.Users.Add(newUser);
            await _dbContext.SaveChangesAsync();

            var token = _jwtService.GenerateToken(newUser);
            return Ok(new LoginResponseDto
            {
                Token = token,
                Name = newUser.Name,
                Email = newUser.Email,
                Role = newUser.Role
            });
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<LoginResponseDto>> Login(LoginRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest("Email and password are required.");
            }

            var email = request.Email.Trim().ToLower();

            var user = await _dbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email);

            if (user == null)
            {
                return Unauthorized("Invalid email or password.");
            }

            // Current project stores plain text password.
            if (user.Password != request.Password)
            {
                return Unauthorized("Invalid email or password.");
            }

            var token = _jwtService.GenerateToken(user);

            return Ok(new LoginResponseDto
            {
                Token = token,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role
            });
        }

        [HttpGet("users")]
        [Authorize(Roles = "ADMIN")]
        public async Task<ActionResult<List<UserSummaryDto>>> GetUsers()
        {
            var users = await _dbContext.Users
                .AsNoTracking()
                .OrderBy(u => u.Id)
                .Select(u => new UserSummaryDto
                {
                    Id = u.Id,
                    Name = u.Name,
                    Email = u.Email,
                    Role = u.Role.ToUpper()
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpPut("users/{id}/role")]
        [Authorize(Roles = "ADMIN")]
        public async Task<ActionResult<UserSummaryDto>> UpdateUserRole(int id, UpdateUserRoleDto request)
        {
            var normalizedRole = (request.Role ?? string.Empty).Trim().ToUpper();
            if (normalizedRole is not ("USER" or "ADMIN"))
            {
                return BadRequest("Role chỉ được phép là USER hoặc ADMIN.");
            }

            var currentUserIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (int.TryParse(currentUserIdClaim, out var currentUserId) && currentUserId == id)
            {
                return BadRequest("Không thể tự đổi role của chính mình.");
            }

            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
            {
                return NotFound("Không tìm thấy user.");
            }

            user.Role = normalizedRole;
            await _dbContext.SaveChangesAsync();

            return Ok(new UserSummaryDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role
            });
        }
    }
}
