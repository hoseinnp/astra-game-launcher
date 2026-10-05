export interface Track {
  id: string;
  title: string;
  gameId: string;
  filePath?: string;
  duration: number;
  artist?: string;
  album?: string;
  coverUrl?: string;
  source?: 'curated' | 'local' | 'synthesizer' | 'radio';
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
