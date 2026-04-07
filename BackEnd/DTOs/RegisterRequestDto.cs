using System.ComponentModel.DataAnnotations;

namespace TaskCRUD.DTOs
{
    public class RegisterRequestDto
    {
        [Required(ErrorMessage = "Vui lòng nhập họ tên.")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng nhập email.")]
        [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng nhập mật khẩu.")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng nhập xác nhận mật khẩu.")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
