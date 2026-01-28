# API Integration Documentation

This React application has been integrated with the C# backend API running at `http://localhost:5000/api`.

## Configuration

### API Base URL
The base URL is configured in `/src/config/api.ts`:
```typescript
export const API_BASE_URL = 'http://localhost:5000/api';
```

### Authentication
The application uses JWT token authentication. Tokens are stored in `localStorage` and automatically included in API requests via the `getAuthHeader()` function.

## Services

### 1. Authentication Service (`/src/services/authService.ts`)

Handles user authentication and profile management.

**Endpoints:**
- `POST /api/Auth/register` - Register new user
- `POST /api/Auth/login` - Login user
- `GET /api/Auth/me` - Get current user info
- `PUT /api/Auth/update-profile` - Update user profile
- `POST /api/Auth/change-password` - Change password
- `POST /api/Auth/logout` - Logout user

**Usage Example:**
```typescript
import { authService } from './services/authService';

// Login
const response = await authService.login({
  email: 'user@example.com',
  password: 'password123'
});

// Register
const response = await authService.register({
  username: 'johndoe',
  email: 'john@example.com',
  password: 'password123',
  displayName: 'John Doe'
});
```

### 2. Conversation Service (`/src/services/conversationService.ts`)

Manages conversations and participants.

**Endpoints:**
- `GET /api/Conversations/my-conversations` - Get user's conversations
- `POST /api/Conversations/create` - Create new conversation
- `POST /api/Conversations/{id}/add-participants` - Add participants
- `POST /api/Conversations/{id}/leave` - Leave conversation
- `GET /api/Conversations/{id}/details` - Get conversation details

**Usage Example:**
```typescript
import { conversationService } from './services/conversationService';

// Get all conversations
const conversations = await conversationService.getMyConversations();

// Create a new conversation
const result = await conversationService.createConversation({
  name: 'Team Chat',
  isGroup: true,
  participantIds: [1, 2, 3]
});
```

### 3. Message Service (`/src/services/messageService.ts`)

Handles sending, editing, and managing messages.

**Endpoints:**
- `GET /api/Messages/conversation/{id}` - Get messages (paginated)
- `POST /api/Messages/send` - Send message
- `PUT /api/Messages/{id}/edit` - Edit message
- `DELETE /api/Messages/{id}/recall` - Recall message
- `POST /api/Messages/{id}/react` - React to message
- `POST /api/Messages/forward` - Forward message
- `POST /api/Messages/{id}/pin` - Pin/unpin message
- `GET /api/Messages/conversation/{id}/pinned` - Get pinned messages
- `POST /api/MessageReadReceipts/{id}/mark-read` - Mark as read

**Usage Example:**
```typescript
import { messageService } from './services/messageService';

// Send a message
const message = await messageService.sendMessage({
  conversationId: 1,
  content: 'Hello!',
  messageType: 'text'
});

// React to a message
await messageService.reactToMessage(messageId, { emoji: '👍' });

// Edit a message
await messageService.editMessage(messageId, {
  newContent: 'Updated message'
});
```

### 4. File Service (`/src/services/fileService.ts`)

Manages file uploads and deletions via Cloudinary.

**Endpoints:**
- `POST /api/Files/upload` - Upload file
- `DELETE /api/Files/delete/{publicId}` - Delete file

**Usage Example:**
```typescript
import { fileService } from './services/fileService';

// Upload a file
const result = await fileService.uploadFile(file);
console.log(result.url); // Cloudinary URL

// Delete a file
await fileService.deleteFile(publicId);
```

## Data Mappers

The application uses mapper functions (`/src/utils/mappers.ts`) to convert API responses to the frontend data models:

- `mapUserResponseToUser()` - Maps API user to frontend User type
- `mapMessageResponseToMessage()` - Maps API message to frontend Message type
- `mapConversationResponseToConversation()` - Maps API conversation to frontend Conversation type

## Component Integration

### Login Page (`/src/components/LoginPage.tsx`)
- Uses `authService.login()` to authenticate users
- Stores JWT token in localStorage
- Handles authentication errors

### Register Page (`/src/components/RegisterPage.tsx`)
- Uses `authService.register()` to create new accounts
- Validates form data before submission
- Handles registration errors

### App Component (`/src/App.tsx`)
- Loads conversations on authentication using `conversationService.getMyConversations()`
- Loads messages when a conversation is selected
- Sends messages using `messageService.sendMessage()`
- Handles logout via `authService.logout()`

## API Request Flow

1. **User Login:**
   ```
   User enters credentials → authService.login() → POST /api/Auth/login
   → Server returns JWT token → Token stored in localStorage
   → User data mapped to frontend model → Authentication successful
   ```

2. **Load Conversations:**
   ```
   App authenticated → conversationService.getMyConversations()
   → GET /api/Conversations/my-conversations (with JWT header)
   → Server returns conversation list → Data mapped to frontend models
   → Conversations displayed in sidebar
   ```

3. **Send Message:**
   ```
   User types message → handleSendMessage() → messageService.sendMessage()
   → POST /api/Messages/send (with JWT header)
   → Server processes and returns message → Message mapped to frontend model
   → Message added to conversation → UI updated
   ```

## Error Handling

All API services throw errors that can be caught and handled:

```typescript
try {
  await messageService.sendMessage(dto);
} catch (error) {
  console.error('Failed to send message:', error);
  // Show error to user
}
```

## CORS Configuration

Ensure your C# backend has CORS enabled to accept requests from the React development server:

```csharp
// In Program.cs or Startup.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        builder =>
        {
            builder.WithOrigins("http://localhost:5173") // Vite default port
                   .AllowAnyMethod()
                   .AllowAnyHeader()
                   .AllowCredentials();
        });
});

app.UseCors("AllowReactApp");
```

## Testing the Integration

1. **Start the C# backend:**
   ```bash
   dotnet run
   ```
   Backend should be running on `http://localhost:5000`

2. **Start the React frontend:**
   ```bash
   npm run dev
   ```
   Frontend should be running on `http://localhost:5173`

3. **Test the flow:**
   - Register a new account
   - Login with credentials
   - Conversations should load automatically
   - Send messages in a conversation
   - Try reactions, editing, and other features

## Environment Variables

If you need to change the API base URL, update the value in `/src/config/api.ts`:

```typescript
export const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
```

Then create a `.env` file:
```
VITE_API_BASE_URL=http://localhost:5000/api
```

## Next Steps

- [ ] Implement SignalR for real-time messaging
- [ ] Add file upload functionality
- [ ] Implement voice message recording and playback
- [ ] Add typing indicators
- [ ] Implement push notifications
- [ ] Add conversation search functionality
- [ ] Implement message read receipts UI
