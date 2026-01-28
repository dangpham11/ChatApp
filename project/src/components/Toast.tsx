import React, { useEffect } from 'react';
import { BellOff, CheckCircle, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'info' | 'error';
  icon?: 'bell' | 'check' | 'alert';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  icon = 'bell',
  isVisible,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (icon) {
      case 'bell':
        return <BellOff className="w-5 h-5 text-blue-500" />;
      case 'check':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <BellOff className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-2xl px-6 py-4 flex items-center space-x-3 min-w-[320px] border border-gray-200">
        {getIcon()}
        <p className="text-gray-800 font-medium">{message}</p>
      </div>
    </div>
  );
};
