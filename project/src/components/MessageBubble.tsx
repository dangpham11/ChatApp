import React, { useState } from 'react';
import type { Message, User } from '../types';
import { Check, CheckCheck, Pin, Reply, MoreHorizontal, Trash2, Mic, MapPin, Forward, Smile, CreditCard as Edit3, X, Save } from 'lucide-react';
import { VoiceMessageBubble } from './VoiceMessageBubble';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  sender?: User;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onPinMessage?: (messageId: string) => void;
  onReplyMessage?: (message: Message) => void;
  onRecallMessage?: (messageId: string) => void;
  onForwardMessage?: (message: Message) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  isPinned?: boolean;
}

const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

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
  isPinned
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (message.isRecalled) {
    return null;
  }

  const renderMessageContent = () => {
    if (message.type === 'voice') {
      return (
        <VoiceMessageBubble
          audioUrl={message.content}
          duration={message.voiceDuration || 0}
          isOwn={isOwn}
        />
      );
    }

    if (message.type === 'location') {
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

    return <p className="text-sm leading-relaxed">{message.content}</p>;
  };

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group relative ${isPinned ? 'bg-yellow-50 p-2 rounded-lg' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
        setShowMoreMenu(false);
      }}
    >
      {isPinned && (
        <div className="absolute top-0 left-0 flex items-center text-yellow-600 text-xs">
          <Pin className="w-3 h-3 mr-1" />
          <span>Pinned</span>
        </div>
      )}
      
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
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
        {message.replyTo && (
          <div className={`mb-2 ${isOwn ? 'mr-4' : 'ml-4'}`}>
            <div className="bg-blue-100 rounded-lg border-l-4 border-blue-500 p-3 max-w-xs">
              <div className="text-sm font-medium text-blue-900 mb-1">{message.replyTo.senderName}</div>
              <div className="text-sm text-blue-800">{message.replyTo.content}</div>
            </div>
          </div>
        )}
        
        <div
          className={`px-4 py-3 rounded-2xl shadow-sm relative ${
            isOwn
              ? 'bg-blue-500 text-white rounded-br-md'
              : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'
          }`}
        >
          {renderMessageContent()}
          
          <div className={`flex items-center justify-end mt-2 gap-1 ${
            isOwn ? 'text-blue-100' : 'text-gray-400'
          }`}>
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
        </div>

        {/* Message Reactions - New Style */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`flex items-center space-x-1 mt-1 ${isOwn ? 'justify-end mr-4' : 'justify-start ml-4'}`}>
            <div className="flex items-center bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm">
              {message.reactions.map((reaction, index) => (
                <button
                  key={index}
                  onClick={() => onAddReaction?.(message.id, reaction.emoji)}
                  className="flex items-center hover:scale-110 transition-transform duration-150"
                  title={`${reaction.count} reaction${reaction.count > 1 ? 's' : ''}`}
                >
                  <span className="text-sm">{reaction.emoji}</span>
                  {reaction.count > 1 && (
                    <span className="text-xs text-gray-600 ml-1">{reaction.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Message Actions - Simplified */}
      {showActions && (
        <div className={`flex items-center space-x-1 ${
          isOwn ? 'order-1 mr-2' : 'order-2 ml-2'
        }`}>
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
              <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} bottom-8 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex space-x-1 z-50`}>
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
              <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} bottom-8 bg-white border border-gray-200 rounded-lg shadow-lg py-2 w-40 z-50`}>
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
                    onPinMessage?.(message.id);
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center px-3 py-2 hover:bg-gray-50 transition-colors duration-150"
                >
                  <Pin className="w-4 h-4 text-gray-600 mr-2" />
                  <span className="text-sm text-gray-700">
                    {isPinned ? 'Unpin' : 'Pin'}
                  </span>
                </button>
                
                {isOwn && (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center px-3 py-2 hover:bg-gray-50 transition-colors duration-150"
                    >
                      <Edit3 className="w-4 h-4 text-gray-600 mr-2" />
                      <span className="text-sm text-gray-700">Edit</span>
                    </button>
                    
                  <button
                    onClick={() => {
                      onRecallMessage?.(message.id);
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center px-3 py-2 hover:bg-red-50 transition-colors duration-150"
                  >
                    <Trash2 className="w-4 h-4 text-red-500 mr-2" />
                    <span className="text-sm text-red-500">Recall</span>
                  </button>
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