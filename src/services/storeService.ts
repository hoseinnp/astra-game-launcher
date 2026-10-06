import type { Game, AppSettings, UserProfile } from '../types/game';
import { normalizeMediaUrl } from '../utils/mediaUrl';
import { QuotesService } from './quotesService';


export const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'user-default',
    name: 'User',
    tag: 'Player 1',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=300&auto=format&fit=crop',
    theme: '8bitdo-mint',
    isHost: true
  },
  {
    id: 'user-tactician',
    name: 'Tactician',
    tag: 'Player 2 · Scout',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop',
    theme: 'ps5-dark',
    isHost: false
  },
  {
    id: 'user-berserker',
    name: 'Berserker',
    tag: 'Player 3 · Juggernaut',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
    theme: 'cyberpunk',
    isHost: false
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  viewMode: 'ps5',
  globalTheme: '8bitdo-mint',
  sfxEnabled: true,
  sfxVolume: 0.7,
  bgmEnabled: true,
  bgmVolume: 0.5,
  minimizeOnLaunch: false,
  apiKeys: {
    steamGridDb: '',
    rawg: ''
  },
  backgroundBlur: 'medium',
  skipStartupScreen: false,
  startOnBoot: false,
  showNavigationHud: false,
  hasCompletedOnboarding: false,
  experienceArchetype: 'digital',
  hapticsEnabled: true
};

export const INITIAL_GAMES: Game[] = [];

export class StoreService {
  private static patchGames(games: Game[]): Game[] {
    return games.map((g) => {
      const initMatch = INITIAL_GAMES.find((ig) => ig.id === g.id);
      let cover = normalizeMediaUrl(g.coverUrl);
      let backdrop = normalizeMediaUrl(g.backdropUrl);
      const video = g.videoUrl ? normalizeMediaUrl(g.videoUrl) : undefined;
      let logo = g.theme?.logoUrl ? normalizeMediaUrl(g.theme.logoUrl) : undefined;
      const quote = g.quote || initMatch?.quote || QuotesService.getQuoteForGame(g.title) || undefined;

      if (initMatch) {
        cover = cover.includes('unsplash') ? initMatch.coverUrl : cover;
        backdrop = (!backdrop || backdrop.includes('unsplash')) ? (initMatch.backdropUrl || '') : backdrop;
        logo = logo || initMatch.theme.logoUrl;
      }

      return {
        ...g,
        version: g.version || initMatch?.version,
        coverUrl: cover || g.coverUrl,
        backdropUrl: backdrop || cover || g.backdropUrl,
        videoUrl: video,
        quote,
        theme: {
          ...g.theme,
          logoUrl: logo
        }
      };
    });
  }

  public static getCached(): { games: Game[]; settings: AppSettings; profiles: UserProfile[] } {
    try {
      const rawGames = localStorage.getItem('astra_games') || localStorage.getItem('nexus_games');
      const rawSettings = localStorage.getItem('astra_settings') || localStorage.getItem('nexus_settings');
      const rawProfiles = localStorage.getItem('astra_profiles') || localStorage.getItem('nexus_profiles');
      const profiles = rawProfiles ? JSON.parse(rawProfiles) : DEFAULT_PROFILES;
      if (rawGames) {
        const parsed = JSON.parse(rawGames);
        if (Array.isArray(parsed)) {
          return {
            games: StoreService.patchGames(parsed),
            settings: rawSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) } : DEFAULT_SETTINGS,
            profiles: Array.isArray(profiles) && profiles.length > 0 ? profiles : DEFAULT_PROFILES
          };
        }
      }
      return { games: INITIAL_GAMES, settings: DEFAULT_SETTINGS, profiles: DEFAULT_PROFILES };
    } catch {}
    return { games: INITIAL_GAMES, settings: DEFAULT_SETTINGS, profiles: DEFAULT_PROFILES };
  }

  public static async load(): Promise<{ games: Game[]; settings: AppSettings; profiles: UserProfile[] }> {
    if (window.api && window.api.loadData) {
      try {
        const data = await window.api.loadData();
        if (data && Array.isArray(data.games)) {
          const profiles = (data as any).profiles && Array.isArray((data as any).profiles) && (data as any).profiles.length > 0
            ? (data as any).profiles
            : DEFAULT_PROFILES;
          return {
            games: StoreService.patchGames(data.games),
            settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
            profiles
          };
        }
      } catch (err) {
        console.warn('Electron load error, falling back to local:', err);
      }
    }

    // LocalStorage fallback
    const rawGames = localStorage.getItem('astra_games') || localStorage.getItem('nexus_games');
    const rawSettings = localStorage.getItem('astra_settings') || localStorage.getItem('nexus_settings');
    const rawProfiles = localStorage.getItem('astra_profiles') || localStorage.getItem('nexus_profiles');

    const games = rawGames ? StoreService.patchGames(JSON.parse(rawGames)) : INITIAL_GAMES;
    const settings = rawSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) } : DEFAULT_SETTINGS;
    const profiles = rawProfiles ? JSON.parse(rawProfiles) : DEFAULT_PROFILES;

    return { games, settings, profiles };
  }

  public static async save(games: Game[], settings: AppSettings, profiles?: UserProfile[]): Promise<void> {
    const toSaveProfiles = profiles || DEFAULT_PROFILES;
    if (window.api && window.api.saveData) {
      try {
        await window.api.saveData({ games, settings, profiles: toSaveProfiles } as any);
      } catch (err) {
        console.warn('Electron save error:', err);
      }
    }

    try {
      localStorage.setItem('astra_games', JSON.stringify(games));
      localStorage.setItem('astra_settings', JSON.stringify(settings));
      localStorage.setItem('astra_profiles', JSON.stringify(toSaveProfiles));
    } catch {
      // Ignore quota error
    }
  }

  public static async enrichVersions(games: Game[], onUpdate?: (games: Game[]) => void): Promise<Game[]> {
    if (!window.api?.getExeVersion) return games;
    const missing = games.filter((g) => !g.version && g.executablePath);
    if (missing.length === 0) return games;

    let changed = false;
    const updated = [...games];
    for (const g of missing) {
      try {
        const v = await window.api.getExeVersion(g.executablePath);
        if (v) {
          const idx = updated.findIndex((x) => x.id === g.id);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], version: v };
            changed = true;
          }
        }
      } catch {}
    }
    if (changed && onUpdate) {
      onUpdate(updated);
    }
    return updated;
  }
}

