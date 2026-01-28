import React, { useState } from 'react';
import { X, CreditCard as Edit3 } from 'lucide-react';

interface EditNicknameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNickname: string;
  friendName: string;
  onSave: (nickname: string) => void;
}

export const EditNicknameModal: React.FC<EditNicknameModalProps> = ({
  isOpen,
  onClose,
  currentNickname,
  friendName,
  onSave,
}) => {
  const [nickname, setNickname] = useState(currentNickname);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(nickname.trim());
  };

  const handleClear = () => {
    setNickname('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-[400px] max-w-[90vw] p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Edit Nickname</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nickname for {friendName}
            </label>
            <div className="relative">
              <Edit3 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={`Enter nickname for ${friendName}`}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={30}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {nickname.length}/30 characters
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Preview:</strong> {nickname.trim() || friendName}
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleClear}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-150"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors duration-150"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};