import type { SaveStateItem } from '../types/Retro.types';
import { EmulatorDetectionService } from './EmulatorDetectionService';
import { SaveVaultService } from './SaveVaultService';

class SaveStateServiceClass {
  public async getSaveStates(romPath: string): Promise<SaveStateItem[]> {
    if (typeof window !== 'undefined' && window.api?.listSaveStates) {
      try {
        const raw = await window.api.listSaveStates(romPath);
        if (Array.isArray(raw)) {
          return raw.map((item) => ({
            id: item.id,
            romId: item.romId,
            romPath: item.romPath,
            statePath: item.statePath,
            timestamp: item.timestamp,
            fileSizeBytes: item.fileSizeBytes
          }));
        }
      } catch (err) {
        console.warn('[SaveStateService] Error getting save states:', err);
      }
    }
    return [];
  }

  public async backupSaveState(statePath: string): Promise<{ success: boolean; backupPath?: string; error?: string }> {
    if (typeof window !== 'undefined' && window.api?.backupSaveState) {
      try {
        const settings = EmulatorDetectionService.getSettings();
        const res = await window.api.backupSaveState({
          statePath,
          backupFolder: settings.customSaveStateFolder
        });
        return res;
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to backup save state' };
      }
    }
    return { success: false, error: 'Save state backup not supported in this environment' };
  }

  public async restoreSaveState(backupPath: string, targetStatePath: string): Promise<{ success: boolean; error?: string }> {
    if (typeof window !== 'undefined' && window.api?.restoreSaveState) {
      try {
        return await window.api.restoreSaveState({ backupPath, targetStatePath });
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to restore save state' };
      }
    }
    return { success: false, error: 'Save state restore not supported in this environment' };
  }

  /**
   * Backup save state along with SaveVault snapshot system
   */
  public async backupWithSaveVault(romId: string, romTitle: string, statePath: string): Promise<boolean> {
    try {
      const backupRes = await this.backupSaveState(statePath);
      if (backupRes.success) {
        // Also log into SaveVault
        await SaveVaultService.createBackup(`retro_${romId}`, {
          gameTitle: `${romTitle} (Retro Save State)`,
          isAuto: true,
          notes: `Save state backup: ${statePath}`
        });
        return true;
      }
    } catch (err) {
      console.warn('[SaveStateService] SaveVault integration backup failed:', err);
    }
    return false;
  }

  public formatTimeAgo(isoString?: string): string {
    if (!isoString) return 'No saves yet';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins === 1) return '1 min ago';
      if (mins < 60) return `${mins} mins ago`;
      const hours = Math.floor(mins / 60);
      if (hours === 1) return '1 hour ago';
      if (hours < 24) return `${hours} hours ago`;
      const days = Math.floor(hours / 24);
      if (days === 1) return '1 day ago';
      return `${days} days ago`;
    } catch {
      return 'Unknown';
    }
  }
}

export const SaveStateService = new SaveStateServiceClass();
