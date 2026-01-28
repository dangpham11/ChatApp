import { axiosInstance } from '../config/api';

export interface CreateConversationDto {
  name?: string;
  isGroup: boolean;
  participantIds: number[];
  avatarUrl?: string;
}

export interface ParticipantResponse {
  userId: number;
  username: string;
  displayName: string;
  avatarUrl: string;
  isOnline: boolean;
  role: string;
  joinedAt?: string;
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
  sentAt: string;
  isEdited: boolean;
  editedAt?: string;
  isPinned: boolean;
  replyToMessageId?: number;
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
  id: number;
  name?: string;
  isGroup: boolean;
  avatarUrl: string;
  createdAt: string;
  lastMessage?: MessageResponse;
  participants: ParticipantResponse[];
  unreadCount: number;
}

export interface ConversationDetailsResponse {
  id: number;
  name?: string;
  isGroup: boolean;
  avatarUrl: string;
  createdAt: string;
  participants: ParticipantResponse[];
}

export const conversationService = {
  async getMyConversations(): Promise<ConversationResponse[]> {
    try {
      const { data } = await axiosInstance.get<ConversationResponse[]>('/Conversations/my-conversations');
      return data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch conversations');
    }
  },

  async createConversation(dto: CreateConversationDto): Promise<{ conversationId: number; message: string }> {
    try {
      const { data } = await axiosInstance.post<{ conversationId: number; message: string }>('/Conversations/create', dto);
      return data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create conversation');
    }
  },

  async addParticipants(conversationId: number, participantIds: number[]): Promise<void> {
    try {
      await axiosInstance.post(`/Conversations/${conversationId}/add-participants`, { participantIds });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add participants');
    }
  },

  async leaveConversation(conversationId: number): Promise<void> {
    try {
      await axiosInstance.post(`/Conversations/${conversationId}/leave`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to leave conversation');
    }
  },

  async getConversationDetails(conversationId: number): Promise<ConversationDetailsResponse> {
    try {
      const { data } = await axiosInstance.get<ConversationDetailsResponse>(`/Conversations/${conversationId}/details`);
      return data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch conversation details');
    }
  },
};
