import React from 'react';
import { X, MessageSquare, Phone, Video, UserMinus, Shield, Calendar, MapPin, Mail } from 'lucide-react';
import type { User } from '../types';
import { UserAvatar } from './UserAvatar';

interface FriendProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: User;
  onStartChat: () => void;
  onRemoveFriend?: () => void;
}

export const FriendProfileModal: React.FC<FriendProfileModalProps> = ({
  isOpen,
  onClose,
  friend,
  onStartChat,
  onRemoveFriend,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-[450px] max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Profile</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Avatar Section */}
          <div className="text-center mb-8">
            <UserAvatar user={friend} size="lg" showOnline={true} />
            <h2 className="text-2xl font-bold text-gray-900 mt-4">{friend.name}</h2>
            <div className="flex items-center justify-center mt-2">
              <div className={`w-3 h-3 rounded-full mr-2 ${friend.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">
                {friend.isOnline ? 'Online' : `Last seen ${friend.lastSeen}`}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mb-8">
            <button
              onClick={onStartChat}
              className="flex-1 flex items-center justify-center space-x-2 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors duration-150"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Message</span>
            </button>
            <button className="flex items-center justify-center p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors duration-150">
              <Phone className="w-5 h-5" />
            </button>
            <button className="flex items-center justify-center p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors duration-150">
              <Video className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Information */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Information</h4>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <p className="text-gray-900">{friend.email || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Location
                    </label>
                    <p className="text-gray-900">San Francisco, CA</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Joined
                    </label>
                    <p className="text-gray-900">March 2024</p>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">About</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  Love connecting with people and sharing great conversations! Always up for a chat about technology, travel, and good food.
                </p>
              </div>
            </div>

            {/* Mutual Friends */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Mutual Friends</h4>
              <div className="flex space-x-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-full mb-2"></div>
                    <span className="text-xs text-gray-600">Friend {i}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <button className="w-full flex items-center justify-center space-x-2 p-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors duration-150">
                <Shield className="w-5 h-5" />
                <span>Block User</span>
              </button>
              
              {onRemoveFriend && (
                <button
                  onClick={onRemoveFriend}
                  className="w-full flex items-center justify-center space-x-2 p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-150"
                >
                  <UserMinus className="w-5 h-5" />
                  <span>Remove Friend</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};