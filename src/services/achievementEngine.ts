import type { Game, GameAchievement } from '../types/game';
import { audioEngine } from './audioEngine';

export interface MilestoneDef {
  id: string;
  title: string;
  description: string;
  type: 'bronze' | 'silver' | 'gold' | 'platinum';
  check: (game: Game) => boolean;
}

export const UNIVERSAL_MILESTONES: MilestoneDef[] = [
  {
    id: 'milestone-first-blood',
    title: 'First Blood',
    description: 'Launched this title for the first time.',
    type: 'bronze',
    check: (g) => g.stats.playCount > 0
  },
  {
    id: 'milestone-apprentice',
    title: 'Apprentice Gamer',
    description: 'Logged over 1 hour of playtime.',
    type: 'bronze',
    check: (g) => g.stats.playtimeMinutes >= 60
  },
  {
    id: 'milestone-dedicated',
    title: 'Dedicated Player',
    description: 'Logged over 10 hours of playtime.',
    type: 'silver',
    check: (g) => Boolean(g.stats?.playtimeMinutes && g.stats.playtimeMinutes >= 600)
  },
  {
    id: 'milestone-mastery',
    title: 'Mastery',
    description: 'Logged over 50 hours of deep mastery.',
    type: 'gold',
    check: (g) => Boolean(g.stats?.playtimeMinutes && g.stats.playtimeMinutes >= 3000)
  },
  {
    id: 'milestone-fan-favorite',
    title: 'Fan Favorite',
    description: 'Added to your favorites collection.',
    type: 'bronze',
    check: (g) => g.favorite === true
  },
  {
    id: 'milestone-lore-keeper',
    title: 'Lore Keeper',
    description: 'Recorded personal notes or checklists.',
    type: 'bronze',
    check: (g) => Boolean(g.notes && g.notes.trim().length > 10)
  },
  {
    id: 'milestone-weekend-warrior',
    title: 'Weekend Warrior',
    description: 'Enjoyed a gaming session on the weekend.',
    type: 'silver',
    check: (g) => {
      if (!g.stats?.lastPlayed) return false;
      const day = new Date(g.stats.lastPlayed).getDay();
      return day === 0 || day === 6;
    }
  },
  {
    id: 'milestone-night-owl',
    title: 'Night Owl',
    description: 'Played between midnight and 5:00 AM.',
    type: 'silver',
    check: (g) => {
      if (!g.stats?.lastPlayed) return false;
      const hour = new Date(g.stats.lastPlayed).getHours();
      return hour >= 0 && hour < 5;
    }
  }
];

export class AchievementEngine {
  /**
   * Initializes or refreshes milestones for a game, returning newly unlocked trophies
   */
  public static evaluateMilestones(game: Game, playChime = true): { updatedGame: Game; newlyUnlocked: GameAchievement[] } {
    const existing = [...(game.achievements || [])];
    const newlyUnlocked: GameAchievement[] = [];
    let changed = false;

    UNIVERSAL_MILESTONES.forEach((ms) => {
      const idx = existing.findIndex((a) => a.id === ms.id);
      const isQualified = ms.check(game);

      if (idx === -1) {
        // Milestone not yet in list
        const trophy: GameAchievement = {
          id: ms.id,
          title: ms.title,
          description: ms.description,
          type: ms.type,
          unlocked: isQualified,
          unlockedAt: isQualified ? new Date().toISOString() : undefined
        };
        existing.push(trophy);
        changed = true;
        if (isQualified) {
          newlyUnlocked.push(trophy);
        }
      } else {
        // Milestone already present, check if freshly unlocked
        const current = existing[idx];
        if (!current.unlocked && isQualified) {
          existing[idx] = {
            ...current,
            unlocked: true,
            unlockedAt: new Date().toISOString()
          };
          changed = true;
          newlyUnlocked.push(existing[idx]);
        }
      }
    });

    if (newlyUnlocked.length > 0 && playChime) {
      audioEngine.playTrophy();
    }

    return {
      updatedGame: changed ? { ...game, achievements: existing } : game,
      newlyUnlocked
    };
  }

  /**
   * Toggle manual/custom achievement status
   */
  public static toggleAchievement(game: Game, achievementId: string): Game {
    const list = [...(game.achievements || [])];
    const idx = list.findIndex((a) => a.id === achievementId);
    if (idx === -1) return game;

    const current = list[idx];
    const willUnlock = !current.unlocked;
    list[idx] = {
      ...current,
      unlocked: willUnlock,
      unlockedAt: willUnlock ? new Date().toISOString() : undefined
    };

    if (willUnlock) {
      audioEngine.playTrophy();
    }

    return { ...game, achievements: list };
  }

  /**
   * Add custom achievement to game
   */
  public static addCustomAchievement(
    game: Game,
    title: string,
    description: string,
    type: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze'
  ): Game {
    const list = [...(game.achievements || [])];
    const newTrophy: GameAchievement = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      type,
      unlocked: false
    };
    list.push(newTrophy);
    return { ...game, achievements: list };
  }
}
