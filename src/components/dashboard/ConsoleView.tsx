import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Play, Star, Clock, Sparkles, FolderOpen, Flame, BookOpen, RotateCcw, Palette, Trash2, Trophy, Bookmark, Timer, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Game } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { ThemeEngine } from '../../services/themeEngine';
import { normalizeMediaUrl } from '../../utils/mediaUrl';
import { AtmosphericOverlay } from './AtmosphericOverlay';
import { ProceduralTitleLogo } from './ProceduralTitleLogo';
import { GameCover } from '../GameCover';

interface ConsoleViewProps {
  games: Game[];
  selectedGameIndex: number;
  onSelectGame: (index: number) => void;
  onLaunchGame: (game: Game) => void;
  onToggleFavorite: (gameId: string) => void;
  onOpenFolder: (game: Game) => void;
  onOpenNotes: () => void;
  onOpenOverview?: (game: Game) => void;
  onOpenThemeEditor?: (game: Game) => void;
  onRequestRemoveGame?: (game: Game) => void;
  onRemoveGame?: (gameId: string) => void;
  backgroundBlur?: 'none' | 'subtle' | 'medium' | 'heavy';
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({
  games,
  selectedGameIndex,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
  onOpenFolder,
  onOpenNotes,
  onOpenOverview,
  onOpenThemeEditor,
  onRequestRemoveGame,
  onRemoveGame,
  backgroundBlur = 'medium'
}) => {
  const ribbonRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeCollection, setActiveCollection] = useState<'all' | 'playing' | 'backlog' | 'completed' | 'favorites'>('all');

  const displayedGames = useMemo(() => {
    return games.filter((g) => {
      if (g.hidden) return false;
      if (activeCollection === 'all') return true;
      if (activeCollection === 'favorites') return g.favorite;
      return g.collection === activeCollection;
    });
  }, [games, activeCollection]);

  // Index of currently active game within displayedGames
  const displayedIndex = useMemo(() => {
    const current = games[selectedGameIndex];
    if (!current) return 0;
    const idx = displayedGames.findIndex((g) => g.id === current.id);
    return idx >= 0 ? idx : 0;
  }, [displayedGames, games, selectedGameIndex]);

  const activeGame = displayedGames[displayedIndex] || games[selectedGameIndex] || games[0];
  const [logoError, setLogoError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [bgFallbackLevel, setBgFallbackLevel] = useState<number>(0);

  // Cross-fading background buffer
  const [previousBg, setPreviousBg] = useState<string | null>(null);
  const [isCrossfading, setIsCrossfading] = useState<boolean>(false);

  const vibeConfig = useMemo(() => {
    return ThemeEngine.getVibeConfig(activeGame?.theme?.vibe, activeGame);
  }, [activeGame]);

  const defaultBackdrops = useMemo(() => [
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1920&auto=format&fit=crop'
  ], []);

  let rawBg = activeGame?.backdropUrl || activeGame?.coverUrl;
  if (bgFallbackLevel === 1) {
    rawBg = activeGame?.coverUrl || defaultBackdrops[selectedGameIndex % defaultBackdrops.length];
  } else if (bgFallbackLevel >= 2 || !rawBg) {
    rawBg = defaultBackdrops[selectedGameIndex % defaultBackdrops.length];
  }
  const bgImage = normalizeMediaUrl(rawBg);

  // Background crossfade transition when active game changes
  const prevBgRef = useRef<string>(bgImage);
  useEffect(() => {
    queueMicrotask(() => {
      setLogoError(false);
      setVideoError(false);
      setBgFallbackLevel(0);
    });

    if (prevBgRef.current && prevBgRef.current !== bgImage) {
      setPreviousBg(prevBgRef.current);
      setIsCrossfading(true);
      const timer = setTimeout(() => {
        setIsCrossfading(false);
        setPreviousBg(null);
      }, 700);
      prevBgRef.current = bgImage;
      return () => clearTimeout(timer);
    }
    prevBgRef.current = bgImage;
  }, [activeGame?.id, bgImage]);

  // Clean hardware video decoder context on video change
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) {
        try {
          video.pause();
        } catch {}
      }
    };
  }, [activeGame?.videoUrl]);

  // Pause video on visibility loss
  useEffect(() => {
    const handleVisibility = () => {
      if (!videoRef.current) return;
      if (document.hidden) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const mostRecentGameId = useMemo(() => {
    let bestId = '';
    let bestTime = 0;
    games.forEach((g) => {
      if (g.stats.lastPlayed) {
        const t = new Date(g.stats.lastPlayed).getTime();
        if (t > bestTime) {
          bestTime = t;
          bestId = g.id;
        }
      }
    });
    return bestId;
  }, [games]);

  const isMostRecent = activeGame?.id === mostRecentGameId;

  const playButtonLabel = useMemo(() => {
    if (isMostRecent) {
      if (vibeConfig.id === 'souls-fantasy') return '✧ AWAKEN ✧';
      if (vibeConfig.id === 'cozy-wholesome') return '✦ Continue ✦';
      if (vibeConfig.resumeLabelPrefix) {
        return `${vibeConfig.resumeLabelPrefix}RESUME${vibeConfig.playLabelSuffix || ''}`;
      }
      return 'RESUME GAME';
    }
    if (vibeConfig.id === 'souls-fantasy') return '✧ COMMENCE ✧';
    if (vibeConfig.id === 'cozy-wholesome') return '✦ Play ✦';
    if (vibeConfig.playLabelPrefix) {
      return `${vibeConfig.playLabelPrefix}PLAY${vibeConfig.playLabelSuffix || ''}`;
    }
    return 'PLAY GAME';
  }, [isMostRecent, vibeConfig]);

  const secondaryBtnClass = `flex items-center gap-2 px-4 py-3.5 ${vibeConfig.secondaryBtnShape} ${vibeConfig.secondaryBtnBorder || 'border border-white/15 hover:border-white/40'} ${vibeConfig.secondaryBtnBg || 'glass-panel text-white/80'} ${vibeConfig.secondaryBtnTypography || 'font-semibold text-xs tracking-wide'} hover:text-white hover:scale-105 active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer transform-gpu`;
  const secondaryIconBtnClass = `p-3.5 ${vibeConfig.secondaryBtnShape} ${vibeConfig.secondaryBtnBorder || 'border border-white/15 hover:border-white/40'} ${vibeConfig.secondaryBtnBg || 'glass-panel text-white/70'} hover:text-white hover:scale-105 active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer transform-gpu`;

  const blurClasses = useMemo(() => {
    switch (backgroundBlur) {
      case 'none':
        return {
          mediaFilter: '',
          mediaScale: 'scale-105',
          overlay: 'backdrop-blur-none'
        };
      case 'subtle':
        return {
          mediaFilter: 'blur-[3px]',
          mediaScale: 'scale-108',
          overlay: 'backdrop-blur-sm bg-black/10'
        };
      case 'heavy':
        return {
          mediaFilter: 'blur-[12px]',
          mediaScale: 'scale-115',
          overlay: 'backdrop-blur-xl bg-black/35'
        };
      case 'medium':
      default:
        return {
          mediaFilter: 'blur-[6px]',
          mediaScale: 'scale-110',
          overlay: 'backdrop-blur-md bg-black/20'
        };
    }
  }, [backgroundBlur]);

  // Auto-scroll ribbon to keep active game centered
  useEffect(() => {
    if (ribbonRef.current) {
      const activeEl = ribbonRef.current.children[displayedIndex] as HTMLElement;
      if (activeEl) {
        const ribbon = ribbonRef.current;
        const scrollTarget = activeEl.offsetLeft - ribbon.clientWidth / 2 + activeEl.clientWidth / 2;
        ribbon.scrollTo({ left: scrollTarget, behavior: 'smooth' });
      }
    }
  }, [displayedIndex]);

  const lastWheelTimeRef = useRef<number>(0);
  const isWheelScrollingRef = useRef<boolean>(false);
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Controlled edge scrolling and debounced card hover state
  const edgeScrollAnimRef = useRef<number | null>(null);
  const edgeScrollDirRef = useRef<'left' | 'right' | null>(null);
  const edgeScrollSpeedRef = useRef<number>(0);
  const [showLeftScrollBtn, setShowLeftScrollBtn] = useState(false);
  const [showRightScrollBtn, setShowRightScrollBtn] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startEdgeScroll = (dir: 'left' | 'right', speed: number) => {
    edgeScrollDirRef.current = dir;
    edgeScrollSpeedRef.current = speed;

    if (!edgeScrollAnimRef.current) {
      const step = () => {
        if (ribbonRef.current && edgeScrollDirRef.current) {
          const delta = edgeScrollDirRef.current === 'left' ? -edgeScrollSpeedRef.current : edgeScrollSpeedRef.current;
          ribbonRef.current.scrollLeft += delta;
          edgeScrollAnimRef.current = requestAnimationFrame(step);
        } else {
          edgeScrollAnimRef.current = null;
        }
      };
      edgeScrollAnimRef.current = requestAnimationFrame(step);
    }
  };

  const stopEdgeScroll = () => {
    edgeScrollDirRef.current = null;
    if (edgeScrollAnimRef.current) {
      cancelAnimationFrame(edgeScrollAnimRef.current);
      edgeScrollAnimRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopEdgeScroll();
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (isWheelScrollingRef.current && Date.now() - lastWheelTimeRef.current > 200) {
      isWheelScrollingRef.current = false;
    }

    // Narrow threshold strictly near extreme left / right edges (75px)
    const EDGE_THRESHOLD = 75;
    const x = e.clientX;
    const width = window.innerWidth;

    setShowLeftScrollBtn(x < 150);
    setShowRightScrollBtn(x > width - 150);

    if (x < EDGE_THRESHOLD) {
      const factor = (EDGE_THRESHOLD - x) / EDGE_THRESHOLD;
      const speed = Math.max(3, Math.round(factor * 9));
      startEdgeScroll('left', speed);
    } else if (x > width - EDGE_THRESHOLD) {
      const factor = (x - (width - EDGE_THRESHOLD)) / EDGE_THRESHOLD;
      const speed = Math.max(3, Math.round(factor * 9));
      startEdgeScroll('right', speed);
    } else {
      stopEdgeScroll();
    }
  };

  const handleContainerMouseLeave = () => {
    stopEdgeScroll();
    setShowLeftScrollBtn(false);
    setShowRightScrollBtn(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleCardMouseEnter = (realIdx: number, isSelected: boolean) => {
    if (isSelected) return;
    if (edgeScrollDirRef.current !== null) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    // Debounce hover selection so sweeping mouse across ribbon does NOT trigger runaway auto-scrolling
    hoverTimeoutRef.current = setTimeout(() => {
      audioEngine.playHover();
      onSelectGame(realIdx);
    }, 280);
  };

  const handleCardMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const scrollRibbonLeft = () => {
    audioEngine.playHover();
    if (displayedIndex > 0) {
      const prevGame = displayedGames[displayedIndex - 1];
      const realIdx = games.findIndex((g) => g.id === prevGame.id);
      if (realIdx >= 0) onSelectGame(realIdx);
    } else if (ribbonRef.current) {
      ribbonRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    }
  };

  const scrollRibbonRight = () => {
    audioEngine.playHover();
    if (displayedIndex < displayedGames.length - 1) {
      const nextGame = displayedGames[displayedIndex + 1];
      const realIdx = games.findIndex((g) => g.id === nextGame.id);
      if (realIdx >= 0) onSelectGame(realIdx);
    } else if (ribbonRef.current) {
      ribbonRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!displayedGames || displayedGames.length === 0) return;

    const now = Date.now();
    if (now - lastWheelTimeRef.current < 360) {
      return;
    }

    const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
    if (Math.abs(delta) < 18) return;

    if (delta > 0) {
      if (displayedIndex < displayedGames.length - 1) {
        const nextGame = displayedGames[displayedIndex + 1];
        const realIdx = games.findIndex((g) => g.id === nextGame.id);
        if (realIdx >= 0) {
          lastWheelTimeRef.current = now;
          isWheelScrollingRef.current = true;
          if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
          wheelTimeoutRef.current = setTimeout(() => {
            isWheelScrollingRef.current = false;
          }, 450);

          audioEngine.playHover();
          onSelectGame(realIdx);
        }
      }
    } else if (delta < 0) {
      if (displayedIndex > 0) {
        const prevGame = displayedGames[displayedIndex - 1];
        const realIdx = games.findIndex((g) => g.id === prevGame.id);
        if (realIdx >= 0) {
          lastWheelTimeRef.current = now;
          isWheelScrollingRef.current = true;
          if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
          wheelTimeoutRef.current = setTimeout(() => {
            isWheelScrollingRef.current = false;
          }, 450);

          audioEngine.playHover();
          onSelectGame(realIdx);
        }
      }
    }
  };

  const formatPlaytime = (mins: number) => {
    if (!mins || mins === 0) return 'Never Played';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m Played`;
    return `${h}h ${m}m Played`;
  };

  if (!activeGame) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/50">
        No games in library. Click "+ Add Game" to start.
      </div>
    );
  }

  return (
    <div
      className="relative flex-1 w-full h-[calc(100vh-3.5rem)] flex flex-col justify-between overflow-hidden select-none isolate pb-6"
      onWheel={handleWheel}
      onMouseMove={handleContainerMouseMove}
      onMouseLeave={handleContainerMouseLeave}
    >
      {/* Dynamic Fullscreen Cinematic Wallpaper & Looping Scene with Crossfade */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Previous outgoing backdrop during crossfade */}
        {previousBg && isCrossfading && (
          <div className="absolute inset-0 z-0 opacity-0 transition-opacity duration-700 ease-out overflow-hidden">
            <img
              src={previousBg}
              alt="Previous Backdrop"
              className={`w-full h-full object-cover object-center filter ${blurClasses.mediaFilter} ${blurClasses.mediaScale} brightness-90`}
            />
          </div>
        )}

        {/* Dynamic ambient color glow from game theme */}
        <div
          className="absolute inset-0 transition-all duration-1000 opacity-60 pointer-events-none z-10"
          style={{
            background: `radial-gradient(circle at 70% 25%, var(--game-glow) 0%, transparent 65%)`
          }}
        />

        {/* Looping Game Scene: Video OR Breathing Wallpaper with Ken Burns animation */}
        {activeGame.videoUrl && !videoError ? (
          <video
            ref={videoRef}
            key={activeGame.videoUrl}
            src={normalizeMediaUrl(activeGame.videoUrl)}
            autoPlay
            loop
            muted
            playsInline
            onError={() => setVideoError(true)}
            className={`w-full h-full object-cover object-center filter ${blurClasses.mediaFilter} ${blurClasses.mediaScale} brightness-95 contrast-105 transition-all duration-700`}
          />
        ) : bgImage ? (
          <div className="w-full h-full overflow-hidden">
            <img
              key={`${bgImage}-${bgFallbackLevel}`}
              src={bgImage}
              alt={activeGame.title}
              onError={() => setBgFallbackLevel((lvl) => lvl + 1)}
              className={`w-full h-full object-cover object-center filter ${blurClasses.mediaFilter} ${blurClasses.mediaScale} brightness-95 contrast-105 animate-kenburns transition-opacity duration-700 ease-out`}
            />
          </div>
        ) : null}

        {/* Frosted Glass Cinematic Backdrop Blur Layer */}
        {backgroundBlur !== 'none' && (
          <div className={`absolute inset-0 ${blurClasses.overlay} pointer-events-none z-10 transition-all duration-500`} />
        )}

        {/* Atmospheric Theme Color Wash (Silky smooth, zero GPU dither noise) */}
        <div
          className="absolute inset-0 transition-all duration-1000 opacity-10 pointer-events-none z-10"
          style={{ background: 'radial-gradient(ellipse at 50% 30%, var(--game-accent), transparent 75%)' }}
        />

        {/* Cinematic Vignette Gradients (Smooth falloff, no harsh dark band over title text) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--global-bg-start)]/95 via-[var(--global-bg-start)]/40 via-35% to-transparent to-65% z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--global-bg-start)]/75 via-[var(--global-bg-start)]/20 via-40% to-transparent z-10 pointer-events-none" />

        {/* Dynamic Game Vibe Atmospheric Overlay (Cyber grid, Gothic embers, CRT raster, etc.) */}
        <AtmosphericOverlay vibeConfig={vibeConfig} accentColor={activeGame?.theme?.accentColor || '#00f0ff'} />
      </div>

      {/* TOP SECTION: Console Horizontal Game Ribbon */}
      <div className="pt-2 px-3 sm:px-6 md:px-10 z-20 w-full min-w-0">
        {/* Collection Filter Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 pt-2 pb-0 px-1 sm:px-4 z-30 overflow-x-auto no-scrollbar max-w-full flex-nowrap sm:flex-wrap">
          {[
            { id: 'all', label: 'All Titles', count: games.length },
            { id: 'playing', label: 'Now Playing', count: games.filter((g) => g.collection === 'playing').length },
            { id: 'backlog', label: 'Backlog', count: games.filter((g) => g.collection === 'backlog').length },
            { id: 'completed', label: 'Completed', count: games.filter((g) => g.collection === 'completed').length },
            { id: 'favorites', label: 'Favorites', count: games.filter((g) => g.favorite).length }
          ].map((tab) => {
            const isActive = activeCollection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  audioEngine.playSelect();
                  setActiveCollection(tab.id as 'all' | 'playing' | 'backlog' | 'completed' | 'favorites');
                  const nextList = games.filter((g) => {
                    if (tab.id === 'all') return true;
                    if (tab.id === 'favorites') return g.favorite;
                    return g.collection === tab.id;
                  });
                  if (nextList.length > 0) {
                    const isCurrentIn = nextList.some((g) => g.id === activeGame?.id);
                    if (!isCurrentIn) {
                      const firstReal = games.findIndex((g) => g.id === nextList[0].id);
                      if (firstReal >= 0) onSelectGame(firstReal);
                    }
                  }
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white/20 text-white border border-white/30 shadow-md backdrop-blur-md'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-[var(--game-accent)] text-black font-bold'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Horizontal Game Ribbon with Edge Controls */}
        <div className="relative group/ribbon w-full min-w-0">
          {/* Left Navigation Chevron Button */}
          {displayedIndex > 0 && (
            <button
              type="button"
              onClick={scrollRibbonLeft}
              aria-label="Previous Game"
              className={`absolute left-0 sm:-left-4 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-2.5 rounded-full bg-black/75 hover:bg-black/95 border border-white/20 hover:border-white/50 text-white/80 hover:text-white shadow-[0_8px_24px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all cursor-pointer ${
                showLeftScrollBtn ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Right Navigation Chevron Button */}
          {displayedIndex < displayedGames.length - 1 && (
            <button
              type="button"
              onClick={scrollRibbonRight}
              aria-label="Next Game"
              className={`absolute right-0 sm:-right-4 top-1/2 -translate-y-1/2 z-40 p-2 sm:p-2.5 rounded-full bg-black/75 hover:bg-black/95 border border-white/20 hover:border-white/50 text-white/80 hover:text-white shadow-[0_8px_24px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all cursor-pointer ${
                showRightScrollBtn ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div
            ref={ribbonRef}
            className="flex items-center gap-7 overflow-x-auto no-scrollbar pt-6 pb-14 px-8 scroll-smooth min-h-[390px] transform-gpu relative z-10"
          >
            {displayedGames.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full py-16 text-white/50 text-xs">
                <p className="font-semibold text-white/80 text-sm">No games in this collection</p>
                <p className="text-[11px] text-white/40 mt-1">Open the theme editor or game hub to organize titles into this collection</p>
              </div>
            ) : (
              displayedGames.map((game, idx) => {
                const isSelected = idx === displayedIndex;
                const realIndex = games.findIndex((g) => g.id === game.id);
                const itemVibe = ThemeEngine.getVibeConfig(game.theme?.vibe, game);
                return (
                  /* 2-LAYER CARD ARCHITECTURE:
                     Outer container handles unclipped glow, drop-shadow, scaling, and hover transforms.
                     Inner container handles signature polygon clip paths with a crisp glowing border.
                  */
                  <div
                    key={game.id}
                    onClick={() => {
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                        hoverTimeoutRef.current = null;
                      }
                      if (!isSelected && realIndex >= 0) {
                        audioEngine.playHover();
                        onSelectGame(realIndex);
                      }
                    }}
                    onMouseEnter={() => handleCardMouseEnter(realIndex, isSelected)}
                    onMouseLeave={handleCardMouseLeave}
                    style={{
                      filter: isSelected && itemVibe.cardClipPath
                        ? 'drop-shadow(0 16px 14px rgba(0,0,0,0.7))'
                        : undefined
                    }}
                    className={`relative flex-shrink-0 cursor-pointer transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu will-change-transform ${
                      isSelected
                        ? 'w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 -translate-y-3.5 scale-105 z-30'
                        : 'w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44 opacity-65 hover:opacity-95 hover:scale-105 z-10'
                    }`}
                  >
                    {/* Inner Clipped Card */}
                    <div
                      style={{
                        clipPath: isSelected ? itemVibe.cardClipPath : undefined
                      }}
                      className={`relative w-full h-full overflow-hidden transition-all duration-400 ${
                        isSelected
                          ? `${itemVibe.cardSelectedShape} border-2 border-[var(--game-accent,#2ee5ba)] shadow-[0_18px_36px_-6px_rgba(0,0,0,0.8)]`
                          : `${itemVibe.cardShape} border-2 border-white/15 hover:border-white/40 shadow-md`
                      }`}
                    >
                      <GameCover
                        src={normalizeMediaUrl(game.coverUrl)}
                        title={game.title}
                        accent={game.theme?.accentColor}
                        className={`w-full h-full object-cover object-top transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          isSelected ? 'scale-100 brightness-105 contrast-105' : 'filter brightness-90 contrast-95'
                        }`}
                      />

                      {/* Animated Specular Light Bar Sweep for active card */}
                      {isSelected && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
                          <div className="absolute inset-0 -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-r from-transparent via-white/20 to-transparent specular-light-sweep" />
                        </div>
                      )}

                      {/* Quick Resume badge */}
                      {game.id === mostRecentGameId && (
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#2ee5ba] text-black text-[10px] font-black tracking-wider shadow-md animate-pulse z-20">
                          <RotateCcw className="w-3 h-3" />
                          <span>RESUME</span>
                        </div>
                      )}

                      {/* Favorite badge */}
                      {game.favorite && (
                        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center z-20 border border-white/20">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        </div>
                      )}

                      {/* Collection status indicator badge */}
                      {game.collection && game.collection !== 'none' && (
                        <div className={`absolute top-3 ${game.favorite ? 'right-12' : 'right-3'} px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[9px] font-black tracking-wider uppercase border border-white/20 z-20 flex items-center gap-1`}>
                          {game.collection === 'playing' && <span className="text-emerald-400">PLAYING</span>}
                          {game.collection === 'backlog' && <span className="text-amber-400">BACKLOG</span>}
                          {game.collection === 'completed' && <span className="text-purple-400">★ 100%</span>}
                        </div>
                      )}

                      {/* Active Card Label & Logo Sheen */}
                      {isSelected && (
                        <div className="absolute inset-x-0 bottom-0 pt-16 pb-3.5 px-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-center z-20 pointer-events-none">
                          {game.theme?.logoUrl ? (
                            <img
                              src={normalizeMediaUrl(game.theme.logoUrl)}
                              alt={game.title}
                              className="max-h-9 max-w-[88%] object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                            />
                          ) : (
                            <p className="text-sm font-black text-white truncate tracking-wider uppercase drop-shadow-md text-center">
                              {game.title}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: PS5 Hero Bar */}
      <div key={activeGame.id} className="pb-6 sm:pb-10 px-4 sm:px-8 md:px-14 z-20 flex flex-col justify-end max-w-5xl space-y-3 sm:space-y-3.5 animate-heroEnter transform-gpu min-w-0">
        {/* Badges / Genres */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            style={{ color: 'var(--game-accent-contrast)' }}
            className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[var(--game-accent)] shadow-sm drop-shadow-sm"
          >
            {activeGame.type}
          </span>

          {/* Active Aesthetic Vibe Badge */}
          <button
            type="button"
            onClick={() => {
              audioEngine.playSelect();
              onOpenThemeEditor?.(activeGame);
            }}
            title="Game Aesthetic Vibe: Click to customize buttons, fonts, and atmosphere"
            className={`px-2.5 py-1 text-[11px] font-bold tracking-wider flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm ${vibeConfig.badgeShape}`}
            style={{ borderColor: 'var(--game-accent)' }}
          >
            <span>{vibeConfig.badgeIcon}</span>
            <span className="text-[var(--game-accent)]">{vibeConfig.badgeLabel}</span>
          </button>

          {/* Game Version Badge */}
          {activeGame.version && (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold glass-pill text-white/95 border border-white/20 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--game-accent)] inline-block shadow-[0_0_6px_var(--game-glow)]" />
              <span>{activeGame.version.startsWith('v') || activeGame.version.startsWith('V') ? activeGame.version : `v${activeGame.version}`}</span>
            </span>
          )}

          {/* Collection Status Pill */}
          {activeGame.collection && activeGame.collection !== 'none' && (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider glass-pill border border-white/25 flex items-center gap-1.5 shadow-sm">
              <Bookmark className="w-3 h-3 text-[var(--game-accent)]" />
              <span>
                {activeGame.collection === 'playing' ? 'Now Playing' : activeGame.collection === 'backlog' ? 'In Backlog' : 'Completed 100%'}
              </span>
            </span>
          )}

          {/* Metacritic Score */}
          {activeGame.metadata?.metacritic && (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
              <span>Metascore:</span>
              <span className="font-mono font-black">{activeGame.metadata.metacritic}</span>
            </span>
          )}

          {/* Trophies Progress Pill */}
          {activeGame.achievements && activeGame.achievements.length > 0 && (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>{activeGame.achievements.filter((a) => a.unlocked).length}/{activeGame.achievements.length} Trophies</span>
            </span>
          )}

          {/* HowLongToBeat Duration Badge */}
          {(() => {
            const hltb = activeGame.hltb || activeGame.metadata?.hltb;
            if (!hltb || (!hltb.mainStoryHours && !hltb.completionistHours)) return null;
            return (
              <span
                title={`Main Story: ${hltb.mainStoryHours}h • Main + Extra: ${hltb.mainExtraHours || '--'}h • 100%: ${hltb.completionistHours || '--'}h`}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-sky-300 bg-sky-500/15 border border-sky-500/30 flex items-center gap-1.5 shadow-sm"
              >
                <Timer className="w-3.5 h-3.5 text-sky-400" />
                <span>Story: {hltb.mainStoryHours}h</span>
                {hltb.completionistHours > 0 && (
                  <>
                    <span className="text-white/30">•</span>
                    <span className="text-sky-200/80">100%: {hltb.completionistHours}h</span>
                  </>
                )}
              </span>
            );
          })()}

          {activeGame.genres
            .filter((g) => g.toLowerCase() !== activeGame.type.toLowerCase())
            .map((g) => (
              <span
                key={g}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium tracking-wide glass-pill text-white/80"
              >
                {g}
              </span>
            ))}

          {activeGame.stats.playtimeMinutes > 3000 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-amber-300 bg-amber-500/20 border border-amber-500/30">
              <Flame className="w-3 h-3 text-amber-400" />
              Most Played
            </span>
          )}
        </div>

        {/* Title or Stylized Procedural Title Logo */}
        {activeGame.theme?.logoUrl && !logoError ? (
          <div className="h-28 sm:h-36 md:h-44 flex items-center">
            <img
              src={normalizeMediaUrl(activeGame.theme.logoUrl)}
              alt={activeGame.title}
              onError={() => setLogoError(true)}
              className="max-h-28 sm:max-h-36 md:max-h-44 max-w-xl md:max-w-2xl object-contain filter drop-shadow-xl transition-all duration-300 transform origin-left hover:scale-105"
            />
          </div>
        ) : (
          <ProceduralTitleLogo
            title={activeGame.title}
            vibe={activeGame.theme?.vibe}
            accentColor={activeGame.theme?.accentColor}
          />
        )}

        {/* Famous Dialogue / Monologue Badge */}
        {activeGame.quote?.text && (
          <div className="flex items-start sm:items-center gap-2.5 max-w-2xl px-4 py-2.5 rounded-2xl bg-black/45 backdrop-blur-md border border-white/10 shadow-lg group/quote transition-all duration-300 hover:border-white/20">
            <Quote className="w-4 h-4 text-[var(--game-accent)] flex-shrink-0 mt-0.5 sm:mt-0 opacity-80 group-hover/quote:scale-110 transition-transform" />
            <div className="flex flex-wrap items-baseline gap-x-2 text-xs sm:text-sm">
              <span className="text-white/95 italic font-serif tracking-wide drop-shadow">
                “{activeGame.quote.text}”
              </span>
              {activeGame.quote.speaker && (
                <span className="text-[var(--game-accent)] font-semibold text-[11px] sm:text-xs not-italic whitespace-nowrap opacity-90">
                  — {activeGame.quote.speaker}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {activeGame.description && (
          <p className="text-white/70 text-sm line-clamp-2 max-w-2xl leading-relaxed drop-shadow">
            {activeGame.description}
          </p>
        )}

        {/* Playtime & Status Stats */}
        <div className="flex items-center gap-4 text-xs text-white/75 py-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[var(--game-accent)]" />
            <span className="font-semibold text-white">{formatPlaytime(activeGame.stats.playtimeMinutes)}</span>
          </div>

          {activeGame.stats.lastPlayed && (
            <>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span className="text-white/50">
                Last played {new Date(activeGame.stats.lastPlayed).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </span>
            </>
          )}

          {activeGame.theme.accentColor && (
            <div className="flex items-center gap-1.5 ml-2">
              <Sparkles className="w-3 h-3 text-[var(--game-accent)]" />
              <span className="text-[10px] uppercase text-white/40 tracking-wider">Dynamic Theme Active</span>
            </div>
          )}

          {(() => {
            const hltb = activeGame.hltb || activeGame.metadata?.hltb;
            if (!hltb || !hltb.mainStoryHours) return null;
            const progress = Math.min(100, Math.round(((activeGame.stats.playtimeMinutes / 60) / hltb.mainStoryHours) * 100));
            return (
              <>
                <span className="w-1 h-1 rounded-full bg-white/30 hidden sm:inline-block" />
                <span className="text-sky-300/80 font-mono text-[11px] hidden sm:flex items-center gap-1">
                  <Timer className="w-3 h-3 text-sky-400" />
                  <span>Campaign: {progress}%</span>
                </span>
              </>
            );
          })()}
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-4 pt-2 flex-wrap">
          {/* Primary Launch Button styled according to Game Vibe */}
          <button
            onClick={() => {
              audioEngine.playLaunch();
              onLaunchGame(activeGame);
            }}
            style={{
              clipPath: vibeConfig.buttonClipPath,
              color: vibeConfig.buttonBgOverride ? undefined : 'var(--game-accent-contrast)'
            }}
            className={`flex items-center gap-3 px-8 py-3.5 ${vibeConfig.buttonShape} ${vibeConfig.buttonBorder || ''} ${vibeConfig.buttonBgOverride || 'bg-[var(--game-accent)]'} ${vibeConfig.buttonTypography} hover:brightness-110 hover:scale-105 active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${vibeConfig.buttonShadow || 'shadow-[0_0_30px_var(--game-glow)]'} cursor-pointer drop-shadow-sm transform-gpu`}
          >
            {isMostRecent ? (
              <RotateCcw className="w-5 h-5 font-bold flex-shrink-0" />
            ) : (
              <Play className="w-5 h-5 fill-current flex-shrink-0" />
            )}
            <span>{playButtonLabel}</span>
          </button>

          {/* Game Overview Hub & Trophies */}
          {onOpenOverview && (
            <button
              onClick={() => {
                audioEngine.playSelect();
                onOpenOverview(activeGame);
              }}
              title="Game Hub: Trophies, Gallery & Metadata (Space or Gamepad X)"
              style={{ clipPath: vibeConfig.secondaryBtnClipPath }}
              className={secondaryBtnClass}
            >
              <Trophy className="w-4 h-4 text-[var(--game-accent)] flex-shrink-0" />
              <span>Game Hub</span>
            </button>
          )}

          {/* Notes Drawer Button */}
          <button
            onClick={() => {
              audioEngine.playSelect();
              onOpenNotes();
            }}
            title="Field Notes & Cheats (F1 or Gamepad Y)"
            style={{ clipPath: vibeConfig.secondaryBtnClipPath }}
            className={secondaryBtnClass}
          >
            <BookOpen className="w-4 h-4 text-[var(--game-accent)] flex-shrink-0" />
            <span>Notes (F1)</span>
          </button>

          {/* Favorite Toggle */}
          <button
            onClick={() => {
              audioEngine.playSelect();
              onToggleFavorite(activeGame.id);
            }}
            title={activeGame.favorite ? 'Remove Favorite' : 'Mark Favorite'}
            style={{ clipPath: vibeConfig.secondaryBtnClipPath }}
            className={`${secondaryIconBtnClass} ${
              activeGame.favorite ? 'border-yellow-400/50 bg-yellow-400/10 text-yellow-400' : ''
            }`}
          >
            <Star className={`w-5 h-5 ${activeGame.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-white/70'}`} />
          </button>

          {/* Open Folder / Location */}
          <button
            onClick={() => {
              audioEngine.playSelect();
              onOpenFolder(activeGame);
            }}
            title="Open Game Location"
            style={{ clipPath: vibeConfig.secondaryBtnClipPath }}
            className={secondaryIconBtnClass}
          >
            <FolderOpen className="w-5 h-5" />
          </button>

          {/* Dedicated Theme Editor */}
          {onOpenThemeEditor && (
            <button
              onClick={() => {
                audioEngine.playSelect();
                onOpenThemeEditor(activeGame);
              }}
              title="Customize Dedicated Game Theme (Vibe, Logo, Backdrop, Music, Colors)"
              style={{ clipPath: vibeConfig.secondaryBtnClipPath }}
              className={`${secondaryIconBtnClass} group`}
            >
              <Palette className="w-5 h-5 group-hover:text-[var(--game-accent)] transition-colors" />
            </button>
          )}

          {/* Remove Game from Library */}
          {(onRequestRemoveGame || onRemoveGame) && (
            <button
              onClick={() => {
                audioEngine.playSelect();
                if (onRequestRemoveGame) {
                  onRequestRemoveGame(activeGame);
                } else if (onRemoveGame) {
                  onRemoveGame(activeGame.id);
                }
              }}
              title="Remove Game from Library"
              style={{ clipPath: vibeConfig.secondaryBtnClipPath }}
              className={`p-3.5 ${vibeConfig.secondaryBtnShape} ${vibeConfig.secondaryBtnBorder || 'border border-white/15'} ${vibeConfig.secondaryBtnBg || 'glass-panel'} text-white/40 hover:text-rose-400 hover:border-rose-400/40 hover:bg-rose-500/10 transition-all cursor-pointer group`}
            >
              <Trash2 className="w-5 h-5 transition-colors" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const PS5View = ConsoleView;
