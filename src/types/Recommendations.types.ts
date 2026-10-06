import type { Game } from './game';

export type StandardGenre =
  | 'Action'
  | 'RPG'
  | 'Strategy'
  | 'Puzzle'
  | 'Sports'
  | 'Adventure'
  | 'Simulation'
  | 'Horror'
  | 'Indie'
  | 'Casual';

export type SortOption =
  | 'score'
  | 'genre'
  | 'length_short'
  | 'length_long'
  | 'library_playtime';

export interface PlaystyleProfileData {
  topGenres: { genre: StandardGenre; hours: number; percentage: number }[];
  summaryText: string;
  totalHoursPlayed: number;
  totalGamesPlayed: number;
  unplayedCount: number;
  platformSplit: {
    pcPercent: number;
    retroPercent: number;
    consolePercent: number;
  };
  peakGamingHours?: string; // e.g. "Evening (8 PM – 11 PM)"
}

export interface RecommendationScoreBreakdown {
  genreMatch: number; // Max 40
  libraryPopularity: number; // Max 20
  recencyRelevance: number; // Max 10
  platformMatch: number; // Max 10
  ratingsProxy: number; // Max 10
  baseScore: number; // Max 10
  totalScore: number; // 0 - 100
}

export interface RecommendedGameItem {
  game: Game;
  score: number; // 0 - 100
  breakdown: RecommendationScoreBreakdown;
  reason: string;
  primaryGenre: StandardGenre;
  allGenres: StandardGenre[];
  estimatedLengthHours?: number;
  isRetro?: boolean;
}

export interface RecommendationsCache {
  version: number;
  timestamp: number; // 24-hour TTL check
  recommendations: RecommendedGameItem[];
  profile: PlaystyleProfileData;
}
