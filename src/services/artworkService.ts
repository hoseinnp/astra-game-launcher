import type { ProviderApiKeys, GameMetadata, HltbStats } from '../types/game';

export interface ArtworkSearchResult {
  coverUrl: string;
  backdropUrl: string;
  logoUrl?: string;
  title: string;
  description?: string;
  genres?: string[];
  source?: 'steam' | 'steamgriddb' | 'gog' | 'rawg';
}

export class ArtworkService {
  /**
   * Search Steam CDN (Built-in, zero API keys required)
   */
  public static async searchSteam(cleanTerm: string): Promise<ArtworkSearchResult | null> {
    try {
      const res = await fetch(
        `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanTerm)}&l=english&cc=US`
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        // Test up to 3 candidates to ensure valid Fastly CDN assets exist
        for (const item of data.items.slice(0, 3)) {
          const appId = item.id;
          const remoteCover = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`;
          const remoteBackdrop = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`;
          const remoteLogo = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/logo.png`;

          try {
            const check = await fetch(remoteCover, { method: 'HEAD' });
            if (check.ok) {
              return {
                title: item.name,
                coverUrl: remoteCover,
                backdropUrl: remoteBackdrop,
                logoUrl: remoteLogo,
                source: 'steam'
              };
            }
          } catch {
            // Fallback to next candidate
          }
        }

        // Fallback to first item with standard Steam header if library assets not available
        const top = data.items[0];
        const appId = top.id;
        const header = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
        return {
          title: top.name,
          coverUrl: header,
          backdropUrl: header,
          source: 'steam'
        };
      }
    } catch (e) {
      console.warn('Steam search error:', e);
    }
    return null;
  }

  /**
   * Search GOG Galaxy CDN (Built-in, zero API keys required, ideal for classic/DRM-free PC games)
   */
  public static async searchGOG(cleanTerm: string): Promise<ArtworkSearchResult | null> {
    try {
      const res = await fetch(
        `https://embed.gog.com/games/ajax/filtered?mediaType=game&search=${encodeURIComponent(cleanTerm)}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.products && data.products.length > 0) {
        const top = data.products[0];
        const rawImg = top.image ? (top.image.startsWith('//') ? `https:${top.image}` : top.image) : '';
        if (rawImg) {
          const cover = `${rawImg}_product_card_v2_mobile_slider_639.jpg`;
          const backdrop = `${rawImg}_bg_crop_1920x1080.jpg`;
          return {
            title: top.title || cleanTerm,
            coverUrl: cover,
            backdropUrl: backdrop,
            genres: top.category ? [top.category] : [],
            source: 'gog'
          };
        }
      }
    } catch (e) {
      console.warn('GOG search error:', e);
    }
    return null;
  }

  /**
   * Search SteamGridDB API (Premium community database for transparent PNG logos & custom grids)
   */
  public static async searchSteamGridDB(
    cleanTerm: string,
    apiKey: string
  ): Promise<ArtworkSearchResult | null> {
    if (!apiKey.trim()) return null;

    try {
      const headers = { Authorization: `Bearer ${apiKey.trim()}` };
      const searchRes = await fetch(
        `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(cleanTerm)}`,
        { headers }
      );
      if (!searchRes.ok) return null;
      const searchData = await searchRes.json();
      if (!searchData.success || !searchData.data || searchData.data.length === 0) return null;

      const game = searchData.data[0];
      const gameId = game.id;

      // In parallel: fetch 600x900 vertical grid, wide hero, and transparent PNG logo
      const [gridsRes, heroesRes, logosRes] = await Promise.allSettled([
        fetch(`https://www.steamgriddb.com/api/v2/grids/game/${gameId}?dimensions=600x900`, { headers }).then((r) =>
          r.json()
        ),
        fetch(`https://www.steamgriddb.com/api/v2/heroes/game/${gameId}`, { headers }).then((r) => r.json()),
        fetch(`https://www.steamgriddb.com/api/v2/logos/game/${gameId}`, { headers }).then((r) => r.json())
      ]);

      let coverUrl = '';
      let backdropUrl = '';
      let logoUrl = '';

      if (gridsRes.status === 'fulfilled' && gridsRes.value?.success && gridsRes.value.data?.length > 0) {
        coverUrl = gridsRes.value.data[0].url || '';
      }

      if (heroesRes.status === 'fulfilled' && heroesRes.value?.success && heroesRes.value.data?.length > 0) {
        backdropUrl = heroesRes.value.data[0].url || '';
      }

      if (logosRes.status === 'fulfilled' && logosRes.value?.success && logosRes.value.data?.length > 0) {
        logoUrl = logosRes.value.data[0].url || '';
      }

      if (coverUrl || backdropUrl || logoUrl) {
        return {
          title: game.name || cleanTerm,
          coverUrl,
          backdropUrl,
          logoUrl,
          source: 'steamgriddb'
        };
      }
    } catch (e) {
      console.warn('SteamGridDB search error:', e);
    }
    return null;
  }

  /**
   * Search RAWG.io API (500,000+ catalog, rich screenshots, descriptions, and genres)
   */
  public static async searchRAWG(cleanTerm: string, apiKey: string): Promise<ArtworkSearchResult | null> {
    if (!apiKey.trim()) return null;

    try {
      const res = await fetch(
        `https://api.rawg.io/api/games?key=${apiKey.trim()}&search=${encodeURIComponent(cleanTerm)}&page_size=1`
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const top = data.results[0];
        const genres = Array.isArray(top.genres) ? top.genres.map((g: { name: string }) => g.name) : [];
        return {
          title: top.name || cleanTerm,
          coverUrl: top.background_image || '',
          backdropUrl: top.background_image || '',
          genres,
          source: 'rawg'
        };
      }
    } catch (e) {
      console.warn('RAWG search error:', e);
    }
    return null;
  }

  /**
   * Unified Cascading Artwork Search across all configured providers
   */
  public static async searchArtwork(
    title: string,
    options?: { apiKeys?: ProviderApiKeys }
  ): Promise<ArtworkSearchResult | null> {
    if (!title.trim()) return null;
    const cleanTerm = title.replace(/[-_]/g, ' ').replace(/\.exe$/i, '').trim();

    // 1. If SteamGridDB API key is configured, query it first for transparent PNG logos and custom grids
    let sgdbResult: ArtworkSearchResult | null = null;
    if (options?.apiKeys?.steamGridDb) {
      sgdbResult = await this.searchSteamGridDB(cleanTerm, options.apiKeys.steamGridDb);
    }

    // 2. Query Steam CDN (Standard high-res covers & backdrops)
    const steamResult = await this.searchSteam(cleanTerm);

    // 3. Query GOG CDN (Fallback for classic and DRM-free games)
    let gogResult: ArtworkSearchResult | null = null;
    if (!steamResult && !sgdbResult) {
      gogResult = await this.searchGOG(cleanTerm);
    }

    // 4. Query RAWG.io if key is configured and still missing data
    let rawgResult: ArtworkSearchResult | null = null;
    if ((!steamResult && !gogResult) && options?.apiKeys?.rawg) {
      rawgResult = await this.searchRAWG(cleanTerm, options.apiKeys.rawg);
    }

    // Blend the best assets together:
    const resolvedTitle = sgdbResult?.title || steamResult?.title || gogResult?.title || rawgResult?.title || cleanTerm;
    const resolvedCover = sgdbResult?.coverUrl || steamResult?.coverUrl || gogResult?.coverUrl || rawgResult?.coverUrl || '';
    const resolvedBackdrop = sgdbResult?.backdropUrl || steamResult?.backdropUrl || gogResult?.backdropUrl || rawgResult?.backdropUrl || resolvedCover;
    const resolvedLogo = sgdbResult?.logoUrl || steamResult?.logoUrl || '';
    const resolvedGenres = steamResult?.genres || gogResult?.genres || rawgResult?.genres || [];
    const source = sgdbResult ? 'steamgriddb' : (steamResult ? 'steam' : (gogResult ? 'gog' : 'rawg'));

    if (!resolvedCover && !resolvedBackdrop) {
      return null;
    }

    return {
      title: resolvedTitle,
      coverUrl: resolvedCover,
      backdropUrl: resolvedBackdrop,
      logoUrl: resolvedLogo,
      genres: resolvedGenres,
      source
    };
  }

  /**
   * Fetch rich game metadata (developer, publisher, release date, rating, screenshots)
   */
  public static async fetchGameDetails(
    title: string,
    options?: { apiKeys?: ProviderApiKeys; appId?: string }
  ): Promise<GameMetadata | null> {
    if (!title.trim()) return null;
    const cleanTerm = title.replace(/[-_]/g, ' ').replace(/\.exe$/i, '').trim();

    const meta: GameMetadata = {};

    // 1. If Steam AppID or Steam search matches, fetch Steam store details
    let resolvedAppId = options?.appId;
    if (!resolvedAppId) {
      try {
        const searchRes = await fetch(
          `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanTerm)}&l=english&cc=US`
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.items && searchData.items.length > 0) {
            resolvedAppId = String(searchData.items[0].id);
          }
        }
      } catch {}
    }

    if (resolvedAppId) {
      try {
        const detailsRes = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${resolvedAppId}&l=english`
        );
        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          const gameData = detailsData[resolvedAppId]?.data;
          if (gameData) {
            meta.developer = gameData.developers?.[0];
            meta.publisher = gameData.publishers?.[0];
            meta.releaseDate = gameData.release_date?.date;
            if (gameData.metacritic?.score) {
              meta.metacritic = gameData.metacritic.score;
            }
            if (Array.isArray(gameData.screenshots)) {
              meta.screenshots = gameData.screenshots
                .map((s: { path_full?: string; path_thumbnail?: string }) => s.path_full || s.path_thumbnail || '')
                .filter(Boolean);
            }
          }
        }
      } catch {}
    }

    // 2. If RAWG key is provided, query RAWG for rating and extra screenshots
    if (options?.apiKeys?.rawg) {
      try {
        const rawgRes = await fetch(
          `https://api.rawg.io/api/games?key=${encodeURIComponent(options.apiKeys.rawg.trim())}&search=${encodeURIComponent(cleanTerm)}&page_size=1`
        );
        if (rawgRes.ok) {
          const rawgData = await rawgRes.json();
          if (rawgData.results && rawgData.results.length > 0) {
            const top = rawgData.results[0];
            if (top.rating && !meta.rating) meta.rating = top.rating;
            if (top.metacritic && !meta.metacritic) meta.metacritic = top.metacritic;
            if (top.released && !meta.releaseDate) meta.releaseDate = top.released;
            if (Array.isArray(top.short_screenshots) && (!meta.screenshots || meta.screenshots.length === 0)) {
              meta.screenshots = top.short_screenshots
                .map((s: { image?: string }) => s.image || '')
                .filter(Boolean);
            }
          }
        }
      } catch {}
    }

    // 3. Query HowLongToBeat completion statistics
    try {
      const hltb = await this.fetchHltb(cleanTerm);
      if (hltb) {
        meta.hltb = hltb;
      }
    } catch {}

    return Object.keys(meta).length > 0 ? meta : null;
  }

  /**
   * Fetch HowLongToBeat completion statistics via native IPC bridge
   */
  public static async fetchHltb(title: string): Promise<HltbStats | null> {
    if (!title || !title.trim() || !window.api?.fetchHltb) return null;
    try {
      return await window.api.fetchHltb(title.trim());
    } catch (err) {
      console.warn(`[ArtworkService] Error fetching HLTB for "${title}":`, err);
      return null;
    }
  }

  /**
   * Validate RAWG.io API key
   */
  public static async validateRawgKey(apiKey: string): Promise<{ valid: boolean; message: string; count?: number }> {
    if (!apiKey || !apiKey.trim()) {
      return { valid: false, message: 'Key is empty' };
    }
    try {
      const res = await fetch(`https://api.rawg.io/api/games?key=${encodeURIComponent(apiKey.trim())}&page_size=1`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return { valid: false, message: 'Invalid API Key (401 Unauthorized)' };
        }
        return { valid: false, message: `RAWG Error (${res.status})` };
      }
      const data = await res.json();
      if (data && (typeof data.count === 'number' || Array.isArray(data.results))) {
        const count = typeof data.count === 'number' ? data.count : undefined;
        return {
          valid: true,
          message: count ? `Connected (${count.toLocaleString()} games available)` : 'Connected to RAWG',
          count
        };
      }
      return { valid: false, message: 'Unexpected response from RAWG' };
    } catch (err: any) {
      return { valid: false, message: err?.message || 'Network error connecting to RAWG' };
    }
  }

  /**
   * Validate SteamGridDB API key
   */
  public static async validateSteamGridDbKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
    if (!apiKey || !apiKey.trim()) {
      return { valid: false, message: 'Key is empty' };
    }
    try {
      const res = await fetch(`https://www.steamgriddb.com/api/v2/search/autocomplete/portal`, {
        headers: { Authorization: `Bearer ${apiKey.trim()}` }
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return { valid: false, message: 'Invalid API Key (401 Unauthorized)' };
        }
        return { valid: false, message: `SteamGridDB Error (${res.status})` };
      }
      const data = await res.json();
      if (data && data.success) {
        return { valid: true, message: 'Connected to SteamGridDB (PNG logos ready)' };
      }
      return { valid: false, message: data?.errors?.[0] || 'SteamGridDB key rejected' };
    } catch (err: any) {
      return { valid: false, message: err?.message || 'Network error connecting to SteamGridDB' };
    }
  }

  /**
   * Fetch ambient scene live video wallpaper (zero trailers, pure in-game scenery/idle loop)
   */
  public static async fetchLiveWallpaper(
    title: string,
    options?: { sceneQuery?: string; quality?: '1080p' | '480p' }
  ): Promise<LiveWallpaperResult | null> {
    if (!title || !title.trim()) return null;

    // Zero-trailer rule: Never return commercial trailers or cutscenes.
    // Query true ambient in-game scene loops via backend live wallpaper looper.
    if (typeof window !== 'undefined' && window.api?.downloadLiveWallpaper) {
      try {
        const res = await window.api.downloadLiveWallpaper({
          title,
          gameId: 'preview-' + Date.now(),
          quality: options?.quality || '1080p',
          sceneQuery: options?.sceneQuery
        });
        if (res.success && res.localPath) {
          return {
            videoUrl: res.localPath,
            quality: options?.quality || '1080p',
            title: `${title} Ambient Scene Loop`
          };
        }
      } catch (e) {
        console.warn('Ambient scene fetch failed:', e);
      }
    }

    return null;
  }
}

export interface LiveWallpaperResult {
  videoUrl: string;
  thumbnailUrl?: string;
  title?: string;
  quality: '1080p' | '480p';
  appId?: string;
}

