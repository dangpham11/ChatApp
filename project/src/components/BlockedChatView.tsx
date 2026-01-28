import React from 'react';
import { Ban } from 'lucide-react';

interface BlockedChatViewProps {
  isBlockedByOther?: boolean;
  onUnblock?: () => void;
}

export const BlockedChatView: React.FC<BlockedChatViewProps> = ({
  isBlockedByOther = false,
  onUnblock,
}) => {
  if (isBlockedByOther) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Ban className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Không thể gửi tin nhắn
          </h3>
          <p className="text-gray-600 leading-relaxed">
            Bạn không thể gửi tin nhắn cho người này vì họ đã chặn bạn.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Ban className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          Bạn đã chặn người này
        </h3>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Họ sẽ không thể gửi tin nhắn cho bạn.
        </p>
        {onUnblock && (
          <button
            onClick={onUnblock}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-150 shadow-md"
          >
            Bỏ chặn
          </button>
        )}
      </div>
    </div>
  );
};
