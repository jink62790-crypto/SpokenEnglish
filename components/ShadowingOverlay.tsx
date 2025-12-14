import React, { useState, useRef } from 'react';
import { X, Mic, CheckCircle, AlertTriangle, Volume2 } from 'lucide-react';
import { Segment, PronunciationScore } from '../types';
import { scorePronunciation, generateSpeech, playPCM } from '../services/geminiService';

interface ShadowingOverlayProps {
  segment: Segment;
  onClose: () => void;
}

export const ShadowingOverlay: React.FC<ShadowingOverlayProps> = ({ segment, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scoreResult, setScoreResult] = useState<PronunciationScore | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsProcessing(true);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); // Browsers usually record to webm/ogg
        try {
          const result = await scorePronunciation(segment.nativeRewrite, blob);
          setScoreResult(result);
        } catch (e) {
          console.error(e);
          alert('Error scoring pronunciation. Please try again.');
        } finally {
          setIsProcessing(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setScoreResult(null);
    } catch (err) {
      console.error("Mic error", err);
      alert("Microphone access needed for shadowing.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playNative = async () => {
      try {
        const pcmData = await generateSpeech(segment.nativeRewrite);
        playPCM(pcmData);
      } catch (e) {
        console.error(e);
      }
  }

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col animate-fade-in p-6">
      <div className="flex justify-end">
        <button onClick={onClose} className="p-2 rounded-full bg-slate-100 text-slate-500">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Target Sentence</h2>
          <p className="text-2xl font-bold text-slate-800 leading-snug">
            "{segment.nativeRewrite}"
          </p>
          <button onClick={playNative} className="inline-flex items-center gap-2 text-blue-600 font-medium">
              <Volume2 className="w-4 h-4" /> Listen to Native Audio
          </button>
        </div>

        {/* Scoring Result */}
        {scoreResult && (
          <div className={`w-full p-4 rounded-2xl border-2 ${
            scoreResult.score > 80 ? 'border-green-100 bg-green-50' : 'border-orange-100 bg-orange-50'
          } animate-slide-up`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-lg font-bold ${scoreResult.score > 80 ? 'text-green-700' : 'text-orange-700'}`}>
                {scoreResult.rating}
              </span>
              <span className="text-2xl font-black text-slate-800">{scoreResult.score}</span>
            </div>
            <p className="text-sm text-slate-600">{scoreResult.feedback}</p>
          </div>
        )}

        {/* Action Button */}
        <div className="relative">
          {isRecording && (
            <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse-ring opacity-50"></div>
          )}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording 
                ? 'bg-red-500 scale-110 shadow-red-200 shadow-xl' 
                : isProcessing 
                    ? 'bg-slate-200' 
                    : 'bg-blue-600 shadow-blue-200 shadow-2xl hover:scale-105'
            }`}
          >
             {isProcessing ? (
               <div className="animate-spin h-8 w-8 border-4 border-slate-400 border-t-transparent rounded-full" />
             ) : (
               <Mic className={`w-10 h-10 ${isRecording ? 'text-white' : 'text-white'}`} />
             )}
          </button>
        </div>
        
        <p className="text-slate-400 text-sm">
          {isRecording ? "Listening... Tap to stop" : "Tap microphone to practice"}
        </p>
      </div>
    </div>
  );
};