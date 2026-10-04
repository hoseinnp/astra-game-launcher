import type { Game } from '../types/game';

export interface OracleIntelTopic {
  id: string;
  category: 'bosses' | 'builds' | 'hints' | 'lore' | 'secrets';
  title: string;
  badge: string;
  summary: string;
  details: string[];
  tags: string[];
}

export interface GameOracleProfile {
  universe: string;
  tagline: string;
  intel: OracleIntelTopic[];
}

/**
 * Built-in lore, tactical hints, boss weaknesses & character progression
 * tailored to game universes without spoiling end-game revelations.
 */
const GAME_ORACLE_DATABASE: Record<string, GameOracleProfile> = {
  'cyberpunk': {
    universe: 'Night City / 2077',
    tagline: 'Cyberware tuning, Sandevistan mastery, and street syndicate intel.',
    intel: [
      {
        id: 'cp-boss-smasher',
        category: 'bosses',
        title: 'Adam Smasher Combat Tactics',
        badge: 'Boss Weakness',
        summary: 'Heavy frontal armor with vulnerable missile launcher pack on right shoulder and EMP vulnerability.',
        details: [
          'Use high-tier EMP grenades or Short Circuit quickhacks to overload his cyberware.',
          'Target the missile launcher on his shoulder early to disable his devastating area-of-effect barrage.',
          'Maintain high lateral mobility using Dash / Air Dash; do not engage in prolonged stationary slugfests.'
        ],
        tags: ['Adam Smasher', 'Short Circuit', 'EMP', 'Heavy Cyberware']
      },
      {
        id: 'cp-build-netrunner',
        category: 'builds',
        title: 'Stealth Overclock Netrunner Build',
        badge: 'Meta Build',
        summary: 'Chain memory wipes, synapse burnouts, and contagion loops from the shadows.',
        details: [
          'Prioritize Intelligence (20) and Technical Ability (20) for maximum RAM regeneration and cyberware capacity.',
          'Equip the Tetratronic Rippler or Militech Paraline cyberdeck with Tier 5 Memory Wipe.',
          'Memory Wipe + Reboot Optics + Sonic Shock completely pacifies targets without alerting nearby enemies.'
        ],
        tags: ['Netrunner', 'Quickhacks', 'Overclock', 'Ghost']
      },
      {
        id: 'cp-hints-secrets',
        category: 'secrets',
        title: 'Hidden Rayfield Caliburn Supercar',
        badge: 'Free Vehicle',
        summary: 'Acquire the fastest vehicle in Night City for free inside an abandoned Badlands mining tunnel.',
        details: [
          'Complete the "Ghost Town" mission with Panam Palmer first.',
          'Return to the cave tunnel north of Sunset Motel after 48 in-game hours.',
          'Inside the shipping container sits an unowned matte-black Rayfield Caliburn ready to drive away.'
        ],
        tags: ['Badlands', 'Free Car', 'Rayfield', 'Speed']
      },
      {
        id: 'cp-lore-blackwall',
        category: 'lore',
        title: 'The Blackwall & Rogue AIs',
        badge: 'Deep Lore',
        summary: 'The digital defense perimeter erected by NetWatch to quarantine apocalyptic pre-Crash rogue intelligences.',
        details: [
          'Created following the DataKrash triggered by legendary netrunner Rache Bartmoss in 2022.',
          'The Blackwall is not a firewall; it is an AI itself, continuously waging an invisible war against alien intelligences.',
          'Breaching the Blackwall causes immediate neural liquefaction unless protected by military-grade Cynosure dampeners.'
        ],
        tags: ['NetWatch', 'Bartmoss', 'Blackwall', 'Alt Cunningham']
      }
    ]
  },
  'witcher': {
    universe: 'The Continent',
    tagline: 'Witcher signs, silver sword oils, alchemy toxicity, and bestiary wisdom.',
    intel: [
      {
        id: 'tw-boss-toad',
        category: 'bosses',
        title: 'Toad Prince / Giant Frog Tactics',
        badge: 'Monster Weakness',
        summary: 'Extremely resilient to basic strikes; highly vulnerable to Northern Wind freeze and Golden Oriole.',
        details: [
          'Drink Superior Golden Oriole potion before engaging: his poison spit heals you instead of dealing damage.',
          'Throw Northern Wind bombs to freeze him in place, then execute heavy rend attacks on his flank.',
          'Keep Quen active constantly to absorb sudden tongue lash attacks.'
        ],
        tags: ['Northern Wind', 'Golden Oriole', 'Quen', 'Oxfurt Sewers']
      },
      {
        id: 'tw-build-euphoria',
        category: 'builds',
        title: 'Euphoria Alchemy-Combat Hybrid',
        badge: 'Top Tier Build',
        summary: 'Maximizes toxicity thresholds to boost sword attack power up to +220%.',
        details: [
          'Acquired via the Blood & Wine mutation laboratory.',
          'Equip Acquired Tolerance and Heightened Tolerance to consume 3-4 decoctions simultaneously (Ekimmara + Water Hag).',
          'Pair with Grandmaster Ursine or Feline Witcher gear for immense single-hit damage.'
        ],
        tags: ['Decoctions', 'Euphoria', 'Grandmaster Gear', 'Aerondight']
      },
      {
        id: 'tw-hints-places-of-power',
        category: 'hints',
        title: 'Places of Power Priority in White Orchard',
        badge: 'Early Boost',
        summary: 'Gain 5 free ability points and temporary sign buffs before traveling to Velen.',
        details: [
          'White Orchard contains 5 distinct Places of Power (one for each sign: Aard, Igni, Yrden, Quen, Axii).',
          'Draw power from all 5 before finishing the prologue to kickstart essential tier-1 combat perks.'
        ],
        tags: ['White Orchard', 'Ability Points', 'Early Game']
      },
      {
        id: 'tw-lore-conjunction',
        category: 'lore',
        title: 'Conjunction of the Spheres',
        badge: 'Origin Lore',
        summary: 'The cataclysm 1,500 years ago that fused distinct parallel realities and brought monsters and magic.',
        details: [
          'Humans and monsters arrived simultaneously from distant dimensions, displacing the native Elves and Dwarves.',
          'Chaos magic seeped into the atmosphere, requiring the creation of the first Witchers at Kaer Morhen.'
        ],
        tags: ['Conjunction', 'Chaos Magic', 'Kaer Morhen', 'Elder Blood']
      }
    ]
  },
  'elden': {
    universe: 'The Lands Between',
    tagline: 'Grace route guidance, poise breaks, sacred tears, and demigod counterplay.',
    intel: [
      {
        id: 'er-boss-malenia',
        category: 'bosses',
        title: 'Malenia, Blade of Miquella',
        badge: 'Demigod Weakness',
        summary: 'Weak to Frostbite, Bleed, and heavy poise breaks; Waterfowl Dance counter strategies.',
        details: [
          'Throw Freezing Pots when she leaps up for Waterfowl Dance to interrupt her cast completely.',
          'She heals on hit even through shields; focus on light rolls, bloodhound step, or parries.',
          'Bleed and Frostbite proc easily and briefly interrupt her hyper-armor animations.'
        ],
        tags: ['Waterfowl Dance', 'Freezing Pot', 'Bleed', 'Haligtree']
      },
      {
        id: 'er-build-bleed',
        category: 'builds',
        title: 'Rivers of Blood / Arcane Occultist',
        badge: 'High DPS Build',
        summary: 'Rapid hemorrhage procs combined with Lord of Blood\'s Exultation and White Mask.',
        details: [
          'Stack Arcane to 60+ to scale both bleed buildup rate and Occult weapon damage.',
          'Talisman setup: Lord of Blood\'s Exultation, Rotten Winged Sword Insignia, Shard of Alexander, Dragoncrest Greatshield.'
        ],
        tags: ['Arcane', 'Hemorrhage', 'White Mask', 'Alexander Shard']
      },
      {
        id: 'er-hints-bell-bearings',
        category: 'secrets',
        title: 'Miner\'s Bell Bearings for Infinite Smithing Stones',
        badge: 'Essential Secret',
        summary: 'Unlock infinite upgrade stones at the Twin Maiden Husks in Roundtable Hold.',
        details: [
          'Tier 1 & 2: Raya Lucaria Crystal Tunnel (Liurnia).',
          'Tier 3 & 4: Sealed Tunnel (Altus Plateau).',
          'Somber Bell Bearings 1-5 allow infinite +9 unique weapon upgrades before entering Crumbling Farum Azula.'
        ],
        tags: ['Smithing Stones', 'Twin Maiden', 'Roundtable', 'Upgrades']
      },
      {
        id: 'er-lore-shattering',
        category: 'lore',
        title: 'The Night of the Black Knives & The Shattering',
        badge: 'Origin Lore',
        summary: 'How Godwyn the Golden fell and the Greater Will fractured across the demigod civil war.',
        details: [
          'Ranni the Witch stole a fragment of the Rune of Death from Maliketh to slay her Empyrean flesh.',
          'Queen Marika shattered the Elden Ring, prompting Radagon to attempt repair and triggering the great stalemate.'
        ],
        tags: ['Ranni', 'Godwyn', 'Destined Death', 'Greater Will']
      }
    ]
  },
  'souls': {
    universe: 'Age of Fire',
    tagline: 'Parry timings, estus flask shards, stamina pacing, and flame lore.',
    intel: [
      {
        id: 'ds-boss-nameless',
        category: 'bosses',
        title: 'Nameless King Phase Tactics',
        badge: 'Boss Strategy',
        summary: 'Lightning Stormdrake phase requires lightning weapon, while the King himself is weak to Dark & Fire.',
        details: [
          'Phase 1: Do not lock onto the dragon\'s head; hit its beak when it recovers from attacks.',
          'Phase 2: Nameless King attacks have delayed swings; roll on impact rather than during his windup.',
          'Equip Thunder Stoneplate Ring to survive his lingering shockwave strikes.'
        ],
        tags: ['Archdragon Peak', 'Dark Damage', 'Delayed Swings', 'Estus']
      },
      {
        id: 'ds-build-pyromancy',
        category: 'builds',
        title: 'Chaos Fire & Dark Pyromancer',
        badge: 'Spellcaster Build',
        summary: 'Dual Int/Faith scaling providing tremendous burst damage and ranged safety.',
        details: [
          'Level Intelligence and Faith equally up to 40/40.',
          'Spells: Chaos Bed Vestiges for mob clearing, Black Fire Orb for high stagger on fire-resistant bosses.',
          'Equip Witch\'s Ring, Great Swamp Ring, and Fire Clutch Ring.'
        ],
        tags: ['Chaos Bed', 'Dark Pyromancy', '40/40 Scaling']
      },
      {
        id: 'ds-lore-first-flame',
        category: 'lore',
        title: 'The Fading First Flame',
        badge: 'Mythology',
        summary: 'Disparity between Light and Dark, and Lord Gwyn\'s desperate self-sacrifice to prolong his era.',
        details: [
          'Before Fire, the world was unformed, shrouded by fog, ruled by Archtrees and Everlasting Dragons.',
          'Gwyn linked the flame, committing the First Sin and cursing humanity with the Darksign of undeath.'
        ],
        tags: ['Lord Gwyn', 'Darksign', 'First Sin', 'Kiln']
      }
    ]
  },
  'generic': {
    universe: 'Universal Astra Field Guide',
    tagline: 'Tactical combat theory, resource conservation, and optimal progression habits.',
    intel: [
      {
        id: 'gen-combat-pacing',
        category: 'bosses',
        title: 'Encounter Pacing & Threat Neutralization',
        badge: 'Tactical Rule',
        summary: 'Break combat down into priority target elimination and defensive stamina management.',
        details: [
          'Eliminate ranged snipers, healers, and status-inflicting adds before focusing large single-target bosses.',
          'Always preserve at least 15-20% of your stamina / evasion pool for emergency retreats; never exhaust your meter.',
          'Learn recovery frames: strike during the boss cooldown window rather than greedily trading hits.'
        ],
        tags: ['Pacing', 'Target Priority', 'Stamina Safety']
      },
      {
        id: 'gen-build-synergy',
        category: 'builds',
        title: 'Stat Focus & Diminishing Returns',
        badge: 'Build Theory',
        summary: 'Specialization consistently outperforms jack-of-all-trades builds in modern RPG architectures.',
        details: [
          'Identify your primary damage scaling attribute and soft caps before spreading points into secondary stats.',
          'Stack multiplicative damage multipliers (elemental vulnerability + critical boost + position bonuses).',
          'Equip gear that complements your playstyle loop rather than chasing individual stat numbers.'
        ],
        tags: ['Soft Caps', 'Multipliers', 'Specialization']
      },
      {
        id: 'gen-secrets-explorer',
        category: 'hints',
        title: 'Non-Destructive Exploration Habit',
        badge: 'Progression Hint',
        summary: 'Explore secondary hallways before triggering obvious story cutscenes or elevator checkpoints.',
        details: [
          'If a hallway looks like the main objective, turn around and inspect the opposite branch first for chests and collectibles.',
          'Revisit starter zones after acquiring new mobility abilities (double jump, air dash, master key locks).',
          'Keep frequent manual save snapshots before entering ominous, wide-open courtyards.'
        ],
        tags: ['Secret Rooms', 'Backtracking', 'Checkpoints']
      },
      {
        id: 'gen-lore-reading',
        category: 'lore',
        title: 'Environmental World-Building & Lore Digestion',
        badge: 'Immersion',
        summary: 'How to piece together developer story intent through item descriptions and scenic architecture.',
        details: [
          'Read flavor text on rare artifacts, journal pickups, and quest items; authors hide crucial world history there.',
          'Observe architectural destruction and enemy placement: corpses and broken banners tell the story of past battles.'
        ],
        tags: ['Flavor Text', 'Environmental Story', 'Atmosphere']
      }
    ]
  }
};

export class OracleStrategyService {
  /**
   * Resolves the most accurate tactical oracle profile for a given game.
   */
  public static getProfileForGame(game: Game): GameOracleProfile {
    const titleLower = (game.title || '').toLowerCase();
    const tags = (game.tags || []).map(t => t.toLowerCase());
    const genres = (game.genres || []).map(g => g.toLowerCase());

    if (titleLower.includes('cyberpunk') || tags.includes('cyberpunk')) {
      return GAME_ORACLE_DATABASE['cyberpunk'];
    }
    if (titleLower.includes('witcher') || titleLower.includes('geralt')) {
      return GAME_ORACLE_DATABASE['witcher'];
    }
    if (titleLower.includes('elden ring') || titleLower.includes('elden')) {
      return GAME_ORACLE_DATABASE['elden'];
    }
    if (titleLower.includes('dark souls') || titleLower.includes('souls') || titleLower.includes('bloodborne') || titleLower.includes('demon')) {
      return GAME_ORACLE_DATABASE['souls'];
    }

    // Customized dynamic profile based on game genre
    const genreText = genres.length > 0 ? genres.slice(0, 2).join(' / ') : 'Action RPG';
    
    return {
      universe: `${game.title} Tactical Database`,
      tagline: `Astra Oracle strategic dossier tuned for ${genreText} operations.`,
      intel: [
        {
          id: `custom-boss-${game.id}`,
          category: 'bosses',
          title: `Combat & Boss Encounter Strategy for ${game.title}`,
          badge: 'Combat Protocol',
          summary: `Maintain aggressive positioning while observing pattern telltales in ${game.title}.`,
          details: [
            'Track telegraph animations: heavy attacks often have a distinct audio or visual windup flash.',
            'Maintain resource reserves (ammunition, stamina, mana) for emergency defensive repositioning.',
            'Use elemental or status vulnerabilities whenever encountering elite adversaries.'
          ],
          tags: [game.title, 'Tactics', 'Survival']
        },
        {
          id: `custom-build-${game.id}`,
          category: 'builds',
          title: `Character Optimization & Equipment Synergy`,
          badge: 'Meta Setup',
          summary: `Synergize perks and loadouts tailored to ${genres[0] || 'core mechanics'}.`,
          details: [
            'Prioritize core utility skills before maxing out niche conditional perks.',
            'Inspect gear set bonuses to activate multiplicative tier effects.',
            'Keep weight or agility ratios balanced to maintain high evasion speed.'
          ],
          tags: ['Loadout', 'Synergy', 'Perks']
        },
        {
          id: `custom-hints-${game.id}`,
          category: 'hints',
          title: `Spoiler-Free Progression Tips`,
          badge: 'Field Wisdom',
          summary: `Optimal roadmap hints to maximize your journey through ${game.title}.`,
          details: [
            'Check map borders and hidden paths behind waterfalls or destructible walls.',
            'Upgrade your main weapons early; base damage scaling yields higher immediate returns than raw stat leveling.',
            'Talk to NPCs multiple times until their dialogue repeats to avoid missing optional quests.'
          ],
          tags: ['Exploration', 'Checklist', 'Secrets']
        },
        {
          id: `custom-lore-${game.id}`,
          category: 'lore',
          title: `${game.title} World Lore & Setting`,
          badge: 'Universe Brief',
          summary: game.description ? game.description.slice(0, 160) + '...' : `Immerse yourself into the deep atmospheric universe of ${game.title}.`,
          details: [
            game.metadata?.developer ? `Developed by ${game.metadata.developer} with rich worldbuilding.` : `Expansive game world with distinct factions and lore.`,
            game.metadata?.releaseDate ? `First entered the gaming sphere on ${game.metadata.releaseDate}.` : `A landmark title in its genre.`,
            'Inspect collectibles and side stories to uncover the deeper truths of this setting.'
          ],
          tags: [game.title, 'Worldbuilding', 'Immersion']
        }
      ]
    };
  }
}
