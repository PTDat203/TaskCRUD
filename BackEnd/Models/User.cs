namespace TaskCRUD.Models
{
    public class User
    {
        public int Id { get; set; }                 // tương ứng với id NUMBER
        public string Name { get; set; } = string.Empty;    // tương ứng với name VARCHAR2(100)
        public string Email { get; set; } = string.Empty;   // tương ứng với email VARCHAR2(150)
        public string Password { get; set; } = string.Empty; // tương ứng với password VARCHAR2(255)
        public string Role { get; set; } = "USER";          // tương ứng với role VARCHAR2(50), default 'USER'
    }
}