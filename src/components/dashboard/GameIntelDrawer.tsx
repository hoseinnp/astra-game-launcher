import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Play, Clock, Trophy, FolderOpen, Palette, BookOpen, Star, Shield, Timer, Camera, Quote, Brain } from 'lucide-react';
import type { Game } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { normalizeMediaUrl } from '../../utils/mediaUrl';
import { ThemeEngine } from '../../services/themeEngine';
import { ArtworkService } from '../../services/artworkService';
import { AstraCoreIcon } from '../layout/AstraCoreIcon';
import { OracleStrategyService, type OracleIntelTopic } from '../../services/oracleStrategyService';

interface GameIntelDrawerProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunchGame: (game: Game) => void;
  onOpenFolder: (game: Game) => void;
  onOpenNotes: () => void;
  onOpenThemeEditor?: (game: Game) => void;
  onToggleFavorite: (gameId: string) => void;
  onUpdateGame?: (game: Game) => void;
  onTakeScreenshot?: (game: Game) => void;
}

export const GameIntelDrawer: React.FC<GameIntelDrawerProps> = ({
  game,
  isOpen,
  onClose,
  onLaunchGame,
  onOpenFolder,
  onOpenNotes,
  onOpenThemeEditor,
  onToggleFavorite,
  onUpdateGame,
  onTakeScreenshot
}) => {
  const [isFetchingHltb, setIsFetchingHltb] = useState(false);
  const checkedHltbRef = useRef<Set<string>>(new Set());

  // Auto-fetch HowLongToBeat completion statistics if missing
  useEffect(() => {
    if (!isOpen || !game || !onUpdateGame) return;
    const hasStats = Boolean(game.hltb || game.metadata?.hltb);
    if (!hasStats && !checkedHltbRef.current.has(game.id)) {
      checkedHltbRef.current.add(game.id);
      setIsFetchingHltb(true);
      ArtworkService.fetchHltb(game.title)
        .then((stats) => {
          if (stats) {
            onUpdateGame({
              ...game,
              hltb: stats,
              metadata: {
                ...game.metadata,
                hltb: stats
              }
            });
          }
        })
        .finally(() => {
          setIsFetchingHltb(false);
        });
    }
  }, [isOpen, game, onUpdateGame]);

  if (!isOpen || !game) return null;

  const vibeConfig = ThemeEngine.getVibeConfig(game.theme?.vibe, game);
  const achievements = game.achievements || [];
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const progressPercent = achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0;
  const hltb = game.hltb || game.metadata?.hltb;

  const [activeOracleCategory, setActiveOracleCategory] = useState<'all' | 'bosses' | 'builds' | 'hints' | 'lore'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const oracleProfile = useMemo(() => {
    return game ? OracleStrategyService.getProfileForGame(game) : null;
  }, [game]);

  const filteredOracleIntel = useMemo(() => {
    if (!oracleProfile) return [];
    if (activeOracleCategory === 'all') return oracleProfile.intel;
    return oracleProfile.intel.filter((item) => item.category === activeOracleCategory);
  }, [oracleProfile, activeOracleCategory]);

  const handleCopyIntel = (item: OracleIntelTopic) => {
    audioEngine.playSelect();
    const textToCopy = `[${oracleProfile?.universe}] ${item.title}\n${item.summary}\n• ${item.details.join('\n• ')}`;
    navigator.clipboard?.writeText(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatHours = (mins: number) => {
    if (!mins) return '0 hrs';
    const hrs = (mins / 60).toFixed(1);
    return `${hrs} hrs`;
  };

  return (
    <div
      role="dialog"
      aria-label="Game Intel Drawer"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md transition-all duration-300 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[85vh] overflow-y-auto glass-panel border-t border-x border-white/20 rounded-t-3xl shadow-[0_-15px_50px_rgba(0,0,0,0.85)] p-6 sm:p-8 flex flex-col gap-6 animate-fadeInUp select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section: Backdrop Strip & Controls */}
        <div className="relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden border border-white/15 shadow-xl">
          <img
            src={normalizeMediaUrl(game.backdropUrl || game.coverUrl)}
            alt={game.title}
            className="w-full h-full object-cover filter brightness-75 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-[#0b0e14]/40 to-transparent" />

          {/* Top Telemetry Tag */}
          <div className="absolute top-4 left-6 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15">
            <AstraCoreIcon size="xs" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-white/90 uppercase">
              ASTRA INTEL DECK
            </span>
          </div>

          {/* Close Button */}
          <button
            onClick={() => {
              audioEngine.playSelect();
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/90 transition-all cursor-pointer border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title & Badges in Banner */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase bg-black/80 text-[var(--game-accent)] border border-[var(--game-accent)]/40 shadow-[0_0_8px_var(--game-glow)]">
                  NODE // {game.id.slice(0, 8)}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--game-accent)] text-black">
                  {game.type}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider glass-pill text-white/90 border border-white/20">
                  {vibeConfig.badgeIcon} {vibeConfig.badgeLabel}
                </span>
                {game.version && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono glass-pill text-white/80">
                    {game.version.startsWith('v') ? game.version : `v${game.version}`}
                  </span>
                )}
              </div>
              <h2 className={`text-2xl sm:text-3xl font-black text-white drop-shadow-md tracking-wide ${vibeConfig.fontFamily}`}>
                {game.title}
              </h2>
              {game.quote?.text && (
                <p className="text-xs text-white/80 italic mt-1.5 max-w-xl font-serif flex items-center gap-1.5">
                  <Quote className="w-3 h-3 text-[var(--game-accent)] flex-shrink-0 opacity-80" />
                  <span>“{game.quote.text}”</span>
                  {game.quote.speaker && (
                    <span className="not-italic text-[var(--game-accent)] font-sans font-semibold text-[11px] ml-1">
                      — {game.quote.speaker}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Launch Game Button */}
            <button
              onClick={() => {
                audioEngine.playLaunch();
                onLaunchGame(game);
              }}
              style={{
                clipPath: vibeConfig.buttonClipPath,
                color: vibeConfig.buttonBgOverride ? undefined : 'var(--game-accent-contrast)'
              }}
              className={`flex items-center gap-2.5 px-6 py-3 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 ${vibeConfig.buttonShape} ${vibeConfig.buttonBgOverride || 'bg-[var(--game-accent)]'}`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch</span>
            </button>
          </div>
        </div>

        {/* 4-Column Intel Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Column 1: Playtime & Session Stats */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-white/80 font-bold text-xs uppercase tracking-wider mb-2.5">
                <Clock className="w-4 h-4 text-[var(--game-accent)]" />
                <span>Playtime & Sessions</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{formatHours(game.stats.playtimeMinutes)}</span>
                <span className="text-xs text-white/50">total logged</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-white/70 pt-2 border-t border-white/10">
              <div className="flex justify-between">
                <span className="text-white/40">Last Played:</span>
                <span className="font-medium text-white/90">
                  {game.stats.lastPlayed ? new Date(game.stats.lastPlayed).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Sessions Started:</span>
                <span className="font-medium text-white/90">{game.stats.playCount || 0} times</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Collection:</span>
                <span className="font-medium text-[var(--game-accent)] uppercase text-[10px] tracking-wider">
                  {game.collection || 'Unassigned'}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: HowLongToBeat Campaign Estimates & Progress */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between text-white/80 font-bold text-xs uppercase tracking-wider mb-2.5">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-sky-400" />
                  <span>HowLongToBeat</span>
                </div>
                {hltb && (
                  <span className="text-[9px] font-mono font-bold text-sky-400/90 bg-sky-400/10 px-1.5 py-0.5 rounded border border-sky-400/20">
                    VERIFIED
                  </span>
                )}
              </div>

              {isFetchingHltb ? (
                <div className="py-5 flex flex-col items-center justify-center gap-2 text-white/50 text-xs animate-pulse">
                  <Timer className="w-5 h-5 animate-spin text-sky-400" />
                  <span>Querying HLTB...</span>
                </div>
              ) : hltb ? (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black text-white font-mono">{hltb.mainStoryHours}</span>
                      <span className="text-xs text-white/60 font-semibold ml-1">hrs</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded border border-sky-500/30">
                      Main Story
                    </span>
                  </div>

                  {/* Campaign Progress vs Main Story */}
                  {hltb.mainStoryHours > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-white/50">Story Pace</span>
                        <span className="text-white/90 font-mono font-semibold">
                          {Math.round(((game.stats.playtimeMinutes / 60) / hltb.mainStoryHours) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-cyan-300 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                          style={{
                            width: `${Math.min(100, Math.round(((game.stats.playtimeMinutes / 60) / hltb.mainStoryHours) * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-white/40 flex flex-col items-center gap-1.5">
                  <Timer className="w-5 h-5 text-white/20" />
                  <span>No HLTB targets found</span>
                  {onUpdateGame && (
                    <button
                      onClick={() => {
                        if (isFetchingHltb) return;
                        setIsFetchingHltb(true);
                        ArtworkService.fetchHltb(game.title).then((stats) => {
                          if (stats) {
                            onUpdateGame({
                              ...game,
                              hltb: stats,
                              metadata: { ...game.metadata, hltb: stats }
                            });
                          }
                        }).finally(() => setIsFetchingHltb(false));
                      }}
                      className="mt-1 text-[10px] text-sky-400 hover:underline cursor-pointer"
                    >
                      Retry Search
                    </button>
                  )}
                </div>
              )}
            </div>

            {hltb && (
              <div className="space-y-1.5 text-xs text-white/70 pt-2 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-white/40">Main + Extra:</span>
                  <span className="font-semibold text-white/90 font-mono">
                    {hltb.mainExtraHours > 0 ? `${hltb.mainExtraHours} hrs` : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40">Completionist:</span>
                  <span className="font-semibold text-amber-300 font-mono">
                    {hltb.completionistHours > 0 ? `${hltb.completionistHours} hrs` : '--'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Trophies & Achievements Progress */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between text-white/80 font-bold text-xs uppercase tracking-wider mb-2.5">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Achievements</span>
                </div>
                <span className="text-amber-400 font-mono">{progressPercent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                <span>{unlockedCount} of {achievements.length} Unlocked</span>
                {progressPercent === 100 && (
                  <span className="text-amber-300 font-bold text-[10px]">★ Platinum</span>
                )}
              </div>
            </div>

            {/* Recent Unlocked Badges */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/10 overflow-x-auto no-scrollbar">
              {achievements.length === 0 ? (
                <span className="text-[11px] text-white/40 italic">No achievements cataloged</span>
              ) : (
                achievements.slice(0, 3).map((ach) => (
                  <div
                    key={ach.id}
                    title={`${ach.title}: ${ach.description}`}
                    className={`p-1.5 rounded-lg text-center flex-1 min-w-[50px] border ${
                      ach.unlocked
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                        : 'bg-black/40 border-white/10 text-white/30'
                    }`}
                  >
                    <Trophy className="w-3 h-3 mx-auto mb-0.5" />
                    <span className="text-[8px] block truncate font-medium">{ach.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 4: Game Specs & Metadata */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-white/80 font-bold text-xs uppercase tracking-wider mb-2.5">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span>Specs & Details</span>
              </div>

              <div className="space-y-1.5 text-xs text-white/70">
                {game.metadata?.developer && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Developer:</span>
                    <span className="font-medium text-white/90 truncate max-w-[120px]">{game.metadata.developer}</span>
                  </div>
                )}
                {game.metadata?.publisher && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Publisher:</span>
                    <span className="font-medium text-white/90 truncate max-w-[120px]">{game.metadata.publisher}</span>
                  </div>
                )}
                {game.metadata?.releaseDate && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Released:</span>
                    <span className="font-medium text-white/90 truncate max-w-[120px]">{game.metadata.releaseDate}</span>
                  </div>
                )}
                {game.metadata?.metacritic && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/40">Metacritic:</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                      {game.metadata.metacritic} / 100
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-white/70 pt-2 border-t border-white/10 flex justify-between">
              <span className="text-white/40">Run as Admin:</span>
              <span className="font-medium text-white/90">
                {game.compatibility?.runAsAdmin ? 'Yes' : 'Standard'}
              </span>
            </div>
          </div>
        </div>

        {/* Astra Game Oracle: Tactical Strategy & Lore Co-Pilot Deck */}
        {oracleProfile && (
          <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-4 relative overflow-hidden backdrop-blur-md">
            {/* Ambient Background Glow */}
            <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-[var(--game-accent)]/10 blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--game-accent)]/20 border border-[var(--game-accent)]/30 text-[var(--game-accent)] shadow-[0_0_12px_var(--game-glow)]">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>Astra Oracle</span>
                      <span className="text-[10px] font-mono text-[var(--game-accent)] font-semibold px-1.5 py-0.2 rounded bg-white/10 border border-white/15">
                        TACTICAL CO-PILOT
                      </span>
                    </h3>
                  </div>
                  <p className="text-xs text-white/50">{oracleProfile.tagline}</p>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all', 'bosses', 'builds', 'hints', 'lore'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      audioEngine.playSelect();
                      setActiveOracleCategory(cat);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer border ${
                      activeOracleCategory === cat
                        ? 'bg-[var(--game-accent)] text-black font-bold border-transparent shadow-[0_0_10px_var(--game-glow)]'
                        : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border-white/10'
                    }`}
                  >
                    {cat === 'all' ? 'All Intel' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Intel Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredOracleIntel.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-[var(--game-accent)] border border-white/15">
                        {item.badge}
                      </span>
                      <button
                        onClick={() => handleCopyIntel(item)}
                        className="text-[11px] text-white/40 hover:text-white flex items-center gap-1 cursor-pointer transition-colors px-1.5 py-0.5 rounded hover:bg-white/10"
                        title="Copy tactical brief to clipboard"
                      >
                        {copiedId === item.id ? (
                          <span className="text-emerald-400 font-semibold">Copied!</span>
                        ) : (
                          <span>Copy Brief</span>
                        )}
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-[var(--game-accent)] transition-colors">
                      {item.title}
                    </h4>

                    <p className="text-xs text-white/70 leading-relaxed font-sans">
                      {item.summary}
                    </p>

                    <div className="space-y-1 pt-2 border-t border-white/5">
                      {item.details.map((detail, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[11px] text-white/60">
                          <span className="text-[var(--game-accent)] mt-0.5">•</span>
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/5">
                    {item.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Tools & Shortcuts Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {/* Notes Drawer */}
            <button
              onClick={() => {
                audioEngine.playSelect();
                onOpenNotes();
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-semibold cursor-pointer transition-all border border-white/15"
            >
              <BookOpen className="w-3.5 h-3.5 text-[var(--game-accent)]" />
              <span>Strategy Notes (F1)</span>
            </button>

            {/* Open Folder */}
            <button
              onClick={() => {
                audioEngine.playSelect();
                onOpenFolder(game);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-semibold cursor-pointer transition-all border border-white/15"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Open Files</span>
            </button>

            {/* Edit Theme */}
            {onOpenThemeEditor && (
              <button
                onClick={() => {
                  audioEngine.playSelect();
                  onOpenThemeEditor(game);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-semibold cursor-pointer transition-all border border-white/15"
              >
                <Palette className="w-3.5 h-3.5 text-pink-400" />
                <span>Customize Vibe</span>
              </button>
            )}

            {/* Favorite Toggle */}
            <button
              onClick={() => {
                audioEngine.playSelect();
                onToggleFavorite(game.id);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
                game.favorite
                  ? 'bg-yellow-400/20 text-yellow-300 border-yellow-400/40'
                  : 'bg-white/10 hover:bg-white/20 text-white/70 border-white/15'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${game.favorite ? 'fill-yellow-400' : ''}`} />
              <span>{game.favorite ? 'Favorited' : 'Favorite'}</span>
            </button>

            {/* Snap Screenshot Button */}
            {onTakeScreenshot && (
              <button
                onClick={() => {
                  audioEngine.playSelect();
                  onTakeScreenshot(game);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-semibold cursor-pointer transition-all border border-white/15"
                title="Capture Screenshot (F12)"
              >
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                <span>Snap (F12)</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-white/40 flex items-center gap-2">
            <span>Press <kbd className="px-1 py-0.5 rounded bg-white/15 text-white/80 font-mono">Esc</kbd> or click outside to dismiss</span>
          </div>
        </div>
      </div>
    </div>
  );
};
