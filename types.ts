export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
  translation: string;
  nativeRewrite: string;
  rewriteReason: string;
}

export interface AnalysisMetadata {
  cefr: string; // A1, A2, B1, etc.
  wpm: number;
  wordCount: number;
  duration: number;
}

export interface AnalysisResult {
  metadata: AnalysisMetadata;
  segments: Segment[];
}

export interface HistoryItem {
  id: string; // timestamp as ID
  filename: string;
  date: string;
  analysis: AnalysisResult;
}

export interface WordDefinition {
  word: string;
  phonetic: string;
  definition: string;
  example: string;
}

export interface PronunciationScore {
  score: number; // 0-100
  rating: 'Good' | 'Average' | 'Poor';
  feedback: string;
}
