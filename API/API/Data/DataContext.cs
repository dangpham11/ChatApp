using API.Entities;
using Microsoft.EntityFrameworkCore;

namespace API.Data
{
    public class DataContext : DbContext
    {
        public DataContext(DbContextOptions<DataContext> opts) : base(opts) { }

        public DbSet<AppUser> Users { get; set; } = null!;
        public DbSet<Message> Messages { get; set; } = null!;
        public DbSet<MessageDeletion> MessageDeletions { get; set; } = null!;
        public DbSet<MessageFile> MessageFiles { get; set; } = null!;
        public DbSet<MessageEditHistory> MessageEditHistories { get; set; } = null!;
        public DbSet<Conversation> Conversations { get; set; } = null!;
        public DbSet<Friendship> Friendships { get; set; } = null!;
        public DbSet<MessageReaction> MessageReactions { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // ========================
            // AppUser
            // ========================
            builder.Entity<AppUser>().HasKey(u => u.Id);

            builder.Entity<AppUser>()
                .HasMany(u => u.SentMessages)
                .WithOne(m => m.Sender)
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<AppUser>()
                .HasMany(u => u.ConversationsAsUser1)
                .WithOne(c => c.User1)
                .HasForeignKey(c => c.User1Id)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<AppUser>()
                .HasMany(u => u.ConversationsAsUser2)
                .WithOne(c => c.User2)
                .HasForeignKey(c => c.User2Id)
                .OnDelete(DeleteBehavior.Restrict);

            // ========================
            // Message
            // ========================
            builder.Entity<Message>()
                .HasOne(m => m.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Message>()
                .HasOne(m => m.ForwardedFrom)
                .WithMany()  // không cần navigation ngược lại
                .HasForeignKey(m => m.ForwardedFromId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Message>()
                .HasOne(m => m.ReplyToMessage)
                .WithMany()
                .HasForeignKey(m => m.ReplyToMessageId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<MessageFile>()
                .HasOne(mf => mf.Message)
                .WithMany(m => m.MessageFiles)
                .HasForeignKey(mf => mf.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<MessageEditHistory>()
                .HasOne(meh => meh.Message)
                .WithMany(m => m.EditHistories)
                .HasForeignKey(meh => meh.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<MessageDeletion>()
                .HasOne(md => md.Message)
                .WithMany(m => m.MessageDeletions)
                .HasForeignKey(md => md.MessageId)
                .OnDelete(DeleteBehavior.Restrict);

            // ========================
            // MessageReaction 👇 (Mới)
            // ========================
            builder.Entity<MessageReaction>()
                .HasKey(r => r.Id);

            builder.Entity<MessageReaction>()
                .HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.NoAction); // 🔥 Không cascade delete từ User

            builder.Entity<MessageReaction>()
                .HasOne(r => r.Message)
                .WithMany(m => m.Reactions)
                .HasForeignKey(r => r.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            // Đảm bảo 1 user chỉ có 1 reaction duy nhất cho mỗi message
            builder.Entity<MessageReaction>()
                .HasIndex(r => new { r.UserId, r.MessageId })
                .IsUnique();


            // ========================
            // Conversation
            // ========================
            builder.Entity<Conversation>()
                .HasKey(c => c.Id);

            // Unique constraint: tránh tạo duplicate conversation giữa 2 user
            builder.Entity<Conversation>()
                .HasIndex(c => new { c.User1Id, c.User2Id })
                .IsUnique();
            builder.Entity<Conversation>()
                .HasOne(c => c.LastMessage)
                .WithOne() // hoặc .WithMany() nếu muốn
                .HasForeignKey<Conversation>(c => c.LastMessageId)
                .OnDelete(DeleteBehavior.NoAction);

            // ========================
            // Friendship
            // ========================
            builder.Entity<Friendship>()
                .HasOne(f => f.User)
                .WithMany()
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<Friendship>()
                .HasOne(f => f.Friend)
                .WithMany()
                .HasForeignKey(f => f.FriendId)
                .OnDelete(DeleteBehavior.NoAction);
        }
    }
}
