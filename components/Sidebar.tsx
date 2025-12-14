import React, { useEffect, useState } from 'react';
import { X, Clock, Trash2, ChevronRight } from 'lucide-react';
import { HistoryItem } from '../types';
import { getHistoryItems, deleteHistoryItem } from '../services/db';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHistory: (item: HistoryItem) => void;
  currentHistoryId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onSelectHistory, currentHistoryId }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const fetchHistory = async () => {
      try {
          const items = await getHistoryItems();
          setHistory(items);
      } catch (e) {
          console.error(e);
      }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      await deleteHistoryItem(id);
      fetchHistory();
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div className={`absolute top-0 right-0 h-full w-3/4 bg-slate-50 z-50 shadow-2xl transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              History
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar">
            {history.length === 0 ? (
                <div className="text-center text-slate-400 mt-10">No history yet.</div>
            ) : (
                history.map((item) => (
                    <div 
                        key={item.id}
                        onClick={() => { onSelectHistory(item); onClose(); }}
                        className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-1
                            ${currentHistoryId === item.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                    >
                        <div className="flex justify-between items-start">
                            <span className="font-medium text-slate-700 truncate w-3/4">{item.filename}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                item.analysis.metadata.cefr.startsWith('A') ? 'bg-green-100 text-green-700' :
                                item.analysis.metadata.cefr.startsWith('B') ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                                {item.analysis.metadata.cefr}
                            </span>
                        </div>
                        <span className="text-xs text-slate-400">{new Date(item.date).toLocaleDateString()}</span>
                        
                        <button 
                            onClick={(e) => handleDelete(e, item.id)}
                            className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};