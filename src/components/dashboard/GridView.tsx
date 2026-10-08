import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Play, Star, Clock, Filter, Trash2, Trophy, Bookmark, LayoutGrid, Rows3, Image as ImageIcon, Quote, EyeOff } from 'lucide-react';
import type { Game } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { ThemeEngine } from '../../services/themeEngine';
import { normalizeMediaUrl } from '../../utils/mediaUrl';
import { GameCover } from '../GameCover';

export type GridDensity = 'poster' | 'banner' | 'compact';

interface GridViewProps {
  games: Game[];
  selectedGameIndex: number;
  onSelectGame: (index: number) => void;
  onLaunchGame: (game: Game) => void;
  onToggleFavorite: (gameId: string) => void;
  onOpenOverview?: (game: Game) => void;
  onRequestRemoveGame?: (game: Game) => void;
  onRemoveGame?: (gameId: string) => void;
  initialDensity?: GridDensity;
  onDensityChange?: (density: GridDensity) => void;
}

export const GridView: React.FC<GridViewProps> = ({
  games,
  selectedGameIndex,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
  onOpenOverview,
  onRequestRemoveGame,
  onRemoveGame,
  initialDensity = 'poster',
  onDensityChange
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'lastPlayed' | 'playtime' | 'title'>('lastPlayed');
  const [density, setDensity] = useState<GridDensity>(initialDensity);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleSetDensity = useCallback((newDensity: GridDensity) => {
    audioEngine.playSelect();
    setDensity(newDensity);
    onDensityChange?.(newDensity);
  }, [onDensityChange]);

  const visibleGamesCount = useMemo(() => games.filter((g) => !g.hidden).length, [games]);
  const hiddenGamesCount = useMemo(() => games.filter((g) => g.hidden).length, [games]);

  // Filter and sort games
  const filteredGames = useMemo(() => {
    return games
      .filter((g) => {
        // If viewing hidden category, only show hidden games
        if (activeFilter === 'hidden') {
          if (!g.hidden) return false;
        } else {
          // In standard views, hide games marked hidden
          if (g.hidden) return false;
        }

        const matchesSearch =
          g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.genres.some((genre) => genre.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        if (activeFilter === 'all' || activeFilter === 'hidden') return true;
        if (activeFilter === 'favorites') return g.favorite;
        if (activeFilter === 'playing') return g.collection === 'playing';
        if (activeFilter === 'backlog') return g.collection === 'backlog';
        if (activeFilter === 'completed') return g.collection === 'completed';
        if (activeFilter === 'standalone') return g.type === 'standalone';
        if (activeFilter === 'steam') return g.type === 'steam';
        return g.genres.includes(activeFilter);
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'playtime') return b.stats.playtimeMinutes - a.stats.playtimeMinutes;
        const aDate = a.stats.lastPlayed ? new Date(a.stats.lastPlayed).getTime() : 0;
        const bDate = b.stats.lastPlayed ? new Date(b.stats.lastPlayed).getTime() : 0;
        return bDate - aDate;
      });
  }, [games, activeFilter, searchQuery, sortBy]);

  // ID-to-index lookup map for O(1) performance (addresses audit finding 2.4)
  const gameIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    games.forEach((g, idx) => map.set(g.id, idx));
    return map;
  }, [games]);

  // 2D Directional Keyboard Navigation
  const getColumnCount = useCallback(() => {
    if (density === 'compact') return 1;
    if (typeof window === 'undefined') return 4;
    const w = window.innerWidth;
    if (density === 'banner') {
      if (w >= 1536) return 4;
      if (w >= 1024) return 3;
      if (w >= 640) return 2;
      return 1;
    }
    // poster
    if (w >= 1536) return 6;
    if (w >= 1280) return 5;
    if (w >= 1024) return 4;
    if (w >= 640) return 3;
    return 2;
  }, [density]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in search input
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (filteredGames.length === 0) return;

      const currentTarget = games[selectedGameIndex];
      const currentFilteredIdx = currentTarget
        ? filteredGames.findIndex((g) => g.id === currentTarget.id)
        : 0;
      const validCurrentIdx = currentFilteredIdx >= 0 ? currentFilteredIdx : 0;
      const cols = getColumnCount();

      let nextFilteredIdx = validCurrentIdx;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextFilteredIdx = Math.min(validCurrentIdx + 1, filteredGames.length - 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nextFilteredIdx = Math.max(validCurrentIdx - 1, 0);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        nextFilteredIdx = Math.min(validCurrentIdx + cols, filteredGames.length - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nextFilteredIdx = Math.max(validCurrentIdx - cols, 0);
      } else if (e.key.toLowerCase() === 'v') {
        e.preventDefault();
        // Cycle density with 'V'
        const nextDensity: GridDensity =
          density === 'poster' ? 'banner' : density === 'banner' ? 'compact' : 'poster';
        handleSetDensity(nextDensity);
        return;
      }

      if (nextFilteredIdx !== validCurrentIdx) {
        const nextGame = filteredGames[nextFilteredIdx];
        const realIdx = gameIndexMap.get(nextGame.id);
        if (realIdx !== undefined) {
          audioEngine.playHover();
          onSelectGame(realIdx);

          // Scroll card smoothly into viewport
          const el = cardRefs.current.get(nextGame.id);
          if (el) {
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
      }
    },
    [filteredGames, games, selectedGameIndex, density, getColumnCount, gameIndexMap, onSelectGame, handleSetDensity]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const formatPlaytime = (mins: number) => {
    if (!mins || mins === 0) return '0h';
    const h = Math.floor(mins / 60);
    return `${h}h`;
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden px-8 py-4 select-none isolate pb-14"
    >
      {/* Dynamic Ambient Background Wallpaper */}
      {games[selectedGameIndex] && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            key={games[selectedGameIndex]?.backdropUrl || games[selectedGameIndex]?.coverUrl}
            src={normalizeMediaUrl(games[selectedGameIndex]?.backdropUrl || games[selectedGameIndex]?.coverUrl)}
            alt="Backdrop"
            className="w-full h-full object-cover filter blur-3xl opacity-35 scale-110 transition-all duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--global-bg-start)] via-transparent to-[var(--global-bg-start)]/70" />
        </div>
      )}

      {/* Controls Bar: Filter Pills, Search & Density Switcher */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10 flex-wrap z-10">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => {
              audioEngine.playHover();
              setActiveFilter('all');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all ${
              activeFilter === 'all'
                ? 'bg-[var(--game-accent)] text-[var(--game-accent-contrast,#000000)] font-semibold shadow-md'
                : 'glass-pill text-white/70 hover:text-white'
            }`}
          >
            All ({visibleGamesCount})
          </button>

          <button
            onClick={() => {
              audioEngine.playHover();
              setActiveFilter('playing');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
              activeFilter === 'playing'
                ? 'bg-[var(--game-accent)] text-[var(--game-accent-contrast,#000000)] font-semibold shadow-md'
                : 'glass-pill text-white/70 hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Playing</span>
          </button>

          <button
            onClick={() => {
              audioEngine.playHover();
              setActiveFilter('backlog');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
              activeFilter === 'backlog'
                ? 'bg-[var(--game-accent)] text-[var(--game-accent-contrast,#000000)] font-semibold shadow-md'
                : 'glass-pill text-white/70 hover:text-white'
            }`}
          >
            <Bookmark className="w-3 h-3 text-amber-400" />
            <span>Backlog</span>
          </button>

          <button
            onClick={() => {
              audioEngine.playHover();
              setActiveFilter('completed');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
              activeFilter === 'completed'
                ? 'bg-[var(--game-accent)] text-[var(--game-accent-contrast,#000000)] font-semibold shadow-md'
                : 'glass-pill text-white/70 hover:text-white'
            }`}
          >
            <Trophy className="w-3 h-3 text-purple-400" />
            <span>Completed</span>
          </button>

          <button
            onClick={() => {
              audioEngine.playHover();
              setActiveFilter('favorites');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
              activeFilter === 'favorites'
                ? 'bg-[var(--game-accent)] text-[var(--game-accent-contrast,#000000)] font-semibold shadow-md'
                : 'glass-pill text-white/70 hover:text-white'
            }`}
          >
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span>Favorites</span>
          </button>

          {hiddenGamesCount > 0 && (
            <button
              onClick={() => {
                audioEngine.playHover();
                setActiveFilter('hidden');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                activeFilter === 'hidden'
                  ? 'bg-amber-500 text-black font-bold shadow-md ring-1 ring-amber-400'
                  : 'glass-pill text-amber-400/80 hover:text-amber-300 border border-amber-500/20'
              }`}
            >
              <EyeOff className="w-3 h-3 text-amber-400" />
              <span>Hidden ({hiddenGamesCount})</span>
            </button>
          )}
        </div>

        {/* Right Tools: View Density Switcher, Sort & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Density Switcher */}
          <div className="flex items-center glass-pill rounded-lg p-0.5 border border-white/15">
            <button
              onClick={() => handleSetDensity('poster')}
              title="Poster Capsule View (2:3)"
              className={`p-1.5 rounded-md cursor-pointer transition-all ${
                density === 'poster'
                  ? 'bg-[var(--game-accent)] text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetDensity('banner')}
              title="Cinematic Banner View (16:9)"
              className={`p-1.5 rounded-md cursor-pointer transition-all ${
                density === 'banner'
                  ? 'bg-[var(--game-accent)] text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetDensity('compact')}
              title="Dense List View"
              className={`p-1.5 rounded-md cursor-pointer transition-all ${
                density === 'compact'
                  ? 'bg-[var(--game-accent)] text-black font-bold shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Rows3 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search input */}
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-lg glass-pill border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[var(--game-accent)] w-36 sm:w-48 transition-all"
          />

          {/* Sort selector */}
          <div className="flex items-center gap-1 text-xs text-white/60 glass-pill px-2.5 py-1 rounded-lg border border-white/10">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'lastPlayed' | 'playtime' | 'title')}
              className="bg-transparent border-none text-white/80 focus:outline-none cursor-pointer"
            >
              <option value="lastPlayed" className="bg-[#0b0e14]">Last Played</option>
              <option value="playtime" className="bg-[#0b0e14]">Most Played</option>
              <option value="title" className="bg-[#0b0e14]">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 overflow-y-auto py-6 px-8 z-10">
        {filteredGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/50 text-xs">
            <p className="font-semibold text-white/70 text-sm">No games found</p>
            <p className="text-[11px] text-white/40 mt-1">Try tweaking your search query or collection filter</p>
          </div>
        ) : density === 'compact' ? (
          /* COMPACT / LIST VIEW */
          <div className="flex flex-col gap-2">
            {filteredGames.map((game) => {
              const originalIndex = gameIndexMap.get(game.id) ?? 0;
              const isSelected = originalIndex === selectedGameIndex;
              const itemVibe = ThemeEngine.getVibeConfig(game.theme?.vibe, game);

              return (
                <div
                  key={game.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(game.id, el);
                    else cardRefs.current.delete(game.id);
                  }}
                  onClick={() => {
                    audioEngine.playHover();
                    onSelectGame(originalIndex);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-white/15 border-[var(--game-accent)] shadow-[0_0_20px_var(--game-glow)]'
                      : 'bg-black/40 border-white/10 hover:bg-white/5 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <GameCover
                      src={normalizeMediaUrl(game.coverUrl)}
                      title={game.title}
                      accent={game.theme?.accentColor}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-white truncate">{game.title}</h4>
                        <span className="text-xs">{itemVibe.badgeIcon}</span>
                        {game.favorite && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />}
                        {game.hidden && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <EyeOff className="w-2.5 h-2.5" />
                            Hidden
                          </span>
                        )}
                        {game.quote?.text && (
                          <span
                            title={`“${game.quote.text}”${game.quote.speaker ? ` — ${game.quote.speaker}` : ''}`}
                            className="hidden md:inline-flex items-center gap-1 text-[11px] text-[var(--game-accent)]/85 italic truncate max-w-xs xl:max-w-md ml-1"
                          >
                            <Quote className="w-2.5 h-2.5 flex-shrink-0 opacity-70" />
                            <span className="truncate">“{game.quote.text}”</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-white/50 mt-0.5">
                        <span className="uppercase">{game.type}</span>
                        <span>•</span>
                        <span>{game.genres.slice(0, 2).join(', ') || 'Game'}</span>
                        {game.version && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{game.version}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-semibold text-white flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3 text-[var(--game-accent)]" />
                        <span>{formatPlaytime(game.stats.playtimeMinutes)}</span>
                      </div>
                      <div className="text-[10px] text-white/40">
                        {game.stats.lastPlayed ? new Date(game.stats.lastPlayed).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Never'}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audioEngine.playLaunch();
                        onLaunchGame(game);
                      }}
                      className="px-4 py-2 rounded-lg bg-[var(--game-accent)] text-black font-bold text-xs flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* POSTER OR BANNER GRID */
          <div
            className={`grid gap-6 ${
              density === 'banner'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
            }`}
          >
            {filteredGames.map((game) => {
              const originalIndex = gameIndexMap.get(game.id) ?? 0;
              const isSelected = originalIndex === selectedGameIndex;
              const itemVibe = ThemeEngine.getVibeConfig(game.theme?.vibe, game);
              const cardImage = density === 'banner'
                ? (game.backdropUrl || game.coverUrl)
                : game.coverUrl;

              return (
                /* 2-LAYER CARD ARCHITECTURE FOR UNCLIPPED GLOW */
                <div
                  key={game.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(game.id, el);
                    else cardRefs.current.delete(game.id);
                  }}
                  onClick={() => {
                    audioEngine.playHover();
                    onSelectGame(originalIndex);
                  }}
                  style={{
                    filter: isSelected
                      ? itemVibe.id === 'retro-arcade'
                        ? 'drop-shadow(6px 6px 0px #000) drop-shadow(0 0 20px var(--game-glow))'
                        : itemVibe.id === 'anime-stylized'
                        ? 'drop-shadow(8px 8px 0px rgba(0,0,0,0.85)) drop-shadow(0 0 25px var(--game-glow))'
                        : 'drop-shadow(0 16px 18px rgba(0,0,0,0.75))'
                      : undefined
                  }}
                  className={`group relative cursor-pointer flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu will-change-transform hover:-translate-y-2 ${
                    isSelected ? 'scale-105 z-20' : 'z-10'
                  }`}
                >
                  {/* Inner Clipped Shape Container */}
                  <div
                    style={{
                      clipPath: isSelected ? itemVibe.cardClipPath : undefined
                    }}
                    className={`relative w-full overflow-hidden flex flex-col bg-[#0f131f] border transition-all duration-300 ${
                      isSelected
                        ? `${itemVibe.cardSelectedShape} ${itemVibe.cardSelectedRing} ${itemVibe.cardSelectedBorder || 'border-2 border-white/50'}`
                        : `${itemVibe.cardShape} border-white/10 hover:border-white/30 hover:shadow-2xl`
                    }`}
                  >
                    {/* Image Area */}
                    <div className={`relative w-full overflow-hidden ${density === 'banner' ? 'aspect-video' : 'aspect-[3/4]'}`}>
                      <GameCover
                        src={normalizeMediaUrl(cardImage)}
                        title={game.title}
                        accent={game.theme?.accentColor}
                        className="w-full h-full object-cover object-top group-hover:scale-103 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                      />

                      {/* Play & Hub Hover Overlay */}
                      <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity duration-250 flex items-center justify-center gap-3">
                        {onOpenOverview && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              audioEngine.playSelect();
                              onOpenOverview(game);
                            }}
                            title="Game Hub (Space)"
                            className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/35 flex items-center justify-center shadow-lg transform scale-90 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/25"
                          >
                            <Trophy className="w-5 h-5 text-amber-300" />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            audioEngine.playLaunch();
                            onLaunchGame(game);
                          }}
                          style={{
                            clipPath: itemVibe.buttonClipPath,
                            color: itemVibe.buttonBgOverride ? undefined : 'var(--game-accent-contrast)'
                          }}
                          className={`w-12 h-12 flex items-center justify-center shadow-lg transform scale-90 hover:scale-105 active:scale-95 transition-transform cursor-pointer ${itemVibe.buttonShape} ${itemVibe.buttonBgOverride || 'bg-[var(--game-accent)]'}`}
                        >
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </button>
                      </div>

                      {/* Favorite button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          audioEngine.playSelect();
                          onToggleFavorite(game.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white/70 hover:text-white"
                      >
                        <Star className={`w-3.5 h-3.5 ${game.favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </button>

                      {/* Remove Game button */}
                      {(onRequestRemoveGame || onRemoveGame) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            audioEngine.playSelect();
                            if (onRequestRemoveGame) {
                              onRequestRemoveGame(game);
                            } else if (onRemoveGame) {
                              onRemoveGame(game.id);
                            }
                          }}
                          title="Remove game"
                          className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 text-white/40 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Collection or Hidden badge */}
                      {game.hidden ? (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-amber-500/90 backdrop-blur-sm text-[9px] font-black uppercase tracking-wider text-black border border-amber-400 flex items-center gap-1 shadow-md">
                          <EyeOff className="w-2.5 h-2.5 text-black" />
                          <span>HIDDEN</span>
                        </div>
                      ) : game.collection && game.collection !== 'none' ? (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[9px] font-black uppercase tracking-wider text-white/90 border border-white/20">
                          {game.collection === 'playing' && <span className="text-emerald-400">PLAYING</span>}
                          {game.collection === 'backlog' && <span className="text-amber-400">BACKLOG</span>}
                          {game.collection === 'completed' && <span className="text-purple-400">★ 100%</span>}
                        </div>
                      ) : null}

                      {/* Playtime Badge */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] text-white/90">
                        <Clock className="w-2.5 h-2.5 text-[var(--game-accent)]" />
                        <span>{formatPlaytime(game.stats.playtimeMinutes)}</span>
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="p-3">
                      <div className="flex items-baseline justify-between gap-1.5">
                        <h3 className={`font-bold text-xs text-white truncate tracking-wide ${itemVibe.fontFamily}`}>{game.title}</h3>
                        {game.quote?.speaker && density === 'banner' && (
                          <span className="text-[10px] text-[var(--game-accent)]/80 font-medium truncate flex-shrink-0">
                            — {game.quote.speaker}
                          </span>
                        )}
                      </div>

                      {/* Famous dialogue / monologue snippet */}
                      {game.quote?.text && (
                        <p
                          title={`“${game.quote.text}”${game.quote.speaker ? ` — ${game.quote.speaker}` : ''}`}
                          className="text-[10px] text-white/60 italic truncate mt-0.5 flex items-center gap-1 group-hover:text-white/85 transition-colors"
                        >
                          <Quote className="w-2.5 h-2.5 text-[var(--game-accent)] flex-shrink-0 opacity-70" />
                          <span className="truncate">“{game.quote.text}”</span>
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-white/40 mt-1.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="uppercase">{game.type}</span>
                          <span className="text-[10px]" title={itemVibe.name}>{itemVibe.badgeIcon}</span>
                          {game.version && (
                            <span className="font-mono font-bold text-white/70 bg-white/10 px-1.5 py-0.5 rounded text-[9px]">
                              {game.version.startsWith('v') ? game.version : `v${game.version}`}
                            </span>
                          )}
                        </div>
                        {game.achievements && game.achievements.length > 0 ? (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <Trophy className="w-2.5 h-2.5" />
                            <span>{game.achievements.filter((a) => a.unlocked).length}/{game.achievements.length}</span>
                          </span>
                        ) : (
                          <span className="truncate">{game.genres[0] || 'Game'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
