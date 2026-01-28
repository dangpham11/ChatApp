export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  reactions?: MessageReaction[];
  isPinned?: boolean;
  isRecalled?: boolean;
  isEdited?: boolean;
  editHistory?: { content: string; timestamp: Date }[];
  replyTo?: {
    messageId: string;
    content: string;
    senderName: string;
  };
  type?: 'text' | 'voice' | 'image' | 'file' | 'location';
  voiceDuration?: number;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  forwardedFrom?: {
    senderName: string;
    originalTimestamp: Date;
  };
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface Conversation {
  id: string;
  participants: User[];
  messages: Message[];
  lastMessage?: Message;
  unreadCount: number;
  pinnedMessages?: string[];
  nicknames?: Record<string, string>;
  isMuted?: boolean;
  mutedUntil?: Date;
  isBlocked?: boolean;
  isBlockedByOther?: boolean;
}