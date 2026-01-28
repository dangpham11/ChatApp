import React from "react";
import { Ban } from "lucide-react";

interface BlockMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmBlock: () => Promise<void> | void;
  userName: string;
}

export const BlockMessageModal: React.FC<BlockMessageModalProps> = ({
  isOpen,
  onClose,
  onConfirmBlock,
  userName,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirmBlock();
      onClose();
    } catch (err) {
      console.error("Failed to block:", err);
      alert("Không thể chặn người dùng. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ban className="w-8 h-8 text-red-500" />
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Chặn tin nhắn?
          </h3>

          <p className="text-gray-600 mb-6">
            Bạn sẽ không nhận được tin nhắn từ{" "}
            <span className="font-semibold">{userName}</span> cho đến khi bỏ
            chặn.
          </p>
        </div>

        <div className="p-6 border-t border-gray-200 flex space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-150 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors duration-150 shadow-md disabled:opacity-50"
          >
            {isLoading ? "Đang xử lý..." : "Chặn"}
          </button>
        </div>
      </div>
    </div>
  );
};
