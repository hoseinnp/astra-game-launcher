import type { Game } from '../types/game';
import { AudioService } from './AudioService';
import { SaveVaultService } from './SaveVaultService';
import { ActivityTrackingService } from './ActivityTrackingService';
import { MiniHUDService } from './MiniHUDService';

export interface LaunchGameOptions {
  autoBackup?: boolean;
  duckVolume?: boolean;
}

export interface LaunchGameResult {
  success: boolean;
  pid?: number;
  error?: string;
  mode?: string;
}

class GameLauncherServiceClass {
  private activeGameSessions: Set<string> = new Set();
  private sessionEndListenerRegistered: boolean = false;

  constructor() {
    this.setupSessionEndListener();
  }

  /**
   * Set up listener for when an active game session closes
   */
  private setupSessionEndListener() {
    if (typeof window === 'undefined' || !window.api?.onGameSessionEnded) return;
    if (this.sessionEndListenerRegistered) return;

    this.sessionEndListenerRegistered = true;
    window.api.onGameSessionEnded(({ gameId, durationMinutes }) => {
      this.activeGameSessions.delete(gameId);
      // Auto-save session tracking on game close
      ActivityTrackingService.logClose(gameId, durationMinutes);

      // Notify MiniHUD
      MiniHUDService.setGameRunning(null);

      // When all active game sessions have closed, restore volume
      if (this.activeGameSessions.size === 0) {
        this.onGameClosed(gameId);
      }
    });
  }

  /**
   * Launch a game, trigger volume ducking, auto-backup, and activity logging
   */
  public async launchGame(game: Game, options?: LaunchGameOptions): Promise<LaunchGameResult> {
    const shouldDuck = options?.duckVolume !== false;
    const shouldBackup = options?.autoBackup !== false;

    // 1. Log game session launch in ActivityTrackingService
    ActivityTrackingService.logLaunch(game.id, game.title);

    // 2. Call AudioService.duckVolume() when game launches
    if (shouldDuck) {
      AudioService.duckVolume();
    }

    // Pre-launch Auto-Backup via SaveVaultService if enabled
    if (shouldBackup) {
      SaveVaultService.autoBackupBeforeLaunch(
        game.id,
        game.title,
        (game as any).version
      ).catch((err) => {
        console.warn('[GameLauncherService] Auto-backup failed before launch:', err);
      });
    }

    // Launch game executable via Electron IPC
    if (window.api?.launchGame) {
      try {
        const res = await window.api.launchGame(game);
        if (res.success) {
          this.activeGameSessions.add(game.id);
          this.setupSessionEndListener();
          // Publish game status to MiniHUD
          MiniHUDService.setGameRunning(game, Date.now());
          return res;
        } else {
          // Launch failed — immediately restore volume
          if (shouldDuck) {
            AudioService.restoreVolume();
          }
          return res;
        }
      } catch (err: any) {
        if (shouldDuck) {
          AudioService.restoreVolume();
        }
        return { success: false, error: err?.message || 'Failed to launch executable' };
      }
    }

    // Web preview fallback simulation
    this.activeGameSessions.add(game.id);
    MiniHUDService.setGameRunning(game, Date.now());
    return { success: true, mode: 'web-simulation' };
  }

  /**
   * 2. Call AudioService.restoreVolume() when game closes
   */
  public onGameClosed(gameId?: string): void {
    if (gameId) {
      this.activeGameSessions.delete(gameId);
    }
    MiniHUDService.setGameRunning(null);
    AudioService.restoreVolume();
  }

  /**
   * Launch a retro ROM using a specific emulator executable
   */
  public async launchRetroRom(
    rom: { id: string; title: string; romPath: string; system: string },
    emulator: { id: string; name: string; executablePath: string; defaultArgs?: string }
  ): Promise<LaunchGameResult> {
    const retroGameId = `retro_${rom.id}`;
    const gameTitle = `${rom.title} [${rom.system.toUpperCase()}]`;

    // 1. Log in ActivityTrackingService
    ActivityTrackingService.logLaunch(retroGameId, gameTitle);

    // 2. Duck volume
    AudioService.duckVolume();

    // 3. Launch via IPC
    if (typeof window !== 'undefined' && window.api?.launchRetroGame) {
      try {
        const res = await window.api.launchRetroGame({
          emulatorPath: emulator.executablePath,
          romPath: rom.romPath,
          args: emulator.defaultArgs || '',
          gameTitle
        });

        if (res.success) {
          this.activeGameSessions.add(retroGameId);
          this.setupSessionEndListener();
          return { success: true, pid: res.pid };
        } else {
          AudioService.restoreVolume();
          return { success: false, error: res.error || 'Failed to start emulator' };
        }
      } catch (err: any) {
        AudioService.restoreVolume();
        return { success: false, error: err?.message || 'Error launching retro game' };
      }
    }

    // Web simulation
    this.activeGameSessions.add(retroGameId);
    return { success: true, mode: 'web-simulation' };
  }

  /**
   * Manually check if any game is currently running
   */
  public hasRunningGames(): boolean {
    return this.activeGameSessions.size > 0;
  }

  /**
   * Extract standardized game metadata for recommendation and analysis
   */
  public getGameMetadata(game: Game): {
    title: string;
    platform: string;
    genres: string[];
    playtimeMinutes: number;
    rating?: number;
    isUnplayed: boolean;
  } {
    const playtime = game.stats?.playtimeMinutes || 0;
    const rating = game.metadata?.rating || (game.metadata?.metacritic ? game.metadata.metacritic / 10 : undefined);
    return {
      title: game.title,
      platform: game.type || 'standalone',
      genres: game.genres || [],
      playtimeMinutes: playtime,
      rating,
      isUnplayed: playtime === 0
    };
  }
}

export const GameLauncherService = new GameLauncherServiceClass();

