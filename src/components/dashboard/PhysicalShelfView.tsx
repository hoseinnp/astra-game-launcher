import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Play, Disc, BookOpen, Layers, X, RotateCw, Star, Eye,
  ZoomIn, ZoomOut, Wind, Compass, Sparkles, FileText
} from 'lucide-react';
import type { Game } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { hapticsService } from '../../services/hapticsService';
import { GameCover } from '../GameCover';

interface PhysicalShelfViewProps {
  games: Game[];
  selectedGameIndex: number;
  onSelectGame: (index: number) => void;
  onLaunchGame: (game: Game) => void;
  onOpenOverview?: (game: Game) => void;
  onOpenMods?: (game: Game) => void;
}

export type ShelfMaterial = 'walnut' | 'smoked-glass' | 'cyber-neon';
export type PhysicalMediaFormat = 'retro-cartridge' | 'ps1-jewel-case' | 'dvd-keep-case' | 'modern-blu-ray';

/**
 * Intelligent format detection:
 * Detects whether an item is a vintage ROM cartridge, PS1 jewel case, 2000s DVD keep case, or modern Blu-ray.
 */
function detectPhysicalMediaFormat(game: Game): PhysicalMediaFormat {
  if (!game) return 'modern-blu-ray';
  const titleLower = game.title.toLowerCase();
  const allTags = [...(game.genres || []), ...(game.tags || [])].map((t) => t.toLowerCase());

  // 1. Explicit emulator or retro console types
  if (
    game.type === 'emulator' ||
    allTags.some((t) =>
      ['retro', 'arcade', 'snes', 'nes', 'n64', 'genesis', 'megadrive', 'gba', 'gb', 'gameboy', 'game boy', 'atari', 'famicom'].includes(t)
    ) ||
    titleLower.includes('super mario') ||
    titleLower.includes('zelda') ||
    titleLower.includes('pokemon') ||
    titleLower.includes('pokémon') ||
    titleLower.includes('metroid') ||
    titleLower.includes('castlevania') ||
    titleLower.includes('sonic the hedgehog') ||
    titleLower.includes('chrono trigger') ||
    titleLower.includes('donkey kong') ||
    titleLower.includes('doom (1993)')
  ) {
    return 'retro-cartridge';
  }

  // 2. 90s CD-ROM / PS1 era (Release year < 2001 or PS1 / Sega Saturn tags)
  const yearMatch = game.metadata?.releaseDate ? parseInt(game.metadata.releaseDate.slice(0, 4), 10) : NaN;
  if (
    (!isNaN(yearMatch) && yearMatch < 2001) ||
    allTags.some((t) => ['ps1', 'psx', 'playstation 1', 'saturn', 'dreamcast', 'dos', 'pc-98', 'cd-rom'].includes(t)) ||
    titleLower.includes('resident evil (1996)') ||
    titleLower.includes('resident evil 2 (1998)') ||
    titleLower.includes('resident evil 3 (1999)') ||
    titleLower.includes('silent hill (1999)') ||
    titleLower.includes('metal gear solid (1998)') ||
    titleLower.includes('crash bandicoot') ||
    titleLower.includes('spyro')
  ) {
    return 'ps1-jewel-case';
  }

  // 3. PS2 / DVD era (2001 to 2012)
  if (
    (!isNaN(yearMatch) && yearMatch >= 2001 && yearMatch < 2013) ||
    allTags.some((t) => ['ps2', 'playstation 2', 'gamecube', 'xbox classic', 'ps3', 'xbox 360'].includes(t)) ||
    titleLower.includes('resident evil 4') ||
    titleLower.includes('silent hill 2') ||
    titleLower.includes('devil may cry') ||
    titleLower.includes('god of war') ||
    titleLower.includes('halo')
  ) {
    return 'dvd-keep-case';
  }

  // 4. Default: Modern Blu-ray case (PS4/PS5/PC)
  return 'modern-blu-ray';
}

/**
 * Calculates accumulated vintage dust level (0.0 = pristine clean, 1.0 = thick archive dust)
 * Games accumulate dust if they haven't been played in a while.
 */
function calculateGameDust(game: Game, cleanedGameIds: Set<string>): number {
  if (cleanedGameIds.has(game.id)) return 0;

  // Games that have never been played are considered "new" or "mint in box", so no dust yet.
  if (!game.stats?.lastPlayed || game.stats?.playCount === 0) {
    return 0.0;
  }

  const lastPlayedTime = new Date(game.stats?.lastPlayed).getTime();
  if (isNaN(lastPlayedTime)) return 0.0;

  const daysSincePlayed = (Date.now() - lastPlayedTime) / (1000 * 60 * 60 * 24);

  // Played recently (under 4 days): pristine clean
  if (daysSincePlayed < 4) return 0;
  // 4 - 10 days: light dust motes
  if (daysSincePlayed < 10) return 0.35;
  // 10 - 25 days: noticeable dust film
  if (daysSincePlayed < 25) return 0.65;
  // 25+ days: thick vintage archive dust
  return 0.95;
}

export const PhysicalShelfView: React.FC<PhysicalShelfViewProps> = ({
  games,
  selectedGameIndex,
  onSelectGame,
  onLaunchGame,
  onOpenOverview,
  onOpenMods
}) => {
  const [shelfMaterial, setShelfMaterial] = useState<ShelfMaterial>('walnut');
  const [activeCollection, setActiveCollection] = useState<string>('all');
  const [hoveredGameId, setHoveredGameId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dusted / cleaned games tracking (persisted to localStorage)
  const [cleanedGames, setCleanedGames] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('astra_dusted_games');
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  });

  const markGameCleaned = useCallback((gameId: string) => {
    setCleanedGames((prev) => {
      const next = new Set(prev);
      next.add(gameId);
      try {
        localStorage.setItem('astra_dusted_games', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, []);

  // 3D Resident Evil Style Inspector State
  const [inspectingGame, setInspectingGame] = useState<Game | null>(null);
  const [isCaseOpened, setIsCaseOpened] = useState<boolean>(false);
  const [isDiscExtracted, setIsDiscExtracted] = useState<boolean>(false);
  const [discRotation, setDiscRotation] = useState<{ x: number; y: number }>({ x: 12, y: -25 });
  const [boxRotation, setBoxRotation] = useState<{ x: number; y: number }>({ x: 8, y: -20 });
  const [zoom, setZoom] = useState<number>(1.0);
  const [isExaminingClue, setIsExaminingClue] = useState<boolean>(false);
  const [isBlowingDust, setIsBlowingDust] = useState<boolean>(false);
  const [dustNotification, setDustNotification] = useState<string | null>(null);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const activeFormat = useMemo(() => {
    return inspectingGame ? detectPhysicalMediaFormat(inspectingGame) : 'modern-blu-ray';
  }, [inspectingGame]);

  const inspectingDust = useMemo(() => {
    if (!inspectingGame) return 0;
    return calculateGameDust(inspectingGame, cleanedGames);
  }, [inspectingGame, cleanedGames]);

  // Filter games by collection and search query
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      
      if (activeCollection === 'all') return true;
      if (activeCollection === 'favorites') return g.favorite;
      return g.collection === activeCollection;
    });
  }, [games, activeCollection, searchQuery]);

  // Organize games into shelf tiers (6 items per shelf)
  const itemsPerTier = 6;
  const tiers = useMemo(() => {
    const rows: Game[][] = [];
    for (let i = 0; i < filteredGames.length; i += itemsPerTier) {
      rows.push(filteredGames.slice(i, i + itemsPerTier));
    }
    return rows;
  }, [filteredGames]);

  // Handle Box Inspection
  const handleInspectGame = useCallback((game: Game) => {
    audioEngine.playCaseClick();
    setInspectingGame(game);
    setIsCaseOpened(false);
    setIsDiscExtracted(false);
    setIsExaminingClue(false);
    setBoxRotation({ x: 6, y: -18 });
    setDiscRotation({ x: 14, y: -28 });
    setZoom(1.0);
  }, []);

  const handleToggleCaseOpen = useCallback(() => {
    audioEngine.playCaseClick();
    hapticsService.trigger('light-tick');
    setIsCaseOpened((prev) => {
      const next = !prev;
      if (!next) setIsDiscExtracted(false);
      return next;
    });
  }, []);

  const handleToggleExtractDisc = useCallback(() => {
    audioEngine.playDiscSpin();
    hapticsService.trigger('confirm');
    setIsDiscExtracted((prev) => !prev);
    setDiscRotation({ x: 12, y: -25 });
  }, []);

  const handleLaunchFromInspector = useCallback(() => {
    if (!inspectingGame) return;
    markGameCleaned(inspectingGame.id);
    if (activeFormat === 'retro-cartridge') {
      audioEngine.playCartridgeInsert();
      hapticsService.trigger('cartridge-clunk');
    } else {
      audioEngine.playDiscSpin();
      hapticsService.trigger('confirm');
    }
    onLaunchGame(inspectingGame);
    setInspectingGame(null);
  }, [inspectingGame, activeFormat, onLaunchGame, markGameCleaned]);

  const handleFlip180 = useCallback(() => {
    audioEngine.playSelect();
    hapticsService.trigger('light-tick');
    if (isDiscExtracted) {
      setDiscRotation((prev) => ({
        ...prev,
        y: prev.y + 180
      }));
    } else {
      setBoxRotation((prev) => ({
        ...prev,
        y: prev.y + 180
      }));
    }
  }, [isDiscExtracted]);

  // Blow Dust off Cartridge OR Disc
  const handleBlowDust = useCallback(() => {
    if (isBlowingDust || !inspectingGame) return;
    audioEngine.playCartridgeBlow();
    hapticsService.trigger('blow-dust-ripple');
    setIsBlowingDust(true);

    const isCart = activeFormat === 'retro-cartridge';
    const msg = isCart
      ? '💨 Whoooosh! Connector pins & cartridge cleared of vintage dust.'
      : '💨 Whoooosh! Optical disc surface buffed & cleared of dust.';

    setDustNotification(msg);
    markGameCleaned(inspectingGame.id);

    // After air gust, play satisfying clean gleam shine
    setTimeout(() => {
      audioEngine.playHover();
    }, 450);

    setTimeout(() => {
      setIsBlowingDust(false);
    }, 900);

    setTimeout(() => {
      setDustNotification(null);
    }, 3500);
  }, [isBlowingDust, inspectingGame, activeFormat, markGameCleaned]);

  const handleToggleExamineClue = useCallback(() => {
    audioEngine.playInspectClue();
    setIsExaminingClue((prev) => !prev);
  }, []);

  // 3D Drag to Rotate Inspector logic
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    if (isDiscExtracted) {
      setDiscRotation((prev) => ({
        x: Math.max(-80, Math.min(80, prev.x - dy * 0.45)),
        y: prev.y + dx * 0.55
      }));
    } else {
      setBoxRotation((prev) => ({
        x: Math.max(-75, Math.min(75, prev.x - dy * 0.45)),
        y: prev.y + dx * 0.55
      }));
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    setZoom((prev) => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      return Math.max(0.8, Math.min(1.6, Math.round((prev + delta) * 10) / 10));
    });
  };

  // Ensure drag state is released even if cursor leaves window
  useEffect(() => {
    if (!inspectingGame) return;
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [inspectingGame]);

  // Keyboard navigation & Resident Evil item inspection shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (inspectingGame) {
        if (e.key === 'Escape') {
          audioEngine.playSelect();
          if (isExaminingClue) {
            setIsExaminingClue(false);
          } else {
            setInspectingGame(null);
          }
        } else if (e.key === ' ') {
          e.preventDefault();
          if (activeFormat === 'retro-cartridge') {
            handleFlip180();
          } else {
            handleToggleCaseOpen();
          }
        } else if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          handleFlip180();
        } else if (e.key.toLowerCase() === 'd' && activeFormat !== 'retro-cartridge' && isCaseOpened) {
          e.preventDefault();
          handleToggleExtractDisc();
        } else if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          handleBlowDust();
        } else if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          handleToggleExamineClue();
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          setZoom((z) => Math.min(1.6, z + 0.1));
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          setZoom((z) => Math.max(0.8, z - 0.1));
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          setBoxRotation({ x: 6, y: -18 });
          setDiscRotation({ x: 12, y: -25 });
          setZoom(1.0);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleLaunchFromInspector();
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        const next = Math.min(selectedGameIndex + 1, games.length - 1);
        if (next !== selectedGameIndex) {
          audioEngine.playShelfSlide();
          onSelectGame(next);
        }
      } else if (e.key === 'ArrowLeft') {
        const prev = Math.max(selectedGameIndex - 1, 0);
        if (prev !== selectedGameIndex) {
          audioEngine.playShelfSlide();
          onSelectGame(prev);
        }
      } else if (e.key === 'Enter') {
        const active = games[selectedGameIndex];
        if (active) handleInspectGame(active);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    inspectingGame, selectedGameIndex, games, isCaseOpened, isDiscExtracted,
    isExaminingClue, activeFormat, inspectingDust, onSelectGame, handleFlip180,
    handleLaunchFromInspector, handleBlowDust, handleToggleCaseOpen,
    handleToggleExtractDisc, handleToggleExamineClue, handleInspectGame
  ]);

  // Shelf styling presets
  const shelfStyles = useMemo(() => {
    switch (shelfMaterial) {
      case 'smoked-glass':
        return {
          plankBg: 'bg-white/10 backdrop-blur-md border-t border-b border-white/20 shadow-[0_15px_30px_rgba(0,0,0,0.8)]',
          lipBg: 'bg-white/15 border-t border-white/30',
          ledColor: 'rgba(0, 240, 255, 0.45)',
          backwall: 'bg-gradient-to-b from-[#080d18] via-[#050810] to-[#020408]'
        };
      case 'cyber-neon':
        return {
          plankBg: 'bg-black/85 border-t border-b border-[var(--game-accent,#2ee5ba)]/40 shadow-[0_15px_35px_rgba(0,0,0,0.9)]',
          lipBg: 'bg-[var(--game-accent,#2ee5ba)]/20 border-t border-[var(--game-accent,#2ee5ba)]/60',
          ledColor: 'var(--game-accent,#2ee5ba)',
          backwall: 'bg-gradient-to-b from-[#060e14] via-[#02070a] to-[#010304]'
        };
      case 'walnut':
      default:
        return {
          plankBg: 'bg-gradient-to-b from-[#2b1810] to-[#170c08] border-t border-[#4a2b1c] shadow-[0_18px_35px_rgba(0,0,0,0.9)]',
          lipBg: 'bg-[#3b2014] border-t border-[#5c3420]',
          ledColor: 'rgba(245, 158, 11, 0.35)',
          backwall: 'bg-gradient-to-b from-[#140b07] via-[#0c0604] to-[#050302]'
        };
    }
  }, [shelfMaterial]);

  // Renders the appropriate card on the shelf according to physical media format & dust level
  const renderShelfItem = (game: Game, isHovered: boolean, isSelected: boolean) => {
    const format = detectPhysicalMediaFormat(game);
    const dustLevel = calculateGameDust(game, cleanedGames);
    const selectedClass = isSelected ? 'ring-2 ring-[var(--game-accent,#2ee5ba)] shadow-[0_0_20px_var(--game-glow)]' : '';

    if (format === 'retro-cartridge') {
      return (
        <div className={`relative w-[145px] h-[190px] rounded-t-xl rounded-b-sm shadow-2xl overflow-hidden border border-zinc-700/80 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 select-none ${selectedClass}`}>
          {/* Top Cartridge Grip Notches & Label */}
          <div className="h-6 bg-zinc-950 flex items-center justify-between px-2 border-b border-zinc-700">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 inline-block" />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 inline-block" />
            </div>
            <span className="text-[8px] font-black tracking-widest text-amber-300 uppercase font-mono">
              RETRO ROM
            </span>
          </div>

          {/* Front Cartridge Label Art with Gloss Finish */}
          <div className="p-2 h-[142px]">
            <div className="relative w-full h-full rounded-md overflow-hidden border border-white/20 shadow-inner bg-black">
              <GameCover
                src={game.coverUrl}
                title={game.title}
                accent={game.theme?.accentColor}
                className="w-full h-full object-cover select-none filter contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 inset-x-0 bg-black/85 backdrop-blur-xs py-0.5 px-1.5 text-[8px] font-bold text-white truncate font-mono">
                {game.title}
              </div>
            </div>
          </div>

          {/* Bottom Exposed Gold Connector Pins Lip */}
          <div className="absolute bottom-0 inset-x-0 h-4 bg-zinc-950 border-t border-zinc-700 flex items-center justify-center px-3">
            <div
              className="w-full h-2 rounded-xs opacity-75"
              style={{
                background: 'repeating-linear-gradient(90deg, #d97706 0px, #d97706 3px, #000 3px, #000 5px)'
              }}
            />
          </div>

          {/* Dusty Patina Film on Shelf if Neglected */}
          {dustLevel > 0.4 && (
            <div
              className="absolute inset-0 pointer-events-none rounded-t-xl rounded-b-sm z-20 transition-opacity"
              style={{
                background: 'linear-gradient(180deg, rgba(220, 210, 195, 0.35) 0%, rgba(180, 170, 155, 0.15) 30%, transparent 70%)'
              }}
              title="Forgotten vintage cartridge (accumulated dust)"
            />
          )}
        </div>
      );
    }

    if (format === 'ps1-jewel-case') {
      return (
        <div className={`relative w-[150px] h-[165px] rounded-xs shadow-2xl overflow-hidden border border-white/30 bg-zinc-950/90 select-none ${selectedClass}`}>
          {/* Left Ribbed Black Spine */}
          <div
            className="absolute inset-y-0 left-0 w-3 border-r border-white/20 z-20"
            style={{
              background: 'repeating-linear-gradient(180deg, #18181b 0px, #18181b 3px, #27272a 3px, #27272a 6px)'
            }}
          />
          {/* Top Clear Header */}
          <div className="absolute top-0 inset-x-0 h-5 bg-gradient-to-r from-zinc-900/90 to-black/80 flex items-center justify-between px-2 pl-4 z-10 border-b border-white/10">
            <span className="text-[7.5px] font-black tracking-widest text-sky-300 uppercase font-mono">
              COMPACT DISC
            </span>
            <Disc className={`w-2.5 h-2.5 text-white ${isHovered ? 'animate-spin' : ''}`} />
          </div>
          {/* Cover Art */}
          <GameCover
            src={game.coverUrl}
            title={game.title}
            accent={game.theme?.accentColor}
            className="w-full h-full object-cover pl-3 pt-5 select-none"
          />
          {/* Acrylic Glass Specular Reflection */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none opacity-50" />

          {dustLevel > 0.4 && (
            <div
              className="absolute top-0 inset-x-0 h-4 pointer-events-none z-20"
              style={{
                background: 'linear-gradient(180deg, rgba(220, 210, 195, 0.4) 0%, transparent 100%)'
              }}
            />
          )}
        </div>
      );
    }

    if (format === 'dvd-keep-case') {
      return (
        <div className={`relative w-[150px] h-[215px] rounded-r-md rounded-l-xs shadow-2xl overflow-hidden border border-zinc-700 bg-zinc-950 select-none ${selectedClass}`}>
          <div className="absolute top-0 inset-x-0 h-6 bg-black flex items-center justify-between px-2 z-20 border-b border-zinc-800">
            <span className="text-[8px] font-black tracking-widest text-zinc-300 uppercase font-mono">
              DVD-ROM
            </span>
            <span className="text-[8px] font-bold text-emerald-400 font-mono">CLASSIC</span>
          </div>
          <GameCover
            src={game.coverUrl}
            title={game.title}
            accent={game.theme?.accentColor}
            className="w-full h-full object-cover pt-5 select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none opacity-40" />

          {dustLevel > 0.4 && (
            <div
              className="absolute top-0 inset-x-0 h-4 pointer-events-none z-20"
              style={{
                background: 'linear-gradient(180deg, rgba(220, 210, 195, 0.35) 0%, transparent 100%)'
              }}
            />
          )}
        </div>
      );
    }

    // Default: Modern Blu-ray case
    return (
      <div className={`relative w-[150px] h-[215px] rounded-r-md rounded-l-sm shadow-2xl overflow-hidden border border-white/20 bg-zinc-900 select-none ${selectedClass}`}>
        {/* Top Retail Blue Bar */}
        <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-r from-blue-700 via-sky-600 to-blue-700 flex items-center justify-between px-2 z-20 shadow-md">
          <div className="flex items-center gap-1 text-[8px] font-black tracking-widest text-white uppercase">
            <Disc className={`w-2.5 h-2.5 text-white ${isHovered ? 'animate-spin' : ''}`} />
            <span>ASTRA ARCHIVE</span>
          </div>
          <span className="text-[8px] font-bold text-white/90 uppercase font-mono">
            {game.type === 'steam' ? 'STEAM' : 'DISC'}
          </span>
        </div>
        <GameCover
          src={game.coverUrl}
          title={game.title}
          accent={game.theme?.accentColor}
          className="w-full h-full object-cover pt-5 select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity" />
        <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none z-10" />

        {dustLevel > 0.4 && (
          <div
            className="absolute top-0 inset-x-0 h-4 pointer-events-none z-20"
            style={{
              background: 'linear-gradient(180deg, rgba(220, 210, 195, 0.35) 0%, transparent 100%)'
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div className={`relative flex-1 flex flex-col h-full overflow-hidden select-none transition-colors duration-700 min-w-0 ${shelfStyles.backwall}`}>
      {/* Top Shelf Controls Bar */}
      <div className="z-30 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md flex-wrap gap-2 min-w-0">
        {/* Left: Collection Filter Chips */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar max-w-full flex-nowrap py-1">
          {[
            { id: 'all', label: 'All Titles', count: games.length },
            { id: 'playing', label: 'Now Playing', count: games.filter((g) => g.collection === 'playing').length },
            { id: 'backlog', label: 'Backlog', count: games.filter((g) => g.collection === 'backlog').length },
            { id: 'completed', label: 'Completed', count: games.filter((g) => g.collection === 'completed').length },
            { id: 'favorites', label: 'Favorites', count: games.filter((g) => g.favorite).length }
          ].map((tab) => {
            const active = activeCollection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  audioEngine.playSelect();
                  setActiveCollection(tab.id);
                }}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0 ${
                  active
                    ? 'bg-white/20 text-white border border-white/30 shadow-md'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-white/70">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Search & Shelf Material Texture Selector */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="relative">
            <input
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[var(--game-accent)] focus:bg-white/10 transition-colors w-32 sm:w-40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 text-xs">
            <span className="text-white/40 text-[11px] font-mono mr-1">RACK:</span>
            {[
              { id: 'walnut', label: 'Walnut' },
              { id: 'smoked-glass', label: 'Glass' },
              { id: 'cyber-neon', label: 'Neon' }
            ].map((mat) => (
              <button
                key={mat.id}
                onClick={() => {
                  audioEngine.playSelect();
                  setShelfMaterial(mat.id as ShelfMaterial);
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  shelfMaterial === mat.id
                    ? 'bg-[var(--game-accent,#2ee5ba)] text-black shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {mat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Shelving Display Scroll Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-16">
        {filteredGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pt-20 pb-10">
            <div className="w-48 h-48 mb-6 opacity-30 pointer-events-none">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full text-white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white/80 mb-2">Shelf is empty</h3>
            <p className="text-sm text-white/50 text-center max-w-sm">
              {searchQuery 
                ? `No physical media found matching "${searchQuery}".` 
                : `Your ${activeCollection === 'all' ? 'library' : activeCollection} rack has no items.`}
            </p>
          </div>
        ) : (
          tiers.map((tier, tierIdx) => (
            <div key={tierIdx} className="relative pt-6 pb-2">
              {/* 3D Game Boxes / Cartridges on Shelf */}
              <div className="flex items-end justify-start gap-8 px-8 pt-8 pb-2 overflow-x-auto no-scrollbar [perspective:1400px]">
              {tier.map((game) => {
                const isSelected = games[selectedGameIndex]?.id === game.id;
                const isHovered = hoveredGameId === game.id;

                return (
                  <div
                    key={game.id}
                    tabIndex={0}
                      data-gp-focusable="true"
                      data-gp-context="true"
                      onFocus={() => { if (!isSelected) { const idx = games.findIndex(g => g.id === game.id); if (idx >= 0) onSelectGame(idx); } }}
                      onMouseEnter={() => {
                      if (!isHovered) {
                        audioEngine.playShelfSlide();
                        setHoveredGameId(game.id);
                      }
                    }}
                    onMouseLeave={() => setHoveredGameId(null)}
                    onClick={() => handleInspectGame(game)}
                    className="group relative cursor-pointer flex-shrink-0 transition-all duration-400 ease-out"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: isHovered
                        ? 'translateZ(65px) translateY(-20px) rotateY(-22deg) scale(1.06)'
                        : isSelected
                          ? 'translateZ(25px) translateY(-8px) rotateY(-10deg)'
                          : 'translateZ(0px) rotateY(0deg)'
                    }}
                  >
                    {/* The Physical Media Container */}
                    {renderShelfItem(game, isHovered, isSelected)}

                    {/* Floating Quick Action Overlay on Hover */}
                    {isHovered && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-2 z-30 animate-fadeIn rounded-md">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLaunchGame(game);
                          }}
                          className="w-10 h-10 rounded-full bg-[var(--game-accent,#2ee5ba)] text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_0_15px_var(--game-glow)]"
                          title="Play Game"
                        >
                          <Play className="w-5 h-5 fill-black ml-0.5" />
                        </button>
                        <span className="text-[10px] font-bold text-white tracking-wider uppercase text-center px-1 truncate w-full">
                          {game.title}
                        </span>
                        <span className="text-[9px] text-[var(--game-accent,#2ee5ba)] font-mono">
                          Inspect in 3D
                        </span>
                      </div>
                    )}

                    {/* Dynamic Case Drop Shadow onto Shelf */}
                    <div
                      className="absolute -bottom-2 inset-x-2 h-4 bg-black/80 rounded-full blur-md transition-all duration-300 pointer-events-none -z-10"
                      style={{
                        transform: isHovered ? 'scale(1.2) translateY(8px)' : 'scale(1)'
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Physical Shelf Plank Construction */}
            <div className="relative mt-1">
              <div
                className="absolute -top-1 inset-x-0 h-2 blur-sm pointer-events-none"
                style={{ backgroundColor: shelfStyles.ledColor }}
              />
              <div className={`h-4 w-full rounded-sm ${shelfStyles.plankBg}`} />
              <div className={`h-3 w-full rounded-b-md shadow-2xl ${shelfStyles.lipBg}`} />
            </div>
          </div>
        )))}
      </div>

      {/* ========================================================================= */}
      {/* RESIDENT EVIL STYLE ITEM INSPECTION STAGE MODAL                            */}
      {/* ========================================================================= */}
      {inspectingGame && (
        <div
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-fadeIn select-none overflow-hidden"
        >
          {/* Dust Puff Easter Egg Notification Banner */}
          {dustNotification && (
            <div className="absolute top-6 z-50 px-5 py-2.5 rounded-2xl bg-amber-500/25 border border-amber-400/50 text-amber-100 text-xs font-mono font-bold shadow-2xl animate-slideDown flex items-center gap-2.5">
              <Wind className="w-4 h-4 text-amber-300 animate-spin" />
              <span>{dustNotification}</span>
            </div>
          )}

          <div className="relative w-full max-w-6xl max-w-[calc(100vw-1.5rem)] h-[90vh] max-h-[calc(100vh-1.5rem)] flex flex-col rounded-2xl sm:rounded-3xl bg-[#090d16] border border-white/15 shadow-[0_0_80px_rgba(0,0,0,0.95)] overflow-hidden animate-modalIn">
            {/* Top Toolbar: Resident Evil Remake Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3.5 border-b border-white/10 bg-white/5 flex-wrap gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-400 via-[var(--game-accent,#2ee5ba)] to-purple-600 flex items-center justify-center text-black font-black shadow-lg flex-shrink-0">
                  <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-base font-black text-white tracking-widest uppercase truncate">
                      EXAMINE ITEM
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-[var(--game-accent,#2ee5ba)]/20 text-[var(--game-accent,#2ee5ba)] border border-[var(--game-accent,#2ee5ba)]/30">
                      {activeFormat === 'retro-cartridge'
                        ? 'VINTAGE CARTRIDGE ROM'
                        : activeFormat === 'ps1-jewel-case'
                          ? 'COMPACT DISC JEWEL CASE'
                          : activeFormat === 'dvd-keep-case'
                            ? 'DVD KEEP CASE'
                            : 'BLU-RAY ARCHIVE EDITION'}
                    </span>
                    {inspectingDust > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse">
                        DUSTY ARCHIVE ({Math.round(inspectingDust * 100)}%)
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-white/50 font-mono hidden sm:block">
                    Drag to rotate 360° • Scroll wheel to Zoom ({Math.round(zoom * 100)}%) • [F] Flip • [B] Blow Dust
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* 180 Flip Button */}
                <button
                  onClick={handleFlip180}
                  title="Flip 180° (F)"
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Flip (F)</span>
                </button>

                {/* Take Out Disc 3D Inspector Toggle Button */}
                {activeFormat !== 'retro-cartridge' && isCaseOpened && (
                  <button
                    onClick={handleToggleExtractDisc}
                    title={isDiscExtracted ? 'Put Disc back into Case (D)' : 'Inspect 3D Disc in Spotlight (D)'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isDiscExtracted
                        ? 'bg-[var(--game-accent,#2ee5ba)] text-black border-[var(--game-accent,#2ee5ba)] shadow-[0_0_15px_var(--game-glow)]'
                        : 'text-sky-300 hover:text-white bg-sky-500/15 hover:bg-sky-500/25 border-sky-400/40'
                    }`}
                  >
                    <Disc className={`w-3.5 h-3.5 ${isDiscExtracted ? 'animate-spin' : ''}`} />
                    <span>{isDiscExtracted ? 'Back to Case (D)' : 'Inspect 3D Disc (D)'}</span>
                  </button>
                )}

                {/* Blow Dust Button (Available on all cartridges and optical discs) */}
                <button
                  onClick={handleBlowDust}
                  title="Blow Dust off Media Surface (B)"
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    inspectingDust > 0
                      ? 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border-amber-400/50 shadow-[0_0_18px_rgba(245,158,11,0.35)] animate-pulse'
                      : 'text-sky-300 hover:text-white bg-sky-500/10 hover:bg-sky-500/20 border-sky-400/30'
                  }`}
                >
                  <Wind className={`w-3.5 h-3.5 ${isBlowingDust ? 'animate-spin' : ''}`} />
                  <span>{inspectingDust > 0 ? `Blow Dust (${Math.round(inspectingDust * 100)}%)` : 'Blow Surface (B)'}</span>
                </button>

                {/* Investigate Clue Button */}
                <button
                  onClick={handleToggleExamineClue}
                  title="Investigate Hidden Detail (E)"
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border ${
                    isExaminingClue
                      ? 'bg-[var(--game-accent,#2ee5ba)] text-black border-[var(--game-accent,#2ee5ba)]'
                      : 'text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Investigate Clue</span>
                </button>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}
                    title="Zoom Out (-)"
                    className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono text-white/70 px-1">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
                    title="Zoom In (+)"
                    className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => {
                    audioEngine.playSelect();
                    setInspectingGame(null);
                  }}
                  className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Interactive 3D Stage & Inspector Sidebar */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
              {/* Resident Evil Cinematic Studio Spotlight Viewport */}
              <div
                onMouseDown={handleMouseDown}
                className="flex-1 relative flex items-center justify-center p-8 overflow-hidden cursor-grab active:cursor-grabbing [perspective:1300px]"
                style={{
                  background: 'radial-gradient(ellipse at 50% 40%, rgba(20, 35, 60, 0.45) 0%, rgba(6, 10, 18, 0.95) 75%)'
                }}
              >
                {/* Volumetric Studio Spotlight Ring */}
                <div
                  className="absolute w-[500px] h-[500px] rounded-full blur-3xl opacity-40 pointer-events-none -z-10"
                  style={{
                    background: `radial-gradient(circle, var(--game-accent,#2ee5ba) 0%, rgba(30, 58, 138, 0.2) 50%, transparent 70%)`
                  }}
                />

                {/* Ambient Realistic Floating Dust Motes in Spotlight Beam */}
                {inspectingDust > 0 && (
                  <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                    {[...Array(32)].map((_, i) => (
                      <div
                        key={`ambient-mote-${i}`}
                        className="absolute rounded-full bg-amber-100/60 pointer-events-none"
                        style={{
                          width: `${1 + (i % 3)}px`,
                          height: `${1 + (i % 3)}px`,
                          top: `${10 + ((i * 17) % 80)}%`,
                          left: `${15 + ((i * 23) % 70)}%`,
                          opacity: 0.2 + (inspectingDust * 0.5) * ((i % 5) / 5),
                          filter: 'blur(0.5px)',
                          animation: `dustMoteDrift ${3 + (i % 4)}s ease-in-out infinite alternate`,
                          animationDelay: `${(i * 0.2)}s`
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Volumetric Animated Dust Gust Cloud Burst when blowing dust */}
                {isBlowingDust && (
                  <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center overflow-hidden">
                    <div className="relative w-[480px] h-[480px]">
                      {/* Shockwave gust ring */}
                      <div className="absolute inset-0 rounded-full border-2 border-amber-200/50 blur-sm animate-ping" />
                      {/* Swirling micro-mote blast particles */}
                      {[...Array(48)].map((_, i) => {
                        const angle = (i / 48) * 360;
                        const dist = 90 + (i % 7) * 22;
                        const gx = Math.cos((angle * Math.PI) / 180) * dist;
                        const gy = Math.sin((angle * Math.PI) / 180) * dist;
                        return (
                          <div
                            key={`burst-mote-${i}`}
                            className="absolute rounded-full bg-amber-100 animate-dustGust"
                            style={
                              {
                                width: `${2 + (i % 4)}px`,
                                height: `${2 + (i % 4)}px`,
                                top: '50%',
                                left: '50%',
                                boxShadow: '0 0 6px rgba(254, 243, 199, 0.9)',
                                '--gust-x': `${gx}px`,
                                '--gust-y': `${gy}px`,
                                animationDuration: `${0.65 + (i % 5) * 0.1}s`,
                                animationDelay: `${(i % 8) * 0.02}s`
                              } as React.CSSProperties
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3D Item Container */}
                <div
                  className="relative transition-transform duration-300 ease-out will-change-transform animate-scaleUp origin-center"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: `scale(${zoom}) rotateX(${boxRotation.x}deg) rotateY(${boxRotation.y}deg)`
                  }}
                >
                  {/* ========================================================= */}
                  {/* OPTION A: RETRO CARTRIDGE 3D GEOMETRY                     */}
                  {/* ========================================================= */}
                  {activeFormat === 'retro-cartridge' ? (
                    <div
                      className="relative w-[280px] h-[360px] rounded-t-2xl rounded-b-md shadow-[0_30px_70px_rgba(0,0,0,0.95)] border-2 border-zinc-700 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      {/* Top Bevel & Grip Notches */}
                      <div className="h-10 bg-zinc-950 flex items-center justify-between px-4 border-b border-zinc-700 rounded-t-xl">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="w-2 h-2 rounded-full bg-zinc-600" />
                          <span className="w-2 h-2 rounded-full bg-zinc-600" />
                        </div>
                        <span className="text-[10px] font-black tracking-widest text-amber-300 font-mono uppercase">
                          MODEL NO. AST-001
                        </span>
                      </div>

                      {/* Front Label Recess with High-Gloss Art Sticker */}
                      <div className="p-4 h-[255px] relative">
                        <div className="relative w-full h-full rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
                          <GameCover
                            src={inspectingGame.coverUrl}
                            title={inspectingGame.title}
                            accent={inspectingGame.theme?.accentColor}
                            className="w-full h-full object-cover select-none filter contrast-110"
                          />
                          {/* Gloss Sheen Reflection */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/25 to-transparent pointer-events-none" />

                          {/* Official Vintage Seal of Quality */}
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-amber-400/90 text-black font-black text-[7px] tracking-wider uppercase border border-amber-300 shadow-md">
                            ASTRA SEAL OF QUALITY
                          </div>

                          <div className="absolute bottom-0 inset-x-0 bg-black/85 backdrop-blur-xs p-2 text-white font-mono flex items-center justify-between">
                            <span className="text-xs font-extrabold truncate max-w-[180px]">{inspectingGame.title}</span>
                            <span className="text-[9px] text-amber-400 font-bold uppercase">EUR/USA</span>
                          </div>
                        </div>

                        {/* Realistic Dust Film Coating on Cartridge with Fine Granular Texture */}
                        {inspectingDust > 0 && (
                          <div
                            onClick={handleBlowDust}
                            title="Dusty cartridge - click or press [B] to blow dust off"
                            className="absolute inset-4 rounded-xl pointer-events-auto cursor-pointer transition-opacity duration-700 ease-out z-20 flex flex-col items-center justify-center p-3 text-center overflow-hidden"
                            style={{
                              opacity: inspectingDust * 0.9,
                              background: 'linear-gradient(135deg, rgba(230, 220, 205, 0.5) 0%, rgba(185, 175, 155, 0.62) 50%, rgba(140, 130, 115, 0.75) 100%)',
                              backdropFilter: `blur(${inspectingDust * 2}px)`
                            }}
                          >
                            {/* Realistic Granular Sand/Dust Speckle Noise Texture */}
                            <div
                              className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply"
                              style={{
                                backgroundImage: `radial-gradient(#4a3e31 1px, transparent 1px), radial-gradient(#d6c7b2 1px, transparent 1px)`,
                                backgroundSize: '7px 7px, 11px 11px',
                                backgroundPosition: '0 0, 3px 3px'
                              }}
                            />

                            {/* Floating Micro-Dust Grains on Cartridge Label */}
                            {[...Array(12)].map((_, i) => (
                              <div
                                key={`cart-mote-${i}`}
                                className="absolute rounded-full bg-amber-100/90 pointer-events-none"
                                style={{
                                  width: `${1.5 + (i % 3)}px`,
                                  height: `${1.5 + (i % 3)}px`,
                                  top: `${15 + (i * 21) % 70}%`,
                                  left: `${15 + (i * 29) % 70}%`,
                                  opacity: 0.85
                                }}
                              />
                            ))}

                            <div className="px-2.5 py-1 rounded-full bg-black/85 border border-amber-300/50 text-amber-200 text-[8px] font-mono font-bold uppercase shadow-lg flex items-center gap-1.5 z-10">
                              <Wind className="w-3 h-3 text-amber-300 animate-pulse" />
                              <span>DUSTY ROM ({Math.round(inspectingDust * 100)}%)</span>
                            </div>
                            <span className="text-[8px] font-mono text-zinc-100 mt-1 drop-shadow-md z-10 font-bold">
                              Click or Press [B] to Blow Dust
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Recessed 64-Pin Gold Connector Slot */}
                      <div className="absolute bottom-0 inset-x-0 h-10 bg-zinc-950 border-t-2 border-zinc-700 flex flex-col items-center justify-center px-4 rounded-b-md relative overflow-hidden">
                        <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
                          EXPOSED 64-PIN GOLD CONNECTOR
                        </span>
                        <div
                          className="w-full h-3 rounded-xs shadow-inner"
                          style={{
                            background: 'repeating-linear-gradient(90deg, #f59e0b 0px, #f59e0b 4px, #09090b 4px, #09090b 7px)'
                          }}
                        />

                        {/* Dust over pins */}
                        {inspectingDust > 0 && (
                          <div
                            className="absolute inset-0 bg-amber-200/25 pointer-events-none transition-opacity duration-700"
                            style={{ opacity: inspectingDust * 0.7 }}
                          />
                        )}
                      </div>

                      {/* 3D Left Thickness Rib */}
                      <div
                        className="absolute inset-y-0 -left-8 w-8 bg-zinc-800 border-r border-l border-zinc-600 flex flex-col items-center justify-between py-6 text-zinc-400 text-[8px] font-mono font-bold uppercase select-none"
                        style={{
                          transformOrigin: 'right center',
                          transform: 'rotateY(-90deg)'
                        }}
                      >
                        <div className="w-1.5 h-16 rounded-full bg-zinc-900 border border-zinc-700" />
                        <span className="[writing-mode:vertical-rl] rotate-180 tracking-widest text-zinc-300">
                          {inspectingGame.title}
                        </span>
                        <div className="w-1.5 h-16 rounded-full bg-zinc-900 border border-zinc-700" />
                      </div>

                      {/* 3D Right Thickness Rib */}
                      <div
                        className="absolute inset-y-0 -right-8 w-8 bg-zinc-800 border-r border-l border-zinc-600 flex flex-col items-center justify-between py-6 text-zinc-400 text-[8px] font-mono font-bold uppercase select-none"
                        style={{
                          transformOrigin: 'left center',
                          transform: 'rotateY(90deg)'
                        }}
                      >
                        <div className="w-1.5 h-16 rounded-full bg-zinc-900 border border-zinc-700" />
                        <span className="[writing-mode:vertical-rl] tracking-widest text-zinc-300">
                          ASTRA CARTRIDGE
                        </span>
                        <div className="w-1.5 h-16 rounded-full bg-zinc-900 border border-zinc-700" />
                      </div>
                    </div>
                  ) : !isCaseOpened ? (
                    /* ========================================================= */
                    /* OPTION B: CLOSED 3D CASE (MODERN BLU-RAY / JEWEL / DVD)   */
                    /* ========================================================= */
                    <div
                      className={`relative rounded-r-lg rounded-l-sm shadow-[0_25px_60px_rgba(0,0,0,0.9)] border bg-zinc-900 overflow-hidden ${
                        activeFormat === 'ps1-jewel-case'
                          ? 'w-[320px] h-[320px] border-white/40'
                          : 'w-[260px] h-[380px] border-white/20'
                      }`}
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      {/* Top Retail Strip */}
                      <div
                        className={`absolute top-0 inset-x-0 flex items-center justify-between px-3 z-20 shadow-md ${
                          activeFormat === 'ps1-jewel-case'
                            ? 'h-7 bg-zinc-900 text-sky-300 border-b border-white/20'
                            : activeFormat === 'dvd-keep-case'
                              ? 'h-8 bg-black text-white border-b border-zinc-800'
                              : 'h-8 bg-gradient-to-r from-blue-700 via-sky-600 to-blue-700 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase">
                          <Disc className="w-3 h-3 text-white" />
                          <span>
                            {activeFormat === 'ps1-jewel-case'
                              ? 'COMPACT DISC'
                              : activeFormat === 'dvd-keep-case'
                                ? 'DVD-ROM ARCHIVE'
                                : 'ASTRA ARCHIVE'}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold font-mono">
                          {activeFormat === 'ps1-jewel-case' ? 'PS1 / PC-CD' : 'PS5 / PC'}
                        </span>
                      </div>

                      {/* Front Cover Art */}
                      <GameCover
                        src={inspectingGame.coverUrl}
                        title={inspectingGame.title}
                        accent={inspectingGame.theme?.accentColor}
                        className="w-full h-full object-cover pt-8 select-none"
                      />

                      {/* Clear Plastic Cellophane Reflection Sheen */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />

                      {/* Dust Film on Case if Neglected */}
                      {inspectingDust > 0 && (
                        <div
                          className="absolute inset-0 pointer-events-none transition-opacity duration-700 z-15"
                          style={{
                            opacity: inspectingDust * 0.6,
                            background: 'linear-gradient(180deg, rgba(220, 210, 195, 0.45) 0%, transparent 60%)'
                          }}
                        />
                      )}

                      {/* Left Spine Thickness Simulation in 3D */}
                      <div
                        className="absolute inset-y-0 -left-6 w-6 bg-zinc-950 border-r border-l border-white/20 flex flex-col items-center justify-between py-4 text-white text-[9px] font-black tracking-widest uppercase select-none"
                        style={{
                          transformOrigin: 'right center',
                          transform: 'rotateY(-90deg)'
                        }}
                      >
                        <Disc className="w-3.5 h-3.5 text-sky-400" />
                        <span className="[writing-mode:vertical-rl] rotate-180 truncate max-h-[220px]">
                          {inspectingGame.title}
                        </span>
                        <span className="text-[8px] text-white/40 font-mono">ASTRA</span>
                      </div>
                    </div>
                  ) : isDiscExtracted ? (
                    /* ========================================================= */
                    /* OPTION D: EXTRACTED 3D STANDALONE OPTICAL DISC            */
                    /* ========================================================= */
                    <div
                      className="relative flex items-center justify-center cursor-grab active:cursor-grabbing"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: `rotateX(${discRotation.x}deg) rotateY(${discRotation.y}deg)`
                      }}
                    >
                      {/* Realistic 3D Optical Disc Geometry Container */}
                      <div
                        onClick={handleLaunchFromInspector}
                        title="3D Optical Disc (Drag to inspect both sides • Click to insert and play • [B] to blow dust)"
                        className="relative w-72 h-72 rounded-full shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex items-center justify-center group cursor-pointer transition-transform duration-300"
                        style={{
                          transformStyle: 'preserve-3d',
                          background:
                            activeFormat === 'ps1-jewel-case'
                              ? 'radial-gradient(circle at center, transparent 20%, #1c1c1f 21%, #09090b 70%)'
                              : 'radial-gradient(circle at center, transparent 18%, rgba(255,255,255,0.1) 19%, rgba(10,15,30,0.8) 20%, #000 80%)'
                        }}
                      >
                        {/* Disc Polycarbonate Outer Beveled Rim */}
                        <div className="absolute inset-0 rounded-full border-4 border-white/40 shadow-inner pointer-events-none" />
                        <div className="absolute -inset-1 rounded-full border border-sky-400/30 blur-[0.5px] pointer-events-none" />

                        {/* Front Label Screenprint Side (Upper 3D face) */}
                        <div
                          className="absolute inset-2 rounded-full overflow-hidden shadow-2xl"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'translateZ(2px)'
                          }}
                        >
                          <GameCover
                            src={inspectingGame.coverUrl}
                            title={inspectingGame.title}
                            accent={inspectingGame.theme?.accentColor}
                            className="w-full h-full object-cover select-none filter contrast-125 brightness-95"
                          />

                          {/* Optical Data Track Microgrooves Texture */}
                          <div
                            className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-60"
                            style={{
                              background: 'repeating-radial-gradient(circle at center, transparent 0, transparent 2px, rgba(255,255,255,0.18) 2px, rgba(255,255,255,0.18) 3px)'
                            }}
                          />

                          {/* Dynamic Prismatic Rainbow Sheen */}
                          <div
                            className="absolute inset-0 mix-blend-color-dodge pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity animate-holoSheen"
                            style={{
                              background: 'conic-gradient(from 0deg, rgba(255,0,128,0.4), rgba(255,215,0,0.5), rgba(0,255,128,0.5), rgba(0,200,255,0.6), rgba(138,43,226,0.5), rgba(255,0,128,0.4))'
                            }}
                          />

                          {/* Specular Glare Reflection Bar */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-white/35 pointer-events-none" />

                          {/* Archival Disc Edge Typography */}
                          <div className="absolute top-4 inset-x-0 flex items-center justify-between px-6 z-20">
                            <span className="text-[8px] font-black tracking-widest text-white/90 uppercase font-mono drop-shadow-md">
                              {activeFormat === 'ps1-jewel-case' ? 'PLAYSTATION CD-ROM' : 'COMPACT DISC RECORDABLE'}
                            </span>
                            <span className="text-[8px] font-bold text-amber-300 font-mono drop-shadow-md">
                              VOL. 01
                            </span>
                          </div>

                          <div className="absolute bottom-4 inset-x-0 text-center z-20">
                            <span className="text-[10px] font-extrabold text-white tracking-widest uppercase drop-shadow-lg px-3 py-0.5 rounded-full bg-black/60 border border-white/20">
                              {inspectingGame.title}
                            </span>
                          </div>
                        </div>

                        {/* Reverse Silver Mirrored Optical Read Layer (Back 3D face) */}
                        <div
                          className="absolute inset-2 rounded-full overflow-hidden shadow-2xl flex items-center justify-center"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg) translateZ(2px)',
                            background:
                              activeFormat === 'ps1-jewel-case'
                                ? 'radial-gradient(circle at center, transparent 20%, #18181b 21%, #09090b 80%)'
                                : 'radial-gradient(circle at center, transparent 20%, #d4d4d8 21%, #a1a1aa 45%, #71717a 75%, #27272a 100%)'
                          }}
                        >
                          {/* Laser Data Spiral Spiral Concentric Tracks */}
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background: 'repeating-radial-gradient(circle at center, transparent 0, transparent 1.5px, rgba(0,0,0,0.2) 1.5px, rgba(0,0,0,0.2) 3px)'
                            }}
                          />

                          {/* Iridescent Holographic Rainbow Laser Track Reflections */}
                          <div
                            className="absolute inset-0 mix-blend-color-dodge opacity-85 animate-holoSheen pointer-events-none"
                            style={{
                              background: 'conic-gradient(from 120deg, transparent, rgba(239, 68, 68, 0.4), rgba(245, 158, 11, 0.5), rgba(16, 185, 129, 0.5), rgba(6, 182, 212, 0.6), rgba(139, 92, 246, 0.5), transparent)'
                            }}
                          />

                          {/* Matrix Runout Barcode & Mastering IFPI Stamp */}
                          <div className="absolute inset-16 rounded-full border border-black/30 flex items-center justify-center pointer-events-none">
                            <span className="text-[7.5px] font-mono tracking-widest text-black/60 uppercase select-none font-bold">
                              IFPI L328 • MASTERED BY ASTRA ARCHIVE • 0019482
                            </span>
                          </div>

                          <div className="absolute bottom-6 font-mono text-[8px] font-bold text-black/70 tracking-widest">
                            OPTICAL READ SURFACE (L0 / L1 DUAL-LAYER)
                          </div>
                        </div>

                        {/* Central Spindle Hub Clamping Ring (Pierces through 3D disc) */}
                        <div className="w-20 h-20 rounded-full bg-zinc-950/90 border-4 border-zinc-700/80 flex items-center justify-center shadow-inner z-30 pointer-events-none">
                          <div className="w-14 h-14 rounded-full border border-white/30 flex items-center justify-center bg-black/60">
                            <div className="w-6 h-6 rounded-full bg-transparent border-2 border-white/60 shadow-md" />
                          </div>
                        </div>

                        {/* Photorealistic Granular Dust Coating & Fingerprint Patina */}
                        {inspectingDust > 0 && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBlowDust();
                            }}
                            title="Fine dust motes & patina - click or press [B] to blow clean"
                            className="absolute inset-2 rounded-full pointer-events-auto transition-all duration-700 ease-out z-35 flex flex-col items-center justify-center p-4 text-center cursor-pointer overflow-hidden"
                            style={{
                              opacity: inspectingDust * 0.95,
                              background: 'radial-gradient(circle at 40% 35%, rgba(235, 225, 210, 0.55) 0%, rgba(190, 180, 160, 0.65) 45%, rgba(145, 135, 120, 0.78) 100%)',
                              backdropFilter: `blur(${inspectingDust * 2.5}px)`
                            }}
                          >
                            {/* Realistic Granular Sand/Dust Speckle Noise Texture */}
                            <div
                              className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply"
                              style={{
                                backgroundImage: `radial-gradient(#5c4d3c 1px, transparent 1px), radial-gradient(#d6c7b2 1px, transparent 1px)`,
                                backgroundSize: '8px 8px, 12px 12px',
                                backgroundPosition: '0 0, 4px 4px'
                              }}
                            />

                            {/* Floating Micro-Dust Grains on Disc Face */}
                            {[...Array(16)].map((_, i) => (
                              <div
                                key={`disc-mote-${i}`}
                                className="absolute rounded-full bg-amber-100/90 pointer-events-none shadow-xs"
                                style={{
                                  width: `${1.5 + (i % 3)}px`,
                                  height: `${1.5 + (i % 3)}px`,
                                  top: `${20 + (i * 19) % 60}%`,
                                  left: `${20 + (i * 27) % 60}%`,
                                  opacity: 0.8
                                }}
                              />
                            ))}

                            <div className="px-3 py-1 rounded-full bg-black/85 border border-amber-300/60 text-amber-200 text-[8px] font-mono font-black uppercase shadow-2xl flex items-center gap-1.5 z-20">
                              <Wind className="w-3 h-3 text-amber-300 animate-pulse" />
                              <span>DUSTY SURFACE ({Math.round(inspectingDust * 100)}%)</span>
                            </div>
                            <span className="text-[8px] font-mono text-zinc-100 mt-1 drop-shadow-md z-20 font-bold">
                              Click or Press [B] to Blow Dust
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ========================================================= */
                    /* OPTION C: OPENED CASE (DISC + MANUAL / MEMORY CARD)       */
                    /* ========================================================= */
                    <div
                      className="relative w-[540px] h-[380px] flex rounded-lg shadow-2xl border border-white/20 bg-[#0d121f] overflow-hidden"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      {/* Left Interior: Manual Booklet & Game Notes */}
                      <div className="w-1/2 p-5 border-r border-white/10 flex flex-col justify-between bg-black/40">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
                            <BookOpen className="w-4 h-4 text-[var(--game-accent,#2ee5ba)]" />
                            <span>Quick Start Field Manual</span>
                          </div>
                          <h4 className="text-sm font-extrabold text-white tracking-wide">
                            {inspectingGame.title}
                          </h4>
                          <p className="text-xs text-white/60 mt-1 line-clamp-3 leading-relaxed">
                            {inspectingGame.description || 'Official physical copy registered in your Astra archive.'}
                          </p>
                        </div>

                        {inspectingGame.quote && (
                          <div className="p-3 rounded-xl bg-white/5 border border-white/10 italic text-[11px] text-white/70">
                            &ldquo;{inspectingGame.quote.text}&rdquo;
                            <span className="block text-right text-[10px] text-white/40 not-italic mt-1">
                              — {inspectingGame.quote.speaker}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-white/40 font-mono pt-2 border-t border-white/10">
                          <span>FORMAT: {activeFormat.toUpperCase()}</span>
                          <span>VER: {inspectingGame.version || '1.0'}</span>
                        </div>
                      </div>

                      {/* Right Interior: Physical Optical Game Disc Hub */}
                      <div className="w-1/2 p-6 flex flex-col items-center justify-center relative bg-gradient-to-br from-black/60 to-black/90">
                        <div className="relative flex items-center justify-center">
                          {/* The Optical Hologram Disc with 3D Pop Out */}
                          <div
                            onClick={handleLaunchFromInspector}
                            title="Click disc to insert and launch game • Press [D] to inspect standalone 3D disc"
                            className="w-56 h-56 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.9)] border-2 border-white/40 flex items-center justify-center relative overflow-hidden group cursor-pointer hover:scale-105 transition-all duration-300"
                            style={{
                              background:
                                activeFormat === 'ps1-jewel-case'
                                  ? 'radial-gradient(circle at center, transparent 20%, #111 21%, #09090b 70%)'
                                  : `radial-gradient(circle at center, transparent 20%, rgba(255,255,255,0.15) 21%, transparent 22%), conic-gradient(from 45deg, #f43f5e, #eab308, #10b981, #06b6d4, #8b5cf6, #f43f5e)`
                            }}
                          >
                            {/* Disc Artwork Overlay */}
                            <div className="absolute inset-1 rounded-full overflow-hidden opacity-90">
                              <GameCover
                                src={inspectingGame.coverUrl}
                                title={inspectingGame.title}
                                accent={inspectingGame.theme?.accentColor}
                                className="w-full h-full object-cover select-none filter contrast-125"
                              />
                            </div>

                            {/* Data track grooves texture */}
                            <div
                              className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
                              style={{
                                background: 'repeating-radial-gradient(circle at center, transparent 0, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 3px)'
                              }}
                            />

                            {/* Prismatic Rainbow Sheen with smooth sweeping motion */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-white/30 mix-blend-color-dodge pointer-events-none group-hover:rotate-180 transition-transform duration-1000 animate-holoSheen" />

                            {/* Outer Clear Polycarbonate Lip */}
                            <div className="absolute inset-0 rounded-full border border-white/50 pointer-events-none" />

                            {/* Spindle Center Hole */}
                            <div className="w-16 h-16 rounded-full bg-zinc-950 border-4 border-zinc-800 flex items-center justify-center shadow-inner z-20">
                              <div className="w-7 h-7 rounded-full bg-transparent border-2 border-white/40" />
                            </div>

                            {/* Top Title on Disc */}
                            <div className="absolute top-4 font-black text-[9px] tracking-widest text-white drop-shadow-md uppercase px-4 truncate max-w-full z-10">
                              {inspectingGame.title}
                            </div>

                            {/* Foggy / Granular Realistic Dust Film on Disc Surface */}
                            {inspectingDust > 0 && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBlowDust();
                                }}
                                title="Dust on optical disc - click or press [B] to blow dust off"
                                className="absolute inset-0 rounded-full pointer-events-auto transition-all duration-700 ease-out z-25 flex flex-col items-center justify-center p-3 text-center cursor-pointer overflow-hidden"
                                style={{
                                  opacity: inspectingDust * 0.92,
                                  background: 'radial-gradient(circle at 45% 40%, rgba(230, 220, 205, 0.5) 0%, rgba(185, 175, 160, 0.65) 60%, rgba(140, 130, 115, 0.78) 100%)',
                                  backdropFilter: `blur(${inspectingDust * 2.2}px)`
                                }}
                              >
                                {/* Micro dust speckles */}
                                <div
                                  className="absolute inset-0 pointer-events-none opacity-30 mix-blend-multiply"
                                  style={{
                                    backgroundImage: 'radial-gradient(#4a3e31 1px, transparent 1px)',
                                    backgroundSize: '8px 8px'
                                  }}
                                />

                                <div className="px-2 py-0.5 rounded-full bg-black/85 border border-amber-300/40 text-amber-200 text-[7.5px] font-mono font-bold uppercase shadow-lg flex items-center gap-1 z-10">
                                  <Wind className="w-2.5 h-2.5 text-amber-300 animate-pulse" />
                                  <span>DUSTY OPTICAL DISC</span>
                                </div>
                                <span className="text-[7.5px] font-mono text-zinc-100 mt-1 drop-shadow-md z-10 font-bold">
                                  Click or [B] to Blow Dust
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Controls underneath Disc Hub */}
                        <div className="flex items-center gap-3 mt-4">
                          <button
                            onClick={handleToggleExtractDisc}
                            className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/40 text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
                            title="Take disc out to freely inspect both sides in 3D (D)"
                          >
                            <Disc className="w-3 h-3 text-sky-300" />
                            <span>Inspect 3D Disc (D)</span>
                          </button>
                          <span className="text-[9px] text-white/40 font-mono">
                            CLICK DISC TO PLAY
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resident Evil Remake "Forensic Clue / Provenance" Modal Overlay */}
                {isExaminingClue && (
                  <div className="absolute bottom-6 inset-x-8 z-40 p-5 rounded-2xl bg-zinc-950/95 border-2 border-[var(--game-accent,#2ee5ba)]/40 shadow-2xl backdrop-blur-xl animate-modalIn flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--game-accent,#2ee5ba)]/20 border border-[var(--game-accent,#2ee5ba)] text-[var(--game-accent,#2ee5ba)] flex items-center justify-center font-bold">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-[var(--game-accent,#2ee5ba)] uppercase tracking-wider">
                            ARCHIVAL FORENSIC DOSSIER
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                            VERIFIED AUTHENTIC
                          </span>
                          {inspectingDust > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                              SURFACE DUST DETECTED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/80 mt-0.5">
                          {activeFormat === 'retro-cartridge'
                            ? `Battery-backed SRAM Save: 3.14V OK • Bus parity: PASSED • Original mask ROM chips detected • Dust Level: ${Math.round(inspectingDust * 100)}%`
                            : `Laser Checksum: 0x9AF42 • Sector ECC: Valid • No disc rot detected • Optical Dust Level: ${Math.round(inspectingDust * 100)}%`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      <div className="text-right text-[11px] font-mono text-white/40 hidden sm:block">
                        <span>SERIAL: {inspectingGame.id.toUpperCase().slice(0, 14)}</span>
                      </div>
                      <button
                        onClick={() => setIsExaminingClue(false)}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar: Game Metadata, Stats & Quick Actions */}
              <div className="w-full md:w-80 p-6 border-t md:border-t-0 md:border-l border-white/10 bg-black/40 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-[var(--game-accent,#2ee5ba)] uppercase font-bold">
                      {activeFormat === 'retro-cartridge' ? 'VINTAGE CARTRIDGE ARCHIVE' : 'PHYSICAL ARCHIVE EDITION'}
                    </span>
                    <h2 className="text-xl font-black text-white tracking-wide mt-0.5">
                      {inspectingGame.title}
                    </h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-semibold">
                        {inspectingGame.genres.slice(0, 2).join(' • ')}
                      </span>
                      {inspectingGame.favorite && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-300" /> Favorite
                        </span>
                      )}
                      {inspectingDust > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold flex items-center gap-1">
                          <Wind className="w-3 h-3" /> Needs Dusting
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Playtime & Milestones */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-white/40 uppercase font-mono block">Playtime</span>
                      <span className="text-sm font-bold text-white">
                        {Math.floor((inspectingGame.stats.playtimeMinutes || 0) / 60)}h {(inspectingGame.stats.playtimeMinutes || 0) % 60}m
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] text-white/40 uppercase font-mono block">Sessions</span>
                      <span className="text-sm font-bold text-white">
                        {inspectingGame.stats.playCount || 0} Runs
                      </span>
                    </div>
                  </div>

                  {/* Last Played & Dust Status */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Last Played:</span>
                      <span className="font-mono text-white/80">
                        {inspectingGame.stats.lastPlayed
                          ? new Date(inspectingGame.stats.lastPlayed).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Archival Dust:</span>
                      <span className={`font-mono font-bold ${inspectingDust > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                        {inspectingDust > 0 ? `${Math.round(inspectingDust * 100)}% (Press [B])` : '0% Clean'}
                      </span>
                    </div>
                  </div>

                  {/* Mod Pack Count */}
                  {inspectingGame.mods && inspectingGame.mods.length > 0 && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[var(--game-accent,#2ee5ba)]" />
                        <span className="text-xs font-semibold text-white">Active Mods</span>
                      </div>
                      <span className="text-xs font-bold text-[var(--game-accent,#2ee5ba)] font-mono">
                        {inspectingGame.mods.filter((m) => m.enabled).length} / {inspectingGame.mods.length}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-4 border-t border-white/10">
                  {/* Primary Launch */}
                  <button
                    onClick={handleLaunchFromInspector}
                    className="w-full py-3 rounded-2xl bg-[var(--game-accent,#2ee5ba)] text-black font-extrabold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_var(--game-glow)] cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>
                      {activeFormat === 'retro-cartridge' ? 'Insert Cartridge & Play' : 'Insert Disc & Play'}
                    </span>
                  </button>

                  {/* Toggle Open Case or Flip Cartridge */}
                  <button
                    onClick={activeFormat === 'retro-cartridge' ? handleFlip180 : handleToggleCaseOpen}
                    className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Disc className="w-4 h-4 text-sky-400" />
                    <span>
                      {activeFormat === 'retro-cartridge'
                        ? 'Flip Cartridge (180°)'
                        : isCaseOpened
                          ? 'Close Box'
                          : 'Open Box & View Disc'}
                    </span>
                  </button>

                  {/* Blow Dust Quick Action if dusty */}
                  {inspectingDust > 0 && (
                    <button
                      onClick={handleBlowDust}
                      className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer animate-pulse"
                    >
                      <Wind className="w-3.5 h-3.5" />
                      <span>Blow Dust ({Math.round(inspectingDust * 100)}%)</span>
                    </button>
                  )}

                  {/* Manage Mods Button */}
                  {onOpenMods && (
                    <button
                      onClick={() => {
                        onOpenMods(inspectingGame);
                        setInspectingGame(null);
                      }}
                      className="w-full py-2 rounded-xl text-white/60 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Configure Mods & Add-Ons</span>
                    </button>
                  )}

                  {/* View Full Intel / Details */}
                  {onOpenOverview && (
                    <button
                      onClick={() => {
                        onOpenOverview(inspectingGame);
                        setInspectingGame(null);
                      }}
                      className="w-full py-2 rounded-xl text-white/50 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Full Dossier & Trophy Progress</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
