import React, { useCallback } from 'react';
import { Upload, FileAudio, Music, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  error?: string | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading, error }) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 w-full animate-fade-in">
      <div 
        className={`w-full h-80 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden group
          ${error ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept="audio/*" 
          onChange={handleChange} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={isLoading}
        />
        
        {isLoading ? (
          <div className="flex flex-col items-center z-20">
            <div className="animate-spin-slow rounded-full h-20 w-20 border-b-2 border-blue-600 mb-6"></div>
            <p className="text-blue-600 font-medium animate-pulse">Analyzing audio...</p>
            <p className="text-slate-400 text-sm mt-2">Transcribing & Rewriting</p>
          </div>
        ) : (
          <div className="text-center p-6 pointer-events-none">
            {error ? (
              <div className="flex flex-col items-center text-red-500">
                <AlertCircle className="w-16 h-16 mb-4 opacity-80" />
                <p className="font-medium">{error}</p>
                <p className="text-sm mt-2 opacity-70">Try another file</p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Upload Audio</h3>
                <p className="text-slate-500 text-sm max-w-[200px] mx-auto leading-relaxed">
                  Drag & drop or tap to select MP3, WAV, M4A
                </p>
                <div className="mt-8 flex gap-4 justify-center opacity-40">
                  <FileAudio className="w-6 h-6" />
                  <Music className="w-6 h-6" />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};