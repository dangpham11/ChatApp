import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceMessageBubbleProps {
  audioUrl: string;
  duration: number;
  isOwn: boolean;
}

export const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
  audioUrl,
  duration,
  isOwn,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  const renderWaveform = () => {
    const bars = 20;
    const heights = [4, 8, 6, 10, 7, 9, 5, 11, 8, 6, 9, 7, 10, 6, 8, 5, 9, 7, 8, 6];

    return (
      <div className="flex items-center space-x-0.5 h-8">
        {Array.from({ length: bars }).map((_, index) => {
          const heightClass = `h-${heights[index]}`;
          const isActive = (index / bars) * 100 < progress;

          return (
            <div
              key={index}
              className={`w-1 rounded-full transition-all duration-150 ${
                isOwn
                  ? isActive
                    ? 'bg-white'
                    : 'bg-blue-300'
                  : isActive
                  ? 'bg-blue-500'
                  : 'bg-gray-300'
              } ${isPlaying && isActive ? 'animate-pulse' : ''}`}
              style={{
                height: `${heights[index] * 2}px`,
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex items-center space-x-3 min-w-[240px]">
      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />

      <button
        onClick={togglePlayPause}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
          isOwn
            ? 'bg-white text-blue-500 hover:bg-blue-50'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        } shadow-md hover:shadow-lg`}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" fill="currentColor" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        {renderWaveform()}
      </div>

      <span
        className={`flex-shrink-0 text-xs font-medium ${
          isOwn ? 'text-blue-100' : 'text-gray-500'
        }`}
      >
        {formatTime(isPlaying ? currentTime : audioDuration)}
      </span>
    </div>
  );
};
