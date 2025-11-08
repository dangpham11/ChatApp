using API.Entities;
using Microsoft.EntityFrameworkCore;
using System.Reflection.Emit;

namespace API.Data
{
    public class DataContext : DbContext
    {
        public DataContext(DbContextOptions<DataContext> opts) : base(opts) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Conversation> Conversations { get; set; }
        public DbSet<ConversationParticipant> ConversationParticipants { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<MessageReadReceipt> MessageReadReceipts { get; set; }
        public DbSet<MessageReaction> MessageReactions { get; set; }
        public DbSet<PinnedMessage> PinnedMessages { get; set; }
        public DbSet<MessageEditHistory> MessageEditHistories { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // USERS
            builder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            builder.Entity<User>()
                .HasIndex(u => u.IsOnline);

            // CONVERSATION PARTICIPANTS
            builder.Entity<ConversationParticipant>()
                .HasIndex(cp => new { cp.ConversationId, cp.UserId })
                .IsUnique();

            builder.Entity<ConversationParticipant>()
                .HasOne(cp => cp.Conversation)
                .WithMany(c => c.Participants)
                .HasForeignKey(cp => cp.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<ConversationParticipant>()
                .HasOne(cp => cp.User)
                .WithMany(u => u.ConversationParticipants)
                .HasForeignKey(cp => cp.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // MESSAGES
            builder.Entity<Message>()
                .HasOne(m => m.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Message>()
                .HasOne(m => m.Sender)
                .WithMany(u => u.SentMessages)
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Message>()
                .HasOne(m => m.ReplyToMessage)
                .WithMany(m => m.Replies)
                .HasForeignKey(m => m.ReplyToMessageId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<Message>()
                .HasOne(m => m.ForwardedFromUser)
                .WithMany()
                .HasForeignKey(m => m.ForwardedFromUserId)
                .OnDelete(DeleteBehavior.NoAction);
            builder.Entity<Message>(entity =>
            {
                entity.Property(e => e.LocationLatitude).HasPrecision(9, 6);
                entity.Property(e => e.LocationLongitude).HasPrecision(9, 6);
            });

            // MESSAGE READ RECEIPTS
            builder.Entity<MessageReadReceipt>()
                .HasIndex(r => new { r.MessageId, r.UserId })
                .IsUnique();

            builder.Entity<MessageReadReceipt>()
                .HasOne(r => r.Message)
                .WithMany(m => m.ReadReceipts)
                .HasForeignKey(r => r.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<MessageReadReceipt>()
                .HasOne(r => r.User)
                .WithMany(u => u.ReadReceipts)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // MESSAGE REACTIONS
            builder.Entity<MessageReaction>()
                .HasIndex(r => new { r.MessageId, r.UserId, r.Emoji })
                .IsUnique();

            builder.Entity<MessageReaction>()
                .HasOne(r => r.Message)
                .WithMany(m => m.Reactions)
                .HasForeignKey(r => r.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<MessageReaction>()
                .HasOne(r => r.User)
                .WithMany(u => u.Reactions)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // PINNED MESSAGES
            builder.Entity<PinnedMessage>()
                .HasIndex(p => new { p.ConversationId, p.MessageId })
                .IsUnique();

            builder.Entity<PinnedMessage>()
                .HasOne(p => p.Conversation)
                .WithMany(c => c.PinnedMessages)
                .HasForeignKey(p => p.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<PinnedMessage>()
                .HasOne(p => p.Message)
                .WithMany(m => m.PinnedMessages)
                .HasForeignKey(p => p.MessageId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<PinnedMessage>()
                .HasOne(p => p.PinnedByUser)
                .WithMany(u => u.PinnedMessages)
                .HasForeignKey(p => p.PinnedByUserId)
                .OnDelete(DeleteBehavior.Cascade);

            // MESSAGE EDIT HISTORY
            builder.Entity<MessageEditHistory>()
                .HasOne(h => h.Message)
                .WithMany(m => m.EditHistory)
                .HasForeignKey(h => h.MessageId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
