export type Page = 'home' | 'dashboard' | 'downloader' | 'timeline';

export interface VisualizerResult {
  bpm: number;
  scenes_analyzed: number;
  scenes_used: number;
  output_file: string;
}

export interface VisualizerLogic {
  videoFile: File | null;
  audioFile: File | null;
  setVideoFile: (file: File | null) => void;
  setAudioFile: (file: File | null) => void;
  status: string;
  setStatus: (status: string) => void;
  downloadUrl: string;
  isProcessing: boolean;
  result: VisualizerResult | null;
  ytLink: string;
  setYtLink: (link: string) => void;
  isDownloading: boolean;
  handleProcess: () => Promise<void>;
  handleDownloadYT: () => Promise<void>;
}