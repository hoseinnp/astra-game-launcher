export interface BackupMetadata {
  id: string;
  timestamp: string; // ISO string for consistent serialization across IPC
  size: number;
  filePath: string;
  gameVersion?: string;
  notes?: string;
  isAuto?: boolean;
  gameTitle?: string;
  fileCount?: number;
}

export interface SaveVaultState {
  gameId: string;
  backups: BackupMetadata[];
  isBackingUp: boolean;
  backupProgress: number;
}

export interface SaveVaultSettings {
  retentionCount: number;
  autoBackupOnLaunch: boolean;
  customStorageLocation?: string;
}

export interface SaveDirectoryScanResult {
  path: string;
  source: 'saved_games' | 'documents' | 'appdata' | 'custom';
  exists: boolean;
  lastModified?: string;
  fileCount?: number;
  sizeBytes?: number;
}
