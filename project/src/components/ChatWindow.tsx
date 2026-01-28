import React, { useState, useRef, useEffect } from 'react';
import type { Conversation, User, Message } from '../types';
import { MessageBubble } from './MessageBubble';
import { UserAvatar } from './UserAvatar';
import { Send, MoreVertical, Phone, Video, Paperclip, Info, Mic, X, MapPin } from 'lucide-react';
import { FileUploadModal } from './FileUploadModal';
import { EmojiPicker } from './EmojiPicker';
import { ForwardMessageModal } from './ForwardMessageModal';
import { VoiceRecorder } from './VoiceRecorder';
import { LocationMessageBubble } from './LocationMessageBubble';
import { BlockedChatView } from './BlockedChatView';

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
  onSendMessage: (content: string, replyTo?: Message, type?: 'text' | 'voice' | 'location', voiceDuration?: number) => void;
  onToggleInfo: () => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onPinMessage?: (messageId: string) => void;
  onRecallMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onUnblockUser?: () => void;
  onStartCall?: (type: 'audio' | 'video') => void;
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
  onStartCall,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showFileModal, setShowFileModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
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

  const handlePinMessage = (messageId: string) => {
    onPinMessage?.(messageId);
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
      let messageContent = newMessage.trim();
      
      // Pass reply data to parent component
      onSendMessage(messageContent, replyingTo);
      setNewMessage('');
      setReplyingTo(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  const handleVoiceRecord = () => {
    setShowVoiceRecorder(true);
  };

  const handleSendVoice = (audioBlob: Blob, duration: number) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    onSendMessage(audioUrl, replyingTo, 'voice', duration);
    setShowVoiceRecorder(false);
    setReplyingTo(null);
  };

  const handleCancelVoice = () => {
    setShowVoiceRecorder(false);
  };

  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = JSON.stringify({
            type: 'location',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          onSendMessage(locationData, undefined, 'location');
        },
        () => {
          const mockLocation = JSON.stringify({
            type: 'location',
            latitude: 10.762622,
            longitude: 106.660172,
          });
          onSendMessage(mockLocation, undefined, 'location');
        }
      );
    } else {
      const mockLocation = JSON.stringify({
        type: 'location',
        latitude: 10.762622,
        longitude: 106.660172,
      });
      onSendMessage(mockLocation, undefined, 'location');
    }
  };

  const handleStartCall = (type: 'audio' | 'video') => {
    onStartCall?.(type);
  };

  const handleFileSelect = (file: File, type: 'image' | 'file') => {
    // Simulate file upload and create message with file info
    const fileMessage = type === 'image' 
      ? `📷 Image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
      : `📎 File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    onSendMessage(fileMessage);
    setShowFileModal(false);
  };

  const handleForwardComplete = (conversationIds: string[]) => {
    // In a real app, this would forward the message to selected conversations
    console.log('Forwarding message to:', conversationIds);
    setShowForwardModal(false);
  };

  const getOtherParticipant = (): User => {
    return conversation.participants.find(p => p.id !== currentUser.id) || conversation.participants[0];
  };

  const otherUser = getOtherParticipant();

  if (conversation.isBlocked) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <UserAvatar user={otherUser} size="md" />
            <div>
              <h2 className="font-semibold text-gray-900">{otherUser.name}</h2>
              <p className="text-sm text-red-500">Đã chặn</p>
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
              <h2 className="font-semibold text-gray-900">{otherUser.name}</h2>
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
            <h2 className="font-semibold text-gray-900">{otherUser.name}</h2>
            <p className="text-sm text-gray-500">
              {otherUser.isOnline ? 'Online' : `Last seen ${otherUser.lastSeen}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleStartCall('audio')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
            title="Gọi thoại"
          >
            <Phone className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => handleStartCall('video')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
            title="Gọi video"
          >
            <Video className="w-5 h-5 text-gray-600" />
          </button>
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
        {/* Pinned Messages */}
        {conversation.pinnedMessages && conversation.pinnedMessages.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">📌 Pinned Messages</h4>
            <div className="space-y-2">
              {conversation.pinnedMessages.slice(0, 3).map((pinnedId) => {
                const pinnedMessage = conversation.messages.find(m => m.id === pinnedId);
                if (!pinnedMessage) return null;
                return (
                  <div key={pinnedId} className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
                    {pinnedMessage.content}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {conversation.messages.map((message) => {
          if (message.type === 'location') {
            try {
              const locationData = JSON.parse(message.content);
              return (
                <LocationMessageBubble
                  key={message.id}
                  latitude={locationData.latitude}
                  longitude={locationData.longitude}
                  isOwn={message.senderId === currentUser.id}
                />
              );
            } catch (e) {
              return null;
            }
          }
          return (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === currentUser.id}
              sender={conversation.participants.find(p => p.id === message.senderId)}
              onAddReaction={handleAddReaction}
              onPinMessage={handlePinMessage}
              onReplyMessage={handleReplyMessage}
              onRecallMessage={handleRecallMessage}
              onForwardMessage={handleForwardMessage}
              onEditMessage={handleEditMessage}
              isPinned={conversation.pinnedMessages?.includes(message.id)}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {showVoiceRecorder ? (
        <VoiceRecorder onSendVoice={handleSendVoice} onCancel={handleCancelVoice} />
      ) : (
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          {/* Reply Preview */}
          {replyingTo && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Replying to {conversation.participants.find(p => p.id === replyingTo.senderId)?.name}
                </div>
                <div className="text-sm text-gray-500 truncate">{replyingTo.content}</div>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors duration-150"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
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

            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 bg-gray-100 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
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
      />

    </div>
  );
};