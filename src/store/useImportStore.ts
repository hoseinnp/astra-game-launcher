import { create } from 'zustand';
import type { Game, ProviderApiKeys } from '../types/game';
import { ArtworkService } from '../services/artworkService';
import { ThemeEngine } from '../services/themeEngine';
import { QuotesService } from '../services/quotesService';
import { useToastStore } from './useToastStore';

export interface ImportQueueItem {
  id: string;
  title: string;
  sourceType: 'standalone' | 'steam' | 'epic' | 'gog' | 'ubisoft' | 'ea';
  platformName?: string;
  executablePath: string;
  directory?: string;
  version?: string;
  headerUrl?: string;
  backdropUrl?: string;
  logoUrl?: string;
}

export interface ImportTaskStatus {
  total: number;
  completed: number;
  currentTitle: string;
  isImporting: boolean;
  importedGames: Game[];
}

interface ImportStoreState {
  isImporting: boolean;
  total: number;
  completed: number;
  currentTitle: string;
  queue: ImportQueueItem[];
  apiKeys?: ProviderApiKeys;

  // Actions
  startBatchImport: (
    items: ImportQueueItem[],
    options: {
      apiKeys?: ProviderApiKeys;
      onGameImported?: (game: Game) => void;
      onAllCompleted?: (games: Game[]) => void;
    }
  ) => Promise<void>;
  cancelImport: () => void;
}

export const useImportStore = create<ImportStoreState>((set, get) => ({
  isImporting: false,
  total: 0,
  completed: 0,
  currentTitle: '',
  queue: [],
  apiKeys: undefined,

  startBatchImport: async (items, options) => {
    if (!items || items.length === 0) return;

    set({
      isImporting: true,
      total: items.length,
      completed: 0,
      currentTitle: items[0].title,
      queue: items,
      apiKeys: options.apiKeys
    });

    useToastStore.getState().addToast({
      type: 'info',
      message: `Importing ${items.length} games in background...`,
      description: 'You can continue exploring your library.'
    });

    const createdGames: Game[] = [];

    for (let index = 0; index < items.length; index++) {
      // Check if cancelled
      if (!get().isImporting) break;

      const item = items[index];
      set({
        currentTitle: item.title,
        completed: index
      });

      try {
        let cover = item.headerUrl || '';
        let backdrop = item.backdropUrl || '';
        let logo = item.logoUrl;

        // Query artwork if not pre-provided
        if (!cover) {
          try {
            const art = await ArtworkService.searchArtwork(item.title, { apiKeys: options.apiKeys });
            if (art) {
              cover = art.coverUrl;
              backdrop = art.backdropUrl;
              if (art.logoUrl) logo = art.logoUrl;
            }
          } catch {}
        }

        if (!cover) {
          cover = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop';
          backdrop = cover;
        }

        const palette = await ThemeEngine.extractDominantColor(cover);
        const gameId = item.id.startsWith('game-') || item.id.startsWith('steam-') || item.id.startsWith('epic-') || item.id.startsWith('gog-') || item.id.startsWith('ubisoft-') || item.id.startsWith('ea-')
          ? item.id
          : `game-${Date.now()}-${index}`;

        let videoUrl: string | undefined = undefined;
        try {
          if (window.api?.downloadLiveWallpaper) {
            const dlRes = await window.api.downloadLiveWallpaper({
              title: item.title,
              gameId,
              quality: '1080p',
              forceAmbient: true
            });
            if (dlRes.success && dlRes.localPath) {
              videoUrl = dlRes.localPath;
            }
          }
        } catch {}

        const genre = item.platformName || (item.sourceType === 'standalone' ? 'Indie' : 'Action');
        const tag = item.platformName || 'Imported';

        const newGame: Game = {
          id: gameId,
          title: item.title,
          version: item.version,
          executablePath: item.executablePath,
          workingDirectory: item.directory || undefined,
          type: item.sourceType,
          coverUrl: cover,
          backdropUrl: backdrop || cover,
          videoUrl: videoUrl || undefined,
          description: `Installed ${item.platformName || 'Game'} (${item.title}).`,
          quote: QuotesService.getQuoteForGame(item.title) || undefined,
          genres: [genre, 'PC'],
          tags: [tag],
          favorite: false,
          theme: {
            accentColor: palette.accent,
            glowColor: palette.glow,
            logoUrl: logo
          },
          stats: {
            playtimeMinutes: 0,
            playCount: 0
          }
        };

        createdGames.push(newGame);
        if (options.onGameImported) {
          options.onGameImported(newGame);
        }
      } catch (err) {
        console.warn(`Failed to process imported game "${item.title}":`, err);
      }

      set({ completed: index + 1 });
    }

    set({
      isImporting: false,
      currentTitle: '',
      queue: []
    });

    if (createdGames.length > 0) {
      if (options.onAllCompleted) {
        options.onAllCompleted(createdGames);
      }
      useToastStore.getState().addToast({
        type: 'success',
        message: `Import complete!`,
        description: `Successfully added ${createdGames.length} games to your library.`
      });
    }
  },

  cancelImport: () => {
    set({
      isImporting: false,
      currentTitle: '',
      queue: []
    });
    useToastStore.getState().addToast({
      type: 'warning',
      message: 'Game import cancelled'
    });
  }
}));
