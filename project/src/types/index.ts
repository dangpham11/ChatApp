export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: Date;
  bio?: string;
  phoneNumber?: string;
  location?: string;
  dateBirth?: string;
}

export interface Message {
  id: string;
  tempId?: string;
  isTemp?: boolean;
  isForwardClone?: boolean;
  conversationId: string;
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
  type?: "text" | "voice" | "image" | "file" | "location" | "video";
  voiceDuration?: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  forwardedFromUserId?: string;
  forwardedFromTimestamp?: string;
  forwardedFrom?: {
    senderName: string;
    originalTimestamp: Date;
  };
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  username: string;
  createdAt: string;
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
