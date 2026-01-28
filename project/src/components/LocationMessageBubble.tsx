import React from 'react';
import { MapPin } from 'lucide-react';

interface LocationMessageBubbleProps {
  latitude: number;
  longitude: number;
  isOwn: boolean;
}

export const LocationMessageBubble: React.FC<LocationMessageBubbleProps> = ({
  latitude,
  longitude,
  isOwn,
}) => {
  const handleViewLocation = () => {
    window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-xs rounded-2xl p-4 shadow-sm ${
        isOwn ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'
      }`}>
        <div className="flex items-start space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isOwn ? 'bg-blue-600' : 'bg-blue-500'
          }`}>
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className={`font-semibold mb-1 ${isOwn ? 'text-white' : 'text-gray-900'}`}>
              Vị trí trực tiếp
            </h4>
            <p className={`text-xs mb-3 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
              Bạn đã bắt đầu chia sẻ
            </p>
            <button
              onClick={handleViewLocation}
              className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isOwn
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              Xem vị trí
            </button>
          </div>
        </div>
        <div className={`text-xs mt-2 text-right ${isOwn ? 'text-blue-100' : 'text-gray-400'}`}>
          Đã gửi
        </div>
      </div>
    </div>
  );
};
