export interface Track {
  id: string;
  title: string;
  gameId: string;
  filePath?: string;
  url?: string;
  duration: number;
  durationSeconds?: number;
  artist?: string;
  album?: string;
  coverUrl?: string;
  source?: 'curated' | 'local' | 'synthesizer' | 'radio';
  vibe?: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  currentTrackIndex: number;
}

export interface VisualizerConfig {
  barCount: number;
  smoothing: number;
  minDecibels: number;
  maxDecibels: number;
  fftSize: 256 | 512 | 1024 | 2048;
}

export type VisualizerDisplayMode = 'bars' | 'wave' | 'pulsar';
