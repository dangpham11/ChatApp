import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import type { User } from '../types';

type CallStatus = 'idle' | 'incoming' | 'inCall' | 'missed' | 'ended';
type CallType = 'voice' | 'video';

interface CallScreenProps {
  status: CallStatus;
  callType: CallType;
  caller: User;
  onAnswer?: () => void;
  onReject?: () => void;
  onEndCall?: () => void;
  onSendMissedCallMessage?: () => void;
}

export const CallScreen: React.FC<CallScreenProps> = ({
  status,
  callType: initialCallType,
  caller,
  onAnswer,
  onReject,
  onEndCall,
  onSendMissedCallMessage,
}) => {
  const [callType, setCallType] = useState<CallType>(initialCallType);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(initialCallType === 'video');
  const [callDuration, setCallDuration] = useState(0);
  const [isRinging, setIsRinging] = useState(false);

  useEffect(() => {
    if (status === 'incoming') {
      setIsRinging(true);
    } else {
      setIsRinging(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'inCall') {
      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCallDuration(0);
    }
  }, [status]);

  useEffect(() => {
    setCallType(initialCallType);
    setIsCameraOn(initialCallType === 'video');
  }, [initialCallType]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSwitchToVideo = () => {
    setCallType('video');
    setIsCameraOn(true);
  };

  if (status === 'idle') return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="w-full max-w-lg mx-4">
        {status === 'incoming' && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col items-center">
              <div className={`mb-6 ${isRinging ? 'animate-pulse' : ''}`}>
                <UserAvatar user={caller} size="xl" className="w-32 h-32 ring-4 ring-blue-500 ring-offset-4" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {caller.name}
              </h2>

              <div className="flex items-center space-x-2 text-gray-600 mb-8">
                {callType === 'video' && (
                  <Video className="w-5 h-5" />
                )}
                <p className="text-lg">
                  {callType === 'video' ? 'Cuộc gọi video đến...' : 'Đang gọi cho bạn...'}
                </p>
              </div>

              <div className="flex items-center space-x-8">
                <button
                  onClick={onReject}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl">
                    <X className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-sm text-gray-600 mt-2">Từ chối</span>
                </button>

                <button
                  onClick={onAnswer}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-sm text-gray-600 mt-2">Trả lời</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {status === 'inCall' && (
          <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col items-center">
              {callType === 'video' && (
                <div className="w-full mb-6 space-y-4">
                  <div className="w-full h-64 bg-gray-700 rounded-2xl overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-gray-400 text-sm">Video từ xa</p>
                    </div>
                  </div>

                  {isCameraOn && (
                    <div className="w-32 h-24 bg-gray-600 rounded-xl overflow-hidden relative ml-auto">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-gray-400 text-xs">Bạn</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {callType === 'voice' && (
                <div className="mb-8">
                  <UserAvatar user={caller} size="xl" className="w-32 h-32" />
                </div>
              )}

              <h2 className="text-2xl font-semibold text-white mb-2">
                {caller.name}
              </h2>

              <p className="text-green-400 text-lg mb-8 font-mono">
                {formatDuration(callDuration)}
              </p>

              <div className="flex items-center justify-center space-x-6">
                <button
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
                    isMicOn
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                  title={isMicOn ? 'Tắt mic' : 'Bật mic'}
                >
                  {isMicOn ? (
                    <Mic className="w-6 h-6 text-white" />
                  ) : (
                    <MicOff className="w-6 h-6 text-white" />
                  )}
                </button>

                {callType === 'video' && (
                  <button
                    onClick={() => setIsCameraOn(!isCameraOn)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
                      isCameraOn
                        ? 'bg-gray-700 hover:bg-gray-600'
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                    title={isCameraOn ? 'Tắt camera' : 'Bật camera'}
                  >
                    {isCameraOn ? (
                      <Video className="w-6 h-6 text-white" />
                    ) : (
                      <VideoOff className="w-6 h-6 text-white" />
                    )}
                  </button>
                )}

                {callType === 'voice' && (
                  <button
                    onClick={handleSwitchToVideo}
                    className="w-14 h-14 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg"
                    title="Chuyển sang video"
                  >
                    <Video className="w-6 h-6 text-white" />
                  </button>
                )}

                <button
                  onClick={onEndCall}
                  className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
                  title="Kết thúc"
                >
                  <PhoneOff className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {status === 'missed' && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col items-center">
              <div className="mb-6">
                <UserAvatar user={caller} size="xl" className="w-32 h-32 opacity-50" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {caller.name}
              </h2>

              <p className="text-red-600 text-lg mb-8">
                Cuộc gọi nhỡ từ {caller.name}
              </p>

              <button
                onClick={onSendMissedCallMessage}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-150 shadow-md"
              >
                Gửi tin nhắn
              </button>
            </div>
          </div>
        )}

        {status === 'ended' && (
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6">
                <PhoneOff className="w-10 h-10 text-gray-600" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Cuộc gọi đã kết thúc
              </h2>

              <p className="text-gray-600">
                Thời gian: {formatDuration(callDuration)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
