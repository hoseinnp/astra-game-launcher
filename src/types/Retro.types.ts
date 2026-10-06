export type RetroSystem =
  | 'nes'
  | 'snes'
  | 'gb'
  | 'gba'
  | 'n64'
  | 'ps1'
  | 'genesis'
  | 'arcade';

export interface RomItem {
  id: string;
  title: string;
  romPath: string;
  system: RetroSystem;
  releaseYear?: number;
  fileSizeBytes: number;
  extension: string;
  folderPath: string;
  lastPlayed?: string;
  saveStateCount?: number;
  lastSaveStateTime?: string;
}

export interface EmulatorInfo {
  id: string;
  name: string;
  executablePath: string;
  systems: RetroSystem[];
  defaultArgs: string;
  installed: boolean;
  isCustom?: boolean;
}

export interface SaveStateItem {
  id: string;
  romId: string;
  romPath: string;
  slotNumber?: number;
  statePath: string;
  timestamp: string; // ISO string
  fileSizeBytes: number;
  thumbnailPath?: string;
  isAutoBackup?: boolean;
}

export interface RetroSettings {
  romFolders: string[];
  customEmulatorPaths: Record<string, string>; // emulatorId -> exePath
  preferredEmulators: Record<RetroSystem, string>; // system -> emulatorId
  saveStateStorageLocation: 'next_to_rom' | 'emulator_dir' | 'custom';
  customSaveStateFolder?: string;
  autoBackupSaveStates: boolean;
  saveStateRetentionCount: number;
}

export interface RomScanProgress {
  scannedFiles: number;
  foundRoms: number;
  currentFolder?: string;
}

export interface RomDatabaseCache {
  version: number;
  timestamp: number; // TTL check (7 days)
  roms: RomItem[];
}
