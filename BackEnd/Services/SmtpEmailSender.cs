using System.Net;
using System.Net.Mail;

namespace TaskCRUD.Services

{
   
    public class SmtpEmailSender : IEmailSender
    {
        private readonly IConfiguration _config;
        public SmtpEmailSender(IConfiguration config) => _config = config;

        public async Task SendAsync(string to, string subject, string htmlBody)
        {
            var host = _config["Smtp:Host"];
            var port = int.Parse(_config["Smtp:Port"] ?? "587");
            var enableSsl = bool.Parse(_config["Smtp:EnableSsl"] ?? "true");
            var username = _config["Smtp:UserName"];
            var password = _config["Smtp:Password"];
            var from = _config["Smtp:From"];
            var display = _config["Smtp:FromDisplayName"] ?? from;

            using var client = new SmtpClient(host!, port)
            {
                EnableSsl = enableSsl,
                Credentials = new NetworkCredential(username, password)
            };

            using var msg = new MailMessage
            {
                From = new MailAddress(from!, display),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };

            msg.To.Add(to);
            await client.SendMailAsync(msg);
        }
    }
}
