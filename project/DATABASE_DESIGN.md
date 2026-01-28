# Database Design for Chat Application
**Version:** 1.0
**Date:** 2025-10-14
**Target:** Entity Framework Core (Code First)

---

## Overview
This database design supports a one-on-one chat messaging application with features including:
- User authentication and profiles
- Direct messaging (no group chats)
- Message reactions
- Voice messages and location sharing
- Message forwarding, editing, pinning
- Conversation management (mute, block)
- Read receipts and online status

---

## Table Definitions

### Table: Users
Primary table for user accounts and authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | uniqueidentifier | PK, Default: NEWID() | User unique identifier (GUID) |
| Email | nvarchar(255) | UNIQUE, NOT NULL | User's email for login |
| PasswordHash | nvarchar(255) | NOT NULL | Hashed password for authentication |
| Name | nvarchar(100) | NOT NULL | User's display name |
| Avatar | nvarchar(500) | NULL | URL to user's avatar image |
| IsOnline | bit | NOT NULL, Default: 0 | Current online status |
| LastSeenAt | datetime2 | NULL | Last time user was active |
| CreatedAt | datetime2 | NOT NULL, Default: GETUTCDATE() | Account creation timestamp |
| UpdatedAt | datetime2 | NOT NULL, Default: GETUTCDATE() | Last profile update timestamp |

**Indexes:**
- Unique index on `Email`
- Index on `IsOnline` for quick online user queries

---

### Table: Conversations
Represents a conversation between two users (1-on-1 only).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | uniqueidentifier | PK, Default: NEWID() | Conversation unique identifier |
| CreatedAt | datetime2 | NOT NULL, Default: GETUTCDATE() | When conversation was created |
| UpdatedAt | datetime2 | NOT NULL, Default: GETUTCDATE() | Last activity timestamp |

**Indexes:**
- Index on `UpdatedAt` for sorting conversations by recent activity

**Note:** This table is minimal because most conversation data comes from the junction table `ConversationParticipants` and related messages.

---

### Table: ConversationParticipants
Junction table linking users to conversations (manages many-to-many relationship).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | uniqueidentifier | PK, Default: NEWID() | Participant record ID |
| ConversationId | uniqueidentifier | FK -> Conversations.Id, NOT NULL | Reference to conversation |
| UserId | uniqueidentifier | FK -> Users.Id, NOT NULL | Reference to user |
| Nickname | nvarchar(100) | NULL | Custom nickname for the other user in this conversation |
| IsMuted | bit | NOT NULL, Default: 0 | Whether user has muted this conversation |
| MutedUntil | datetime2 | NULL | When mute expires (NULL = forever) |
| IsBlocked | bit | NOT NULL, Default: 0 | Whether user has blocked the other person |
| UnreadCount | int | NOT NULL, Default: 0 | Number of unread messages for this user |
| JoinedAt | datetime2 | NOT NULL, Default: GETUTCDATE() | When user joined conversation |

**Constraints:**
- UNIQUE constraint on (ConversationId, UserId) - each user appears once per conversation
- ON DELETE CASCADE for both foreign keys

**Indexes:**
- Composite index on (ConversationId, UserId)
- Index on UserId for quick user conversation lookup

**Note:** For a 1-on-1 chat, each conversation will have exactly 2 rows in this table.

---

### Table: Messages
Stores all messages sent in conversations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | uniqueidentifier | PK, Default: NEWID() | Message unique identifier |
| ConversationId | uniqueidentifier | FK -> Conversations.Id, NOT NULL | Reference to conversation |
| SenderId | uniqueidentifier | FK -> Users.Id, NOT NULL | User who sent the message |
| Content | nvarchar(MAX) | NOT NULL | Message content (text, URL, JSON for location) |
| MessageType | nvarchar(20) | NOT NULL, Default: 'text' | Type: 'text', 'voice', 'image', 'file', 'location' |
| VoiceDuration | int | NULL | Duration in seconds (for voice messages) |
| LocationLatitude | decimal(10,8) | NULL | GPS latitude (for location messages) |
| LocationLongitude | decimal(11,8) | NULL | GPS longitude (for location messages) |
| LocationAddress | nvarchar(500) | NULL | Human-readable address |
| IsEdited | bit | NOT NULL, Default: 0 | Whether message has been edited |
| IsRecalled | bit | NOT NULL, Default: 0 | Whether message was deleted/recalled |
| ReplyToMessageId | uniqueidentifier | FK -> Messages.Id, NULL | Reference to message being replied to |
| ForwardedFromUserId | uniqueidentifier | FK -> Users.Id, NULL | Original sender if forwarded |
| ForwardedFromTimestamp | datetime2 | NULL | Original send time if forwarded |
| CreatedAt | datetime2 | NOT NULL, Default: GETUTCDATE() | When message was sent |
| UpdatedAt | datetime2 | NULL | Last edit timestamp |

**Constraints:**
- ON DELETE NO ACTION for ReplyToMessageId (prevent cascade delete issues)
- ON DELETE NO ACTION for ForwardedFromUserId
- ON DELETE CASCADE for ConversationId and SenderId

**Indexes:**
- Index on (ConversationId, CreatedAt) for efficient message retrieval
- Index on SenderId

---

### Table: MessageReadReceipts
Tracks which users have read which messages.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | uniqueidentifier | PK, Default: NEWID() | Receipt record ID |
| MessageId | uniqueidentifier | FK -> Messages.Id, NOT NULL | Reference to message |
| UserId | uniqueidentifier | FK -> Users.Id, NOT NULL | User who read the message |
| ReadAt | datetime2 | NOT NULL, Default: GETUTCDATE() | When message was read |

**Constraints:**
- UNIQUE constraint on (MessageId, UserId) - one read receipt per user per message
- ON DELETE CASCADE for both foreign keys

**Indexes:**
- Composite index on (MessageId, UserId)
- Index on UserId

---

### Table: MessageReactions
Stores emoji reactions to messages.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | uniqueidentifier | PK, Default: NEWID() | Reaction record ID |
| MessageId | uniqueidentifier | FK -> Messages.Id, NOT NULL | Reference to message |
| UserId | uniqueidentifier | FK -> Users.Id, NOT NULL | User who reacted |
| Emoji | nvarchar(10) | NOT NULL | Unicode emoji character |
| CreatedAt | datetime2 | NOT NULL, Default: GETUTCDATE() | When reaction was added |

**Constraints:**
- UNIQUE constraint on (MessageId, UserId, Emoji) - one emoji per user per message
- ON DELETE CASCADE for both foreign keys

**Indexes:**
- Composite index on (MessageId, Emoji) for aggregation
- Index on UserId

---

### Table: PinnedMessages
Tracks messages pinned in conversations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | uniqueidentifier | PK, Default: NEWID() | Pin record ID |
| ConversationId | uniqueidentifier | FK -> Conversations.Id, NOT NULL | Reference to conversation |
| MessageId | uniqueidentifier | FK -> Messages.Id, NOT NULL | Reference to pinned message |
| PinnedByUserId | uniqueidentifier | FK -> Users.Id, NOT NULL | User who pinned the message |
| PinnedAt | datetime2 | NOT NULL, Default: GETUTCDATE() | When message was pinned |

**Constraints:**
- UNIQUE constraint on (ConversationId, MessageId) - message pinned once per conversation
- ON DELETE CASCADE for all foreign keys

**Indexes:**
- Composite index on (ConversationId, PinnedAt DESC)

---

### Table: MessageEditHistory
Stores the history of message edits.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | uniqueidentifier | PK, Default: NEWID() | Edit history record ID |
| MessageId | uniqueidentifier | FK -> Messages.Id, NOT NULL | Reference to message |
| PreviousContent | nvarchar(MAX) | NOT NULL | Content before edit |
| EditedAt | datetime2 | NOT NULL, Default: GETUTCDATE() | When edit was made |

**Constraints:**
- ON DELETE CASCADE for MessageId

**Indexes:**
- Index on (MessageId, EditedAt)

---

## Relationships Summary

### Users → ConversationParticipants (1:N)
- One user can participate in many conversations
- Each participant record belongs to one user

### Conversations → ConversationParticipants (1:N)
- One conversation has exactly 2 participants (for 1-on-1 chat)
- Each participant record belongs to one conversation

### Conversations → Messages (1:N)
- One conversation contains many messages
- Each message belongs to one conversation

### Users → Messages (1:N)
- One user can send many messages
- Each message has one sender

### Messages → Messages (1:N) [Self-referencing]
- One message can be replied to by many messages
- Each message can reply to one other message (nullable)

### Messages → MessageReadReceipts (1:N)
- One message can have multiple read receipts (one per reader)
- Each receipt belongs to one message

### Users → MessageReadReceipts (1:N)
- One user can have many read receipts
- Each receipt belongs to one user

### Messages → MessageReactions (1:N)
- One message can have many reactions
- Each reaction belongs to one message

### Users → MessageReactions (1:N)
- One user can create many reactions
- Each reaction belongs to one user

### Conversations → PinnedMessages (1:N)
- One conversation can have many pinned messages
- Each pinned message belongs to one conversation

### Messages → PinnedMessages (1:N)
- One message can be pinned in multiple conversations (if forwarded)
- Each pin record references one message

### Messages → MessageEditHistory (1:N)
- One message can have multiple edit history records
- Each history record belongs to one message

---

## Entity Framework Core Navigation Properties

When implementing in C#, the following navigation properties should be defined:

### User Entity
```csharp
public class User
{
    // Properties...

    // Navigation Properties
    public ICollection<ConversationParticipant> ConversationParticipants { get; set; }
    public ICollection<Message> SentMessages { get; set; }
    public ICollection<MessageReadReceipt> ReadReceipts { get; set; }
    public ICollection<MessageReaction> Reactions { get; set; }
    public ICollection<PinnedMessage> PinnedMessages { get; set; }
}
```

### Conversation Entity
```csharp
public class Conversation
{
    // Properties...

    // Navigation Properties
    public ICollection<ConversationParticipant> Participants { get; set; }
    public ICollection<Message> Messages { get; set; }
    public ICollection<PinnedMessage> PinnedMessages { get; set; }
}
```

### ConversationParticipant Entity
```csharp
public class ConversationParticipant
{
    // Properties...

    // Navigation Properties
    public Conversation Conversation { get; set; }
    public User User { get; set; }
}
```

### Message Entity
```csharp
public class Message
{
    // Properties...

    // Navigation Properties
    public Conversation Conversation { get; set; }
    public User Sender { get; set; }
    public Message ReplyToMessage { get; set; }
    public User ForwardedFromUser { get; set; }
    public ICollection<MessageReadReceipt> ReadReceipts { get; set; }
    public ICollection<MessageReaction> Reactions { get; set; }
    public ICollection<PinnedMessage> PinnedMessages { get; set; }
    public ICollection<MessageEditHistory> EditHistory { get; set; }
    public ICollection<Message> Replies { get; set; }
}
```

---

## Additional Notes

### Data Types
- **uniqueidentifier**: Used for all primary keys and foreign keys (GUID)
- **nvarchar**: Used for all text fields to support Unicode (international characters)
- **datetime2**: Used for timestamps (better precision than datetime)
- **decimal**: Used for GPS coordinates with appropriate precision
- **bit**: Used for boolean flags

### Naming Convention
- Tables: PascalCase (e.g., `Users`, `ConversationParticipants`)
- Columns: PascalCase (e.g., `UserId`, `CreatedAt`)
- Foreign Keys: EntityName + "Id" (e.g., `UserId`, `ConversationId`)
- Junction Tables: Entity1Entity2s (e.g., `ConversationParticipants`)

### Indexes Strategy
- Primary keys automatically have clustered indexes
- Foreign keys have non-clustered indexes for join performance
- Composite indexes on frequently queried column combinations
- Indexes on timestamp columns for sorting and filtering

### Cascade Delete Strategy
- **CASCADE**: Used where child records are meaningless without parent (e.g., Messages without Conversation)
- **NO ACTION**: Used to prevent unwanted cascades (e.g., ReplyToMessage relationship)
- Always review cascade paths to prevent accidental data loss

### Performance Considerations
1. Add indexes on frequently filtered columns (e.g., `IsOnline`, `MessageType`)
2. Consider partitioning `Messages` table by `CreatedAt` for large datasets
3. Implement soft deletes for `Messages` using `IsRecalled` flag
4. Archive old conversations to maintain query performance

### Security Considerations
1. Never store plain-text passwords (use `PasswordHash`)
2. Validate foreign key references in application code
3. Implement row-level security for conversation access
4. Encrypt sensitive message content if required by regulations

---

## Sample Queries

### Get All Conversations for a User
```sql
SELECT c.Id, c.UpdatedAt, cp.UnreadCount, cp.IsMuted
FROM Conversations c
INNER JOIN ConversationParticipants cp ON c.Id = cp.ConversationId
WHERE cp.UserId = @UserId
ORDER BY c.UpdatedAt DESC
```

### Get Messages in a Conversation
```sql
SELECT m.*, u.Name AS SenderName, u.Avatar
FROM Messages m
INNER JOIN Users u ON m.SenderId = u.Id
WHERE m.ConversationId = @ConversationId AND m.IsRecalled = 0
ORDER BY m.CreatedAt ASC
```

### Get Unread Message Count
```sql
SELECT COUNT(*)
FROM Messages m
WHERE m.ConversationId = @ConversationId
AND m.SenderId != @CurrentUserId
AND NOT EXISTS (
    SELECT 1 FROM MessageReadReceipts mrr
    WHERE mrr.MessageId = m.Id AND mrr.UserId = @CurrentUserId
)
```

### Get Message Reactions Aggregated
```sql
SELECT mr.Emoji, COUNT(*) AS Count, STRING_AGG(u.Name, ', ') AS UserNames
FROM MessageReactions mr
INNER JOIN Users u ON mr.UserId = u.Id
WHERE mr.MessageId = @MessageId
GROUP BY mr.Emoji
```

---

## Migration Recommendations

### Initial Migration
1. Create all tables in the correct order (Users first, then tables with dependencies)
2. Add all foreign key constraints after tables are created
3. Create all indexes after data is populated

### Future Migrations
- Always test migrations on a copy of production data
- Use transactions for complex migrations
- Keep rollback scripts ready
- Version control all migration files

---

**End of Database Design Document**
