import type { Game } from '../types/game';

export type MoodType = 'adrenaline' | 'cozy' | 'challenge' | 'story';
export type TimeSlotType = 'quick' | 'moderate' | 'marathon';
export type RouletteFilter = 'all' | 'favorites' | 'backlog' | 'short';

export interface RecommendationResult {
  game: Game;
  score: number;
  badge: string;
  reason: string;
  vibeMatch: string;
  estimatedRemainingHours?: number;
  completionPercent?: number;
}

export class SuggesterService {
  /**
   * Filter candidates for the roulette wheel based on player choice.
   */
  public static getRouletteCandidates(games: Game[], filter: RouletteFilter): Game[] {
    if (games.length === 0) return [];

    switch (filter) {
      case 'favorites': {
        const favs = games.filter((g) => g.favorite);
        return favs.length > 0 ? favs : games;
      }
      case 'backlog': {
        const backlog = games.filter((g) => g.collection === 'backlog' || g.stats.playtimeMinutes === 0);
        return backlog.length > 0 ? backlog : games;
      }
      case 'short': {
        const shortGames = games.filter((g) => {
          const hltb = g.hltb || g.metadata?.hltb;
          return hltb && hltb.mainStoryHours > 0 && hltb.mainStoryHours <= 15;
        });
        return shortGames.length > 0 ? shortGames : games;
      }
      case 'all':
      default:
        return games;
    }
  }

  /**
   * Score and rank games based on the player's mood and available time.
   */
  public static getMoodRecommendations(
    games: Game[],
    mood: MoodType,
    timeSlot: TimeSlotType
  ): RecommendationResult[] {
    if (games.length === 0) return [];

    const scored = games.map((game) => {
      let score = 50;
      const reasons: string[] = [];

      const genres = game.genres.map((g) => g.toLowerCase());
      const tags = game.tags.map((t) => t.toLowerCase());
      const allKeywords = [...genres, ...tags];
      const hltb = game.hltb || game.metadata?.hltb;
      const playedHours = (game.stats.playtimeMinutes || 0) / 60;
      const storyHours = hltb?.mainStoryHours || 0;
      const completionPercent = storyHours > 0 ? Math.min(100, Math.round((playedHours / storyHours) * 100)) : undefined;
      const remainingHours = storyHours > 0 ? Math.max(0, Math.round(storyHours - playedHours)) : undefined;

      // 1. Mood Scoring
      switch (mood) {
        case 'adrenaline': {
          const adrenalineMatches = ['fps', 'action', 'fast-paced', 'cyberpunk', 'adrenaline', 'shooter', 'racing', 'heavy metal', 'high-octane'];
          const hitCount = allKeywords.filter((k) => adrenalineMatches.some((m) => k.includes(m))).length;
          score += hitCount * 150;

          if (game.theme?.vibe === 'cyberpunk' || game.theme?.vibe === 'tactical-military') {
            score += 100;
          }
          if (hitCount > 0) {
            reasons.push('High-octane reflexes and explosive action match your adrenaline craving');
          }
          break;
        }

        case 'cozy': {
          const cozyMatches = ['cozy', 'wholesome', 'indie', 'platformer', 'relaxing', 'casual', 'atmospheric', 'puzzle', 'simulator', 'farm'];
          const hitCount = allKeywords.filter((k) => cozyMatches.some((m) => k.includes(m))).length;
          score += hitCount * 150;

          if (game.theme?.vibe === 'cozy-wholesome' || game.theme?.vibe === 'retro-arcade') {
            score += 100;
          }
          if (hitCount > 0) {
            reasons.push('Low-stress, comforting atmosphere perfect for relaxing without pressure');
          }
          break;
        }

        case 'challenge': {
          const challengeMatches = ['souls-like', 'hardcore', 'dark fantasy', 'difficult', 'swordplay', 'masterpiece', 'roguelike', 'roguelite', 'survival'];
          const hitCount = allKeywords.filter((k) => challengeMatches.some((m) => k.includes(m))).length;
          score += hitCount * 150;

          if (game.theme?.vibe === 'souls-fantasy') {
            score += 100;
          }
          if (hitCount > 0) {
            reasons.push('Deep combat mastery, demanding bosses, and high-reward difficulty');
          }
          break;
        }

        case 'story': {
          const storyMatches = ['rpg', 'cinematic', 'narrative', 'open world', 'historical', 'adventure', 'action rpg', 'story-rich'];
          const hitCount = allKeywords.filter((k) => storyMatches.some((m) => k.includes(m))).length;
          score += hitCount * 150;

          if (game.theme?.vibe === 'modern-cinematic' || game.theme?.vibe === 'anime-stylized') {
            score += 100;
          }
          if (hitCount > 0) {
            reasons.push('Rich lore, memorable dialogues, and immersive world-building');
          }
          break;
        }
      }

      // 2. Time Slot Scoring
      switch (timeSlot) {
        case 'quick': {
          if (storyHours > 0 && storyHours <= 12) {
            score += 120;
            reasons.push(`Bite-sized campaign (~${storyHours}h total) suits your quick session`);
          } else if (playedHours > 0) {
            score += 50;
            reasons.push('Already installed and ready to hop in for immediate gameplay');
          }
          break;
        }

        case 'moderate': {
          if (completionPercent && completionPercent >= 40 && completionPercent <= 90) {
            score += 120;
            reasons.push(`You're ${completionPercent}% through the story (${remainingHours}h remaining) — great chunk to knock out today`);
          } else {
            score += 30;
          }
          break;
        }

        case 'marathon': {
          if (storyHours >= 25 || genres.some((g) => g.includes('rpg') || g.includes('open world'))) {
            score += 120;
            reasons.push(`Epic deep-dive title (${storyHours ? `${storyHours}h campaign` : 'expansive world'}) ideal for an uninterrupted marathon`);
          }
          break;
        }
      }

      // 3. Collection Status & Favorites
      if (game.favorite) {
        score += 30;
      }
      if (game.collection === 'playing') {
        score += 40;
      } else if (game.collection === 'backlog') {
        score += 20;
        reasons.push('Waiting patiently in your backlog backlog');
      }

      // 4. Recency Variety (give bonus if not played in the last 48h to avoid burnout, or if currently active)
      if (game.stats.lastPlayed) {
        const hoursSince = (Date.now() - new Date(game.stats.lastPlayed).getTime()) / (1000 * 3600);
        if (hoursSince > 48 && hoursSince < 720) {
          score += 20;
        }
      } else {
        score += 25;
        reasons.push('Completely fresh experience — unplayed in your library');
      }

      // 5. Add a small deterministic random tie-breaker so identical scored games shuffle slightly
      // but remain stable during the session.
      const pseudoRandom = (game.title.length * 7 + (game.stats.playtimeMinutes || 0)) % 15;
      score += pseudoRandom;

      // Construct badge
      let badge = 'Match';
      if (completionPercent && completionPercent > 70 && completionPercent < 100) {
        badge = 'Finish Line Close';
      } else if (game.favorite) {
        badge = 'Top Favorite';
      } else if (storyHours > 0 && storyHours <= 10) {
        badge = 'Quick Victory';
      } else if (mood === 'adrenaline') {
        badge = 'High Octane';
      } else if (mood === 'cozy') {
        badge = 'Pure Chill';
      } else if (mood === 'challenge') {
        badge = 'True Mastery';
      } else if (mood === 'story') {
        badge = 'Cinematic Epic';
      }

      const vibeMatch = game.theme?.vibe && game.theme.vibe !== 'auto' ? game.theme.vibe : 'dynamic';
      const finalReason = reasons.length > 0 ? reasons.slice(0, 2).join(' • ') : 'Balanced match for your current gaming session';

      return {
        game,
        score,
        badge,
        reason: finalReason,
        vibeMatch,
        estimatedRemainingHours: remainingHours,
        completionPercent
      };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /**
   * Identifies games closest to the finish line or shortest unplayed gems.
   */
  public static getBacklogFinishers(games: Game[]): RecommendationResult[] {
    const list: RecommendationResult[] = [];

    for (const game of games) {
      const hltb = game.hltb || game.metadata?.hltb;
      const playedHours = (game.stats.playtimeMinutes || 0) / 60;
      const storyHours = hltb?.mainStoryHours || 0;

      if (storyHours > 0) {
        const percent = Math.min(100, Math.round((playedHours / storyHours) * 100));
        const remaining = Math.max(0, Math.round(storyHours - playedHours));

        if (percent > 0 && percent < 100) {
          list.push({
            game,
            score: 100 + percent,
            badge: `${percent}% Finished`,
            reason: `${remaining}h remaining to roll credits on HowLongToBeat`,
            vibeMatch: game.theme?.vibe || 'auto',
            estimatedRemainingHours: remaining,
            completionPercent: percent
          });
        } else if (percent === 0 && storyHours <= 12) {
          list.push({
            game,
            score: 80 - storyHours,
            badge: `${storyHours}h Quick Win`,
            reason: `Bite-sized campaign ready to complete in just a few sittings`,
            vibeMatch: game.theme?.vibe || 'auto',
            estimatedRemainingHours: storyHours,
            completionPercent: 0
          });
        }
      }
    }

    list.sort((a, b) => b.score - a.score);
    return list;
  }
}
