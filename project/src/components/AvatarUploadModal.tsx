import React, { useRef, useState } from 'react';
import { X, Camera, Upload, User } from 'lucide-react';

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string;
  onAvatarChange: (avatarUrl: string) => void;
}

export const AvatarUploadModal: React.FC<AvatarUploadModalProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  onAvatarChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (previewUrl) {
      setIsUploading(true);
      // Simulate upload delay
      setTimeout(() => {
        onAvatarChange(previewUrl);
        setIsUploading(false);
        onClose();
        setPreviewUrl(null);
      }, 1500);
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    onClose();
  };

  const predefinedAvatars = [
    'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
    'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-[500px] max-w-[90vw] p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Change Avatar</h3>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Current/Preview Avatar */}
          <div className="text-center">
            <div className="relative inline-block">
              <img
                src={previewUrl || currentAvatar}
                alt="Avatar"
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors duration-150 shadow-lg"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">Click the camera icon to upload a new photo</p>
          </div>

          {/* Upload Options */}
          <div className="space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center space-x-3 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors duration-150"
            >
              <Upload className="w-6 h-6 text-gray-400" />
              <span className="text-gray-600">Upload from device</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Predefined Avatars */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Choose from gallery</h4>
            <div className="grid grid-cols-6 gap-3">
              {predefinedAvatars.map((avatar, index) => (
                <button
                  key={index}
                  onClick={() => setPreviewUrl(avatar)}
                  className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all duration-150 ${
                    previewUrl === avatar ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <img
                    src={avatar}
                    alt={`Avatar ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!previewUrl || isUploading}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {isUploading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Avatar'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};