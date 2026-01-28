import React from 'react';
import type { Conversation, User } from '../types';
import { UserAvatar } from './UserAvatar';
import { MoreHorizontal, Archive, BellOff, Phone, Video, Trash2, AlertTriangle, UserX, CheckCheck, User as UserIcon } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  currentUser: User;
  activeConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  activeTab?: 'all' | 'unread';
}

interface ConversationItemProps {
  conversation: Conversation;
  currentUser: User;
  isActive: boolean;
  onSelect: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  currentUser,
  isActive,
  onSelect,
}) => {
  const [showContextMenu, setShowContextMenu] = React.useState(false);
  const [contextMenuPosition, setContextMenuPosition] = React.useState({ x: 0, y: 0 });

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getOtherParticipant = (): User => {
    return conversation.participants.find(p => p.id !== currentUser.id) || conversation.participants[0];
  };

  const otherUser = getOtherParticipant();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenuPosition({ x: rect.right - 200, y: rect.bottom });
    setShowContextMenu(true);
  };

  React.useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  return (
    <>
      <div
        onClick={onSelect}
        onContextMenu={handleContextMenu}
        className={`p-4 cursor-pointer transition-colors duration-150 hover:bg-gray-50 relative group ${
          isActive ? 'bg-blue-50 border-r-4 border-blue-500' : ''
        }`}
      >
        <div className="flex items-center space-x-3">
          <UserAvatar user={otherUser} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <h3 className={`font-medium text-sm truncate ${
                isActive ? 'text-blue-900' : 'text-gray-900'
              }`}>
                {otherUser.name}
              </h3>
              <div className="flex items-center space-x-2">
                {conversation.lastMessage && (
                  <span className="text-xs text-gray-500">
                    {formatTime(conversation.lastMessage.timestamp)}
                  </span>
                )}
                <button
                  onClick={handleMoreClick}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded-full transition-all duration-150"
                >
                  <MoreHorizontal className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600 truncate max-w-[200px]">
                {conversation.lastMessage?.content || 'No messages yet'}
              </p>
              {conversation.unreadCount > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] flex items-center justify-center">
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl py-2 w-48 z-50"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
        >
          <button className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors duration-150">
            <CheckCheck className="w-4 h-4 text-gray-600 mr-3" />
            <span className="text-gray-700">Đánh dấu là chưa đọc</span>
          </button>
          <button className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors duration-150">
            <BellOff className="w-4 h-4 text-gray-600 mr-3" />
            <span className="text-gray-700">Tắt thông báo</span>
          </button>
          <button className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors duration-150">
            <UserIcon className="w-4 h-4 text-gray-600 mr-3" />
            <span className="text-gray-700">Xem trang cá nhân</span>
          </button>
          
          {/* Divider */}
          <div className="border-t border-gray-200 my-2"></div>
          
          <button className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors duration-150">
            <Phone className="w-4 h-4 text-gray-600 mr-3" />
            <span className="text-gray-700">Gọi thoại</span>
          </button>
          <button className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors duration-150">
            <Video className="w-4 h-4 text-gray-600 mr-3" />
            <span className="text-gray-700">Chat video</span>
          </button>
          <button className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors duration-150">
            <UserX className="w-4 h-4 text-gray-600 mr-3" />
            <span className="text-gray-700">Chặn</span>
          </button>
          <button className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors duration-150">
            <Archive className="w-4 h-4 text-gray-600 mr-3" />
            <span className="text-gray-700">Lưu trữ đoạn chat</span>
          </button>
          <button className="w-full flex items-center px-4 py-3 hover:bg-red-50 transition-colors duration-150">
            <Trash2 className="w-4 h-4 text-red-500 mr-3" />
            <span className="text-red-500">Xóa đoạn chat</span>
          </button>
          <button className="w-full flex items-center px-4 py-3 hover:bg-red-50 transition-colors duration-150">
            <AlertTriangle className="w-4 h-4 text-red-500 mr-3" />
            <span className="text-red-500">Báo cáo</span>
          </button>
        </div>
      )}
    </>
  );
};
export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentUser,
  activeConversationId,
  onSelectConversation,
  activeTab,
}) => {
  return (
    <div className="space-y-1">
      {conversations.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {activeTab === 'unread' ? 'Không có tin nhắn chưa đọc' : 'Không có cuộc trò chuyện nào'}
          </p>
        </div>
      )}
      {conversations.map((conversation) => {
        const isActive = conversation.id === activeConversationId;
        
        return (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            currentUser={currentUser}
            isActive={isActive}
            onSelect={() => onSelectConversation(conversation.id)}
          />
        );
      })}
    </div>
  );
};