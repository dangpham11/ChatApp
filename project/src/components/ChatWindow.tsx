import React, { useState, useRef, useEffect } from "react";
import type { Conversation, User, Message } from "../types";
import { MessageBubble } from "./MessageBubble";
import { UserAvatar } from "./UserAvatar";
import { Send, Paperclip, Info, Mic, X, MapPin } from "lucide-react";
import { FileUploadModal } from "./FileUploadModal";
import { EmojiPicker } from "./EmojiPicker";
import { ForwardMessageModal } from "./ForwardMessageModal";
import { VoiceRecorder } from "./VoiceRecorder";
import { LocationMessageBubble } from "./LocationMessageBubble";
import { BlockedChatView } from "./BlockedChatView";
import { fileService } from "../services/fileService";

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
  onSendMessage: (
    content: string,
    replyTo?: Message | null,
    type?: "text" | "voice" | "image" | "video" | "file" | "location",
    voiceDuration?: number,
    fileUrl?: string,
    fileName?: string,
    fileSize?: number,
  ) => void;
  onToggleInfo: () => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onPinMessage?: (messageId: string, isPinned: boolean) => void;
  onRecallMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onUnblockUser?: () => void;
  onStartCall?: (type: "audio" | "video") => void;
  jumpToMessageId?: string | null;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  currentUser,
  onSendMessage,
  onToggleInfo,
  onAddReaction,
  onPinMessage,
  onRecallMessage,
  onEditMessage,
  onUnblockUser,
  jumpToMessageId,
}) => {
  const [newMessage, setNewMessage] = useState("");
  const [showFileModal, setShowFileModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(
    null,
  );
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleScrollToMessage = (messageId: string) => {
    const container = messageRefs.current[messageId];
    const bubble = container?.querySelector(".message-bubble");

    if (bubble) {
      bubble.scrollIntoView({ behavior: "smooth", block: "center" });
      bubble.classList.add("ring-2", "ring-black", "transition");
      setTimeout(() => {
        bubble.classList.remove("ring-2", "ring-black", "transition");
      }, 1500);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  React.useEffect(() => {
    if (jumpToMessageId) {
      // attempt to scroll to message in current view
      handleScrollToMessage(jumpToMessageId);
    }
  }, [jumpToMessageId]);

  useEffect(() => {
    const ids = conversation.messages.map((m) => m.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicates.length > 0) {
      console.warn("Duplicate message IDs:", duplicates);
    }
  }, [conversation.messages]);
  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    onAddReaction?.(messageId, emoji);
  };

  const handleReplyMessage = (message: Message) => {
    setReplyingTo(message);
  };

  const handleForwardMessage = (message: Message) => {
    setMessageToForward(message);
    setShowForwardModal(true);
  };

  const handlePinMessage = (messageId: string, isPinned: boolean) => {
    onPinMessage?.(messageId, isPinned);
  };

  const handleRecallMessage = (messageId: string) => {
    onRecallMessage?.(messageId);
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    onEditMessage?.(messageId, newContent);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const messageContent = newMessage.trim();

      // Pass reply data to parent component
      onSendMessage(messageContent, replyingTo);
      setNewMessage("");
      setReplyingTo(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleSendMessage(e as any);
    }
  };

  const handleVoiceRecord = () => {
    setShowVoiceRecorder(true);
  };

  const handleSendVoice = (audioUrl: string, duration: number) => {
    onSendMessage(audioUrl, replyingTo, "voice", duration);
    setShowVoiceRecorder(false);
    setReplyingTo(null);
  };

  const handleCancelVoice = () => {
    setShowVoiceRecorder(false);
  };

  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "granted" || result.state === "prompt") {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const locationData = JSON.stringify({
                type: "location",
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
              onSendMessage(locationData, undefined, "location");
            },
            (error) => {
              console.error("Cannot get location:", error);
              alert("Không thể lấy vị trí hiện tại");
            },
          );
        } else {
          alert("Bạn chưa cấp quyền truy cập vị trí");
        }
      });
    } else {
      const mockLocation = JSON.stringify({
        type: "location",
        latitude: 10.762622,
        longitude: 106.660172,
      });
      onSendMessage(mockLocation, undefined, "location");
    }
  };

  // const handleStartCall = (type: "audio" | "video") => {
  //   onStartCall?.(type);
  // };

  const LOCATION_EXPIRE_TIME = 60 * 60 * 1000; // 1 giờ (ms)

  const isLocationExpired = (createdAt: string | Date) => {
    const createdTime = new Date(createdAt).getTime();
    return Date.now() - createdTime > LOCATION_EXPIRE_TIME;
  };
  const handleFileSelect = async (file: File) => {
    try {
      setIsUploadingFile(true);
      setShowFileModal(false);

      const uploadResult = await fileService.uploadFile(file);

      let messageType: "image" | "video" | "file" = "file";

      if (file.type.startsWith("image/")) {
        messageType = "image";
      } else if (file.type.startsWith("video/")) {
        messageType = "video";
      }

      onSendMessage(
        newMessage.trim() || file.name,
        replyingTo,
        messageType,
        undefined,
        uploadResult.url,
        file.name,
        file.size,
      );

      setNewMessage("");
      setReplyingTo(null);
    } catch (error) {
      console.error("File upload failed:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleForwardComplete = (conversationIds: string[]) => {
    // In a real app, this would forward the message to selected conversations
    console.log("Forwarding message to:", conversationIds);
    setShowForwardModal(false);
  };

  const getOtherParticipant = (): User => {
    return (
      conversation.participants.find((p) => p.id !== currentUser.id) ||
      conversation.participants[0]
    );
  };

  const otherUser = getOtherParticipant();
  const isCloudChat =
    conversation.participants.length === 1 || otherUser.id === currentUser.id;

  if (conversation.isBlocked) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <UserAvatar user={isCloudChat ? null : otherUser} size="md" />
            <div>
              <h2 className="font-semibold text-gray-900">
                {isCloudChat ? "Cloud của tôi" : otherUser.name}
              </h2>
              <p className="text-sm text-gray-500">
                {isCloudChat
                  ? "Ghi chú cá nhân"
                  : otherUser.isOnline
                    ? "Online"
                    : `Offline`}
              </p>
            </div>
          </div>
          <button
            onClick={onToggleInfo}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
          >
            <Info className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <BlockedChatView onUnblock={onUnblockUser} />
      </div>
    );
  }

  if (conversation.isBlockedByOther) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <UserAvatar user={otherUser} size="md" />
            <div>
              <h2 className="font-semibold text-gray-900">
                {isCloudChat ? "Cloud của tôi" : otherUser.name}
              </h2>
              <p className="text-sm text-red-500">Không thể gửi tin nhắn</p>
            </div>
          </div>
          <button
            onClick={onToggleInfo}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
          >
            <Info className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <BlockedChatView isBlockedByOther />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <UserAvatar user={otherUser} size="md" />
          <div>
            <h2 className="font-semibold text-gray-900">
              {isCloudChat ? "Cloud của tôi" : otherUser.name}
            </h2>
            <p className="text-sm text-gray-500">
              {otherUser.isOnline
                ? "Online"
                : `Last seen ${otherUser.lastSeen}`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* <button
            onClick={() => handleStartCall("audio")}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
            title="Gọi thoại"
          >
            <Phone className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => handleStartCall("video")}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
            title="Gọi video"
          >
            <Video className="w-5 h-5 text-gray-600" />
          </button> */}
          <button
            onClick={onToggleInfo}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
          >
            <Info className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {conversation.pinnedMessages &&
          conversation.pinnedMessages.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
                  📌 Tin nhắn đã ghim ({conversation.pinnedMessages.length})
                </h4>
                <button
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() =>
                    messagesEndRef.current?.scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                >
                  Cuộn xuống
                </button>
              </div>
              <div className="space-y-2">
                {conversation.pinnedMessages.slice(0, 3).map((pinnedId) => {
                  const pinnedMessage = conversation.messages.find(
                    (m) => m.id === pinnedId,
                  );
                  if (!pinnedMessage) return null;
                  const sender =
                    conversation.participants.find(
                      (p) => p.id === pinnedMessage.senderId,
                    )?.name || "Người dùng";
                  return (
                    <div
                      key={pinnedId}
                      className="flex justify-between items-center bg-yellow-100 px-3 py-2 rounded hover:bg-yellow-200 transition"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          {sender}:
                        </div>
                        <div className="text-sm text-gray-700 truncate max-w-[220px]">
                          {pinnedMessage.content}
                        </div>
                      </div>
                      <button
                        onClick={() => onPinMessage?.(pinnedId, true)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Bỏ ghim
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {conversation.messages.map((message) => {
          if (message.type === "location") {
            try {
              const locationData = JSON.parse(message.content);
              const expired = isLocationExpired(message.timestamp);

              return (
                <LocationMessageBubble
                  key={message.id ?? message.tempId}
                  latitude={locationData.latitude}
                  longitude={locationData.longitude}
                  isOwn={message.senderId === currentUser.id}
                  isExpired={expired}
                  createdAt={message.timestamp}
                />
              );
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (e) {
              return null;
            }
          }
          return (
            <div
              key={message.id ?? message.tempId}
              ref={(el) => (messageRefs.current[message.id] = el)}
            >
              <MessageBubble
                message={message}
                isOwn={message.senderId === currentUser.id}
                sender={conversation.participants.find(
                  (p) => p.id === message.senderId,
                )}
                onAddReaction={handleAddReaction}
                onPinMessage={handlePinMessage}
                onReplyMessage={handleReplyMessage}
                onRecallMessage={handleRecallMessage}
                onForwardMessage={handleForwardMessage}
                onEditMessage={handleEditMessage}
                onScrollToMessage={handleScrollToMessage}
                isPinned={conversation.pinnedMessages?.includes(message.id)}
              />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {showVoiceRecorder ? (
        <VoiceRecorder
          onSendVoice={handleSendVoice}
          onCancel={handleCancelVoice}
        />
      ) : (
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          {/* Reply Preview */}
          {replyingTo && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Replying to{" "}
                  {
                    conversation.participants.find(
                      (p) => p.id === replyingTo.senderId,
                    )?.name
                  }
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {replyingTo.content}
                </div>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors duration-150"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}
          {isUploadingFile && (
            <div className="mb-3 p-3 bg-blue-50 rounded-lg flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-600">Uploading file...</span>
            </div>
          )}

          <form
            onSubmit={handleSendMessage}
            className="flex items-center space-x-3"
          >
            <button
              type="button"
              onClick={() => setShowFileModal(true)}
              className="p-3 hover:bg-gray-100 rounded-full transition-colors duration-150"
            >
              <Paperclip className="w-5 h-5 text-gray-600" />
            </button>

            <button
              type="button"
              onClick={handleVoiceRecord}
              className="p-3 hover:bg-gray-100 rounded-full transition-colors duration-150 text-gray-600"
              title="Record voice message"
            >
              <Mic className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleShareLocation}
              className="p-3 hover:bg-gray-100 rounded-full transition-colors duration-150"
            >
              <MapPin className="w-5 h-5 text-gray-600" />
            </button>

            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 px-4 py-3 bg-gray-100 rounded-2xl border-none resize-none
             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white
             transition-all duration-200 overflow-hidden"
            />
            <EmojiPicker
              onEmojiSelect={handleEmojiSelect}
              isOpen={showEmojiPicker}
              onToggle={() => setShowEmojiPicker(!showEmojiPicker)}
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}

      <FileUploadModal
        isOpen={showFileModal}
        onClose={() => setShowFileModal(false)}
        onFileSelect={handleFileSelect}
      />

      <ForwardMessageModal
        isOpen={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        message={messageToForward}
        onForward={handleForwardComplete}
        currentUser={currentUser}
      />
    </div>
  );
};
