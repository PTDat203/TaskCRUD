using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using TaskCRUD.Data;
using TaskCRUD.DTOs;
using TaskCRUD.Models;
using TaskCRUD.Services;

namespace TaskCRUD.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PasswordController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly IEmailSender _emailSender;

        private static string CodeKey(string email) => $"pwd_code::{email.ToLower()}";
        private static string TokenKey(string email) => $"pwd_token::{email.ToLower()}";

        public PasswordController(
            ApplicationDbContext context,
            IMemoryCache cache,
            IEmailSender emailSender)
        {
            _context = context;
            _cache = cache;
            _emailSender = emailSender;
        }

        [HttpPost("forgot")]
        public async Task<IActionResult> Forgot([FromBody] ForgotByEmailDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var email = dto.Email.Trim().ToLower();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email);

            if (user == null)
                return BadRequest("Email không tồn tại.");

         
            var code = Random.Shared.Next(0, 999999).ToString("D6");

            _cache.Set(CodeKey(email), code, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1)
            });

            var html = $@"
                <h3>Reset Password</h3>
                <p>Mã xác nhận của bạn:</p>
                <h2>{code}</h2>
                <p>Hiệu lực 1 phút</p>";

            await _emailSender.SendAsync(email, "Reset Password Code", html);

            return Ok("Đã gửi mã xác nhận.");
        }

        [HttpPost("verify")]
        public IActionResult Verify([FromBody] VerifyCodeDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var email = dto.Email.Trim().ToLower();

            if (!_cache.TryGetValue<string>(CodeKey(email), out var cachedCode))
                return BadRequest("Mã đã hết hạn.");

            if (cachedCode != dto.Code)
                return BadRequest("Mã không đúng.");

            var resetToken = Guid.NewGuid().ToString();

            _cache.Remove(CodeKey(email));

            _cache.Set(TokenKey(email), resetToken, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
            });

            return Ok(new { resetToken });
        }

        [HttpPost("reset")]
        public async Task<IActionResult> Reset([FromBody] ResetPasswordDTO dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var email = dto.Email.Trim().ToLower();

            if (!_cache.TryGetValue<string>(TokenKey(email), out var token)
                || token != dto.ResetToken)
            {
                return BadRequest("Token không hợp lệ hoặc hết hạn.");
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email);

            if (user == null)
                return BadRequest("User không tồn tại.");

            if (dto.NewPassword.Length < 8)
                return BadRequest("Mật khẩu >= 8 ký tự.");

            user.Password = dto.NewPassword;

            await _context.SaveChangesAsync();

            _cache.Remove(TokenKey(email));

            return Ok("Đổi mật khẩu thành công.");
        }
    }
}