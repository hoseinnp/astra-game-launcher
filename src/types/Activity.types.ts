export interface GameSession {
  id: string;
  gameId: string;
  gameName: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  duration: number;  // minutes
  launchCount?: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  sessionCount: number;
  games: string[];
  peakHour?: number;
}

export interface PlayPattern {
  gameId: string;
  gameName: string;
  hour: number; // 0-23
  occurrences: number;
  avgDuration: number;
  lastPlayed?: string;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  threshold: number;
  unlocked: boolean;
  unlockedDate?: string;
  icon?: string;
  category?: 'time' | 'streak' | 'variety' | 'special';
}

export interface OverallStats {
  totalPlaytimeMinutes: number;
  totalPlaytimeThisYearMinutes: number;
  currentStreakDays: number;
  longestStreakDays: number;
  peakGamingHour: number; // 0-23
  mostPlayedGames: { gameId: string; gameName: string; durationMinutes: number; percentage: number }[];
  hourlyDistribution: number[]; // 24 slots (0..23) with total minutes or sessions
  milestones: Milestone[];
}
