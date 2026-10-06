import type { RomDatabaseCache, RomItem, RomScanProgress, RetroSystem } from '../types/Retro.types';
import { EmulatorDetectionService } from './EmulatorDetectionService';

const CACHE_KEY = 'astra_rom_database_cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

class RomDiscoveryServiceClass {
  private romsCache: RomItem[] = [];
  private isScanning: boolean = false;
  private listeners: Set<(roms: RomItem[]) => void> = new Set();
  private progressListeners: Set<(progress: RomScanProgress) => void> = new Set();

  constructor() {
    this.loadFromCache();
    this.setupScanProgressListener();
  }

  private loadFromCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed: RomDatabaseCache = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          this.romsCache = parsed.roms || [];
        } else {
          // Expired after 7 days
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch {}
  }

  private saveToCache() {
    try {
      const data: RomDatabaseCache = {
        version: 1,
        timestamp: Date.now(),
        roms: this.romsCache
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {}
  }

  private setupScanProgressListener() {
    if (typeof window !== 'undefined' && window.api?.onRetroScanProgress) {
      window.api.onRetroScanProgress((prog) => {
        this.progressListeners.forEach((cb) => cb(prog));
      });
    }
  }

  public getRoms(): RomItem[] {
    return this.romsCache;
  }

  public async scanFolders(folders?: string[]): Promise<RomItem[]> {
    const targetFolders = folders || EmulatorDetectionService.getSettings().romFolders;
    if (!targetFolders || targetFolders.length === 0) {
      return this.romsCache;
    }

    this.isScanning = true;
    try {
      if (typeof window !== 'undefined' && window.api?.scanRoms) {
        const results = await window.api.scanRoms(targetFolders);
        if (Array.isArray(results)) {
          // Merge newly scanned ROMs with existing ones without duplicating
          const map = new Map<string, RomItem>();
          // Keep existing stats/lastPlayed
          this.romsCache.forEach((r) => map.set(r.romPath, r));

          results.forEach((item: any) => {
            const existing = map.get(item.romPath);
            map.set(item.romPath, {
              id: item.id || existing?.id || `rom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              title: item.title,
              romPath: item.romPath,
              system: (item.system || item.platform) as RetroSystem,
              releaseYear: item.releaseYear,
              fileSizeBytes: item.fileSizeBytes || 0,
              extension: item.extension || '',
              folderPath: item.folderPath || '',
              lastPlayed: existing?.lastPlayed,
              saveStateCount: existing?.saveStateCount,
              lastSaveStateTime: existing?.lastSaveStateTime
            });
          });

          this.romsCache = Array.from(map.values());
          this.saveToCache();
          this.notify();
        }
      }
    } catch (err) {
      console.error('[RomDiscoveryService] Scan failed:', err);
    } finally {
      this.isScanning = false;
    }

    return this.romsCache;
  }

  public async addFolderAndScan(folderPath: string): Promise<RomItem[]> {
    const settings = EmulatorDetectionService.getSettings();
    if (!settings.romFolders.includes(folderPath)) {
      settings.romFolders.push(folderPath);
      EmulatorDetectionService.saveSettings({ romFolders: settings.romFolders });
    }
    // Incremental scan of just this added folder
    return await this.scanFolders([folderPath]);
  }

  public removeFolder(folderPath: string) {
    const settings = EmulatorDetectionService.getSettings();
    settings.romFolders = settings.romFolders.filter((f) => f !== folderPath);
    EmulatorDetectionService.saveSettings({ romFolders: settings.romFolders });

    // Remove ROMs associated with this folder
    this.romsCache = this.romsCache.filter((r) => !r.romPath.startsWith(folderPath));
    this.saveToCache();
    this.notify();
  }

  public searchRoms(query: string, systemFilter: string = 'all'): RomItem[] {
    const q = query.toLowerCase().trim();
    return this.romsCache.filter((rom) => {
      const matchesSystem = systemFilter === 'all' || rom.system === systemFilter;
      const matchesQuery =
        !q ||
        rom.title.toLowerCase().includes(q) ||
        rom.system.toLowerCase().includes(q) ||
        (rom.releaseYear && String(rom.releaseYear).includes(q));
      return matchesSystem && matchesQuery;
    });
  }

  public markRomPlayed(romId: string) {
    const target = this.romsCache.find((r) => r.id === romId);
    if (target) {
      target.lastPlayed = new Date().toISOString();
      this.saveToCache();
      this.notify();
    }
  }

  public updateRomSaveInfo(romId: string, count: number, lastTime?: string) {
    const target = this.romsCache.find((r) => r.id === romId);
    if (target) {
      target.saveStateCount = count;
      if (lastTime) target.lastSaveStateTime = lastTime;
      this.saveToCache();
      this.notify();
    }
  }

  public subscribe(cb: (roms: RomItem[]) => void): () => void {
    this.listeners.add(cb);
    cb(this.romsCache);
    return () => this.listeners.delete(cb);
  }

  public onScanProgress(cb: (progress: RomScanProgress) => void): () => void {
    this.progressListeners.add(cb);
    return () => this.progressListeners.delete(cb);
  }

  public isBusy(): boolean {
    return this.isScanning;
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.romsCache));
  }
}

export const RomDiscoveryService = new RomDiscoveryServiceClass();
