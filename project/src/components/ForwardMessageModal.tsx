import React, { useState, useEffect } from "react";
import { X, Search, Send, Check, Loader2 } from "lucide-react";
import type { Message, Conversation, User } from "../types";
import { UserAvatar } from "./UserAvatar";
import { messageService } from "../services/messageService";
import { conversationService } from "../services/conversationService";
import { mapConversationResponseToConversation } from "../utils/mappers";

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  currentConversationId?: string;
  onForward: (conversationIds: string[]) => void;
  currentUser: User; // ✅ thêm prop để biết ai là người dùng hiện tại
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  message,
  currentConversationId,
  onForward,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversations, setSelectedConversations] = useState<string[]>(
    [],
  );
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 🔹 Load danh sách cuộc trò chuyện
  useEffect(() => {
    const loadConversations = async () => {
      if (!isOpen) return;

      setIsLoading(true);
      setError(null);

      try {
        const conversationsData =
          await conversationService.getMyConversations();
        const mappedConversations = conversationsData.map(
          mapConversationResponseToConversation,
        );

        // Bỏ cuộc trò chuyện hiện tại ra khỏi danh sách
        const filtered = mappedConversations.filter(
          (conv) => conv.id !== currentConversationId,
        );

        setConversations(filtered);
      } catch (err) {
        console.error("Failed to load conversations:", err);
        setError("Failed to load conversations");
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [isOpen, currentConversationId]);

  // Reset khi modal đóng
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedConversations([]);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen || !message) return null;

  // 🔹 Lọc người tham gia KHÁC người dùng hiện tại
  const filteredConversations = conversations.filter((conv) => {
    // ☁️ Cloud của tôi
    if (conv.participants.length === 1) {
      return "cloud".includes(searchQuery.toLowerCase());
    }

    // 💬 Chat thường
    const otherParticipant = conv.participants.find(
      (p) => p.id !== currentUser.id,
    );

    if (!otherParticipant) return false;

    return otherParticipant.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  const handleToggleConversation = (conversationId: string) => {
    setSelectedConversations((prev) =>
      prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId],
    );
  };

  const handleForward = async () => {
    if (selectedConversations.length === 0) return;

    setIsForwarding(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await messageService.forwardMessage({
        messageId: parseInt(message.id),
        targetConversationIds: selectedConversations.map((id) => parseInt(id)),
      });

      setSuccessMessage(
        `Message forwarded to ${selectedConversations.length} conversation${
          selectedConversations.length > 1 ? "s" : ""
        }`,
      );

      onForward(selectedConversations);

      setTimeout(() => {
        onClose();
      }, 1500);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Failed to forward message:", err);
      setError(err.message || "Failed to forward message");
    } finally {
      setIsForwarding(false);
    }
  };

  const getMessagePreview = () => {
    if (message.type === "voice") return "Voice message";
    if (message.type === "location") return "Location";
    if (message.type === "image") return "Image";
    if (message.type === "video") return "Video";
    if (message.type === "file") return message.fileName || "File";
    return message.content.length > 50
      ? message.content.substring(0, 50) + "..."
      : message.content;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-[500px] max-w-[90vw] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            Forward Message
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
              {successMessage}
            </div>
          )}

          {/* Message Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Message to forward:
            </h4>
            <div className="bg-white p-3 rounded-lg border">
              <p className="text-sm text-gray-800">{getMessagePreview()}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Selected Count */}
          {selectedConversations.length > 0 && (
            <div className="text-sm text-blue-600 font-medium">
              {selectedConversations.length} conversation
              {selectedConversations.length !== 1 ? "s" : ""} selected
            </div>
          )}

          {/* Conversations List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery
                  ? "No conversations found"
                  : "No other conversations available"}
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const isSelected = selectedConversations.includes(
                  conversation.id,
                );
                const isCloud = conversation.participants.length === 1;

                const otherParticipant = isCloud
                  ? currentUser
                  : conversation.participants.find(
                      (p) => p.id !== currentUser.id,
                    );

                if (!otherParticipant) return null;

                return (
                  <div
                    key={conversation.id}
                    onClick={() => handleToggleConversation(conversation.id)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? "bg-blue-50 border-2 border-blue-200"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <UserAvatar user={otherParticipant} size="md" />
                      <div>
                        <h5 className="font-medium text-gray-900">
                          {isCloud ? "Cloud của tôi" : otherParticipant.name}
                        </h5>
                        <p className="text-sm text-gray-500">
                          {isCloud
                            ? "Lưu trữ cá nhân"
                            : otherParticipant.isOnline
                              ? "Online"
                              : "Offline"}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleForward}
              disabled={selectedConversations.length === 0 || isForwarding}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center space-x-2"
            >
              {isForwarding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Forwarding...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Forward ({selectedConversations.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
