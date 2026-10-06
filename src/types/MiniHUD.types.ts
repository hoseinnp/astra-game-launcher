export type HudPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'TL' | 'TR' | 'BL' | 'BR';

export interface GameStatusData {
  gameId?: string;
  gameTitle?: string;
  isRunning: boolean;
  startTime?: string | number | null;
  sessionPlaytimeFormatted?: string; // HH:MM:SS
  lastBackupText?: string; // e.g. "Last backup: 5 mins ago" or "No backups yet"
  pid?: number;
}

export interface SystemStatsData {
  cpuUsage: number; // %
  ramUsage: number; // %
  ramUsedGB?: number;
  ramTotalGB?: number;
  gpuUsage?: number; // %
  fps: number; // estimated FPS
  ping?: number; // ms network latency
}

export interface HudSettings {
  opacity: number; // 50 - 100 (%)
  position: 'TL' | 'TR' | 'BL' | 'BR';
  alwaysOnTop: boolean;
  visible: boolean;
}

export interface MiniHudIpcPayload {
  gameStatus: GameStatusData;
  systemStats: SystemStatsData;
}
