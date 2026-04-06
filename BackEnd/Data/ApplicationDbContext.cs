using Microsoft.EntityFrameworkCore;
using TaskCRUD.Models;

namespace TaskCRUD.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<TaskItem> Tasks { get; set; } = null!;
        public DbSet<User> Users { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure TaskItem
            modelBuilder.Entity<TaskItem>(entity =>
            {
                entity.ToTable("TASKS", schema: "DAT_DEV");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("ID").UseIdentityColumn();
                entity.Property(e => e.Title).HasColumnName("TITLE").IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).HasColumnName("DESCRIPTION").HasMaxLength(1000);
                entity.Property(e => e.Deadline).HasColumnName("DEADLINE");
                entity.Property(e => e.Status).HasColumnName("STATUS").HasMaxLength(50);
                entity.Property(e => e.CreatedAt).HasColumnName("CREATED_AT").HasDefaultValueSql("SYSTIMESTAMP");
            });

            // Configure User
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("USERS", schema: "DAT_DEV");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("ID").UseIdentityColumn();
                entity.Property(e => e.Name).HasColumnName("NAME").IsRequired().HasMaxLength(100);
                entity.Property(e => e.Email).HasColumnName("EMAIL").IsRequired().HasMaxLength(150);
                entity.Property(e => e.Password).HasColumnName("PASSWORD").IsRequired().HasMaxLength(255);
                entity.Property(e => e.Role).HasColumnName("ROLE").HasMaxLength(50);
                entity.HasIndex(e => e.Email).IsUnique();
            });
        }
    }
}
