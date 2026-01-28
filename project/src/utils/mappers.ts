import type { User, Conversation, Message } from '../types';
import type { UserResponse } from '../services/authService';
import type { ConversationResponse, MessageResponse } from '../services/conversationService';

export const mapUserResponseToUser = (userResponse: UserResponse): User => {
  return {
    id: userResponse.id.toString(),
    name: userResponse.displayName,
    email: userResponse.email,
    avatar: userResponse.avatarUrl,
    isOnline: userResponse.isOnline,
    lastSeen: userResponse.lastSeenAt,
  };
};

export const mapMessageResponseToMessage = (messageResponse: MessageResponse): Message => {
  return {
    id: messageResponse.id.toString(),
    senderId: messageResponse.senderId.toString(),
    content: messageResponse.content,
    timestamp: new Date(messageResponse.sentAt),
    isRead: messageResponse.readReceipts.length > 0,
    isPinned: messageResponse.isPinned,
    isEdited: messageResponse.isEdited,
    type: messageResponse.messageType as 'text' | 'voice' | 'image' | 'file' | 'location',
    voiceDuration: messageResponse.duration,
    reactions: messageResponse.reactions.map(r => ({
      emoji: r.emoji,
      count: 1,
      users: [r.userId.toString()],
    })),
    replyTo: messageResponse.replyToMessageId ? {
      messageId: messageResponse.replyToMessageId.toString(),
      content: '',
      senderName: '',
    } : undefined,
  };
};

export const mapConversationResponseToConversation = (convResponse: ConversationResponse): Conversation => {
  const participants: User[] = convResponse.participants.map(p => ({
    id: p.userId.toString(),
    name: p.displayName,
    email: '',
    avatar: p.avatarUrl,
    isOnline: p.isOnline,
  }));

  const messages: Message[] = [];
  let lastMessage: Message | undefined;

  if (convResponse.lastMessage) {
    lastMessage = mapMessageResponseToMessage(convResponse.lastMessage);
  }

  return {
    id: convResponse.id.toString(),
    participants,
    messages,
    lastMessage,
    unreadCount: convResponse.unreadCount,
  };
};
