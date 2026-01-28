import React, { useState, useMemo } from "react";
import {
  X,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckSquare,
  Square,
} from "lucide-react";
import type { Message, Conversation, User } from "../types";
import { MessageBubble } from "./MessageBubble";

interface PinnedMessagesPageProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  currentUser: User;
  onUnpinMessages: (messageIds: string[]) => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onReplyMessage?: (message: Message) => void;
  onRecallMessage?: (messageId: string) => void;
  onForwardMessage?: (message: Message) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

type SortOrder = "newest" | "oldest";

export const PinnedMessagesPage: React.FC<PinnedMessagesPageProps> = ({
  isOpen,
  onClose,
  conversation,
  currentUser,
  onUnpinMessages,
  onAddReaction,
  onReplyMessage,
  onRecallMessage,
  onForwardMessage,
  onEditMessage,
}) => {
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const pinnedMessages = useMemo(() => {
    const messages = conversation.messages.filter((msg) =>
      conversation.pinnedMessages?.includes(msg.id)
    );

    if (sortOrder === "newest") {
      return [...messages].reverse();
    }
    return messages;
  }, [conversation.messages, conversation.pinnedMessages, sortOrder]);

  const handleSelectMessage = (messageId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedIds(newSelected);
    setSelectAll(
      newSelected.size === pinnedMessages.length && pinnedMessages.length > 0
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(pinnedMessages.map((msg) => msg.id));
      setSelectedIds(allIds);
      setSelectAll(true);
    }
  };

  const handleUnpinSelected = () => {
    if (selectedIds.size > 0) {
      onUnpinMessages(Array.from(selectedIds));
      setSelectedIds(new Set());
      setSelectAll(false);
    }
  };

  const handleUnpinSingle = (messageId: string) => {
    onUnpinMessages([messageId]);
    const newSelected = new Set(selectedIds);
    newSelected.delete(messageId);
    setSelectedIds(newSelected);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40">
      <div className="absolute top-0 right-0 h-full w-full max-w-2xl bg-white shadow-lg flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pinned Messages</h2>
            <p className="text-sm text-gray-500">
              {pinnedMessages.length} message
              {pinnedMessages.length !== 1 ? "s" : ""} pinned
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Toolbar */}
        {pinnedMessages.length > 0 && (
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSelectAll}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
                title={selectAll ? "Deselect all" : "Select all"}
              >
                {selectAll ? (
                  <CheckSquare className="w-5 h-5 text-blue-500" />
                ) : (
                  <Square className="w-5 h-5 text-gray-600" />
                )}
              </button>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-sm font-medium text-gray-700">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={handleUnpinSelected}
                    className="ml-4 px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors duration-150 flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Unpin</span>
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSortOrder("newest")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center space-x-2 ${
                  sortOrder === "newest"
                    ? "bg-blue-500 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <ArrowDown className="w-4 h-4" />
                <span>Newest</span>
              </button>
              <button
                onClick={() => setSortOrder("oldest")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center space-x-2 ${
                  sortOrder === "oldest"
                    ? "bg-blue-500 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <ArrowUp className="w-4 h-4" />
                <span>Oldest</span>
              </button>
            </div>
          </div>
        )}

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {pinnedMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 text-lg">No pinned messages yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Pin messages to keep them organized
                </p>
              </div>
            </div>
          ) : (
            pinnedMessages.map((message) => (
              <div
                key={message.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-150 group"
              >
                <div className="flex items-start space-x-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleSelectMessage(message.id)}
                    className="mt-1 p-1 hover:bg-gray-200 rounded transition-colors duration-150"
                  >
                    {selectedIds.has(message.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                    )}
                  </button>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <MessageBubble
                      message={message}
                      isOwn={message.senderId === currentUser.id}
                      sender={conversation.participants.find(
                        (p) => p.id === message.senderId
                      )}
                      onAddReaction={onAddReaction}
                      onReplyMessage={onReplyMessage}
                      onRecallMessage={onRecallMessage}
                      onForwardMessage={onForwardMessage}
                      onEditMessage={onEditMessage}
                      isPinned={true}
                    />
                  </div>

                  {/* Unpin Button */}
                  <button
                    onClick={() => handleUnpinSingle(message.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-150 opacity-0 group-hover:opacity-100"
                    title="Unpin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
