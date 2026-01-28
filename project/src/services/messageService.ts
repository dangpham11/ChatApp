/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosInstance } from "../config/api";
import type { MessageResponse } from "./conversationService";

export interface CreateMessageDto {
  conversationId: number;
  content: string;
  messageType: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  duration?: number;
  replyToMessageId?: number;
}

export interface EditMessageDto {
  newContent: string;
}

export interface ReactDto {
  emoji: string;
}

export interface ForwardDto {
  messageId: number;
  targetConversationIds: number[];
}

export interface PinMessageDto {
  isPinned: boolean;
}

export interface PinnedMessageResponse {
  messageId: number;
  content: string;
  messageType: string;
  senderName: string;
  pinnedByName: string;
  pinnedAt: string;
}

export const messageService = {
  async getMessages(
    conversationId: number,
    page = 1,
    pageSize = 50
  ): Promise<MessageResponse[]> {
    try {
      const { data } = await axiosInstance.get<MessageResponse[]>(
        `/Messages/conversation/${conversationId}`,
        {
          params: { page, pageSize },
        }
      );
      return data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch messages"
      );
    }
  },

  async sendMessage(dto: CreateMessageDto): Promise<MessageResponse> {
    try {
      const { data } = await axiosInstance.post<MessageResponse>(
        "/Messages/send",
        dto
      );
      return data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to send message"
      );
    }
  },

  async editMessage(messageId: number, dto: EditMessageDto): Promise<void> {
    try {
      await axiosInstance.put(`/Messages/${messageId}/edit`, dto);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to edit message"
      );
    }
  },

  async recallMessage(messageId: number): Promise<void> {
    try {
      await axiosInstance.delete(`/Messages/${messageId}/recall`);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to recall message"
      );
    }
  },

  async reactToMessage(messageId: number, dto: ReactDto): Promise<void> {
    try {
      await axiosInstance.post(`/Messages/${messageId}/react`, dto);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to react to message"
      );
    }
  },

  async forwardMessage(dto: ForwardDto): Promise<void> {
    try {
      await axiosInstance.post("/Messages/forward", dto);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to forward message"
      );
    }
  },

  async pinMessage(messageId: number, dto: PinMessageDto): Promise<void> {
    try {
      await axiosInstance.post(`/Messages/${messageId}/pin`, dto);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to pin message");
    }
  },

  async getPinnedMessages(
    conversationId: number
  ): Promise<PinnedMessageResponse[]> {
    try {
      const { data } = await axiosInstance.get<PinnedMessageResponse[]>(
        `/Messages/conversation/${conversationId}/pinned`
      );
      return data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch pinned messages"
      );
    }
  },

  async markMessageAsRead(messageId: number): Promise<void> {
    try {
      await axiosInstance.post(`/MessageReadReceipts/${messageId}/mark-read`);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to mark message as read"
      );
    }
  },
};
