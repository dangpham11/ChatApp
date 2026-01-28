/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosInstance } from "../config/api";

export interface CreateConversationDto {
  participantIds: number[];
}

export interface ParticipantResponse {
  userId: number;
  username: string;
  displayName?: string;
  avatarUrl: string;
  isOnline: boolean;
  lastSeen: string;
  email?: string;
  phoneNumber?: string;
  dateBirth?: string;
  bio?: string;
  location?: string;
}

export interface MessageResponse {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderAvatar: string;
  content: string;
  messageType: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  duration?: number;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  createdAt: Date;
  isEdited: boolean;
  editedAt?: string;
  isPinned: boolean;
  replyToMessageId?: number;
  replyToMessage?: {
    id: number;
    senderName: string;
    content: string;
    messageType?: string;
  };
  readReceipts: ReadReceiptResponse[];
  reactions: ReactionResponse[];
}

export interface ReadReceiptResponse {
  userId: number;
  username?: string;
  avatarUrl?: string;
  readAt: string;
}

export interface ReactionResponse {
  id: number;
  emoji: string;
  userId: number;
  username: string;
  createdAt: string;
}

export interface ConversationResponse {
  messages: any;
  id: number;
  name?: string;
  isGroup: boolean;
  avatarUrl: string;
  createdAt: string;
  lastMessage?: MessageResponse;
  participants: ParticipantResponse[];
  unreadCount: number;
  isBlocked?: boolean;
  isBlockedByOther?: boolean;
}

export interface SearchMessagesResult<T = MessageResponse> {
  keyword: string;
  page: number;
  pageSize: number;
  total: number;
  items: T[];
}

export interface ConversationDetailsResponse {
  id: number;
  name?: string;
  isGroup: boolean;
  avatarUrl: string;
  createdAt: string;
  participants: ParticipantResponse[];
}

export interface BlockUserDto {
  targetUserId: number;
}

export interface UpdateNicknameDto {
  nickname?: string | null;
}

export const conversationService = {
  async getMyConversations(): Promise<ConversationResponse[]> {
    try {
      const { data } = await axiosInstance.get<ConversationResponse[]>(
        "/Conversations/my-conversations"
      );
      return data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch conversations"
      );
    }
  },

  async createConversation(
    dto: CreateConversationDto
  ): Promise<{ conversationId: number; message: string }> {
    try {
      const { data } = await axiosInstance.post<{
        conversationId: number;
        message: string;
      }>("/Conversations/create", dto);
      return data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to create conversation"
      );
    }
  },

  async addParticipants(
    conversationId: number,
    participantIds: number[]
  ): Promise<void> {
    try {
      await axiosInstance.post(
        `/Conversations/${conversationId}/add-participants`,
        { participantIds }
      );
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to add participants"
      );
    }
  },

  async leaveConversation(conversationId: number): Promise<void> {
    try {
      await axiosInstance.post(`/Conversations/${conversationId}/leave`);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to leave conversation"
      );
    }
  },

  async getConversationDetails(
    conversationId: number
  ): Promise<ConversationDetailsResponse> {
    try {
      const { data } = await axiosInstance.get<ConversationDetailsResponse>(
        `/Conversations/${conversationId}/details`
      );
      return data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch conversation details"
      );
    }
  },

  async blockUser(targetUserId: number): Promise<void> {
    try {
      await axiosInstance.post(`/Conversations/block-user`, {
        targetUserId,
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to block user");
    }
  },

  async unblockUser(targetUserId: number): Promise<void> {
    try {
      await axiosInstance.post(`/Conversations/unblock-user`, {
        targetUserId,
      });
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to unblock user"
      );
    }
  },

  async clearConversation(conversationId: number): Promise<void> {
    try {
      await axiosInstance.post(
        `/Conversations/${conversationId}/clear-messages`
      );
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to clear conversation"
      );
    }
  },

  async searchMessages(
    conversationId: number,
    q: string,
    page = 1,
    pageSize = 20
  ): Promise<SearchMessagesResult<MessageResponse>> {
    try {
      const { data } = await axiosInstance.get<
        SearchMessagesResult<MessageResponse>
      >(`/Conversations/${conversationId}/search-messages`, {
        params: { q, page, pageSize },
      });
      return data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to search messages"
      );
    }
  },

  async updateNickname(
    conversationId: number,
    dto: UpdateNicknameDto
  ): Promise<{ message?: string; nickname?: string | null }> {
    try {
      const { data } = await axiosInstance.put<{
        message?: string;
        nickname?: string | null;
      }>(`/Conversations/${conversationId}/nickname`, dto);
      return data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to update nickname"
      );
    }
  },
};
