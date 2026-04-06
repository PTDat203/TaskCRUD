namespace TaskCRUD.DTOs
{
    public class TaskDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime? Deadline { get; set; }
        public string? Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
