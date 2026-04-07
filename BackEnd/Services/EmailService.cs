using System.Net;
using System.Net.Mail;

namespace TaskCRUD.Services
{
    public class EmailService
    {

        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            var smtp = _config.GetSection("Smtp");

            var client = new SmtpClient(smtp["Host"], int.Parse(smtp["Port"]))
            {
                Credentials = new NetworkCredential(
                    smtp["UserName"],
                    smtp["Password"]
                ),
                EnableSsl = bool.Parse(smtp["EnableSsl"])
            };

            var mail = new MailMessage
            {
                From = new MailAddress(smtp["From"], smtp["FromDisplayName"]),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };

            mail.To.Add(toEmail);

            await client.SendMailAsync(mail);
        }
    }
}
