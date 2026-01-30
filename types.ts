export interface OperaAnalysisResult {
  genre: string;
  confidence: number;
  reasoning: string;
  banguScore: string;
  culturalContext: string;
}

export interface OperaDNAEntry {
  instruments: string[];
  vocal_style: string;
  rhythm: string;
  regions: string[];
  description: string;
}

export interface OperaDNADatabank {
  [key: string]: OperaDNAEntry;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}