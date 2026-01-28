// services/messageReadService.ts
import { axiosInstance } from "../config/api";

export interface ReadReceipt {
  userId: number;
  name: string;
  avatar?: string;
  readAt: string;
}

export const messageReadService = {
  // Đánh dấu toàn bộ conversation đã đọc
  async markConversationAsRead(conversationId: number): Promise<void> {
    await axiosInstance.post(
      `/MessageReadReceipts/conversation/${conversationId}/mark-read`
    );
  },

  // Lấy danh sách ai đã đọc message
  async getReadReceipts(messageId: number): Promise<ReadReceipt[]> {
    const { data } = await axiosInstance.get<ReadReceipt[]>(
      `/MessageReadReceipts/${messageId}/receipts`
    );
    return data;
  },
};
