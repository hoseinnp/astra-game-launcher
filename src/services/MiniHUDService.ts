import type { Game } from '../types/game';
import type { GameStatusData, SystemStatsData } from '../types/MiniHUD.types';
import { SaveVaultService } from './SaveVaultService';
import { SystemStatsService } from './SystemStatsService';

const STORAGE_VISIBLE_KEY = 'astra_hud_visible';
const STORAGE_POSITION_KEY = 'astra_hud_position';
const STORAGE_OPACITY_KEY = 'astra_hud_opacity';
const STORAGE_ALWAYS_ON_TOP_KEY = 'astra_hud_always_on_top';

export interface MiniHudState {
  visible: boolean;
  position: 'TL' | 'TR' | 'BL' | 'BR';
  opacity: number; // 50 to 100
  alwaysOnTop: boolean;
  gameStatus: GameStatusData;
  systemStats: SystemStatsData;
}

type MiniHudListener = (state: MiniHudState) => void;

class MiniHUDServiceClass {
  private listeners: Set<MiniHudListener> = new Set();
  private statsInterval: any = null;
  private currentRunningGame: Game | null = null;
  private gameStartTime: number | null = null;
  private lastBackupText: string = 'No backups yet';
  private discordRpcEnabled: boolean = true;
  private audioVolume: number = 100;

  private state: MiniHudState = {
    visible: false,
    position: 'BR',
    opacity: 85,
    alwaysOnTop: true,
    gameStatus: {
      isRunning: false,
      lastBackupText: 'No backups yet'
    },
    systemStats: {
      cpuUsage: 0,
      ramUsage: 0,
      fps: 60,
      ping: 20
    }
  };

  constructor() {
    this.loadSettings();
    this.setupIpcListeners();
    this.startPolling();
  }

  private loadSettings() {
    try {
      const storedVis = localStorage.getItem(STORAGE_VISIBLE_KEY);
      if (storedVis !== null) {
        this.state.visible = storedVis === 'true';
      }

      const storedPos = localStorage.getItem(STORAGE_POSITION_KEY) as 'TL' | 'TR' | 'BL' | 'BR' | null;
      if (storedPos && ['TL', 'TR', 'BL', 'BR'].includes(storedPos)) {
        this.state.position = storedPos;
      }

      const storedOp = localStorage.getItem(STORAGE_OPACITY_KEY);
      if (storedOp !== null) {
        const val = parseInt(storedOp, 10);
        if (!isNaN(val) && val >= 50 && val <= 100) {
          this.state.opacity = val;
        }
      }

      const storedAot = localStorage.getItem(STORAGE_ALWAYS_ON_TOP_KEY);
      if (storedAot !== null) {
        this.state.alwaysOnTop = storedAot === 'true';
      }
    } catch {}
  }

  private setupIpcListeners() {
    if (typeof window !== 'undefined' && window.api) {
      if ((window.api as any).onHudVisibilityChange) {
        (window.api as any).onHudVisibilityChange((visible: boolean) => {
          this.setVisible(visible, false);
        });
      }

      if ((window.api as any).onHudStatsUpdate) {
        (window.api as any).onHudStatsUpdate((data: any) => {
          if (data?.systemStats) {
            this.state.systemStats = { ...this.state.systemStats, ...data.systemStats };
            this.notify();
          }
        });
      }
    }
  }

  private startPolling() {
    if (this.statsInterval) clearInterval(this.statsInterval);

    // Poll stats every 500ms
    this.statsInterval = setInterval(async () => {
      await this.refreshStats();
    }, 500);
  }

  public async refreshStats() {
    const stats = await SystemStatsService.getStats();
    this.state.systemStats = stats;

    if (this.currentRunningGame && this.gameStartTime) {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.gameStartTime) / 1000));
      const hours = Math.floor(elapsedSeconds / 3600);
      const minutes = Math.floor((elapsedSeconds % 3600) / 60);
      const seconds = elapsedSeconds % 60;
      const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      this.state.gameStatus = {
        gameId: this.currentRunningGame.id,
        gameTitle: this.currentRunningGame.title,
        isRunning: true,
        startTime: this.gameStartTime,
        sessionPlaytimeFormatted: formatted,
        lastBackupText: this.lastBackupText
      };
    } else {
      this.state.gameStatus = {
        isRunning: false,
        lastBackupText: this.lastBackupText
      };
    }

    this.notify();

    // Sync with Electron main process window if available
    if (typeof window !== 'undefined' && (window.api as any)?.updateHudStats) {
      (window.api as any).updateHudStats({
        gameStatus: this.state.gameStatus,
        systemStats: this.state.systemStats
      });
    }
  }

  public async setGameRunning(game: Game | null, startTime?: number) {
    this.currentRunningGame = game;
    this.gameStartTime = game ? (startTime || Date.now()) : null;

    if (game) {
      await this.updateBackupStatus(game.id);
      // Auto open HUD on game launch if visible setting or default
      const savedVis = localStorage.getItem(STORAGE_VISIBLE_KEY);
      if (savedVis === null || savedVis === 'true') {
        this.setVisible(true);
      }
    } else {
      // Game closed -> hide HUD
      this.setVisible(false);
    }

    await this.refreshStats();
  }

  public async updateBackupStatus(gameId: string) {
    try {
      const backups = await SaveVaultService.listBackups(gameId);
      if (backups && backups.length > 0) {
        // Sort by timestamp descending
        const sorted = [...backups].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const latest = sorted[0];
        const diffMs = Date.now() - new Date(latest.timestamp).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) {
          this.lastBackupText = 'Last backup: Just now';
        } else if (diffMins === 1) {
          this.lastBackupText = 'Last backup: 1 min ago';
        } else if (diffMins < 60) {
          this.lastBackupText = `Last backup: ${diffMins} mins ago`;
        } else {
          const hours = Math.floor(diffMins / 60);
          this.lastBackupText = `Last backup: ${hours}h ago`;
        }
      } else {
        this.lastBackupText = 'No backups yet';
      }
    } catch {
      this.lastBackupText = 'No backups yet';
    }

    this.state.gameStatus.lastBackupText = this.lastBackupText;
    this.notify();
  }

  public getState(): MiniHudState {
    return { ...this.state };
  }

  public subscribe(listener: MiniHudListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  public setVisible(visible: boolean, syncWithIpc: boolean = true) {
    this.state.visible = visible;
    try {
      localStorage.setItem(STORAGE_VISIBLE_KEY, String(visible));
    } catch {}
    this.notify();

    if (syncWithIpc && typeof window !== 'undefined' && (window.api as any)?.toggleHudWindow) {
      (window.api as any).toggleHudWindow(visible);
    }
  }

  public toggleVisible() {
    this.setVisible(!this.state.visible);
  }

  public setPosition(position: 'TL' | 'TR' | 'BL' | 'BR') {
    this.state.position = position;
    try {
      localStorage.setItem(STORAGE_POSITION_KEY, position);
    } catch {}
    this.notify();

    if (typeof window !== 'undefined' && (window.api as any)?.setHudPosition) {
      (window.api as any).setHudPosition(position);
    }
  }

  public setOpacity(opacity: number) {
    const clamped = Math.max(50, Math.min(100, opacity));
    this.state.opacity = clamped;
    try {
      localStorage.setItem(STORAGE_OPACITY_KEY, String(clamped));
    } catch {}
    this.notify();

    if (typeof window !== 'undefined' && (window.api as any)?.setHudOpacity) {
      (window.api as any).setHudOpacity(clamped);
    }
  }

  public setAlwaysOnTop(alwaysOnTop: boolean) {
    this.state.alwaysOnTop = alwaysOnTop;
    try {
      localStorage.setItem(STORAGE_ALWAYS_ON_TOP_KEY, String(alwaysOnTop));
    } catch {}
    this.notify();

    if (typeof window !== 'undefined' && (window.api as any)?.setHudAlwaysOnTop) {
      (window.api as any).setHudAlwaysOnTop(alwaysOnTop);
    }
  }

  // Tab 2 Controls
  public async saveAndExit(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentRunningGame) {
      return { success: false, error: 'No game running' };
    }

    try {
      // Trigger SaveVault auto-backup
      await SaveVaultService.createBackup(this.currentRunningGame.id, {
        gameTitle: this.currentRunningGame.title,
        isAuto: true,
        notes: 'HUD Quick Save & Exit'
      });

      await this.updateBackupStatus(this.currentRunningGame.id);

      // Close the game via IPC or process termination
      if (typeof window !== 'undefined' && (window.api as any)?.closeGameProcess) {
        await (window.api as any).closeGameProcess(this.currentRunningGame.id);
      }

      await this.setGameRunning(null);
      return { success: true };
    } catch (err: any) {
      console.error('[MiniHUDService] Save & Exit error:', err);
      return { success: false, error: err?.message || 'Failed to save and exit' };
    }
  }

  public async minimizeGame(): Promise<boolean> {
    if (typeof window !== 'undefined' && (window.api as any)?.minimizeGameWindow) {
      return await (window.api as any).minimizeGameWindow(this.currentRunningGame?.id);
    }
    return false;
  }

  public toggleDiscordRpc(): boolean {
    this.discordRpcEnabled = !this.discordRpcEnabled;
    if (typeof window !== 'undefined' && window.api) {
      if (!this.discordRpcEnabled) {
        window.api.clearDiscordActivity();
      } else if (this.currentRunningGame) {
        window.api.setDiscordActivity({
          details: this.currentRunningGame.title,
          state: 'Playing via Astra HUD'
        });
      }
    }
    return this.discordRpcEnabled;
  }

  public isDiscordRpcEnabled(): boolean {
    return this.discordRpcEnabled;
  }

  public setAudioVolume(volume: number) {
    this.audioVolume = Math.max(0, Math.min(100, volume));
    // Set web audio volume or system volume
    if (typeof window !== 'undefined') {
      const audioElements = document.querySelectorAll('audio, video');
      audioElements.forEach((el) => {
        (el as HTMLMediaElement).volume = this.audioVolume / 100;
      });
    }
  }

  public getAudioVolume(): number {
    return this.audioVolume;
  }
}

export const MiniHUDService = new MiniHUDServiceClass();
