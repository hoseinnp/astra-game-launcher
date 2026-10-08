import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Play, Trophy, Image, Settings, Folder, Clock, Star,
  Award, CheckCircle2, Circle, Plus, Sparkles, ChevronLeft, ChevronRight,
  Shield, Bookmark, Timer, Camera, Upload, Trash2, FolderOpen, Quote, Layers,
  Eye, EyeOff, Terminal, RefreshCw, Monitor
} from 'lucide-react';
import type { Game, GameCollection, ProviderApiKeys } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { AchievementEngine } from '../../services/achievementEngine';
import { ArtworkService } from '../../services/artworkService';
import { normalizeMediaUrl } from '../../utils/mediaUrl';
import { ThemeEngine } from '../../services/themeEngine';
import { LaunchArgumentsService } from '../../services/launchArgumentsService';

interface GameOverviewModalProps {
  isOpen: boolean;
  game: Game | null;
  onClose: () => void;
  onLaunchGame: (game: Game) => void;
  onUpdateGame: (updated: Game) => void;
  onOpenThemeEditor: (game: Game) => void;
  onOpenNotes: () => void;
  onOpenFolder?: (game: Game) => void;
  onOpenMods?: (game: Game) => void;
  onOpenSaveVault?: (game: Game) => void;
  onTakeScreenshot?: (game: Game) => void;
  apiKeys?: ProviderApiKeys;
}

export const GameOverviewModal: React.FC<GameOverviewModalProps> = ({
  isOpen,
  game,
  onClose,
  onLaunchGame,
  onUpdateGame,
  onOpenThemeEditor,
  onOpenNotes,
  onOpenFolder,
  onOpenMods,
  onOpenSaveVault,
  onTakeScreenshot,
  apiKeys
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trophies' | 'screenshots'>('overview');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [newTrophyTitle, setNewTrophyTitle] = useState('');
  const [newTrophyDesc, setNewTrophyDesc] = useState('');
  const [newTrophyType, setNewTrophyType] = useState<'bronze' | 'silver' | 'gold' | 'platinum'>('bronze');
  const [showAddTrophy, setShowAddTrophy] = useState(false);
  const checkedRef = useRef<Set<string>>(new Set());

  // Desktop Shortcut State
  const [shortcutStatus, setShortcutStatus] = useState<string>('');
  const [isCreatingShortcut, setIsCreatingShortcut] = useState(false);

  const handleCreateShortcut = async () => {
    if (!game || !window.api?.createDesktopShortcut) return;
    setIsCreatingShortcut(true);
    audioEngine.playSelect();
    try {
      const res = await window.api.createDesktopShortcut(game);
      if (res.success) {
        setShortcutStatus('✓ Added!');
        setTimeout(() => setShortcutStatus(''), 3000);
      } else {
        setShortcutStatus('Failed');
        setTimeout(() => setShortcutStatus(''), 3000);
      }
    } catch {
      setShortcutStatus('Failed');
      setTimeout(() => setShortcutStatus(''), 3000);
    } finally {
      setIsCreatingShortcut(false);
    }
  };

  // Launch Arguments State
  const [currentArgs, setCurrentArgs] = useState(game?.launchArguments || '');
  useEffect(() => {
    setCurrentArgs(game?.launchArguments || '');
  }, [game?.id, game?.launchArguments]);

  // Detected Smart Launch Presets
  const smartLaunchInfo = useMemo(() => {
    return game ? LaunchArgumentsService.detectSmartPresets(game) : null;
  }, [game?.title, game?.executablePath, game?.workingDirectory]);

  // Executable Disk & Version Status
  const [diskVersionInfo, setDiskVersionInfo] = useState<{
    checking: boolean;
    version: string | null;
    lastModified: string | null;
    exists: boolean;
  }>({ checking: false, version: null, lastModified: null, exists: true });

  const handleCheckDiskVersion = async () => {
    if (!game?.executablePath || !window.api?.checkGameVersion) return;
    setDiskVersionInfo((prev) => ({ ...prev, checking: true }));
    try {
      const res = await window.api.checkGameVersion(game.executablePath);
      setDiskVersionInfo({
        checking: false,
        version: res.version,
        lastModified: res.lastModified,
        exists: res.exists
      });
      if (res.version && res.version !== game.version) {
        onUpdateGame({
          ...game,
          version: res.version
        });
      }
    } catch {
      setDiskVersionInfo((prev) => ({ ...prev, checking: false }));
    }
  };

  useEffect(() => {
    if (isOpen && game?.executablePath) {
      handleCheckDiskVersion();
    }
  }, [isOpen, game?.id]);

  // Initialize and evaluate milestones whenever the modal opens for this game
  useEffect(() => {
    if (isOpen && game) {
      const { updatedGame } = AchievementEngine.evaluateMilestones(game, false);
      if (updatedGame !== game) {
        onUpdateGame(updatedGame);
      }

      if (!checkedRef.current.has(game.id)) {
        checkedRef.current.add(game.id);

        // Auto-fetch rich metadata and screenshots if missing
        if (!game.metadata?.developer && !game.metadata?.screenshots) {
          queueMicrotask(() => {
            setIsFetchingMeta(true);
          });
          const appId = game.executablePath?.startsWith('steam://')
            ? game.executablePath.replace('steam://run/', '')
            : (game.id.startsWith('steam-') ? game.id.replace('steam-', '') : undefined);

          ArtworkService.fetchGameDetails(game.title, { apiKeys, appId }).then((meta) => {
            if (meta) {
              onUpdateGame({
                ...game,
                metadata: {
                  ...game.metadata,
                  ...meta
                },
                hltb: meta.hltb || game.hltb
              });
            }
          }).finally(() => {
            setIsFetchingMeta(false);
          });
        } else if (!game.hltb && !game.metadata?.hltb) {
          // Auto-fetch HowLongToBeat if metadata already exists but HLTB is not yet cached
          ArtworkService.fetchHltb(game.title).then((stats) => {
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
          });
        }
      }
    }
  }, [isOpen, game, onUpdateGame, apiKeys]);

  if (!isOpen || !game) return null;

  const contrastColor = ThemeEngine.getContrastColor(game.theme?.accentColor || '#2ee5ba');
  const achievements = game.achievements || [];
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const progressPercent = achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0;
  const hltb = game.hltb || game.metadata?.hltb;

  const screenshots = game.metadata?.screenshots || (game.backdropUrl ? [game.backdropUrl] : []);

  const handleCollectionChange = (col: GameCollection) => {
    audioEngine.playSelect();
    onUpdateGame({ ...game, collection: col });
  };

  const handleToggleTrophy = (id: string) => {
    const updated = AchievementEngine.toggleAchievement(game, id);
    onUpdateGame(updated);
  };

  const handleCreateTrophy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrophyTitle.trim()) return;
    audioEngine.playSelect();
    const updated = AchievementEngine.addCustomAchievement(
      game,
      newTrophyTitle,
      newTrophyDesc || 'Custom player challenge.',
      newTrophyType
    );
    onUpdateGame(updated);
    setNewTrophyTitle('');
    setNewTrophyDesc('');
    setShowAddTrophy(false);
  };

  const formatPlaytime = (mins: number) => {
    if (!mins) return 'Never Played';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 md:p-10 bg-black/80 backdrop-blur-xl animate-fadeIn isolate"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-w-[calc(100vw-1rem)] max-h-[92vh] max-h-[calc(100vh-1rem)] flex flex-col rounded-2xl sm:rounded-3xl bg-[#0a0d14] border border-white/15 shadow-2xl overflow-hidden relative animate-modalIn transform-gpu will-change-transform min-w-0"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: `0 25px 60px -15px rgba(0,0,0,0.9), 0 0 40px -10px ${game.theme?.glowColor || 'rgba(46,229,186,0.2)'}`
        }}
      >
        {/* HERO BANNER SECTION */}
        <div className="relative h-64 sm:h-72 md:h-80 w-full flex-shrink-0 overflow-hidden select-none">
          <img
            src={normalizeMediaUrl(game.backdropUrl || game.coverUrl)}
            alt={game.title}
            className="w-full h-full object-cover object-center filter brightness-90 contrast-105"
          />
          {/* Atmospheric Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d14] via-[#0a0d14]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0d14]/90 via-[#0a0d14]/30 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/60 hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Hero Content */}
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col justify-end gap-3">
            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                style={{ color: contrastColor }}
                className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[var(--game-accent)] shadow-sm"
              >
                {game.type}
              </span>

              {game.version && (
                <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold glass-pill text-white border border-white/20">
                  {game.version.startsWith('v') ? game.version : `v${game.version}`}
                </span>
              )}

              {/* Collection Dropdown */}
              <div className="flex items-center gap-1 glass-pill px-2.5 py-0.5 rounded-md border border-white/15">
                <Bookmark className="w-3 h-3 text-[var(--game-accent)]" />
                <select
                  value={game.collection || 'none'}
                  onChange={(e) => handleCollectionChange(e.target.value as GameCollection)}
                  className="bg-transparent text-[11px] font-bold text-white/90 focus:outline-none cursor-pointer py-0.5"
                >
                  <option value="none" className="bg-[#0c101b] text-white">No Collection</option>
                  <option value="playing" className="bg-[#0c101b] text-emerald-400">Currently Playing</option>
                  <option value="backlog" className="bg-[#0c101b] text-amber-400">In Backlog</option>
                  <option value="completed" className="bg-[#0c101b] text-purple-400">Completed 100%</option>
                </select>
              </div>

              {/* Metacritic / Rating badge */}
              {game.metadata?.metacritic && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  METACRITIC {game.metadata.metacritic}
                </span>
              )}
              {game.metadata?.rating && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{game.metadata.rating.toFixed(1)} / 5</span>
                </span>
              )}

              {isFetchingMeta && (
                <span className="text-[10px] text-white/40 animate-pulse flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Fetching details...
                </span>
              )}
            </div>

            {/* Title / Stylized Logo */}
            {game.theme?.logoUrl ? (
              <div className="h-16 sm:h-20 flex items-center">
                <img
                  src={normalizeMediaUrl(game.theme.logoUrl)}
                  alt={game.title}
                  className="max-h-16 sm:max-h-20 max-w-md object-contain filter drop-shadow-[0_8px_24px_rgba(0,0,0,0.9)]"
                />
              </div>
            ) : (
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase drop-shadow-lg">
                {game.title}
              </h1>
            )}

            {game.quote?.text && (
              <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 max-w-xl">
                <Quote className="w-3.5 h-3.5 text-[var(--game-accent)] flex-shrink-0 opacity-80" />
                <span className="text-xs text-white/90 italic font-serif truncate">
                  “{game.quote.text}”
                </span>
                {game.quote.speaker && (
                  <span className="text-[11px] text-[var(--game-accent)] font-semibold not-italic whitespace-nowrap opacity-90">
                    — {game.quote.speaker}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ACTION BAR & TABS */}
        <div className="px-4 sm:px-8 py-3 bg-black/40 border-y border-white/10 flex items-center justify-between gap-3 flex-wrap min-w-0">
          {/* Quick Launch & Options */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar max-w-full flex-nowrap py-1">
            <button
              onClick={() => {
                audioEngine.playLaunch();
                onLaunchGame(game);
                onClose();
              }}
              style={{
                backgroundColor: 'var(--game-accent)',
                color: contrastColor,
                boxShadow: '0 0 25px -3px var(--game-glow)'
              }}
              className="flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch</span>
            </button>

            <button
              onClick={() => {
                audioEngine.playSelect();
                onOpenNotes();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass-pill text-xs font-semibold text-white/80 hover:text-white cursor-pointer flex-shrink-0"
            >
              <span>Notes</span>
            </button>

            <button
              onClick={() => {
                audioEngine.playSelect();
                onOpenThemeEditor(game);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass-pill text-xs font-semibold text-white/80 hover:text-white cursor-pointer flex-shrink-0"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Customize</span>
            </button>

            {onOpenMods && (
              <button
                onClick={() => {
                  audioEngine.playSelect();
                  onOpenMods(game);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass-pill text-xs font-semibold text-white/80 hover:text-white cursor-pointer flex-shrink-0"
                title="Manage Mods & Add-On Packs"
              >
                <Layers className="w-3.5 h-3.5 text-[var(--game-accent)]" />
                <span>Mods ({game.mods?.filter((m) => m.enabled).length || 0})</span>
              </button>
            )}

            {onOpenSaveVault && (
              <button
                onClick={() => {
                  audioEngine.playSelect();
                  onOpenSaveVault(game);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass-pill text-xs font-semibold text-white/80 hover:text-white cursor-pointer flex-shrink-0"
                title="Save Game Vault & Snapshots"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Save Vault</span>
              </button>
            )}

            {onOpenFolder && (
              <button
                onClick={() => {
                  audioEngine.playSelect();
                  onOpenFolder(game);
                }}
                className="p-2.5 rounded-xl glass-pill text-white/60 hover:text-white cursor-pointer flex-shrink-0"
                title="Open Game Folder"
              >
                <Folder className="w-4 h-4" />
              </button>
            )}

            {/* Hide / Unhide Game from Library */}
            <button
              onClick={() => {
                audioEngine.playSelect();
                const updated = { ...game, hidden: !game.hidden };
                onUpdateGame(updated);
              }}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl glass-pill text-xs font-semibold cursor-pointer transition-all flex-shrink-0 ${
                game.hidden
                  ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                  : 'text-white/70 hover:text-white'
              }`}
              title={game.hidden ? 'Unhide this game from library' : 'Hide this game from library without deleting'}
            >
              {game.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{game.hidden ? 'Hidden' : 'Hide'}</span>
            </button>

            {/* Create Desktop Shortcut */}
            <button
              onClick={handleCreateShortcut}
              disabled={isCreatingShortcut}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl glass-pill text-xs font-semibold cursor-pointer transition-all flex-shrink-0 ${
                shortcutStatus === '✓ Added!'
                  ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                  : 'text-white/70 hover:text-white hover:border-white/30'
              }`}
              title="Create a Windows Desktop Shortcut for this game"
            >
              <Monitor className="w-3.5 h-3.5 text-sky-400" />
              <span>{shortcutStatus || 'Shortcut'}</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs overflow-x-auto no-scrollbar max-w-full flex-nowrap py-1">
            <button
              onClick={() => {
                audioEngine.playHover();
                setActiveTab('overview');
              }}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[var(--game-accent)] text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Overview
            </button>

            <button
              onClick={() => {
                audioEngine.playHover();
                setActiveTab('trophies');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'trophies'
                  ? 'bg-[var(--game-accent)] text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Trophies ({unlockedCount}/{achievements.length})</span>
            </button>

            <button
              onClick={() => {
                audioEngine.playHover();
                setActiveTab('screenshots');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'screenshots'
                  ? 'bg-[var(--game-accent)] text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Image className="w-3.5 h-3.5" />
              <span>Gallery ({screenshots.length})</span>
            </button>
          </div>
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left 2 Cols: Description & Metadata */}
              <div className="md:col-span-2 space-y-5">
                <div>
                  <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2">About Game</h3>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line bg-white/5 p-4 rounded-2xl border border-white/5">
                    {game.description || 'No detailed description available. Use the Customize menu to add game notes and lore.'}
                  </p>
                </div>

                {/* Developer / Publisher Info */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-white/40 uppercase font-bold block">Developer</span>
                    <span className="text-xs font-bold text-white truncate block mt-0.5">
                      {game.metadata?.developer || 'Unknown'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-white/40 uppercase font-bold block">Publisher</span>
                    <span className="text-xs font-bold text-white truncate block mt-0.5">
                      {game.metadata?.publisher || 'Independent'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-white/40 uppercase font-bold block">Release Date</span>
                    <span className="text-xs font-bold text-white truncate block mt-0.5">
                      {game.metadata?.releaseDate || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Executable & Disk Version Verification */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Shield className="w-4 h-4 text-[var(--game-accent)]" />
                      <span>Executable & Disk Version Check</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCheckDiskVersion}
                      disabled={diskVersionInfo.checking}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--game-accent)] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${diskVersionInfo.checking ? 'animate-spin' : ''}`} />
                      <span>{diskVersionInfo.checking ? 'Checking...' : 'Check Disk'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] text-white/40 block font-mono">FILE VERSION</span>
                      <span className="font-mono font-bold text-white text-[11px] mt-0.5 block truncate">
                        {game.version || diskVersionInfo.version || 'Version info unparsed'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <span className="text-[10px] text-white/40 block font-mono">DISK STATUS</span>
                      <span className="font-mono font-bold text-[11px] mt-0.5 block truncate text-emerald-400">
                        {diskVersionInfo.exists ? '✓ Installed & Ready on Disk' : '⚠ File missing on disk'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-white/40 truncate bg-black/30 p-2 rounded-lg">
                    {game.executablePath}
                  </div>
                </div>

                {/* Launch Arguments & Smart Engine Presets */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Terminal className="w-4 h-4 text-[var(--game-accent)]" />
                      <span>Launch Arguments & Compatibility Presets</span>
                    </div>
                    {smartLaunchInfo && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--game-accent)]/15 text-[var(--game-accent)] border border-[var(--game-accent)]/30 font-semibold">
                        ⚡ {smartLaunchInfo.engineName}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentArgs}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCurrentArgs(val);
                        onUpdateGame({
                          ...game,
                          launchArguments: val
                        });
                      }}
                      placeholder="e.g. -fullscreen -novid -dx11 --launcher-skip"
                      className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-[var(--game-accent)]"
                    />
                  </div>

                  {smartLaunchInfo?.recommendedPresets && smartLaunchInfo.recommendedPresets.length > 0 && (
                    <div>
                      <span className="text-[10px] text-white/50 block mb-1.5 font-medium">
                        Smart Presets for {smartLaunchInfo.engineName} (click to toggle argument):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {smartLaunchInfo.recommendedPresets.map((preset) => {
                          const isApplied = currentArgs.includes(preset.arg);
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                audioEngine.playSelect();
                                const newArgs = isApplied
                                  ? LaunchArgumentsService.removeArgument(currentArgs, preset.arg)
                                  : LaunchArgumentsService.appendArgument(currentArgs, preset.arg);
                                setCurrentArgs(newArgs);
                                onUpdateGame({
                                  ...game,
                                  launchArguments: newArgs
                                });
                              }}
                              title={preset.description}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                isApplied
                                  ? 'bg-[var(--game-accent)] text-black shadow-sm'
                                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white border border-white/10'
                              }`}
                            >
                              <span>{preset.label}</span>
                              <span className="text-[9px] opacity-75">({preset.arg})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Col: Activity Cards & Stats */}
              <div className="space-y-4">
                {/* Playtime Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 space-y-3">
                  <span className="text-[10px] text-[var(--game-accent)] font-bold tracking-widest uppercase block">
                    Playtime Analytics
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-white font-mono">
                      {formatPlaytime(game.stats.playtimeMinutes)}
                    </span>
                    <span className="text-xs text-white/50">{game.stats.playCount} sessions</span>
                  </div>

                  {game.stats.lastPlayed && (
                    <div className="text-xs text-white/40 pt-1 border-t border-white/10 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>Last played: {new Date(game.stats.lastPlayed).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>

                {/* Trophy Mini Card */}
                <div
                  onClick={() => setActiveTab('trophies')}
                  className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3 cursor-pointer hover:border-[var(--game-accent)] transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Trophy Progress</span>
                    <span className="text-xs font-bold text-[var(--game-accent)] font-mono">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[var(--game-accent)] transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>{unlockedCount} of {achievements.length} unlocked</span>
                    <span className="text-[var(--game-accent)] group-hover:underline">View &rarr;</span>
                  </div>
                </div>

                {/* HowLongToBeat Targets Card */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-sky-400 font-bold tracking-widest uppercase flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5" />
                      <span>HowLongToBeat Targets</span>
                    </span>
                    {hltb && (
                      <span className="text-[9px] font-mono font-bold text-sky-400/90 bg-sky-400/10 px-1.5 py-0.5 rounded border border-sky-400/20">
                        VERIFIED
                      </span>
                    )}
                  </div>

                  {hltb ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-[10px] text-white/40 uppercase font-medium block">Story</span>
                          <span className="text-base font-black text-white font-mono mt-0.5 block">{hltb.mainStoryHours}h</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-[10px] text-white/40 uppercase font-medium block">Extra</span>
                          <span className="text-base font-black text-white font-mono mt-0.5 block">{hltb.mainExtraHours || '--'}h</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                          <span className="text-[10px] text-white/40 uppercase font-medium block">100%</span>
                          <span className="text-base font-black text-amber-300 font-mono mt-0.5 block">{hltb.completionistHours || '--'}h</span>
                        </div>
                      </div>

                      {hltb.mainStoryHours > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-xs text-white/60">
                            <span>Campaign Completion</span>
                            <span className="font-mono text-white/90 font-semibold">
                              {Math.min(100, Math.round(((game.stats.playtimeMinutes / 60) / hltb.mainStoryHours) * 100))}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-sky-400 to-cyan-300 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                              style={{
                                width: `${Math.min(100, Math.round(((game.stats.playtimeMinutes / 60) / hltb.mainStoryHours) * 100))}%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-2 text-xs text-white/40 flex items-center justify-between">
                      <span>No completion metrics cataloged</span>
                      <button
                        onClick={() => {
                          ArtworkService.fetchHltb(game.title).then((stats) => {
                            if (stats) {
                              onUpdateGame({
                                ...game,
                                hltb: stats,
                                metadata: { ...game.metadata, hltb: stats }
                              });
                            }
                          });
                        }}
                        className="text-[11px] text-sky-400 hover:underline cursor-pointer"
                      >
                        Search
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TROPHIES & ACHIEVEMENTS */}
          {activeTab === 'trophies' && (
            <div className="space-y-6">
              {/* Header summary & Add button */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Trophy & Milestone Collection</h3>
                    <p className="text-xs text-white/50">
                      {unlockedCount} of {achievements.length} Unlocked ({progressPercent}%)
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddTrophy(!showAddTrophy)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--game-accent)] text-black text-xs font-bold hover:brightness-110 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Custom Challenge</span>
                </button>
              </div>

              {/* Add Custom Challenge Form */}
              {showAddTrophy && (
                <form onSubmit={handleCreateTrophy} className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-white/70 uppercase mb-1">Challenge Title</label>
                      <input
                        type="text"
                        required
                        value={newTrophyTitle}
                        onChange={(e) => setNewTrophyTitle(e.target.value)}
                        placeholder="e.g. Beat the secret boss with no damage"
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-[var(--game-accent)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-white/70 uppercase mb-1">Trophy Grade</label>
                      <select
                        value={newTrophyType}
                        onChange={(e) => setNewTrophyType(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-[var(--game-accent)]"
                      >
                        <option value="bronze">Bronze</option>
                        <option value="silver">Silver</option>
                        <option value="gold">Gold</option>
                        <option value="platinum">Platinum</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/70 uppercase mb-1">Description</label>
                    <input
                      type="text"
                      value={newTrophyDesc}
                      onChange={(e) => setNewTrophyDesc(e.target.value)}
                      placeholder="Requirements to achieve this trophy..."
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-[var(--game-accent)]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddTrophy(false)}
                      className="px-3 py-1.5 text-xs text-white/60 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-[var(--game-accent)] text-black font-bold text-xs"
                    >
                      Save Trophy
                    </button>
                  </div>
                </form>
              )}

              {/* Trophy List Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {achievements.map((item) => {
                  const gradeColor =
                    item.type === 'platinum'
                      ? 'text-cyan-300 bg-cyan-500/20 border-cyan-500/30'
                      : item.type === 'gold'
                      ? 'text-amber-300 bg-amber-500/20 border-amber-500/30'
                      : item.type === 'silver'
                      ? 'text-slate-200 bg-slate-400/20 border-slate-400/30'
                      : 'text-amber-600 bg-amber-700/20 border-amber-700/30';

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleTrophy(item.id)}
                      className={`flex items-start justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                        item.unlocked
                          ? 'bg-white/10 border-white/20 text-white shadow-md'
                          : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl border flex-shrink-0 ${gradeColor}`}>
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{item.title}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${gradeColor}`}>
                              {item.type}
                            </span>
                          </div>
                          <p className="text-xs text-white/60 mt-1 leading-relaxed">{item.description}</p>
                          {item.unlockedAt && (
                            <span className="text-[10px] text-emerald-400 mt-1.5 block font-mono">
                              Unlocked {new Date(item.unlockedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-1">
                        {item.unlocked ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-white/20" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SCREENSHOTS & MEDIA GALLERY */}
          {activeTab === 'screenshots' && (
            <div className="space-y-5">
              {/* Screenshot Management Toolbar */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 flex-wrap gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Game Gallery & Captures</h4>
                  <p className="text-[11px] text-white/50">
                    {screenshots.length} screenshots cataloged • Press <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-white/90 font-mono text-[10px]">F12</kbd> anywhere to snap
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Take Screenshot Button */}
                  <button
                    onClick={() => {
                      audioEngine.playSelect();
                      if (onTakeScreenshot) {
                        onTakeScreenshot(game);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--game-accent)] text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Snap Screenshot (F12)</span>
                  </button>

                  {/* Import Screenshots Button */}
                  <button
                    onClick={async () => {
                      audioEngine.playSelect();
                      if (window.api?.pickScreenshot) {
                        const files = await window.api.pickScreenshot();
                        if (files && files.length > 0) {
                          const existing = game.metadata?.screenshots || [];
                          const merged = [...files, ...existing.filter((s) => !files.includes(s))];
                          onUpdateGame({
                            ...game,
                            metadata: {
                              ...game.metadata,
                              screenshots: merged
                            }
                          });
                        }
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-pill text-xs font-semibold text-white/80 hover:text-white cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>Import Image</span>
                  </button>

                  {/* Open Screenshots Folder */}
                  <button
                    onClick={() => {
                      audioEngine.playSelect();
                      window.api?.openScreenshotsFolder?.(game.title);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-pill text-xs font-semibold text-white/80 hover:text-white cursor-pointer"
                    title="Open Astra Screenshots folder in Windows Explorer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Open Folder</span>
                  </button>
                </div>
              </div>

              {/* Grid of Screenshots */}
              {screenshots.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-3">
                  <Camera className="w-10 h-10 text-white/20" />
                  <p className="text-sm text-white/60 font-medium">No screenshots in gallery yet</p>
                  <p className="text-xs text-white/40 max-w-sm">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 font-mono">F12</kbd> while playing or browsing, or import images directly from your computer.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {screenshots.map((src, i) => (
                    <div
                      key={i}
                      onClick={() => setLightboxIndex(i)}
                      className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer group border border-white/10 hover:border-[var(--game-accent)] transition-all shadow-lg"
                    >
                      <img
                        src={normalizeMediaUrl(src)}
                        alt={`Screenshot ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Hover Overlay with Management Tools */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              audioEngine.playSelect();
                              onUpdateGame({ ...game, backdropUrl: src });
                            }}
                            title="Set as Game Backdrop"
                            className="px-2 py-1 rounded-md bg-black/70 hover:bg-black/90 text-white/80 hover:text-white text-[10px] font-bold border border-white/20 cursor-pointer backdrop-blur-md"
                          >
                            Set Backdrop
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              audioEngine.playSelect();
                              const current = game.metadata?.screenshots || [];
                              const updatedScreenshots = current.filter((s) => s !== src);
                              onUpdateGame({
                                ...game,
                                metadata: {
                                  ...game.metadata,
                                  screenshots: updatedScreenshots
                                }
                              });
                            }}
                            title="Remove Screenshot"
                            className="p-1.5 rounded-md bg-rose-500/30 hover:bg-rose-500/60 text-rose-200 border border-rose-500/40 cursor-pointer backdrop-blur-md"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-center">
                          <span className="text-xs font-bold text-white bg-black/70 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/20 inline-block">
                            View Fullscreen
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] font-mono text-white/50">#{i + 1}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* LIGHTBOX FULLSCREEN VIEWER */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 select-none"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer z-20"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Prev button */}
          {screenshots.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : screenshots.length - 1));
              }}
              className="absolute left-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer z-20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <img
            src={normalizeMediaUrl(screenshots[lightboxIndex])}
            alt="Fullscreen view"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next button */}
          {screenshots.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev! < screenshots.length - 1 ? prev! + 1 : 0));
              }}
              className="absolute right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer z-20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
