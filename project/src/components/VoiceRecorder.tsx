import React, { useState, useRef } from 'react';
import { Mic, X, Send, Play, Pause } from 'lucide-react';

interface VoiceRecorderProps {
  onSendVoice: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoice, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onSendVoice(audioBlob, recordingTime);
      handleCancel();
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    onCancel();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  React.useEffect(() => {
    startRecording();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
    }
  }, [audioUrl]);

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
      <div className="flex items-center space-x-4">
        <button
          onClick={handleCancel}
          className="p-3 hover:bg-gray-100 rounded-full transition-colors duration-150"
          title="Cancel"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {isRecording ? (
          <div className="flex-1 flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 font-medium text-sm">Đang ghi âm...</span>
            </div>

            <div className="flex-1 flex items-center space-x-2">
              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${Math.min((recordingTime / 60) * 100, 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 min-w-[40px]">
                {formatTime(recordingTime)}
              </span>
            </div>

            <button
              onClick={stopRecording}
              className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-150 font-medium text-sm"
            >
              Dừng
            </button>
          </div>
        ) : audioBlob ? (
          <div className="flex-1 flex items-center space-x-4">
            <button
              onClick={handlePlayPause}
              className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors duration-150"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" fill="currentColor" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
              )}
            </button>

            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-8 flex items-center space-x-0.5">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500 rounded-full transition-all duration-150"
                      style={{
                        height: `${Math.random() * 20 + 10}px`,
                        opacity: isPlaying ? 1 : 0.5,
                      }}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700 min-w-[40px]">
                  {formatTime(recordingTime)}
                </span>
              </div>
            </div>

            <button
              onClick={handleSend}
              className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors duration-150 shadow-md"
              title="Send"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        ) : null}

        {audioUrl && (
          <audio ref={audioRef} src={audioUrl} className="hidden" preload="metadata" />
        )}
      </div>
    </div>
  );
};
