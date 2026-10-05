import type { GameSession, Milestone, OverallStats } from '../types/Activity.types';

const STORAGE_KEY = 'astra_sessions_cache';

export const INITIAL_MILESTONES: Milestone[] = [
  {
    id: '100-hour-club',
    name: '100-Hour Club',
    description: 'Surpassed 100 total hours across your game universe',
    threshold: 6000, // 100 hours in minutes
    unlocked: false,
    category: 'time',
    icon: 'Trophy'
  },
  {
    id: 'weekend-warrior',
    name: 'Weekend Warrior',
    description: 'Clocked 10+ hours of gameplay across Saturday & Sunday',
    threshold: 600, // 10 hours in minutes
    unlocked: false,
    category: 'special',
    icon: 'Flame'
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Devoted 20+ hours during nocturnal hours (10 PM – 6 AM)',
    threshold: 1200, // 20 hours in minutes
    unlocked: false,
    category: 'special',
    icon: 'Moon'
  },
  {
    id: 'consistency-streak',
    name: 'Consistency',
    description: 'Maintained a legendary 30-day consecutive gaming streak',
    threshold: 30, // 30 days
    unlocked: false,
    category: 'streak',
    icon: 'Zap'
  },
  {
    id: 'speed-runner',
    name: 'Speed Runner',
    description: 'Jumped between 3 or more distinct games in a single day',
    threshold: 3, // 3 games
    unlocked: false,
    category: 'variety',
    icon: 'Sparkles'
  }
];

class ActivityTrackingServiceClass {
  private sessionsCache: GameSession[] = [];
  private activeSessions = new Map<string, { startTime: string; gameName: string }>();
  private listeners: Set<(sessions: GameSession[]) => void> = new Set();
  private milestoneListeners: Set<(milestone: Milestone) => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.syncWithBackend();
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.sessionsCache = JSON.parse(raw);
      }
    } catch {}
  }

  private persistLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessionsCache));
    } catch {}
  }

  public async syncWithBackend(): Promise<GameSession[]> {
    if (typeof window !== 'undefined' && window.api?.getActivityLog) {
      try {
        const rawSessions = await window.api.getActivityLog();
        if (Array.isArray(rawSessions)) {
          // Normalize sessions
          this.sessionsCache = rawSessions.map((s: any) => ({
            id: s.id || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            gameId: s.gameId,
            gameName: s.gameName || s.gameTitle || 'Game',
            startTime: s.startTime,
            endTime: s.endTime || s.startTime,
            duration: Number(s.duration ?? s.durationMinutes ?? 0),
            launchCount: s.launchCount ?? 1
          }));
          this.persistLocal();
          this.notify();
          this.checkMilestones();
          return this.sessionsCache;
        }
      } catch (err) {
        console.warn('[ActivityTracking] Failed to sync backend sessions:', err);
      }
    }
    return this.sessionsCache;
  }

  public subscribe(cb: (sessions: GameSession[]) => void) {
    this.listeners.add(cb);
    cb(this.sessionsCache);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public onMilestoneUnlocked(cb: (milestone: Milestone) => void) {
    this.milestoneListeners.add(cb);
    return () => {
      this.milestoneListeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.sessionsCache));
  }

  /**
   * Log game launch start
   */
  public logLaunch(gameId: string, gameName: string) {
    this.activeSessions.set(gameId, {
      startTime: new Date().toISOString(),
      gameName
    });
  }

  /**
   * Auto-save on game close with duration calculation
   */
  public async logClose(gameId: string, customDurationMinutes?: number): Promise<GameSession | null> {
    const active = this.activeSessions.get(gameId);
    this.activeSessions.delete(gameId);

    const endTime = new Date().toISOString();
    let startTime = active ? active.startTime : new Date(Date.now() - (customDurationMinutes || 1) * 60000).toISOString();
    const gameName = active ? active.gameName : 'Game';

    let duration = customDurationMinutes;
    if (duration === undefined) {
      const ms = Math.max(0, new Date(endTime).getTime() - new Date(startTime).getTime());
      duration = Math.max(1, Math.round(ms / 60000));
    }

    const session: GameSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      gameId,
      gameName,
      startTime,
      endTime,
      duration,
      launchCount: 1
    };

    // Prepend to local memory cache
    this.sessionsCache.unshift(session);
    this.persistLocal();
    this.notify();

    // Persist to Electron sessions.json
    if (typeof window !== 'undefined' && window.api?.recordActivitySession) {
      try {
        await window.api.recordActivitySession({
          id: session.id,
          gameId: session.gameId,
          gameTitle: session.gameName,
          startTime: session.startTime,
          endTime: session.endTime,
          durationMinutes: session.duration,
          date: session.startTime.split('T')[0]
        });
      } catch (err) {
        console.warn('[ActivityTracking] Failed to save session to disk:', err);
      }
    }

    this.checkMilestones();
    return session;
  }

  public getAllSessions(): GameSession[] {
    return this.sessionsCache;
  }

  public getSessionsForGame(gameId: string): GameSession[] {
    return this.sessionsCache.filter((s) => s.gameId === gameId);
  }

  /**
   * Calculate overall statistics
   */
  public getOverallStats(): OverallStats {
    const sessions = this.sessionsCache;
    const now = new Date();
    const currentYear = now.getFullYear();

    let totalMinutes = 0;
    let thisYearMinutes = 0;
    const gameDurations = new Map<string, { name: string; minutes: number }>();
    const hourlySessions = new Array(24).fill(0);
    const dayMap = new Map<string, number>();

    sessions.forEach((s) => {
      const dur = s.duration || 0;
      totalMinutes += dur;

      const d = new Date(s.startTime);
      if (d.getFullYear() === currentYear) {
        thisYearMinutes += dur;
      }

      // Hour distribution
      const hr = d.getHours();
      if (hr >= 0 && hr < 24) {
        hourlySessions[hr] += dur;
      }

      // Date string YYYY-MM-DD
      const dateKey = s.startTime.split('T')[0];
      dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + dur);

      // Per-game aggregate
      const existing = gameDurations.get(s.gameId) || { name: s.gameName, minutes: 0 };
      existing.minutes += dur;
      gameDurations.set(s.gameId, existing);
    });

    // Peak hour
    let peakHour = 20; // default 8 PM
    let maxHourly = -1;
    hourlySessions.forEach((dur, hr) => {
      if (dur > maxHourly) {
        maxHourly = dur;
        peakHour = hr;
      }
    });

    // Most played games ranking
    const sortedGames = Array.from(gameDurations.entries())
      .map(([gameId, val]) => ({
        gameId,
        gameName: val.name,
        durationMinutes: val.minutes,
        percentage: totalMinutes > 0 ? Math.round((val.minutes / totalMinutes) * 100) : 0
      }))
      .sort((a, b) => b.durationMinutes - a.durationMinutes);

    // Streaks calculation
    const { currentStreak, longestStreak } = this.calculateStreaks(dayMap);

    const milestones = this.evaluateMilestones();

    return {
      totalPlaytimeMinutes: totalMinutes,
      totalPlaytimeThisYearMinutes: thisYearMinutes,
      currentStreakDays: currentStreak,
      longestStreakDays: longestStreak,
      peakGamingHour: peakHour,
      mostPlayedGames: sortedGames,
      hourlyDistribution: hourlySessions,
      milestones
    };
  }

  private calculateStreaks(dayMap: Map<string, number>): { currentStreak: number; longestStreak: number } {
    const sortedDays = Array.from(dayMap.keys()).sort();
    if (sortedDays.length === 0) return { currentStreak: 0, longestStreak: 0 };

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let checkDate = dayMap.has(todayStr) ? new Date(today) : dayMap.has(yesterdayStr) ? new Date(yesterday) : null;

    if (checkDate) {
      while (true) {
        const k = checkDate.toISOString().split('T')[0];
        if (dayMap.has(k) && (dayMap.get(k) || 0) > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Longest streak
    let prevTime: number | null = null;
    sortedDays.forEach((dayStr) => {
      const time = new Date(dayStr).getTime();
      if (prevTime === null) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((time - prevTime) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      prevTime = time;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    });

    return { currentStreak, longestStreak: Math.max(longestStreak, currentStreak) };
  }

  public evaluateMilestones(): Milestone[] {
    const sessions = this.sessionsCache;
    const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);

    // Weekend hours
    let weekendMinutes = 0;
    let nightOwlMinutes = 0;
    const daysWithDistinctGames = new Map<string, Set<string>>();

    sessions.forEach((s) => {
      const d = new Date(s.startTime);
      const dayOfWeek = d.getDay(); // 0 is Sun, 6 is Sat
      const hr = d.getHours();
      const dur = s.duration || 0;

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendMinutes += dur;
      }

      if (hr >= 22 || hr < 6) {
        nightOwlMinutes += dur;
      }

      const dateKey = s.startTime.split('T')[0];
      const gameSet = daysWithDistinctGames.get(dateKey) || new Set();
      gameSet.add(s.gameId);
      daysWithDistinctGames.set(dateKey, gameSet);
    });

    const maxGamesInSingleDay = Math.max(
      0,
      ...Array.from(daysWithDistinctGames.values()).map((set) => set.size)
    );

    const dayMap = new Map<string, number>();
    sessions.forEach((s) => {
      const dateKey = s.startTime.split('T')[0];
      dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + (s.duration || 0));
    });
    const { longestStreak } = this.calculateStreaks(dayMap);

    return INITIAL_MILESTONES.map((m) => {
      let isUnlocked = false;
      if (m.id === '100-hour-club') isUnlocked = totalMinutes >= m.threshold;
      else if (m.id === 'weekend-warrior') isUnlocked = weekendMinutes >= m.threshold;
      else if (m.id === 'night-owl') isUnlocked = nightOwlMinutes >= m.threshold;
      else if (m.id === 'consistency-streak') isUnlocked = longestStreak >= m.threshold;
      else if (m.id === 'speed-runner') isUnlocked = maxGamesInSingleDay >= m.threshold;

      return {
        ...m,
        unlocked: isUnlocked
      };
    });
  }

  private checkMilestones() {
    const currentMilestones = this.evaluateMilestones();
    const storedStatusKey = 'astra_milestones_unlocked';
    let previouslyUnlocked: string[] = [];
    try {
      const raw = localStorage.getItem(storedStatusKey);
      if (raw) previouslyUnlocked = JSON.parse(raw);
    } catch {}

    const nowUnlocked: string[] = [];
    currentMilestones.forEach((m) => {
      if (m.unlocked) {
        nowUnlocked.push(m.id);
        if (!previouslyUnlocked.includes(m.id)) {
          // Newly unlocked!
          this.milestoneListeners.forEach((cb) => cb(m));
        }
      }
    });

    try {
      localStorage.setItem(storedStatusKey, JSON.stringify(nowUnlocked));
    } catch {}
  }
}

export const ActivityTrackingService = new ActivityTrackingServiceClass();
