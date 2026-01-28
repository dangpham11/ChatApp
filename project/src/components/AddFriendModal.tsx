import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Mail, Loader2 } from 'lucide-react';
import type { User } from '../types';
import { UserAvatar } from './UserAvatar';
import { userService, type SearchUserResult } from '../services/userService';
import { conversationService } from '../services/conversationService';
import { messageService } from '../services/messageService';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFriend: (user: User) => void;
  onConversationCreated?: (conversationId: string) => void;
}

const mapSearchResultToUser = (result: SearchUserResult): User => ({
  id: result.id,
  name: result.displayName,
  email: result.email,
  avatar: result.avatarUrl || 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
  isOnline: result.isOnline,
});

export const AddFriendModal: React.FC<AddFriendModalProps> = ({
  isOpen,
  onClose,
  onAddFriend,
  onConversationCreated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setEmailInput('');
      setSearchResults([]);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const results = await userService.searchUsers(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Error searching users:', err);
        setError('Failed to search users');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleAddFriend = async (user: SearchUserResult) => {
    setIsAddingFriend(user.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const conversation = await conversationService.createConversation([user.id]);

      await messageService.sendMessage(
        conversation.conversationId,
        'Xin chào! 👋',
        'text'
      );

      const mappedUser = mapSearchResultToUser(user);
      onAddFriend(mappedUser);

      if (onConversationCreated) {
        onConversationCreated(conversation.conversationId.toString());
      }

      setSuccessMessage(`Started conversation with ${user.displayName}`);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error adding friend:', err);
      setError(err.response?.data?.message || 'Failed to add friend and start conversation');
    } finally {
      setIsAddingFriend(null);
    }
  };

  const handleAddByEmail = async () => {
    if (!emailInput.trim()) return;

    setIsAddingFriend('email');
    setError(null);
    setSuccessMessage(null);

    try {
      const user = await userService.getUserByEmail(emailInput);

      if (!user) {
        setError('User not found with this email');
        setIsAddingFriend(null);
        return;
      }

      await handleAddFriend(user);
      setEmailInput('');
    } catch (err: any) {
      console.error('Error adding friend by email:', err);
      setError(err.response?.data?.message || 'Failed to find user');
      setIsAddingFriend(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-[500px] max-w-[90vw] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Add Friends</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl">
              {successMessage}
            </div>
          )}

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Add by Email</h4>
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                />
              </div>
              <button
                onClick={handleAddByEmail}
                disabled={!emailInput.trim() || isAddingFriend === 'email'}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isAddingFriend === 'email' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Add Friend'
                )}
              </button>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Search Users</h4>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people..."
                className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              )}

              {!isSearching && searchQuery.trim().length > 0 && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No users found
                </div>
              )}

              {!isSearching && searchQuery.trim().length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Enter a name or email to search
                </div>
              )}

              {!isSearching && searchResults.map((user) => {
                const mappedUser = mapSearchResultToUser(user);
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors duration-150"
                  >
                    <div className="flex items-center space-x-3">
                      <UserAvatar user={mappedUser} size="md" />
                      <div>
                        <h5 className="font-medium text-gray-900">{user.displayName}</h5>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400">
                          {user.isOnline ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddFriend(user)}
                      disabled={isAddingFriend === user.id}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingFriend === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span className="text-sm">Add</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
