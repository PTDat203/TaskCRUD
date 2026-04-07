using System.ComponentModel.DataAnnotations;

namespace TaskCRUD.DTOs
{
    public class ForgotByEmailDTO
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }
    public class VerifyCodeDTO
    {
        [Required]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Code { get; set; } = string.Empty;
    }

    public class ResetPasswordDTO
    {
        [Required]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string ResetToken { get; set; } = string.Empty;

        [Required]
        public string NewPassword { get; set; } = string.Empty;
    }

}
