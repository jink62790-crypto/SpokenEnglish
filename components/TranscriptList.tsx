import React, { useRef, useEffect, useState } from 'react';
import { Play, Mic, Volume2 } from 'lucide-react';
import { Segment } from '../types';
import { generateSpeech, playPCM } from '../services/geminiService';

interface TranscriptListProps {
  segments: Segment[];
  currentTime: number;
  onPlaySegment: (start: number) => void;
  onWordClick: (word: string, context: string) => void;
  onShadowSegment: (segment: Segment) => void;
}

export const TranscriptList: React.FC<TranscriptListProps> = ({ 
  segments, 
  currentTime, 
  onPlaySegment,
  onWordClick,
  onShadowSegment
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [playingTTS, setPlayingTTS] = useState<number | null>(null);

  // Auto-scroll to active segment
  useEffect(() => {
    const activeIndex = segments.findIndex(s => currentTime >= s.start && currentTime < s.end);
    if (activeIndex !== -1 && scrollRef.current) {
      const activeEl = scrollRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, segments]);

  const handleTTS = async (text: string, id: number) => {
    try {
      setPlayingTTS(id);
      const pcmData = await generateSpeech(text);
      playPCM(pcmData, () => setPlayingTTS(null));
    } catch (e) {
      console.error(e);
      setPlayingTTS(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-40" ref={scrollRef}>
      {segments.map((segment) => {
        const isActive = currentTime >= segment.start && currentTime < segment.end;
        
        return (
          <div 
            key={segment.id}
            className={`rounded-2xl p-5 transition-all duration-300 border ${
              isActive 
                ? 'bg-white border-blue-100 shadow-lg ring-1 ring-blue-100 scale-[1.02]' 
                : 'bg-white/50 border-transparent hover:bg-white'
            }`}
          >
            {/* Header: Play & Actions */}
            <div className="flex items-center justify-between mb-3">
              <button 
                onClick={() => onPlaySegment(segment.start)}
                className={`p-2 rounded-full ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 hover:text-blue-600'}`}
              >
                <Play className="w-3 h-3 fill-current" />
              </button>
              <div className="text-xs font-mono text-slate-400">
                {Math.floor(segment.start / 60)}:{(segment.start % 60).toFixed(0).padStart(2, '0')}
              </div>
            </div>

            {/* Original Text */}
            <p className="text-lg leading-relaxed text-slate-800 font-medium mb-3">
              {segment.text.split(' ').map((word, idx) => (
                <span 
                  key={idx}
                  className="cursor-pointer hover:text-blue-600 hover:underline decoration-blue-300 decoration-2 underline-offset-2 transition-colors inline-block mr-1"
                  onClick={() => onWordClick(word.replace(/[^a-zA-Z]/g, ''), segment.text)}
                >
                  {word}
                </span>
              ))}
            </p>

            {/* Native Rewrite Box */}
            <div className="bg-blue-50/80 rounded-xl p-3 border-l-4 border-blue-500 mb-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">Native Expression</p>
                  <p className="text-sm text-blue-800 italic">"{segment.nativeRewrite}"</p>
                  <p className="text-xs text-blue-600 mt-2 font-medium leading-normal">{segment.rewriteReason}</p>
                </div>
                <div className="flex flex-col gap-2 ml-2">
                   <button 
                    onClick={() => handleTTS(segment.nativeRewrite, segment.id)}
                    className={`p-1.5 rounded-full ${playingTTS === segment.id ? 'bg-blue-200 animate-pulse text-blue-700' : 'bg-white text-blue-400 hover:text-blue-600'}`}
                    disabled={playingTTS !== null}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onShadowSegment(segment)}
                    className="p-1.5 rounded-full bg-white text-blue-400 hover:text-blue-600"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Blurred Translation */}
            <div className="relative group cursor-pointer overflow-hidden rounded-lg mt-2">
              <p className="text-sm text-slate-500 blur-[4px] group-hover:blur-0 transition-all duration-300 select-none">
                {segment.translation}
              </p>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-0 transition-opacity pointer-events-none">
                {/* Overlay logic if needed, but standard blur is enough */}
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
};