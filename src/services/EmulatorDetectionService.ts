import type { EmulatorInfo, RetroSettings, RetroSystem } from '../types/Retro.types';

const SETTINGS_KEY = 'astra_retro_settings';

const DEFAULT_SETTINGS: RetroSettings = {
  romFolders: [],
  customEmulatorPaths: {},
  preferredEmulators: {
    nes: 'mesen',
    snes: 'bsnes',
    gb: 'vba',
    gba: 'vba',
    n64: 'project64',
    ps1: 'duckstation',
    genesis: 'blastem',
    arcade: 'fbneo'
  },
  saveStateStorageLocation: 'next_to_rom',
  autoBackupSaveStates: true,
  saveStateRetentionCount: 3
};

class EmulatorDetectionServiceClass {
  private emulatorsCache: EmulatorInfo[] = [];
  private listeners: Set<(emulators: EmulatorInfo[]) => void> = new Set();
  private settingsListeners: Set<(settings: RetroSettings) => void> = new Set();

  constructor() {
    this.detectInstalledEmulators();
  }

  public getSettings(): RetroSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {}
    return { ...DEFAULT_SETTINGS };
  }

  public saveSettings(settings: Partial<RetroSettings>): RetroSettings {
    const current = this.getSettings();
    const updated: RetroSettings = { ...current, ...settings };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch {}
    this.notifySettings(updated);
    return updated;
  }

  public async detectInstalledEmulators(): Promise<EmulatorInfo[]> {
    let detected: EmulatorInfo[] = [];
    if (typeof window !== 'undefined' && window.api?.detectEmulators) {
      try {
        const raw = await window.api.detectEmulators();
        if (Array.isArray(raw)) {
          detected = raw.map((item) => ({
            id: item.id,
            name: item.name,
            executablePath: item.executablePath || '',
            systems: item.systems || item.platforms || [],
            defaultArgs: item.defaultArgs || '',
            installed: Boolean(item.installed)
          }));
        }
      } catch (err) {
        console.warn('[EmulatorDetectionService] detect error:', err);
      }
    }

    // Overlay custom user emulator paths from settings
    const settings = this.getSettings();
    for (const [emuId, customPath] of Object.entries(settings.customEmulatorPaths)) {
      if (!customPath) continue;
      const existing = detected.find((e) => e.id === emuId);
      if (existing) {
        existing.executablePath = customPath;
        existing.installed = true;
        existing.isCustom = true;
      } else {
        detected.push({
          id: emuId,
          name: emuId.toUpperCase(),
          executablePath: customPath,
          systems: ['nes', 'snes', 'gb', 'gba', 'n64', 'ps1', 'genesis', 'arcade'],
          defaultArgs: '',
          installed: true,
          isCustom: true
        });
      }
    }

    this.emulatorsCache = detected;
    this.notify();
    return detected;
  }

  public getEmulators(): EmulatorInfo[] {
    return this.emulatorsCache;
  }

  public getEmulatorsForSystem(system: RetroSystem): EmulatorInfo[] {
    return this.emulatorsCache.filter((e) => e.systems.includes(system));
  }

  public getPreferredEmulator(system: RetroSystem): EmulatorInfo | null {
    const settings = this.getSettings();
    const prefId = settings.preferredEmulators[system];
    if (prefId) {
      const match = this.emulatorsCache.find((e) => e.id === prefId && e.installed);
      if (match) return match;
    }

    // Fallback: First installed emulator that supports this system
    const anyInstalled = this.emulatorsCache.find(
      (e) => e.systems.includes(system) && e.installed
    );
    return anyInstalled || null;
  }

  public setPreferredEmulator(system: RetroSystem, emulatorId: string) {
    const settings = this.getSettings();
    settings.preferredEmulators[system] = emulatorId;
    this.saveSettings(settings);
  }

  public setCustomEmulatorPath(emulatorId: string, exePath: string) {
    const settings = this.getSettings();
    settings.customEmulatorPaths[emulatorId] = exePath;
    this.saveSettings(settings);
    this.detectInstalledEmulators();
  }

  public subscribe(cb: (emulators: EmulatorInfo[]) => void): () => void {
    this.listeners.add(cb);
    cb(this.emulatorsCache);
    return () => this.listeners.delete(cb);
  }

  public subscribeSettings(cb: (settings: RetroSettings) => void): () => void {
    this.settingsListeners.add(cb);
    cb(this.getSettings());
    return () => this.settingsListeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.emulatorsCache));
  }

  private notifySettings(settings: RetroSettings) {
    this.settingsListeners.forEach((cb) => cb(settings));
  }
}

export const EmulatorDetectionService = new EmulatorDetectionServiceClass();
