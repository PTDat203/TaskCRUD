using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Linq;
using TaskCRUD.Data;
using TaskCRUD.DTOs;
using TaskCRUD.Models;
using TaskCRUD.Services;
using Google.Apis.Auth;

namespace TaskCRUD.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly JwtService _jwtService;
        private readonly IConfiguration _config;

        public AuthController(ApplicationDbContext dbContext, JwtService jwtService, IConfiguration config)
        {
            _dbContext = dbContext;
            _jwtService = jwtService;
            _config = config;
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<ActionResult<LoginResponseDto>> Register(RegisterRequestDto request)
        {
            var nonWhitespacePasswordLength = request.Password.Count(c => !char.IsWhiteSpace(c));
            if (nonWhitespacePasswordLength < 8)
            {
                return BadRequest("Mật khẩu phải có ít nhất 8 ký tự.");
            }

            if (!string.Equals(request.Password, request.ConfirmPassword, StringComparison.Ordinal))
            {
                return BadRequest("Mật khẩu xác nhận không khớp.");
            }

            var email = request.Email.Trim().ToLower();
            var existedUser = await _dbContext.Users.AnyAsync(u => u.Email.ToLower() == email);
            if (existedUser)
            {
                return Conflict("Email đã được sử dụng.");
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

        [HttpPost("google")]
        [AllowAnonymous]
        public async Task<ActionResult<LoginResponseDto>> LoginWithGoogle(GoogleLoginRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.IdToken))
            {
                return BadRequest("Thiếu idToken.");
            }

            var googleClientId = GetGoogleClientId();
            if (string.IsNullOrWhiteSpace(googleClientId))
                return StatusCode(500, "Thiếu cấu hình Google ClientId (GoogleKeys:ClientId hoặc Authentication:Google:ClientId).");

            GoogleJsonWebSignature.Payload payload;
            try
            {
                payload = await GoogleJsonWebSignature.ValidateAsync(
                    request.IdToken,
                    new GoogleJsonWebSignature.ValidationSettings
                    {
                        Audience = new[] { googleClientId }
                    });
            }
            catch
            {
                return Unauthorized("Google token không hợp lệ.");
            }

            var email = (payload.Email ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email))
            {
                return Unauthorized("Google account không có email.");
            }

            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
            if (user == null)
            {
                // Oracle treats empty string as NULL. Password column is NOT NULL,
                // so we must store a non-empty placeholder for Google accounts.
                user = new User
                {
                    Name = string.IsNullOrWhiteSpace(payload.Name) ? email : payload.Name.Trim(),
                    Email = email,
                    Password = $"GOOGLE:{Guid.NewGuid():N}",
                    Role = "USER"
                };

                _dbContext.Users.Add(user);
                try
                {
                    await _dbContext.SaveChangesAsync();
                }
                catch (DbUpdateException)
                {
                    return StatusCode(500, "Không thể tạo user từ Google account (lỗi DB).");
                }
            }
            else
            {
                var newName = string.IsNullOrWhiteSpace(payload.Name) ? user.Name : payload.Name.Trim();
                if (!string.Equals(user.Name, newName, StringComparison.Ordinal))
                {
                    user.Name = newName;
                    await _dbContext.SaveChangesAsync();
                }
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

        // Alias endpoint following the user's preferred naming.
        // FE can call /api/Auth/google-login
        [HttpPost("google-login")]
        [AllowAnonymous]
        public Task<ActionResult<LoginResponseDto>> GoogleLogin([FromBody] GoogleLoginRequestDto request)
            => LoginWithGoogle(request);

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

        private string? GetGoogleClientId()
            => _config["GoogleKeys:ClientId"] ?? _config["Authentication:Google:ClientId"];

    }
}
