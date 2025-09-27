// Data/DataContext.cs
using API.Entities;
using Microsoft.EntityFrameworkCore;
using System.Reflection.Emit;

namespace API.Data
{
    public class DataContext : DbContext
    {
        public DataContext(DbContextOptions<DataContext> opts) : base(opts) { }

        public DbSet<AppUser> Users { get; set; } = null!;
        public DbSet<Group> Groups { get; set; } = null!;
        public DbSet<GroupMember> GroupMembers { get; set; } = null!;
        public DbSet<Message> Messages { get; set; } = null!;
        public DbSet<MessageDeletion> MessageDeletions { get; set; } 


        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<AppUser>().HasKey(u => u.Id);

            builder.Entity<Message>()
                .HasOne(m => m.Sender)
                .WithMany(u => u.SentMessages)
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Message>()
                .HasOne(m => m.Receiver)
                .WithMany()
                .HasForeignKey(m => m.ReceiverId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Message>()
                .HasOne(m => m.Group)
                .WithMany(g => g.Messages)
                .HasForeignKey(m => m.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<GroupMember>()
                .HasOne(gm => gm.Group)
                .WithMany(g => g.Members)
                .HasForeignKey(gm => gm.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<GroupMember>()
                .HasOne(gm => gm.User)
                .WithMany(u => u.GroupMembers) // thêm navigation property trong AppUser
                .HasForeignKey(gm => gm.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<MessageDeletion>()
                .HasOne(md => md.User)
                .WithMany()
                .HasForeignKey(md => md.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
