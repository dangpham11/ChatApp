import React, { useRef } from 'react';
import { X, Upload, Image, FileText, Camera } from 'lucide-react';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: File, type: 'image' | 'file') => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onFileSelect,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file, 'image');
      onClose();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file, 'file');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-96 max-w-[90vw]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Send File</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-full flex items-center p-4 hover:bg-gray-50 rounded-xl transition-colors duration-150 border border-gray-200"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <Image className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-left">
              <h4 className="font-medium text-gray-900">Photos & Videos</h4>
              <p className="text-sm text-gray-500">Share images and videos</p>
            </div>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center p-4 hover:bg-gray-50 rounded-xl transition-colors duration-150 border border-gray-200"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-left">
              <h4 className="font-medium text-gray-900">Documents</h4>
              <p className="text-sm text-gray-500">Share files and documents</p>
            </div>
          </button>

          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-full flex items-center p-4 hover:bg-gray-50 rounded-xl transition-colors duration-150 border border-gray-200"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
              <Camera className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-left">
              <h4 className="font-medium text-gray-900">Camera</h4>
              <p className="text-sm text-gray-500">Take a photo or video</p>
            </div>
          </button>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};