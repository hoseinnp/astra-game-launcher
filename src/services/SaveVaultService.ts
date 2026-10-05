import type { BackupMetadata, SaveDirectoryScanResult, SaveVaultSettings } from '../types/SaveVault.types';

const SETTINGS_KEY = 'astra_save_vault_settings';

export const SaveVaultService = {
  /**
   * Scan for save directories in standard Windows locations (%APPDATA%, Documents/My Games, Saved Games)
   */
  async scanSaveDirectories(gameId: string, gameTitle?: string): Promise<SaveDirectoryScanResult[]> {
    if (window.api?.scanSaveLocations) {
      const title = gameTitle || gameId;
      const res = await window.api.scanSaveLocations(gameId, title);
      return res.map(r => ({
        path: r.path,
        source: r.source,
        exists: r.exists,
        lastModified: r.lastModified
      }));
    }
    return [];
  },

  /**
   * Create a zipped backup of the game's save folder
   */
  async createBackup(
    gameId: string,
    options?: {
      gameTitle?: string;
      savePath?: string;
      notes?: string;
      gameVersion?: string;
      isAuto?: boolean;
    }
  ): Promise<{ success: boolean; backup?: BackupMetadata; error?: string }> {
    const settings = this.getSettings();
    if (window.api?.createBackup) {
      return await window.api.createBackup({
        gameId,
        gameTitle: options?.gameTitle || gameId,
        savePath: options?.savePath,
        notes: options?.notes,
        gameVersion: options?.gameVersion,
        isAuto: options?.isAuto,
        retentionCount: settings.retentionCount,
        customStorage: settings.customStorageLocation
      });
    }

    // Fallback to legacy snapshot API if running against older preload
    if (window.api?.createSaveSnapshot) {
      const snapRes = await window.api.createSaveSnapshot(
        gameId,
        options?.gameTitle || gameId,
        options?.notes,
        options?.isAuto
      );
      if (snapRes.success && snapRes.snapshot) {
        return {
          success: true,
          backup: {
            id: snapRes.snapshot.id,
            timestamp: snapRes.snapshot.timestamp,
            size: snapRes.snapshot.sizeBytes,
            filePath: snapRes.snapshot.archivePath,
            notes: snapRes.snapshot.note,
            isAuto: snapRes.snapshot.isAutoBackup,
            gameTitle: snapRes.snapshot.gameTitle,
            fileCount: snapRes.snapshot.fileCount
          }
        };
      }
      return { success: false, error: snapRes.error };
    }

    return { success: false, error: 'Save Vault API is unavailable in this environment.' };
  },

  /**
   * Get all backups for a game with metadata
   */
  async listBackups(gameId: string): Promise<BackupMetadata[]> {
    const settings = this.getSettings();
    if (window.api?.listBackups) {
      const list = await window.api.listBackups(gameId, settings.customStorageLocation);
      return list || [];
    }

    if (window.api?.listSaveSnapshots) {
      const snaps = await window.api.listSaveSnapshots(gameId);
      return (snaps || []).map(s => ({
        id: s.id,
        timestamp: s.timestamp,
        size: s.sizeBytes,
        filePath: s.archivePath,
        notes: s.note,
        isAuto: s.isAutoBackup,
        gameTitle: s.gameTitle,
        fileCount: s.fileCount
      }));
    }

    return [];
  },

  /**
   * Restore a backup from zip archive
   */
  async restoreBackup(gameId: string, backupId: string): Promise<{ success: boolean; error?: string }> {
    const settings = this.getSettings();
    if (window.api?.restoreBackup) {
      return await window.api.restoreBackup({
        gameId,
        backupId,
        customStorage: settings.customStorageLocation
      });
    }

    if (window.api?.restoreSaveSnapshot) {
      return await window.api.restoreSaveSnapshot(gameId, backupId);
    }

    return { success: false, error: 'Restore API is unavailable.' };
  },

  /**
   * Delete a specific backup
   */
  async deleteBackup(gameId: string, backupId: string): Promise<{ success: boolean; error?: string }> {
    const settings = this.getSettings();
    if (window.api?.deleteBackup) {
      return await window.api.deleteBackup({
        gameId,
        backupId,
        customStorage: settings.customStorageLocation
      });
    }
    return { success: false, error: 'Delete API unavailable' };
  },

  /**
   * Automatically run backup before game starts
   */
  async autoBackupBeforeLaunch(
    gameId: string,
    gameTitle?: string,
    gameVersion?: string
  ): Promise<{ success: boolean; backup?: BackupMetadata; error?: string }> {
    const settings = this.getSettings();
    if (!settings.autoBackupOnLaunch) {
      return { success: true };
    }

    return await this.createBackup(gameId, {
      gameTitle,
      gameVersion,
      notes: 'Pre-launch auto-backup',
      isAuto: true
    });
  },

  /**
   * Open the vault storage folder in explorer
   */
  async openVaultFolder(gameId: string): Promise<{ success: boolean; path?: string }> {
    const settings = this.getSettings();
    if (window.api?.openSaveDirectory) {
      return await window.api.openSaveDirectory(gameId, settings.customStorageLocation);
    }
    return { success: false };
  },

  /**
   * Pick custom storage directory
   */
  async pickStorageLocation(): Promise<string | null> {
    if (window.api?.pickSaveStorageFolder) {
      return await window.api.pickSaveStorageFolder();
    }
    return null;
  },

  /**
   * Subscribe to backup progress updates
   */
  onProgress(callback: (info: { gameId: string; progress: number }) => void): () => void {
    if (window.api?.onSaveVaultProgress) {
      return window.api.onSaveVaultProgress(callback);
    }
    return () => {};
  },

  /**
   * Vault Settings Management
   */
  getSettings(): SaveVaultSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return {
      retentionCount: 5,
      autoBackupOnLaunch: true,
      customStorageLocation: undefined
    };
  },

  saveSettings(settings: SaveVaultSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error('[SaveVaultService] Failed to save settings:', err);
    }
  }
};
