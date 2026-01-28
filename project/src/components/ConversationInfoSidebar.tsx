import React from 'react';
import type { Conversation, User } from '../types';
import { UserAvatar } from './UserAvatar';
import { X, User as UserIcon, BellOff, Search, ChevronUp, ChevronDown, Pin, CreditCard as Edit3, Image, File, ArrowLeft, Trash2, Ban } from 'lucide-react';
import { FriendProfileModal } from './FriendProfileModal';
import { EditNicknameModal } from './EditNicknameModal';
import { MuteNotificationModal } from './MuteNotificationModal';
import { BlockMessageModal } from './BlockMessageModal';
import { Toast } from './Toast';

interface ConversationInfoSidebarProps {
  conversation: Conversation;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSendFriendRequest?: (userId: string) => void;
  onUpdateNickname?: (userId: string, nickname: string) => void;
  onBlockUser?: () => void;
  onUnblockUser?: () => void;
}

export const ConversationInfoSidebar: React.FC<ConversationInfoSidebarProps> = ({
  conversation,
  currentUser,
  isOpen,
  onClose,
  onSendFriendRequest,
  onUpdateNickname,
  onBlockUser,
  onUnblockUser,
}) => {
  const [showFriendProfile, setShowFriendProfile] = React.useState(false);
  const [showEditNickname, setShowEditNickname] = React.useState(false);
  const [showFileMediaView, setShowFileMediaView] = React.useState(false);
  const [activeFileTab, setActiveFileTab] = React.useState<'media' | 'file'>('media');
  const [showMuteModal, setShowMuteModal] = React.useState(false);
  const [showBlockModal, setShowBlockModal] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [expandedSections, setExpandedSections] = React.useState({
    chatInfo: true,
    customization: true,
    mediaFiles: true,
    privacy: true
  });

  const getOtherParticipant = (): User => {
    return conversation.participants.find(p => p.id !== currentUser.id) || conversation.participants[0];
  };

  const otherUser = getOtherParticipant();
  const nickname = conversation.nicknames?.[otherUser.id];
  const displayName = nickname || otherUser.name;

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleMuteNotification = (duration: string) => {
    setShowMuteModal(false);
    setToastMessage('🔕 Bạn đã tắt thông báo cho cuộc trò chuyện này.');
    setShowToast(true);
  };

  const handleBlockUser = () => {
    setShowBlockModal(false);
    onBlockUser?.();
    setToastMessage('🚫 Bạn đã chặn người này.');
    setShowToast(true);
  };

  const handleUnblockUser = () => {
    onUnblockUser?.();
    setToastMessage('Bạn đã bỏ chặn người này.');
    setShowToast(true);
  };

  // Mock data for media and files
  const mediaFiles = [
    { id: 1, type: 'image', url: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', month: 'Tháng 10' },
    { id: 2, type: 'image', url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', month: 'Tháng 10' },
    { id: 3, type: 'image', url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', month: 'Tháng 10' },
    { id: 4, type: 'image', url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', month: 'Tháng 9' },
    { id: 5, type: 'image', url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', month: 'Tháng 9' },
    { id: 6, type: 'image', url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2', month: 'Tháng 9' },
  ];

  const files = [
    { id: 1, name: '66PM.D1_07_PhamVanDang_0...566.docx', size: '8.19 MB', type: 'docx', date: 'Hôm qua' },
    { id: 2, name: 'a.docx', size: '20.77 KB', type: 'docx', date: 'Hôm qua' },
    { id: 3, name: 'ĐỒ ÁN CUỐI KỲ VÀ BÁO CÁO.docx', size: '2.5 MB', type: 'docx', date: '2 ngày trước' },
  ];

  // Group media by month
  const groupedMedia = mediaFiles.reduce((acc, media) => {
    if (!acc[media.month]) {
      acc[media.month] = [];
    }
    acc[media.month].push(media);
    return acc;
  }, {} as Record<string, typeof mediaFiles>);

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
          <h3 className="text-lg font-semibold text-gray-900">File phương tiện và file</h3>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveFileTab('media')}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-150 ${
              activeFileTab === 'media'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            File phương tiện
          </button>
          <button
            onClick={() => setActiveFileTab('file')}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors duration-150 ${
              activeFileTab === 'file'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            File
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeFileTab === 'media' ? (
            <div className="space-y-6">
              {Object.entries(groupedMedia).map(([month, items]) => (
                <div key={month}>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">{month}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {items.map((media) => (
                      <div key={media.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={media.url}
                          alt=""
                          className="w-full h-full object-cover hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-150">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">W</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{file.size}</span>
                      <span>•</span>
                      <span>{file.date}</span>
                    </div>
                  </div>
                </div>
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
        <h3 className="text-lg font-semibold text-gray-900">Thông tin hội thoại</h3>
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
          {displayName}
          <button 
            onClick={() => setShowEditNickname(true)}
            className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors duration-150"
          >
            <Edit3 className="w-4 h-4 text-gray-600" />
          </button>
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {otherUser.isOnline ? 'Đang hoạt động' : `Hoạt động ${otherUser.lastSeen}`}
        </p>
        
        {/* Encryption Badge */}
        <div className="flex items-center justify-center mt-3 px-3 py-1 bg-gray-100 rounded-full">
          <div className="w-3 h-3 bg-gray-600 rounded-full flex items-center justify-center mr-2">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
          <span className="text-xs text-gray-600">Được mã hóa đầu cuối</span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-center space-x-8 mt-6">
          <button 
            onClick={() => setShowFriendProfile(true)}
            className="flex flex-col items-center p-3 hover:bg-gray-100 rounded-lg transition-colors duration-150"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-2">
              <UserIcon className="w-6 h-6 text-gray-600" />
            </div>
            <span className="text-xs text-gray-600">Trang cá nhân</span>
          </button>
          <button
            onClick={() => setShowMuteModal(true)}
            className="flex flex-col items-center p-3 hover:bg-gray-100 rounded-lg transition-colors duration-150"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-2">
              <BellOff className="w-6 h-6 text-gray-600" />
            </div>
            <span className="text-xs text-gray-600">Tắt thông báo</span>
          </button>
          <button className="flex flex-col items-center p-3 hover:bg-gray-100 rounded-lg transition-colors duration-150">
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
            onClick={() => toggleSection('chatInfo')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
          >
            <span className="text-gray-900 font-medium">Thông tin về đoạn chat</span>
            {expandedSections.chatInfo ? 
              <ChevronUp className="w-5 h-5 text-gray-500" /> : 
              <ChevronDown className="w-5 h-5 text-gray-500" />
            }
          </button>
          
          {expandedSections.chatInfo && (
            <div className="px-6 pb-4">
              <button className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-150">
                <Pin className="w-5 h-5 text-gray-500 mr-3" />
                <span className="text-gray-700">Xem tin nhắn đã ghim</span>
              </button>
            </div>
          )}
        </div>

        {/* Tùy chỉnh đoạn chat */}
        <div className="border-b border-gray-200">
          <button 
            onClick={() => toggleSection('customization')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
          >
            <span className="text-gray-900 font-medium">Tùy chỉnh đoạn chat</span>
            {expandedSections.customization ? 
              <ChevronUp className="w-5 h-5 text-gray-500" /> : 
              <ChevronDown className="w-5 h-5 text-gray-500" />
            }
          </button>
          
          {expandedSections.customization && (
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
            onClick={() => toggleSection('mediaFiles')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
          >
            <span className="text-gray-900 font-medium">File phương tiện & file</span>
            {expandedSections.mediaFiles ? 
              <ChevronUp className="w-5 h-5 text-gray-500" /> : 
              <ChevronDown className="w-5 h-5 text-gray-500" />
            }
          </button>
          
          {expandedSections.mediaFiles && (
            <div className="px-6 pb-4 space-y-1">
              <button 
                onClick={() => {
                  setShowFileMediaView(true);
                  setActiveFileTab('media');
                }}
                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-150"
              >
                <Image className="w-5 h-5 text-gray-500 mr-3" />
                <span className="text-gray-700">File phương tiện</span>
              </button>
              <button 
                onClick={() => {
                  setShowFileMediaView(true);
                  setActiveFileTab('file');
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
            onClick={() => toggleSection('privacy')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
          >
            <span className="text-gray-900 font-medium">Quyền riêng tư và hỗ trợ</span>
            {expandedSections.privacy ? 
              <ChevronUp className="w-5 h-5 text-gray-500" /> : 
              <ChevronDown className="w-5 h-5 text-gray-500" />
            }
          </button>
          
          {expandedSections.privacy && (
            <div className="px-6 pb-4 space-y-1">
              <button
                onClick={() => setShowMuteModal(true)}
                className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-150"
              >
                <BellOff className="w-5 h-5 text-gray-500 mr-3" />
                <span className="text-gray-700">Tắt thông báo</span>
              </button>
              <button className="w-full flex items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors duration-150">
                <Trash2 className="w-5 h-5 text-red-500 mr-3" />
                <span className="text-red-500">Xóa cuộc trò chuyện</span>
              </button>
              {conversation.isBlocked ? (
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
              )}
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
        currentNickname={nickname || ''}
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

      <BlockMessageModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onConfirmBlock={handleBlockUser}
        userName={otherUser.name}
      />

      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};