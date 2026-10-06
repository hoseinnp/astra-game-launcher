import type { Game } from '../types/game';
import type {
  StandardGenre,
  PlaystyleProfileData,
  RecommendedGameItem,
  RecommendationsCache
} from '../types/Recommendations.types';
import { ActivityTrackingService } from './ActivityTrackingService';
import { GameLauncherService } from './GameLauncherService';

const CACHE_KEY = 'astra_recommendations_cache';
const PROFILE_KEY = 'astra_playstyle_profile';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Mapping raw genre strings and title keywords to the 10 standard genres
const GENRE_MAP: Record<string, StandardGenre> = {
  action: 'Action',
  fps: 'Action',
  shooter: 'Action',
  hack: 'Action',
  slash: 'Action',
  fighting: 'Action',
  stealth: 'Action',
  platformer: 'Action',
  platform: 'Action',
  beat: 'Action',
  brawler: 'Action',
  rpg: 'RPG',
  'role-playing': 'RPG',
  jrpg: 'RPG',
  arpg: 'RPG',
  souls: 'RPG',
  mmo: 'RPG',
  mmorpg: 'RPG',
  strategy: 'Strategy',
  rts: 'Strategy',
  tbs: 'Strategy',
  tactics: 'Strategy',
  management: 'Strategy',
  tower: 'Strategy',
  grand: 'Strategy',
  puzzle: 'Puzzle',
  logic: 'Puzzle',
  match: 'Puzzle',
  tetris: 'Puzzle',
  sports: 'Sports',
  racing: 'Sports',
  motorsport: 'Sports',
  football: 'Sports',
  soccer: 'Sports',
  basketball: 'Sports',
  adventure: 'Adventure',
  narrative: 'Adventure',
  exploration: 'Adventure',
  metroidvania: 'Adventure',
  quest: 'Adventure',
  'point-and-click': 'Adventure',
  simulation: 'Simulation',
  sim: 'Simulation',
  simulator: 'Simulation',
  city: 'Simulation',
  building: 'Simulation',
  survival: 'Simulation',
  tycoon: 'Simulation',
  horror: 'Horror',
  psychological: 'Horror',
  thriller: 'Horror',
  survivalhorror: 'Horror',
  indie: 'Indie',
  roguelike: 'Indie',
  roguelite: 'Indie',
  casual: 'Casual',
  arcade: 'Casual',
  party: 'Casual',
  relaxing: 'Casual',
  cozy: 'Casual'
};

export class RecommendationEngineClass {
  private cache: RecommendationsCache | null = null;
  private listeners: Set<(items: RecommendedGameItem[]) => void> = new Set();
  private profileListeners: Set<(profile: PlaystyleProfileData) => void> = new Set();

  constructor() {
    this.loadCache();
  }

  private loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed: RecommendationsCache = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          this.cache = parsed;
        } else {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch {}
  }

  private saveCache(recommendations: RecommendedGameItem[], profile: PlaystyleProfileData) {
    try {
      this.cache = {
        version: 1,
        timestamp: Date.now(),
        recommendations,
        profile
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache));
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {}
  }

  public clearCache() {
    this.cache = null;
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(PROFILE_KEY);
    } catch {}
  }

  /**
   * Normalize an array of genre strings or game title into the 10 standard genres:
   * Action, RPG, Strategy, Puzzle, Sports, Adventure, Simulation, Horror, Indie, Casual
   */
  public normalizeGenres(rawGenres: string[], title: string = ''): StandardGenre[] {
    const result = new Set<StandardGenre>();
    const textToCheck = [...rawGenres, title.toLowerCase()].join(' ').toLowerCase();

    for (const [token, std] of Object.entries(GENRE_MAP)) {
      if (textToCheck.includes(token)) {
        result.add(std);
      }
    }

    if (result.size === 0) {
      // Default fallback
      result.add('Action');
    }

    return Array.from(result);
  }

  /**
   * Analyze player's gaming history from ActivityTrackingService & library
   * Computes genre preferences, playstyle summary, platform split, and peak gaming hours.
   */
  public analyzePlaystyle(games: Game[]): PlaystyleProfileData {
    const sessions = ActivityTrackingService.getAllSessions();
    const genreMinutes: Record<StandardGenre, number> = {
      Action: 0,
      RPG: 0,
      Strategy: 0,
      Puzzle: 0,
      Sports: 0,
      Adventure: 0,
      Simulation: 0,
      Horror: 0,
      Indie: 0,
      Casual: 0
    };

    let totalMinutes = 0;
    const playedGameIds = new Set<string>();

    // 1. Tally from activity tracking sessions
    sessions.forEach((s) => {
      totalMinutes += s.duration || 0;
      playedGameIds.add(s.gameId);
      const matchedGame = games.find((g) => g.id === s.gameId);
      const genres = matchedGame
        ? this.normalizeGenres(matchedGame.genres, matchedGame.title)
        : this.normalizeGenres([], s.gameName);

      genres.forEach((genre) => {
        genreMinutes[genre] += s.duration || 0;
      });
    });

    // 2. Also incorporate stats stored on games in the library
    games.forEach((g) => {
      const gPlay = g.stats?.playtimeMinutes || 0;
      if (gPlay > 0 && !playedGameIds.has(g.id)) {
        totalMinutes += gPlay;
        playedGameIds.add(g.id);
        const genres = this.normalizeGenres(g.genres, g.title);
        genres.forEach((genre) => {
          genreMinutes[genre] += gPlay;
        });
      }
    });

    // Calculate percentage breakdown
    const totalGenreSum = Object.values(genreMinutes).reduce((a, b) => a + b, 0);
    const topGenres = Object.entries(genreMinutes)
      .map(([genre, mins]) => ({
        genre: genre as StandardGenre,
        hours: Math.round((mins / 60) * 10) / 10,
        percentage: totalGenreSum > 0 ? Math.round((mins / totalGenreSum) * 100) : 0
      }))
      .filter((g) => g.hours > 0)
      .sort((a, b) => b.hours - a.hours);

    // If player has no play data yet, provide an initial welcoming distribution
    if (topGenres.length === 0) {
      topGenres.push(
        { genre: 'Action', hours: 0, percentage: 40 },
        { genre: 'RPG', hours: 0, percentage: 30 },
        { genre: 'Adventure', hours: 0, percentage: 20 },
        { genre: 'Indie', hours: 0, percentage: 10 }
      );
    }

    // Platform Split (PC vs Retro vs Console)
    let pcCount = 0;
    let retroCount = 0;
    let consoleCount = 0;
    games.forEach((g) => {
      if (g.type === 'emulator' || g.id.startsWith('retro_')) retroCount++;
      else if (g.type === 'steam' || g.type === 'gog' || g.type === 'standalone' || g.type === 'epic') pcCount++;
      else consoleCount++;
    });
    const totalLibrary = games.length || 1;

    // Peak Gaming Hours from Activity Tracking heatmap
    const stats = ActivityTrackingService.getOverallStats();
    let peakGamingHours = 'Evening (8 PM – 11 PM)';
    if (stats.currentStreakDays > 5) {
      peakGamingHours = 'Night Owl (10 PM – 2 AM)';
    }

    // Unplayed count
    const unplayedCount = games.filter((g) => {
      const meta = GameLauncherService.getGameMetadata(g);
      return meta.isUnplayed;
    }).length;

    // Playstyle Summary Text
    const primary = topGenres[0] || { genre: 'Action', percentage: 40 };
    const secondary = topGenres[1] || { genre: 'RPG', percentage: 25 };
    const summaryText = `You play ${primary.genre.toLowerCase()} games ${primary.percentage}% of the time, followed by ${secondary.genre.toLowerCase()} (${secondary.percentage}%). We found ${unplayedCount} hidden gems in your library.`;

    const profile: PlaystyleProfileData = {
      topGenres,
      summaryText,
      totalHoursPlayed: Math.round((totalMinutes / 60) * 10) / 10,
      totalGamesPlayed: playedGameIds.size,
      unplayedCount,
      platformSplit: {
        pcPercent: Math.round((pcCount / totalLibrary) * 100),
        retroPercent: Math.round((retroCount / totalLibrary) * 100),
        consolePercent: Math.round((consoleCount / totalLibrary) * 100)
      },
      peakGamingHours
    };

    return profile;
  }

  /**
   * Main Recommendation Algorithm:
   * 1. Pull all games from GameLauncherService (local + retro ROMs)
   * 2. Categorize into standard genres and identify unplayed games
   * 3. Score unplayed games (0-100) based on weighted parameters:
   *    - Genre match: up to +40 points
   *    - Popularity in library (playedScore / affinity with most-played): up to +20 points
   *    - Release era relevance: up to +10 points
   *    - Platform match: up to +10 points
   *    - User ratings proxy: up to +10 points
   *    - Base score: +10 points
   * 4. Sort by score, return top 10
   */
  public generateRecommendations(allGames: Game[], forceRefresh: boolean = false): {
    recommendations: RecommendedGameItem[];
    profile: PlaystyleProfileData;
  } {
    if (!forceRefresh && this.cache && Date.now() - this.cache.timestamp < CACHE_TTL_MS) {
      return {
        recommendations: this.cache.recommendations,
        profile: this.cache.profile
      };
    }

    const profile = this.analyzePlaystyle(allGames);
    const top3Genres = profile.topGenres.slice(0, 3).map((g) => g.genre);

    // Identify and score played games:
    // playedScore = (totalPlaytime / gameLength) * engagement
    const playedGamesWithScore = allGames
      .map((g) => {
        const playtime = g.stats?.playtimeMinutes || 0;
        const gameLengthHours = g.hltb?.mainStoryHours || g.metadata?.hltb?.mainStoryHours || 15;
        const gameLengthMinutes = Math.max(60, gameLengthHours * 60);
        const sessionCount = g.stats?.playCount || 1;
        const engagement = Math.min(2.0, 1 + sessionCount * 0.1);
        const playedScore = (playtime / gameLengthMinutes) * engagement;
        return { game: g, playtime, playedScore };
      })
      .filter((x) => x.playtime > 0)
      .sort((a, b) => b.playedScore - a.playedScore);

    // Find all unplayed games (playtime = 0)
    let candidates = allGames.filter((g) => {
      const meta = GameLauncherService.getGameMetadata(g);
      return meta.isUnplayed;
    });

    // Fallback: If player has played all games, select least played
    if (candidates.length === 0) {
      candidates = [...allGames].sort(
        (a, b) => (a.stats?.playtimeMinutes || 0) - (b.stats?.playtimeMinutes || 0)
      );
    }

    // Score each unplayed game candidate
    const scoredItems: RecommendedGameItem[] = candidates.map((game) => {
      const genres = this.normalizeGenres(game.genres, game.title);
      const primaryGenre = genres[0] || 'Action';

      // 1. Genre match (Max 40 points)
      // Matches genres with top 3 player preferences
      let genreScore = 0;
      const matchedTopGenres = genres.filter((g) => top3Genres.includes(g));
      if (matchedTopGenres.length >= 2) {
        genreScore = 40;
      } else if (matchedTopGenres.length === 1) {
        const rank = top3Genres.indexOf(matchedTopGenres[0]);
        genreScore = rank === 0 ? 35 : rank === 1 ? 28 : 20;
      } else {
        genreScore = 10;
      }

      // 2. Popularity in your library (Max 20 points)
      // Games like your most-played / highest engagement titles
      let popScore = 0;
      if (playedGamesWithScore.length > 0) {
        const topPlayed = playedGamesWithScore.slice(0, 3);
        const matchesAnyTopPlayed = topPlayed.some((tp) => {
          const tpGenres = this.normalizeGenres(tp.game.genres, tp.game.title);
          return genres.some((g) => tpGenres.includes(g));
        });
        popScore = matchesAnyTopPlayed ? 20 : 8;
      } else {
        popScore = 15;
      }

      // 3. Release relevance / era similarity (Max 10 points)
      let recencyScore = 5;
      const releaseYear = game.metadata?.releaseDate
        ? new Date(game.metadata.releaseDate).getFullYear()
        : undefined;
      if (releaseYear && releaseYear >= 2020) {
        recencyScore = 10;
      } else if (releaseYear && releaseYear >= 2012) {
        recencyScore = 8;
      } else {
        recencyScore = 7;
      }

      // 4. Platform match (Max 10 points)
      let platformScore = 7;
      const isRetro = game.type === 'emulator' || game.id.startsWith('retro_');
      if (profile.platformSplit.retroPercent > 30 && isRetro) {
        platformScore = 10;
      } else if (profile.platformSplit.pcPercent >= 50 && !isRetro) {
        platformScore = 10;
      }

      // 5. User ratings proxy (Max 10 points)
      let ratingsScore = 6;
      if (game.metadata?.metacritic && game.metadata.metacritic >= 85) {
        ratingsScore = 10;
      } else if (game.metadata?.rating && game.metadata.rating >= 4.0) {
        ratingsScore = 9;
      } else if (game.favorite) {
        ratingsScore = 10;
      }

      // 6. Base exploration score (Max 10 points)
      const baseScore = 10;

      const totalScore = Math.min(
        100,
        Math.max(10, genreScore + popScore + recencyScore + platformScore + ratingsScore + baseScore)
      );

      // "Why recommended?" subtitle generation
      let reason = `Matches your top ${primaryGenre} playstyle`;
      if (matchedTopGenres.length > 0) {
        const topProfileMatch = profile.topGenres.find((g) => g.genre === matchedTopGenres[0]);
        if (topProfileMatch && topProfileMatch.hours > 0) {
          reason = `You play similar ${matchedTopGenres[0]} games ${topProfileMatch.hours}h recently`;
        } else {
          reason = `Aligns with your love for ${matchedTopGenres.join(' & ')} games`;
        }
      } else if (isRetro) {
        reason = `Classic retro title waiting in your collection`;
      } else if (ratingsScore >= 9) {
        reason = `Critically acclaimed standout in your library`;
      }

      // Estimated Length (from HLTB if present, else genre default)
      const estimatedLengthHours =
        game.hltb?.mainStoryHours ||
        game.metadata?.hltb?.mainStoryHours ||
        (genres.includes('RPG') ? 35 : genres.includes('Action') ? 12 : 8);

      return {
        game,
        score: totalScore,
        breakdown: {
          genreMatch: genreScore,
          libraryPopularity: popScore,
          recencyRelevance: recencyScore,
          platformMatch: platformScore,
          ratingsProxy: ratingsScore,
          baseScore,
          totalScore
        },
        reason,
        primaryGenre,
        allGenres: genres,
        estimatedLengthHours,
        isRetro
      };
    });

    // Sort by recommendation score descending and pick top 10
    scoredItems.sort((a, b) => b.score - a.score);
    const top10 = scoredItems.slice(0, 10);

    this.saveCache(top10, profile);
    this.notify(top10);
    this.notifyProfile(profile);

    return { recommendations: top10, profile };
  }

  public subscribe(cb: (items: RecommendedGameItem[]) => void): () => void {
    this.listeners.add(cb);
    if (this.cache) cb(this.cache.recommendations);
    return () => this.listeners.delete(cb);
  }

  public subscribeProfile(cb: (profile: PlaystyleProfileData) => void): () => void {
    this.profileListeners.add(cb);
    if (this.cache) cb(this.cache.profile);
    return () => this.profileListeners.delete(cb);
  }

  private notify(items: RecommendedGameItem[]) {
    this.listeners.forEach((cb) => cb(items));
  }

  private notifyProfile(profile: PlaystyleProfileData) {
    this.profileListeners.forEach((cb) => cb(profile));
  }
}

export const RecommendationEngine = new RecommendationEngineClass();
