import type { GameSession, PlayPattern } from '../types/Activity.types';
import { ActivityTrackingService } from './ActivityTrackingService';

class PatternDetectionServiceClass {
  /**
   * Detect if a specific game has a play pattern at the current hour.
   * Pattern rule: "This game was played 3+ times at this hour".
   */
  public detectPlayPattern(gameId: string, currentHour: number = new Date().getHours()): PlayPattern | null {
    const sessions = ActivityTrackingService.getSessionsForGame(gameId);
    if (!sessions || sessions.length === 0) return null;

    const atThisHour = sessions.filter((s: GameSession) => {
      const h = new Date(s.startTime).getHours();
      return h === currentHour;
    });

    // Show popup only if 3+ sessions at this hour
    if (atThisHour.length >= 3) {
      const totalDur = atThisHour.reduce((acc, s) => acc + (s.duration || 0), 0);
      const avgDuration = Math.round(totalDur / atThisHour.length);
      const lastSession = atThisHour[0];

      return {
        gameId,
        gameName: lastSession?.gameName || 'Game',
        hour: currentHour,
        occurrences: atThisHour.length,
        avgDuration,
        lastPlayed: lastSession?.startTime
      };
    }

    return null;
  }

  /**
   * Find the top suggested game pattern across all games for the current hour.
   */
  public findSuggestedResume(currentHour: number = new Date().getHours()): PlayPattern | null {
    const allSessions = ActivityTrackingService.getAllSessions();
    const gameIds = Array.from(new Set(allSessions.map((s) => s.gameId)));

    let bestPattern: PlayPattern | null = null;

    for (const gid of gameIds) {
      const pattern = this.detectPlayPattern(gid, currentHour);
      if (pattern) {
        if (!bestPattern || pattern.occurrences > bestPattern.occurrences) {
          bestPattern = pattern;
        }
      }
    }

    return bestPattern;
  }
}

export const PatternDetectionService = new PatternDetectionServiceClass();
