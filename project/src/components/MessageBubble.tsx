import React, { useState, useRef, useEffect } from "react";
import type { Message, User } from "../types";
import {
  Check,
  CheckCheck,
  Pin,
  Reply,
  MoreHorizontal,
  Trash2,
  MapPin,
  Forward,
  Smile,
  CreditCard as Edit3,
  FileText,
  Download,
} from "lucide-react";
import { VoiceMessageBubble } from "./VoiceMessageBubble";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  sender?: User;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onPinMessage?: (messageId: string, isPinned: boolean) => void;
  onReplyMessage?: (message: Message) => void;
  onRecallMessage?: (messageId: string) => void;
  onForwardMessage?: (message: Message) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  isPinned?: boolean;
  onScrollToMessage?: (messageId: string) => void;
}

const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "😡"];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  sender,
  onAddReaction,
  onPinMessage,
  onReplyMessage,
  onRecallMessage,
  onForwardMessage,
  onEditMessage,
  isPinned,
  onScrollToMessage,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState<string>(
    message.content || "",
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const RECALL_TIME_LIMIT_MINUTES = 30;

  const canRecallMessage = (timestamp: string | Date) => {
    const sentTime =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;

    if (isNaN(sentTime.getTime())) return false;

    const now = new Date();
    const diffMinutes = (now.getTime() - sentTime.getTime()) / (1000 * 60);

    return diffMinutes <= RECALL_TIME_LIMIT_MINUTES;
  };

  const canRecall = isOwn && canRecallMessage(message.timestamp);

  const formatTime = (time: string | Date) => {
    const date = typeof time === "string" ? new Date(time) : time;
    if (isNaN(date.getTime())) return ""; // fallback
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Ho_Chi_Minh",
    });
  };
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;

    return text.split(urlRegex).map((part, index) => {
      if (!part) return null;

      if (part.match(urlRegex)) {
        const href = part.startsWith("http") ? part : `https://${part}`;

        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-200 underline break-words hover:text-blue-100"
          >
            {part}
          </a>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  const renderMessageContent = () => {
    if (message.type === "voice") {
      return (
        <VoiceMessageBubble
          audioUrl={message.content}
          duration={message.voiceDuration || 0}
          isOwn={isOwn}
        />
      );
    }

    if (message.type === "image") {
      return (
        <div className="space-y-2">
          <div className="rounded-lg overflow-hidden">
            <img
              src={message.fileUrl || message.content}
              alt={message.fileName || "Image"}
              className="max-w-full h-auto max-h-80 object-contain cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() =>
                window.open(message.fileUrl || message.content, "_blank")
              }
            />
          </div>
        </div>
      );
    }

    if (message.type === "video") {
      return (
        <div className="space-y-2">
          <div className="rounded-lg overflow-hidden">
            <video
              controls
              className="max-w-full h-auto max-h-80 rounded-lg"
              preload="metadata"
            >
              <source src={message.fileUrl || message.content} />
              Your browser does not support the video tag.
            </video>
          </div>
          {message.content && message.content !== message.fileUrl && (
            <p className="text-sm leading-relaxed">{message.content}</p>
          )}
        </div>
      );
    }

    if (message.type === "file") {
      const fileSize = message.fileSize
        ? `${(message.fileSize / 1024 / 1024).toFixed(2)} MB`
        : "";

      return (
        <div className="space-y-2">
          <div
            className={`flex items-center space-x-3 p-3 rounded-lg ${
              isOwn ? "bg-blue-600" : "bg-gray-100"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isOwn ? "bg-blue-700" : "bg-gray-200"
              }`}
            >
              <FileText
                className={`w-6 h-6 ${isOwn ? "text-white" : "text-gray-600"}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium truncate ${
                  isOwn ? "text-white" : "text-gray-900"
                }`}
              >
                {message.fileName || "Document"}
              </p>
              {fileSize && (
                <p
                  className={`text-xs ${
                    isOwn ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  {fileSize}
                </p>
              )}
            </div>
            <a
              href={message.fileUrl || message.content}
              download={message.fileName}
              className={`p-2 rounded-full transition-colors duration-150 ${
                isOwn
                  ? "hover:bg-blue-700 text-white"
                  : "hover:bg-gray-200 text-gray-600"
              }`}
              title="Download file"
            >
              <Download className="w-5 h-5" />
            </a>
          </div>
        </div>
      );
    }

    if (message.type === "location") {
      return (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-red-500" />
            <span className="font-medium">Location</span>
          </div>
          <div className="bg-gray-100 rounded-lg p-3">
            <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600">{message.location?.address}</p>
          </div>
        </div>
      );
    }

    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {renderTextWithLinks(message.content)}
      </p>
    );
  };

  useEffect(() => {
    if (isEditing) {
      const onOutside = (e: MouseEvent | TouchEvent) => {
        const target = e.target as Node;
        if (containerRef.current && !containerRef.current.contains(target)) {
          setIsEditing(false);
          setEditingContent(message.content || "");
        }
      };
      document.addEventListener("mousedown", onOutside);
      document.addEventListener("touchstart", onOutside);
      return () => {
        document.removeEventListener("mousedown", onOutside);
        document.removeEventListener("touchstart", onOutside);
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) {
      // focus input when entering edit mode
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isEditing]);

  if (message.isRecalled) {
    return null;
  }

  return (
    <div
      className={`flex ${
        isOwn ? "justify-end" : "justify-start"
      } mb-4 group relative ${isPinned ? "bg-yellow-50 p-2 rounded-lg" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
        setShowMoreMenu(false);
      }}
      onTouchStart={() => {
        // start long-press timer to open menu on mobile
        longPressTimer.current = window.setTimeout(() => {
          setShowMoreMenu(true);
        }, 600);
      }}
      onTouchEnd={() => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }}
    >
      {isPinned && (
        <div className="absolute top-0 left-0 flex items-center text-yellow-600 text-xs">
          <Pin className="w-3 h-3 mr-1" />
          <span>Pinned</span>
        </div>
      )}

      <div className={`max-w-xs lg:max-w-md ${isOwn ? "order-2" : "order-1"}`}>
        {!isOwn && sender && (
          <div className="text-xs text-gray-500 mb-1 ml-4">{sender.name}</div>
        )}

        {/* Forwarded Message Indicator */}
        {message.forwardedFrom && (
          <div className="ml-4 mb-2 flex items-center text-xs text-gray-500">
            <Forward className="w-3 h-3 mr-1" />
            <span>Forwarded from {message.forwardedFrom.senderName}</span>
          </div>
        )}

        {/* Reply Preview */}
        {message.replyTo?.messageId && (
          <div
            className={`mb-2 ${isOwn ? "mr-4" : "ml-4"}`}
            onClick={() => {
              if (message.replyTo?.messageId) {
                onScrollToMessage?.(message.replyTo.messageId);
              }
            }}
            title="Go to replied message"
          >
            <div className="bg-blue-100 rounded-lg border-l-4 border-blue-500 p-3 max-w-xs cursor-pointer hover:bg-blue-200 transition-colors">
              <div className="text-sm font-medium text-blue-900 mb-1">
                {message.replyTo.senderName}
              </div>
              <div className="text-sm text-blue-800">
                {message.replyTo.content}
              </div>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className={`message-bubble px-4 py-3 rounded-2xl shadow-sm relative ${
            isOwn
              ? "bg-blue-500 text-white rounded-br-md"
              : "bg-white text-gray-800 rounded-bl-md border border-gray-100"
          }`}
        >
          {isEditing ? (
            <div className="space-y-1">
              <input
                ref={inputRef}
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = editingContent.trim();
                    if (!trimmed) {
                      alert("Message cannot be empty");
                      return;
                    }
                    onEditMessage?.(message.id, trimmed);
                    setIsEditing(false);
                  } else if (e.key === "Escape") {
                    setIsEditing(false);
                    setEditingContent(message.content || "");
                  }
                }}
                className="w-full p-0 bg-transparent text-sm focus:outline-none"
              />
            </div>
          ) : (
            renderMessageContent()
          )}

          <div
            className={`flex items-center justify-end mt-2 gap-1 ${
              isOwn ? "text-blue-100" : "text-gray-400"
            }`}
          >
            <span className="text-xs">{formatTime(message.timestamp)}</span>
            {isOwn && (
              <div className="ml-1">
                {message.isRead ? (
                  <CheckCheck className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </div>
            )}
          </div>
          {message.isEdited && (
            <div className="text-xs text-gray-300 mt-1 ml-1">Đã chỉnh sửa</div>
          )}
        </div>

        {/* Message Reactions - New Style */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            className={`flex items-center space-x-1 mt-1 ${
              isOwn ? "justify-end mr-4" : "justify-start ml-4"
            }`}
          >
            <div className="flex items-center bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm">
              {message.reactions.map((reaction, index) => (
                <button
                  key={index}
                  onClick={() => onAddReaction?.(message.id, reaction.emoji)}
                  className="flex items-center hover:scale-110 transition-transform duration-150"
                  title={`${reaction.count} reaction${
                    reaction.count > 1 ? "s" : ""
                  }`}
                >
                  <span className="text-sm">{reaction.emoji}</span>
                  {reaction.count > 1 && (
                    <span className="text-xs text-gray-600 ml-1">
                      {reaction.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Message Actions - Simplified */}
      {showActions && (
        <div
          className={`flex items-center space-x-1 ${
            isOwn ? "order-1 mr-2" : "order-2 ml-2"
          }`}
        >
          {/* Quick Reactions */}
          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-150"
              title="Add reaction"
            >
              <Smile className="w-4 h-4 text-gray-400" />
            </button>

            {showReactions && (
              <div
                className={`absolute ${
                  isOwn ? "right-0" : "left-0"
                } bottom-8 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex space-x-1 z-50`}
              >
                {quickReactions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onAddReaction?.(message.id, emoji);
                      setShowReactions(false);
                    }}
                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded transition-colors duration-150"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply Button */}
          <button
            onClick={() => onReplyMessage?.(message)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-150"
            title="Reply"
          >
            <Reply className="w-4 h-4 text-gray-400" />
          </button>

          {/* More Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-150"
              title="More actions"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>

            {showMoreMenu && (
              <div
                className={`absolute ${
                  isOwn ? "right-0" : "left-0"
                } bottom-8 bg-white border border-gray-200 rounded-lg shadow-lg py-2 w-40 z-50`}
              >
                <button
                  onClick={() => {
                    onForwardMessage?.(message);
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center px-3 py-2 hover:bg-gray-50 transition-colors duration-150"
                >
                  <Forward className="w-4 h-4 text-gray-600 mr-2" />
                  <span className="text-sm text-gray-700">Forward</span>
                </button>

                <button
                  onClick={() => {
                    onPinMessage?.(message.id, isPinned || false);
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center px-3 py-2 hover:bg-gray-50 transition-colors duration-150"
                >
                  <Pin className="w-4 h-4 text-gray-600 mr-2" />
                  <span className="text-sm text-gray-700">
                    {isPinned ? "Unpin" : "Pin"}
                  </span>
                </button>

                {isOwn && (
                  <>
                    <button
                      onClick={() => {
                        setEditingContent(message.content || "");
                        setIsEditing(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center px-3 py-2 hover:bg-gray-50 transition-colors duration-150"
                    >
                      <Edit3 className="w-4 h-4 text-gray-600 mr-2" />
                      <span className="text-sm text-gray-700">Edit</span>
                    </button>

                    {canRecall && (
                      <button
                        onClick={() => {
                          onRecallMessage?.(message.id);
                          setShowMoreMenu(false);
                        }}
                        className="w-full flex items-center px-3 py-2 hover:bg-red-50 transition-colors duration-150"
                      >
                        <Trash2 className="w-4 h-4 text-red-500 mr-2" />
                        <span className="text-sm text-red-500">Delete</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
