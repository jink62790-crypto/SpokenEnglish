import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Menu, ChevronLeft, Star } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { TranscriptList } from './components/TranscriptList';
import { AudioPlayer } from './components/AudioPlayer';
import { ShadowingOverlay } from './components/ShadowingOverlay';
import { DictionaryModal } from './components/DictionaryModal';
import { Sidebar } from './components/Sidebar';
import { AppState, AnalysisResult, Segment, HistoryItem } from './types';
import { analyzeAudio } from './services/geminiService';
import { initDB, saveHistoryItem } from './services/db';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentFilename, setCurrentFilename] = useState<string>("");
  const [currentHistoryId, setCurrentHistoryId] = useState<string>("");
  
  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  // UI State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shadowingSegment, setShadowingSegment] = useState<Segment | null>(null);
  const [definitionContext, setDefinitionContext] = useState<{word: string, sentence: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'original' | 'favorites'>('original');

  // Init DB
  useEffect(() => {
    initDB().catch(console.error);
  }, []);

  // Audio Event Listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  // File Handling
  const handleFileSelect = async (file: File) => {
    setAppState(AppState.PROCESSING);
    try {
      // 1. Create Object URL for playback
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setCurrentFilename(file.name);

      // 2. Analyze with Gemini
      const result = await analyzeAudio(file);
      setAnalysis(result);
      
      // 3. Save to History
      const historyId = Date.now().toString();
      setCurrentHistoryId(historyId);
      await saveHistoryItem({
          id: historyId,
          filename: file.name,
          date: new Date().toISOString(),
          analysis: result
      });

      setAppState(AppState.READY);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
      // Optional: reset after timeout
      setTimeout(() => setAppState(AppState.IDLE), 3000);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
      // We don't have the audio blob persisted in IDB (too large often),
      // In a real app we might store it or re-request upload.
      // For this demo, we load the text but warn audio is missing if it wasn't just uploaded.
      // Note: To truly support history audio, we'd need to store blob in IDB or cache.
      // Simplification: We just load the analysis and clear audio if unrelated.
      
      setAnalysis(item.analysis);
      setCurrentFilename(item.filename);
      setCurrentHistoryId(item.id);
      setAudioUrl(null); // Reset audio as we don't persist blobs in this demo structure for brevity
      setAppState(AppState.READY);
      alert("Note: Audio playback is not available for history items in this demo version (Text Only Mode). Upload the file again for full features.");
  };

  // Player Controls
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }
  };

  const handleSkip = (seconds: number) => {
      if(audioRef.current) {
          audioRef.current.currentTime = Math.min(Math.max(0, audioRef.current.currentTime + seconds), duration);
      }
  }

  const handleSpeedChange = () => {
      const speeds = [0.75, 1, 1.25, 1.5];
      const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
      const newSpeed = speeds[nextIdx];
      setSpeed(newSpeed);
      if(audioRef.current) audioRef.current.playbackRate = newSpeed;
  }

  const handleReset = () => {
      if(audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
      }
      setAudioUrl(null);
      setAnalysis(null);
      setAppState(AppState.IDLE);
      setCurrentTime(0);
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-0 md:p-6 font-sans">
      <div className="w-full max-w-md bg-slate-50 h-[100dvh] md:h-[850px] md:max-h-[90vh] md:rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
        
        {/* Hidden Audio Element */}
        {audioUrl && <audio ref={audioRef} src={audioUrl} />}

        {/* Header */}
        <header className="bg-white px-5 pt-6 pb-2 border-b border-slate-100 flex-none sticky top-0 z-20">
          <div className="flex items-center justify-between mb-4">
            {appState === AppState.READY ? (
                 <button onClick={handleReset} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500">
                    <ChevronLeft className="w-6 h-6" />
                 </button>
            ) : (
                <div className="w-10"></div> // Spacer
            )}
            
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
              Spoken Easily
            </h1>

            <button onClick={() => setHistoryOpen(true)} className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-600 relative">
               <Menu className="w-6 h-6" />
            </button>
          </div>

          {appState === AppState.READY && analysis && (
              <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
                  <button 
                    onClick={() => setActiveTab('original')}
                    className={`pb-2 border-b-2 transition-colors ${activeTab === 'original' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}
                  >
                      Transcript
                  </button>
                  {/* Future feature: Favorites */}
                  <button 
                     onClick={() => setActiveTab('favorites')}
                     className={`pb-2 border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'favorites' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}
                  >
                      Favorites <Star className="w-3 h-3 mb-0.5" />
                  </button>
                  <div className="ml-auto text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                      Level: {analysis.metadata.cefr}
                  </div>
              </div>
          )}
        </header>

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-50">
          {appState === AppState.IDLE || appState === AppState.PROCESSING || appState === AppState.ERROR ? (
            <FileUpload 
              onFileSelect={handleFileSelect} 
              isLoading={appState === AppState.PROCESSING}
              error={appState === AppState.ERROR ? "Analysis failed. Please try again." : null}
            />
          ) : (
             analysis && (
                 <>
                    {activeTab === 'original' ? (
                        <TranscriptList 
                            segments={analysis.segments}
                            currentTime={currentTime}
                            onPlaySegment={(start) => { handleSeek(start); if(!isPlaying) togglePlay(); }}
                            onWordClick={(word, sentence) => setDefinitionContext({word, sentence})}
                            onShadowSegment={setShadowingSegment}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400">
                            Favorites feature coming soon.
                        </div>
                    )}
                    
                    {/* Floating Player */}
                    <div className="h-32"></div> {/* Spacer for fixed player */}
                    <AudioPlayer 
                        isPlaying={isPlaying}
                        currentTime={currentTime}
                        duration={duration || analysis.metadata.duration || 100}
                        onTogglePlay={togglePlay}
                        onSeek={handleSeek}
                        onSkip={handleSkip}
                        speed={speed}
                        onSpeedChange={handleSpeedChange}
                    />
                 </>
             )
          )}
        </main>

        {/* Overlays */}
        <Sidebar 
            isOpen={historyOpen} 
            onClose={() => setHistoryOpen(false)}
            onSelectHistory={loadHistoryItem}
            currentHistoryId={currentHistoryId}
        />

        {shadowingSegment && (
            <ShadowingOverlay 
                segment={shadowingSegment} 
                onClose={() => setShadowingSegment(null)} 
            />
        )}

        {definitionContext && (
            <DictionaryModal 
                word={definitionContext.word} 
                contextSentence={definitionContext.sentence}
                onClose={() => setDefinitionContext(null)}
            />
        )}

      </div>
    </div>
  );
};

export default App;