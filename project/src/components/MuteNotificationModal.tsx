import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';

interface MuteNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMute: (duration: string) => void;
}

export const MuteNotificationModal: React.FC<MuteNotificationModalProps> = ({
  isOpen,
  onClose,
  onMute,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<string>('15min');

  const durations = [
    { id: '15min', label: 'Trong 15 phút' },
    { id: '1hour', label: 'Trong 1 giờ' },
    { id: '8hours', label: 'Trong 8 giờ' },
    { id: '24hours', label: 'Trong 24 giờ' },
    { id: 'forever', label: 'Đến khi tôi bật lại' },
  ];

  const handleMute = () => {
    onMute(selectedDuration);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Tắt thông báo</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-2">
          {durations.map((duration) => (
            <label
              key={duration.id}
              className="flex items-center p-4 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors duration-150"
            >
              <input
                type="radio"
                name="duration"
                value={duration.id}
                checked={selectedDuration === duration.id}
                onChange={(e) => setSelectedDuration(e.target.value)}
                className="w-5 h-5 text-blue-500 focus:ring-blue-500 cursor-pointer"
              />
              <span className="ml-3 text-gray-800 flex items-center">
                <Clock className="w-4 h-4 text-gray-500 mr-2" />
                {duration.label}
              </span>
            </label>
          ))}
        </div>

        <div className="p-6 border-t border-gray-200 flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-150"
          >
            Hủy
          </button>
          <button
            onClick={handleMute}
            className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-150 shadow-md"
          >
            Tắt thông báo
          </button>
        </div>
      </div>
    </div>
  );
};
