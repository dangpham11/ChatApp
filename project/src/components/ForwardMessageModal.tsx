import React, { useState } from 'react';
import { X, Search, Send, Check } from 'lucide-react';
import type { Message, User } from '../types';
import { UserAvatar } from './UserAvatar';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  onForward: (conversationIds: string[]) => void;
}

// Mock conversations for forwarding
const mockConversations = [
  {
    id: 'conv-1',
    name: 'Alice Johnson',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    isOnline: true,
  },
  {
    id: 'conv-2',
    name: 'Bob Wilson',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    isOnline: false,
  },
  {
    id: 'conv-3',
    name: 'Team Project',
    avatar: 'https://images.pexels.com/photos/1595385/pexels-photo-1595385.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    isGroup: true,
  },
];

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  message,
  onForward,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);

  if (!isOpen || !message) return null;

  const filteredConversations = mockConversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleConversation = (conversationId: string) => {
    setSelectedConversations(prev =>
      prev.includes(conversationId)
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  const handleForward = () => {
    if (selectedConversations.length > 0) {
      onForward(selectedConversations);
      setSelectedConversations([]);
      setSearchQuery('');
    }
  };

  const getMessagePreview = () => {
    if (message.type === 'voice') {
      return '🎤 Voice message';
    }
    if (message.type === 'location') {
      return '📍 Location';
    }
    return message.content.length > 50 
      ? message.content.substring(0, 50) + '...'
      : message.content;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-[500px] max-w-[90vw] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Forward Message</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Message Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Message to forward:</h4>
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
              {selectedConversations.length} conversation{selectedConversations.length !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* Conversations List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filteredConversations.map((conversation) => {
              const isSelected = selectedConversations.includes(conversation.id);
              return (
                <div
                  key={conversation.id}
                  onClick={() => handleToggleConversation(conversation.id)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors duration-150 ${
                    isSelected ? 'bg-blue-50 border-2 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={conversation.avatar}
                      alt={conversation.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h5 className="font-medium text-gray-900">{conversation.name}</h5>
                      <p className="text-sm text-gray-500">
                        {conversation.isGroup ? 'Group' : conversation.isOnline ? 'Online' : 'Offline'}
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
            })}
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
              disabled={selectedConversations.length === 0}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Forward ({selectedConversations.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};