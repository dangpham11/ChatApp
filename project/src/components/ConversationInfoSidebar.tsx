import React from "react";
import type { Conversation, User } from "../types";
import { UserAvatar } from "./UserAvatar";
import {
  X,
  User as UserIcon,
  Search,
  ChevronUp,
  ChevronDown,
  Pin,
  CreditCard as Edit3,
  Image,
  File,
  ArrowLeft,
  Trash2,
  Ban,
} from "lucide-react";
import { FriendProfileModal } from "./FriendProfileModal";
import { EditNicknameModal } from "./EditNicknameModal";
import { MuteNotificationModal } from "./MuteNotificationModal";
import { BlockMessageModal } from "./BlockMessageModal";
import { Toast } from "./Toast";
import SearchMessagesModal from "./SearchMessagesModal";

interface ConversationInfoSidebarProps {
  conversation: Conversation;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSendFriendRequest?: (userId: string) => void;
  onUpdateNickname?: (
    userId: string,
    nickname: string | null,
  ) => Promise<void> | void;
  onBlockUser?: (targetUserId: string) => Promise<void> | void;
  onUnblockUser?: (targetUserId: string) => Promise<void> | void;
  onViewPinnedMessages?: () => void;
  onClearConversation?: (conversationId: string) => Promise<void> | void;
  onSelectMessage?: (messageId: string) => void;
}

export const ConversationInfoSidebar: React.FC<
  ConversationInfoSidebarProps
> = ({
  conversation,
  currentUser,
  isOpen,
  onClose,
  onUpdateNickname,
  onBlockUser,
  onUnblockUser,
  onClearConversation,
  onViewPinnedMessages,
  onSelectMessage,
}) => {
  const [showFriendProfile, setShowFriendProfile] = React.useState(false);
  const [showEditNickname, setShowEditNickname] = React.useState(false);
  const [showFileMediaView, setShowFileMediaView] = React.useState(false);
  const [activeFileTab, setActiveFileTab] = React.useState<"media" | "file">(
    "media",
  );
  const [showMuteModal, setShowMuteModal] = React.useState(false);
  const [showBlockModal, setShowBlockModal] = React.useState(false);
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const [showSearchModal, setShowSearchModal] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState("");
  const [expandedSections, setExpandedSections] = React.useState({
    chatInfo: true,
    customization: true,
    mediaFiles: true,
    privacy: true,
  });

  const getOtherParticipant = (): User => {
    return (
      conversation.participants.find((p) => p.id !== currentUser.id) ||
      conversation.participants[0]
    );
  };

  const otherUser = getOtherParticipant();
  const nickname = conversation.nicknames?.[otherUser.id];
  const displayName = nickname || otherUser.name;

  const isCloudChat =
    conversation.participants.length === 1 || otherUser.id === currentUser.id;
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleMuteNotification = () => {
    setShowMuteModal(false);
    setToastMessage("🔕 Bạn đã tắt thông báo cho cuộc trò chuyện này.");
    setShowToast(true);
  };

  const handleBlockUser = async () => {
    try {
      setToastMessage("");
      await onBlockUser?.(otherUser.id);
      setShowBlockModal(false);
      setToastMessage("🚫 Bạn đã chặn người này.");
      setShowToast(true);
    } catch (err) {
      console.error("Block failed:", err);
      setToastMessage("Không thể chặn người này. Vui lòng thử lại.");
      setShowToast(true);
    }
  };

  const handleUnblockUser = async () => {
    try {
      await onUnblockUser?.(otherUser.id);
      setToastMessage("Bạn đã bỏ chặn người này.");
      setShowToast(true);
    } catch (err) {
      console.error("Unblock failed:", err);
      setToastMessage("Không thể bỏ chặn. Vui lòng thử lại.");
      setShowToast(true);
    }
  };

  const handleClearConversation = async () => {
    try {
      await onClearConversation?.(conversation.id);
      setToastMessage("Cuộc trò chuyện đã được xóa cho bạn.");
      setShowToast(true);
      onClose();
    } catch (err) {
      console.error("Clear conversation failed:", err);
      setToastMessage("Không thể xóa cuộc trò chuyện. Vui lòng thử lại.");
      setShowToast(true);
    }
  };

  // Mock data for media and files
  const mediaFiles = conversation.messages
    .filter((msg) => msg.type === "image" && msg.fileUrl)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .map((msg) => ({
      id: msg.id,
      url: msg.fileUrl!,
      timestamp: msg.timestamp,
      month: new Date(msg.timestamp).toLocaleString("vi-VN", {
        month: "long",
        year: "numeric",
      }),
    }));

  // ✅ Lọc và sắp xếp file theo thời gian gửi (mới nhất lên đầu)
  const files = conversation.messages
    .filter((msg) => msg.type === "file" && msg.fileUrl)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .map((msg) => ({
      id: msg.id,
      name: msg.fileName || "Tệp không tên",
      size: msg.fileSize ? formatFileSize(msg.fileSize) : "Không rõ",
      date: new Date(msg.timestamp).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      url: msg.fileUrl!,
    }));

  // ✅ Hàm định dạng kích thước file
  function formatFileSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024) return sizeInBytes + " B";
    const kb = sizeInBytes / 1024;
    if (kb < 1024) return kb.toFixed(2) + " KB";
    const mb = kb / 1024;
    if (mb < 1024) return mb.toFixed(2) + " MB";
    const gb = mb / 1024;
    return gb.toFixed(2) + " GB";
  }

  // Group media by month
  const groupedMedia = mediaFiles.reduce(
    (acc, media) => {
      if (!acc[media.month]) acc[media.month] = [];
      acc[media.month].push(media);
      return acc;
    },
    {} as Record<string, typeof mediaFiles>,
  );

  if (!isOpen) return null;

  // File Media View
  if (showFileMediaView) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 flex items-center border-b border-gray-200">
          <button
            onClick={() => setShowFileMediaView(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150 mr-3"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900">
            File phương tiện và file
          </h3>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveFileTab("media")}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-150 ${
              activeFileTab === "media"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            File phương tiện
          </button>
          <button
            onClick={() => setActiveFileTab("file")}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-150 ${
              activeFileTab === "file"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            File
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeFileTab === "media" ? (
            <div className="space-y-6">
              {Object.entries(groupedMedia).map(([month, items]) => (
                <div key={month}>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    {month}
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {items.map((media) => (
                      <div
                        key={media.id}
                        className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
                      >
                        <a
                          key={media.id}
                          href={media.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={media.url}
                            alt="media"
                            className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
                          />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-150"
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      {file.name.split(".").pop()?.toUpperCase() || "F"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{file.size}</span>
                      <span>•</span>
                      <span>{file.date}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Conversation Info View
  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Thông tin hội thoại
        </h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* User Profile Section */}
      <div className="p-6 text-center border-b border-gray-200">
        <div className="relative inline-block">
          <UserAvatar user={otherUser} size="lg" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-gray-900 flex items-center justify-center">
          {isCloudChat ? "Cloud của tôi" : displayName}
          <button
            onClick={() => setShowEditNickname(true)}
            className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors duration-150"
          >
            <Edit3 className="w-4 h-4 text-gray-600" />
          </button>
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {isCloudChat
            ? "Ghi chú cá nhân"
            : otherUser.isOnline
              ? "Đang hoạt động"
              : `Hoạt động ${otherUser.lastSeen}`}
        </p>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-8 mt-6">
          {!isCloudChat && (
            <button
              onClick={() => setShowFriendProfile(true)}
              className="flex flex-col items-center p-3 hover:bg-gray-100 rounded-lg transition-colors duration-150"
            >
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-2">
                <UserIcon className="w-6 h-6 text-gray-600" />
              </div>
              <span className="text-xs text-gray-600">Trang cá nhân</span>
            </button>
          )}
          {/* <button
            onClick={() => setShowMuteModal(true)}
            className="flex flex-col items-center p-3 hover:bg-gray-100 rounded-lg transition-colors duration-150"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-2">
              <BellOff className="w-6 h-6 text-gray-600" />
            </div>
            <span className="text-xs text-gray-600">Tắt thông báo</span>
          </button> */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex flex-col items-center p-3 hover:bg-gray-100 rounded-lg transition-colors duration-150"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-2">
              <Search className="w-6 h-6 text-gray-600" />
            </div>
            <span className="text-xs text-gray-600">Tìm kiếm tin nhắn</span>
          </button>
        </div>
      </div>

      {/* Settings Section */}
      <div className="flex-1 overflow-y-auto">
        {/* Thông tin về đoạn chat */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection("chatInfo")}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
          >
            <span className="text-gray-900 font-medium">
              Thông tin về đoạn chat
            </span>
            {expandedSections.chatInfo ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {expandedSections.chatInfo && (
            <div className="px-6 pb-4">
              <button
                onClick={onViewPinnedMessages}
                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-150"
              >
                <Pin className="w-5 h-5 text-gray-500 mr-3" />
                <span className="text-gray-700">Xem tin nhắn đã ghim</span>
              </button>
            </div>
          )}
        </div>

        {/* Tùy chỉnh đoạn chat */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection("customization")}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
          >
            <span className="text-gray-900 font-medium">
              Tùy chỉnh đoạn chat
            </span>
            {expandedSections.customization ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {expandedSections.customization && !isCloudChat && (
            <div className="px-6 pb-4">
              <button
                onClick={() => setShowEditNickname(true)}
                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-150"
              >
                <Edit3 className="w-5 h-5 text-gray-500 mr-3" />
                <span className="text-gray-700">Đổi biệt danh</span>
              </button>
            </div>
          )}
        </div>

        {/* File phương tiện & file */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection("mediaFiles")}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
          >
            <span className="text-gray-900 font-medium">
              File phương tiện & file
            </span>
            {expandedSections.mediaFiles ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {expandedSections.mediaFiles && (
            <div className="px-6 pb-4 space-y-1">
              <button
                onClick={() => {
                  setShowFileMediaView(true);
                  setActiveFileTab("media");
                }}
                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-150"
              >
                <Image className="w-5 h-5 text-gray-500 mr-3" />
                <span className="text-gray-700">File phương tiện</span>
              </button>
              <button
                onClick={() => {
                  setShowFileMediaView(true);
                  setActiveFileTab("file");
                }}
                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-150"
              >
                <File className="w-5 h-5 text-gray-500 mr-3" />
                <span className="text-gray-700">File</span>
              </button>
            </div>
          )}
        </div>

        {/* Quyền riêng tư và hỗ trợ */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection("privacy")}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
          >
            <span className="text-gray-900 font-medium">
              Quyền riêng tư và hỗ trợ
            </span>
            {expandedSections.privacy ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {expandedSections.privacy && (
            <div className="px-6 pb-4 space-y-1">
              {/* <button
                onClick={() => setShowMuteModal(true)}
                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-150"
              >
                <BellOff className="w-5 h-5 text-gray-500 mr-3" />
                <span className="text-gray-700">Tắt thông báo</span>
              </button> */}
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-150"
              >
                <Trash2 className="w-5 h-5 text-red-500 mr-3" />
                <span className="text-red-500">Xóa cuộc trò chuyện</span>
              </button>
              {!isCloudChat &&
                (conversation.isBlocked ? (
                  <button
                    onClick={handleUnblockUser}
                    className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-150"
                  >
                    <Ban className="w-5 h-5 text-blue-500 mr-3" />
                    <span className="text-blue-500">Bỏ chặn tin nhắn</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowBlockModal(true)}
                    className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-150"
                  >
                    <Ban className="w-5 h-5 text-red-500 mr-3" />
                    <span className="text-red-500">Chặn tin nhắn</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <FriendProfileModal
        isOpen={showFriendProfile}
        onClose={() => setShowFriendProfile(false)}
        friend={otherUser}
        onStartChat={() => setShowFriendProfile(false)}
      />

      <EditNicknameModal
        isOpen={showEditNickname}
        onClose={() => setShowEditNickname(false)}
        currentNickname={nickname || ""}
        friendName={otherUser.name}
        onSave={(nickname) => {
          onUpdateNickname?.(otherUser.id, nickname);
          setShowEditNickname(false);
        }}
      />

      <MuteNotificationModal
        isOpen={showMuteModal}
        onClose={() => setShowMuteModal(false)}
        onMute={handleMuteNotification}
      />

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-yellow-600" />
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Xóa cuộc trò chuyện?
              </h3>

              <p className="text-gray-600 mb-6">
                Hành động này sẽ xóa lịch sử chat chỉ cho bạn. Bạn có chắc chắn
                muốn tiếp tục?
              </p>
            </div>

            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-150"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  setShowClearConfirm(false);
                  await handleClearConversation();
                }}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors duration-150 shadow-md"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      <BlockMessageModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onConfirmBlock={handleBlockUser}
        userName={otherUser.name}
      />

      {showSearchModal && (
        <SearchMessagesModal
          isOpen={showSearchModal}
          conversationId={Number(conversation.id)}
          onClose={() => setShowSearchModal(false)}
          onSelectMessage={(messageId) => {
            onSelectMessage?.(messageId);
            setShowSearchModal(false);
            onClose();
          }}
        />
      )}

      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};
