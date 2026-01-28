import type { User, Conversation, Message } from "../types";
import type { UserResponse } from "../services/authService";
import type {
  ConversationResponse,
  MessageResponse,
} from "../services/conversationService";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { parseTimestamp } from "./helper";

dayjs.extend(utc);
dayjs.extend(timezone);
/* 🧠 USER MAPPER */
export const mapUserResponseToUser = (userResponse: UserResponse): User => ({
  id: userResponse.id.toString(),
  name: userResponse.name || "Unknown User",
  email: userResponse.email,
  avatar: userResponse.avatarUrl || "/public/sbcf-default-avatar.webp",
  isOnline: userResponse.isOnline,
});

/* 💬 MESSAGE MAPPER */
export const mapMessageResponseToMessage = (
  messageResponse: MessageResponse,
): Message => ({
  id: messageResponse.id.toString(),
  senderId: messageResponse.senderId.toString(),
  conversationId: messageResponse.conversationId.toString(),
  content: messageResponse.content || "",
  timestamp: parseTimestamp(messageResponse.createdAt),
  isRead: (messageResponse.readReceipts || []).length > 0,
  isPinned: messageResponse.isPinned || false,

  isEdited: messageResponse.isEdited || false,
  type: messageResponse.messageType?.toLowerCase() as
    | "text"
    | "voice"
    | "image"
    | "file"
    | "location"
    | "video",
  voiceDuration: messageResponse.duration || undefined,
  fileUrl: messageResponse.fileUrl || undefined,
  fileName: messageResponse.fileName || undefined,
  fileSize: messageResponse.fileSize || undefined,
  thumbnailUrl: messageResponse.thumbnailUrl || undefined,
  location: messageResponse.location
    ? {
        latitude: messageResponse.location.latitude,
        longitude: messageResponse.location.longitude,
        address: messageResponse.location.address || "",
      }
    : undefined,
  reactions: (messageResponse.reactions || []).map((r) => ({
    emoji: r.emoji,
    count: 1,
    users: [r.userId?.toString() || ""],
  })),
  replyTo: messageResponse.replyToMessageId
    ? {
        messageId: messageResponse.replyToMessageId.toString(),
        content:
          messageResponse.replyToMessage?.content ||
          "(Tin nhắn không khả dụng)",
        senderName:
          messageResponse.replyToMessage?.senderName || "Unknown User",
      }
    : undefined,
});

/* 💭 CONVERSATION MAPPER */
export const mapConversationResponseToConversation = (
  convResponse: ConversationResponse,
): Conversation => {
  const participants: User[] = (convResponse.participants || []).map((p) => ({
    id: p.userId?.toString() || "",
    name: p.displayName || p.username || "Unknown User",
    email: p.email || "",
    avatar: p.avatarUrl || "/public/sbcf-default-avatar.webp",
    isOnline: p.isOnline || false,
    phoneNumber: p.phoneNumber || undefined,
    location: p.location || undefined,
    bio: p.bio || undefined,
    dateBirth: p.dateBirth || undefined,
  }));

  const lastMessage = convResponse.lastMessage
    ? mapMessageResponseToMessage(convResponse.lastMessage)
    : undefined;

  return {
    id: convResponse.id.toString(),
    participants,
    messages: [], // có thể load sau qua /api/Messages/conversation/{id}
    lastMessage,
    unreadCount: convResponse.unreadCount || 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isBlocked: !!(convResponse as any).isBlocked,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isBlockedByOther: !!(convResponse as any).isBlockedByOther,
  };
};
