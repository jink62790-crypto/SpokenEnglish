import React, { useEffect, useState } from 'react';
import { X, Book, Volume2 } from 'lucide-react';
import { defineWord, generateSpeech, playPCM } from '../services/geminiService';
import { WordDefinition } from '../types';

interface DictionaryModalProps {
  word: string;
  contextSentence: string;
  onClose: () => void;
}

export const DictionaryModal: React.FC<DictionaryModalProps> = ({ word, contextSentence, onClose }) => {
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDef = async () => {
      try {
        setLoading(true);
        const result = await defineWord(word, contextSentence);
        setDefinition(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDef();
  }, [word, contextSentence]);

  const playWord = async () => {
      if(!definition) return;
      try {
        const pcmData = await generateSpeech(definition.word);
        playPCM(pcmData);
      } catch (e) {
        console.error(e);
      }
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-40 flex items-end justify-center backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white w-full rounded-t-3xl p-6 min-h-[50%] shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-400 text-sm">Looking up "{word}"...</p>
          </div>
        ) : definition ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-3xl font-bold text-slate-900 capitalize mb-1">{definition.word}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-lg text-slate-500 font-serif italic">/{definition.phonetic}/</span>
                    <button onClick={playWord} className="p-1 rounded-full bg-slate-100 text-slate-500 hover:text-blue-600">
                        <Volume2 className="w-4 h-4" />
                    </button>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Book className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Meaning</h4>
              <p className="text-lg text-slate-700 leading-relaxed font-medium">
                {definition.definition}
              </p>
            </div>

            <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Context Example</h4>
              <p className="text-md text-slate-600 italic">
                "{definition.example}"
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center text-red-500 py-10">Could not find definition.</div>
        )}
      </div>
    </div>
  );
};