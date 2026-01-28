import React, { useState } from 'react';
import { X, Camera, CreditCard as Edit3, Save, User, Mail, Phone, MapPin, Calendar, Settings, Lock } from 'lucide-react';
import type { User as UserType } from '../types';
import { UserAvatar } from './UserAvatar';
import { ChangePasswordModal } from './ChangePasswordModal';
import { AvatarUploadModal } from './AvatarUploadModal';
import { authService } from '../services/authService';
import { Toast } from './Toast';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onUpdateProfile: (updatedUser: Partial<UserType>) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateProfile,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email || '',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    bio: user.status || 'Love connecting with people and sharing great conversations!',
  });

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await authService.updateProfile({
        displayName: formData.name,
        bio: formData.bio,
      });

      onUpdateProfile({
        name: formData.name,
        status: formData.bio,
      });

      setToast({ message: 'Profile updated successfully', type: 'success' });
      setIsEditing(false);
    } catch (error: any) {
      setToast({ message: error.message || 'Failed to update profile', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      email: user.email || '',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      bio: 'Love connecting with people and sharing great conversations!',
    });
    setIsEditing(false);
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
      });
      setToast({ message: 'Password changed successfully', type: 'success' });
      return true;
    } catch (error: any) {
      setToast({ message: error.message || 'Failed to change password', type: 'error' });
      return false;
    }
  };

  const handleAvatarChange = async (newAvatarUrl: string) => {
    try {
      await authService.updateProfile({
        avatarUrl: newAvatarUrl,
      });

      onUpdateProfile({ avatar: newAvatarUrl });
      setToast({ message: 'Avatar updated successfully', type: 'success' });
    } catch (error: any) {
      setToast({ message: error.message || 'Failed to update avatar', type: 'error' });
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl w-[500px] max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Profile</h3>
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
                  title="Edit Profile"
                >
                  <Edit3 className="w-5 h-5 text-gray-600" />
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-150 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{isLoading ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Profile Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Avatar Section */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <UserAvatar user={user} size="lg" showOnline={false} />
                <button 
                  onClick={() => setShowAvatarUpload(true)}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors duration-150 shadow-lg"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mt-4">{user.name}</h2>
              <div className="flex items-center justify-center mt-2">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Online</span>
              </div>
            </div>

            {/* Profile Information */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900">{formData.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900">{formData.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900">{formData.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-gray-900">{formData.location}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* About Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">About</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Tell us about yourself..."
                      />
                    ) : (
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{formData.bio}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Member Since
                      </label>
                      <p className="text-gray-900">January 2024</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy & Settings */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Privacy & Settings</h4>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                  >
                    <div className="flex items-center space-x-3">
                      <Lock className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">Change Password</span>
                    </div>
                    <span className="text-gray-400">›</span>
                  </button>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Settings className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">Show online status</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Settings className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">Read receipts</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onChangePassword={handleChangePassword}
      />

      <AvatarUploadModal
        isOpen={showAvatarUpload}
        onClose={() => setShowAvatarUpload(false)}
        currentAvatar={user.avatar}
        onAvatarChange={handleAvatarChange}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};