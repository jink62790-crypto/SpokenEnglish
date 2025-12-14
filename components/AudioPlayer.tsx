import React from 'react';
import { Play, Pause, Rewind, FastForward, RotateCcw } from 'lucide-react';

interface AudioPlayerProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  speed: number;
  onSpeedChange: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  onSkip,
  speed,
  onSpeedChange
}) => {
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute bottom-6 left-4 right-4 bg-white rounded-3xl shadow-2xl shadow-slate-300/50 p-4 border border-slate-100 z-30">
      {/* Progress Bar */}
      <div className="mb-4 px-1">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
          style={{ backgroundSize: `${(currentTime / duration) * 100}% 100%` }}
        />
        <div className="flex justify-between text-xs text-slate-400 font-medium mt-2 px-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-2">
        <button 
          onClick={onSpeedChange}
          className="w-12 h-8 rounded-full bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors"
        >
          {speed}x
        </button>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => onSkip(-5)}
            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
          >
            <Rewind className="w-6 h-6 fill-current opacity-20" />
          </button>

          <button 
            onClick={onTogglePlay}
            className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-current" />
            ) : (
              <Play className="w-7 h-7 fill-current ml-1" />
            )}
          </button>

          <button 
            onClick={() => onSkip(5)}
            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
          >
            <FastForward className="w-6 h-6 fill-current opacity-20" />
          </button>
        </div>

        <button 
          onClick={() => onSeek(0)}
          className="w-12 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};