using Microsoft.EntityFrameworkCore;
using TaskCRUD.Data;
using TaskCRUD.DTOs;
using TaskCRUD.Models;

namespace TaskCRUD.Services
{
    public interface ITaskService
    {
        Task<List<TaskDto>> GetAllTasksAsync();
        Task<TaskDto?> GetTaskByIdAsync(int id);
        Task<TaskDto> CreateTaskAsync(CreateTaskDto dto);
        Task<TaskDto> UpdateTaskAsync(int id, UpdateTaskDto dto);
        Task<bool> DeleteTaskAsync(int id);
    }

    public class TaskService : ITaskService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<TaskService> _logger;

        public TaskService(ApplicationDbContext context, ILogger<TaskService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<TaskDto>> GetAllTasksAsync()
        {
            try
            {
                var tasks = await _context.Tasks.ToListAsync();
                return tasks.Select(MapToDto).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all tasks");
                throw;
            }
        }

        public async Task<TaskDto?> GetTaskByIdAsync(int id)
        {
            try
            {
                var task = await _context.Tasks.FindAsync(id);
                return task != null ? MapToDto(task) : null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving task with id {id}");
                throw;
            }
        }

        public async Task<TaskDto> CreateTaskAsync(CreateTaskDto dto)
        {
            try
            {
                var taskItem = new TaskItem
                {
                    Title = dto.Title,
                    Description = dto.Description,
                    Deadline = dto.Deadline,
                    Status = dto.Status ?? "PENDING",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Tasks.Add(taskItem);
                await _context.SaveChangesAsync();

                return MapToDto(taskItem);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task");
                throw;
            }
        }

        public async Task<TaskDto> UpdateTaskAsync(int id, UpdateTaskDto dto)
        {
            try
            {
                var task = await _context.Tasks.FindAsync(id);
                if (task == null)
                {
                    throw new KeyNotFoundException($"Task with id {id} not found");
                }

                task.Title = dto.Title;
                task.Description = dto.Description;
                task.Deadline = dto.Deadline;
                task.Status = dto.Status;

                _context.Tasks.Update(task);
                await _context.SaveChangesAsync();

                return MapToDto(task);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating task with id {id}");
                throw;
            }
        }

        public async Task<bool> DeleteTaskAsync(int id)
        {
            try
            {
                var task = await _context.Tasks.FindAsync(id);
                if (task == null)
                {
                    return false;
                }

                _context.Tasks.Remove(task);
                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting task with id {id}");
                throw;
            }
        }

        private TaskDto MapToDto(TaskItem taskItem)
        {
            return new TaskDto
            {
                Id = taskItem.Id,
                Title = taskItem.Title,
                Description = taskItem.Description,
                Deadline = taskItem.Deadline,
                Status = taskItem.Status,
                CreatedAt = taskItem.CreatedAt
            };
        }
    }
}
