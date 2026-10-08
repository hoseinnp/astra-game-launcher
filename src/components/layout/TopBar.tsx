import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  LayoutGrid,
  Search,
  Plus,
  Settings,
  Minus,
  Square,
  X,
  Volume2,
  VolumeX,
  BookOpen,
  Disc,
  Music,
  BarChart2,
  Zap,
  Activity,
  Compass,
  Menu
} from 'lucide-react';
import type { ViewMode } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { jukeboxEngine } from '../../services/jukeboxEngine';
import { DeviceIcon, type ControllerDetails } from '../../utils/deviceDetector';
import { AstraCoreIcon } from './AstraCoreIcon';

interface TopBarProps {
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onOpenSearch: () => void;
  onOpenAddModal: () => void;
  onOpenRecommendations?: () => void;
  onOpenSettings: () => void;
  onOpenNotes: () => void;
  onOpenJukebox?: () => void;
  onOpenActivity?: () => void;
  onOpenRetroHub?: () => void;
  onOpenMiniHud?: () => void;
  sfxEnabled: boolean;
  onToggleMute: () => void;
  activeInputMode?: 'keyboard' | 'controller';
  controllerDetails?: ControllerDetails | null;
  gamepadConnected: boolean;
  gamepadName: string;
  hasRecentlyChangedInput?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  viewMode,
  onToggleViewMode,
  onOpenSearch,
  onOpenAddModal,
  onOpenRecommendations,
  onOpenSettings,
  onOpenNotes,
  onOpenJukebox,
  onOpenActivity,
  onOpenRetroHub,
  onOpenMiniHud,
  sfxEnabled,
  onToggleMute,
  activeInputMode = 'keyboard',
  controllerDetails,
  gamepadConnected,
  gamepadName,
  hasRecentlyChangedInput = false
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [jukeboxPlaying, setJukeboxPlaying] = useState(false);
  const [currentTrackTitle, setCurrentTrackTitle] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Close drawer on Escape key
  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Close drawer automatically if viewport resized above mobile width (>640px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 640 && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDrawerOpen]);

  useEffect(() => {
    return jukeboxEngine.subscribe((st) => {
      setJukeboxPlaying(st.isPlaying);
      setCurrentTrackTitle(st.currentTrack?.title || '');
    });
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMinimize = () => {
    audioEngine.playSelect();
    window.api?.minimizeWindow();
  };

  const handleMaximize = () => {
    audioEngine.playSelect();
    if (window.api?.toggleFullscreen) {
      window.api.toggleFullscreen();
    } else {
      window.api?.maximizeWindow();
    }
  };

  const handleClose = () => {
    audioEngine.playSelect();
    window.api?.closeWindow();
  };

  return (
    <>
      <header className="h-14 w-full flex items-center justify-between px-3 sm:px-5 select-none drag-region z-50 bg-[#090d18]/80 backdrop-blur-md border-b border-white/5">
        {/* Left: Brand & Mode Switcher & Mobile Drawer Trigger */}
        <div className="flex items-center gap-2 sm:gap-4 no-drag">
          {/* Mobile Drawer Hamburger Button (<640px) */}
          <button
            type="button"
            aria-label="Open Navigation Menu"
            title="Open Navigation Menu"
            onClick={() => {
              audioEngine.playSelect();
              setIsDrawerOpen(true);
            }}
            className="sm:hidden p-2 rounded-xl glass-pill text-white/80 hover:text-white cursor-pointer"
          >
            <Menu className="w-4 h-4 text-[var(--game-accent)]" />
          </button>

          <div
            title="ASTRA OS 3.0"
            className="flex items-center gap-2 sm:gap-2.5 group cursor-default"
          >
            <AstraCoreIcon
              size="sm"
              className="transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col select-none">
              <span className="font-black tracking-widest text-xs sm:text-sm uppercase text-white drop-shadow-[0_0_10px_var(--game-glow)]">
                ASTRA
              </span>
              <span className="text-[8px] sm:text-[9px] font-mono tracking-widest text-[var(--game-accent)] opacity-85 uppercase -mt-0.5">
                OS 3.0
              </span>
            </div>
          </div>

          {/* View Mode Toggle Pill (Console / Grid / 3D Physical Shelf) */}
          <button
            type="button"
            onClick={() => {
              audioEngine.playSelect();
              onToggleViewMode();
            }}
            aria-label={`Cycle View Modes: currently ${viewMode === 'ps5' ? 'Console' : viewMode === 'grid' ? 'Grid' : '3D Shelf'}`}
            title="Cycle View Modes: Console Ribbon -> Grid Library -> 3D Physical Shelf (Press Tab)"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium glass-pill text-white/80 hover:text-white hover:border-white/30 transition-all cursor-pointer"
          >
            {viewMode === 'ps5' ? (
              <>
                <Gamepad2 className="w-3.5 h-3.5 text-[var(--game-accent)]" />
                <span className="hidden md:inline">Console View</span>
              </>
            ) : viewMode === 'grid' ? (
              <>
                <LayoutGrid className="w-3.5 h-3.5 text-[var(--game-accent)]" />
                <span className="hidden md:inline">Grid Library</span>
              </>
            ) : (
              <>
                <Disc className="w-3.5 h-3.5 text-[var(--game-accent)] animate-spin" />
                <span className="hidden md:inline">3D Physical Shelf</span>
              </>
            )}
            <span className="hidden lg:inline text-[10px] text-white/40 ml-1">Tab</span>
          </button>
        </div>

        {/* Center: Live Digital Clock & Calendar Date (Hidden on <640px) */}
        <div className="hidden sm:flex items-center text-white/70 text-xs tracking-wider no-drag">
          <div className="flex items-center gap-2.5 px-3.5 py-1 rounded-full glass-pill border border-white/10 font-mono text-xs shadow-inner">
            <span className="font-bold text-white tracking-widest">{timeStr}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--game-accent,#2ee5ba)] shadow-[0_0_8px_var(--game-accent,#2ee5ba)]" />
            <span className="text-white/60 text-[10px] sm:text-[11px] font-medium tracking-wide uppercase">{dateStr}</span>
          </div>
        </div>

        {/* Right: Quick Tools & Window Controls */}
        <div className="flex items-center gap-1 sm:gap-2 no-drag">
          {/* Active Input Device Status Indicator (Collapses on small screens) */}
          <div
            title={
              activeInputMode === 'controller'
                ? `Connected & Active: ${controllerDetails?.modelName || gamepadName || 'Controller'}\nPress any key on Keyboard to switch`
                : gamepadConnected
                  ? `Active Input: Keyboard (PC)\nController in standby: ${controllerDetails?.modelName || gamepadName || 'Connected'}\nPress any button on controller to switch`
                  : 'Active Input: Keyboard (PC)\nNo controller detected'
            }
            className={`hidden min-[850px]:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-500 transform ${
              hasRecentlyChangedInput
                ? activeInputMode === 'controller'
                  ? 'bg-[var(--game-accent,#2ee5ba)]/30 text-white border-2 border-[var(--game-accent,#2ee5ba)] shadow-[0_0_24px_var(--game-glow,#2ee5ba),0_0_12px_var(--game-accent,#2ee5ba)] scale-110 ring-2 ring-[var(--game-accent,#2ee5ba)]/50'
                  : 'bg-emerald-500/30 text-white border-2 border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.7),0_0_12px_rgba(52,211,153,0.5)] scale-110 ring-2 ring-emerald-400/50'
                : activeInputMode === 'controller'
                  ? 'bg-[var(--game-accent)]/15 text-white border border-[var(--game-accent)]/40 shadow-[0_0_12px_var(--game-glow)]'
                  : 'glass-pill text-white/80 border-white/15 hover:border-white/30'
            }`}
          >
            {activeInputMode === 'controller' ? (
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full bg-[var(--game-accent,#2ee5ba)] shadow-[0_0_6px_var(--game-accent,#2ee5ba)] ${hasRecentlyChangedInput ? 'animate-ping' : 'animate-pulse'}`} />
                <DeviceIcon
                  type={controllerDetails?.brand || 'generic'}
                  className={`w-3.5 h-3.5 text-[var(--game-accent,#2ee5ba)] transition-transform duration-300 ${
                    hasRecentlyChangedInput ? 'scale-125 drop-shadow-[0_0_8px_var(--game-accent,#2ee5ba)] animate-bounce' : ''
                  }`}
                />
                <span className="truncate max-w-[100px] tracking-wide">
                  {controllerDetails?.shortName || gamepadName || 'Controller'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] ${hasRecentlyChangedInput ? 'animate-ping' : ''}`} />
                <DeviceIcon
                  type="keyboard"
                  className={`w-3.5 h-3.5 text-white/90 transition-transform duration-300 ${
                    hasRecentlyChangedInput ? 'scale-125 drop-shadow-[0_0_8px_#34d399] animate-bounce text-emerald-300' : ''
                  }`}
                />
                <span className="tracking-wide">Keyboard</span>
                {gamepadConnected && (
                  <div
                    className="flex items-center pl-1 ml-0.5 border-l border-white/20 text-white/40 hover:text-[var(--game-accent,#2ee5ba)] transition-colors"
                    title={`Controller in standby: ${controllerDetails?.modelName || gamepadName}`}
                  >
                    <DeviceIcon
                      type={controllerDetails?.brand || 'generic'}
                      className="w-3 h-3 opacity-60 hover:opacity-100"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Icon Rail Navigation Buttons (Visible from 640px and up) */}
          <div className="hidden sm:flex items-center gap-1">
            {/* Notes & Cheats Drawer */}
            <button
              type="button"
              onClick={() => {
                audioEngine.playSelect();
                onOpenNotes();
              }}
              aria-label="Field Notes and Cheats (F1)"
              title="Field Notes & Cheats (F1 or Gamepad X)"
              className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Search */}
            <button
              type="button"
              onClick={() => {
                audioEngine.playSelect();
                onOpenSearch();
              }}
              aria-label="Search games (Ctrl+K)"
              title="Search games (Ctrl+K)"
              className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Astra Jukebox Mini-Player */}
            {onOpenJukebox && (
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playSelect();
                    onOpenJukebox();
                  }}
                  aria-label={jukeboxPlaying ? `Playing: ${currentTrackTitle} (J)` : 'Astra Jukebox and Audio Visualizer (J)'}
                  title={jukeboxPlaying ? `Playing: ${currentTrackTitle} (J)` : 'Astra Jukebox & Audio Visualizer (J)'}
                  className={`flex items-center gap-1.5 px-2 py-1.5 transition-all cursor-pointer ${
                    jukeboxPlaying
                      ? 'bg-[var(--game-accent,#2ee5ba)]/20 text-white border-y border-l border-[var(--game-accent,#2ee5ba)] rounded-l-full shadow-[0_0_12px_var(--game-glow)]'
                      : 'rounded-full text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {jukeboxPlaying ? (
                    <Activity className="w-3.5 h-3.5 text-[var(--game-accent,#2ee5ba)] animate-pulse" />
                  ) : (
                    <Music className="w-4 h-4" />
                  )}
                  {jukeboxPlaying && (
                    <span className="hidden xl:inline text-[11px] font-mono font-bold max-w-[90px] truncate text-[var(--game-accent,#2ee5ba)]">
                      {currentTrackTitle}
                    </span>
                  )}
                </button>
                {jukeboxPlaying && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      audioEngine.playSelect();
                      jukeboxEngine.stop();
                    }}
                    aria-label="Stop Jukebox Audio"
                    title="Stop Jukebox Audio"
                    className="flex items-center justify-center p-1.5 pr-2 bg-[var(--game-accent,#2ee5ba)]/20 text-white/80 hover:text-white border-y border-r border-[var(--game-accent,#2ee5ba)] rounded-r-full hover:bg-[var(--game-accent,#2ee5ba)]/30 transition-all cursor-pointer"
                  >
                    <Square className="w-3 h-3 fill-current text-[var(--game-accent,#2ee5ba)]" />
                  </button>
                )}
              </div>
            )}

            {/* Gaming Activity Heatmap */}
            {onOpenActivity && (
              <button
                type="button"
                onClick={() => {
                  audioEngine.playSelect();
                  onOpenActivity();
                }}
                aria-label="Gaming Activity Heatmap and Streaks (H)"
                title="Gaming Activity Heatmap & Streaks (H)"
                className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <BarChart2 className="w-4 h-4" />
              </button>
            )}

            {/* Retro & Emulation Hub */}
            {onOpenRetroHub && (
              <button
                type="button"
                onClick={() => {
                  audioEngine.playSelect();
                  onOpenRetroHub();
                }}
                aria-label="Retro and Emulation Hub"
                title="Retro & Emulation Hub (ROM Scanner)"
                className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Gamepad2 className="w-4 h-4" />
              </button>
            )}

            {/* In-Game Companion Mini-HUD */}
            {onOpenMiniHud && (
              <button
                type="button"
                onClick={() => {
                  audioEngine.playSelect();
                  onOpenMiniHud();
                }}
                aria-label="Companion Mini-HUD (Shift+Tab / F10)"
                title="Companion Mini-HUD (Shift+Tab / F10)"
                className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300" />
              </button>
            )}

            {/* AI Recommendations Hub */}
            {onOpenRecommendations && (
              <button
                type="button"
                onClick={() => {
                  audioEngine.playSelect();
                  onOpenRecommendations();
                }}
                aria-label="AI Game Recommendations and Playstyle DNA"
                title="AI Game Recommendations & Playstyle DNA"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/35 text-cyan-300 hover:text-white hover:bg-cyan-500/25 transition-all cursor-pointer text-xs font-bold shadow-sm"
              >
                <Compass className="w-4 h-4 text-cyan-400" />
                <span className="hidden xl:inline tracking-wide">Discover</span>
              </button>
            )}

            {/* Add Game */}
            <button
              type="button"
              onClick={() => {
                audioEngine.playSelect();
                onOpenAddModal();
              }}
              aria-label="Add Game or Scan Folders"
              title="Add Game or Scan Folders"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs bg-[var(--game-accent)] text-[var(--game-accent-contrast,#000000)] hover:brightness-110 transition-all cursor-pointer font-bold shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Add Game</span>
            </button>
          </div>

          {/* Audio Mute Switch */}
          <button
            type="button"
            onClick={() => {
              onToggleMute();
              audioEngine.playSelect();
            }}
            aria-label={sfxEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
            title={sfxEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => {
              audioEngine.playSelect();
              onOpenSettings();
            }}
            aria-label="Settings"
            title="Settings"
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-white/15 mx-0.5 sm:mx-1" />

          {/* Frameless Window Controls */}
          <button
            type="button"
            onClick={handleMinimize}
            aria-label="Minimize"
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleMaximize}
            aria-label="Maximize or Restore"
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
            title="Maximize / Restore"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close application"
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-red-500/80 rounded transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Slide-In Navigation Drawer (<640px) */}
      {isDrawerOpen && (
        <div
          role="dialog"
          aria-label="Navigation Drawer"
          className="fixed inset-0 z-50 flex bg-black/75 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-[#0a0d16] border-r border-white/15 p-5 shadow-2xl flex flex-col justify-between animate-slideLeft transform-gpu will-change-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <AstraCoreIcon size="sm" />
                  <span className="font-black text-sm uppercase text-white tracking-widest">Astra Launcher</span>
                </div>
                <button
                  type="button"
                  aria-label="Close navigation drawer"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* View Mode Switching */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">View Mode</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    aria-label="Switch to Console View"
                    onClick={() => {
                      if (viewMode !== 'ps5') onToggleViewMode();
                      setIsDrawerOpen(false);
                    }}
                    className={`p-2 rounded-xl text-center text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      viewMode === 'ps5' ? 'bg-[var(--game-accent)] text-black' : 'glass-pill text-white/70'
                    }`}
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span className="text-[10px]">Console</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Switch to Grid Library"
                    onClick={() => {
                      if (viewMode !== 'grid') onToggleViewMode();
                      setIsDrawerOpen(false);
                    }}
                    className={`p-2 rounded-xl text-center text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      viewMode === 'grid' ? 'bg-[var(--game-accent)] text-black' : 'glass-pill text-white/70'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-[10px]">Grid</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Switch to 3D Shelf"
                    onClick={() => {
                      if (viewMode !== 'shelf') onToggleViewMode();
                      setIsDrawerOpen(false);
                    }}
                    className={`p-2 rounded-xl text-center text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      viewMode === 'shelf' ? 'bg-[var(--game-accent)] text-black' : 'glass-pill text-white/70'
                    }`}
                  >
                    <Disc className="w-4 h-4" />
                    <span className="text-[10px]">Shelf</span>
                  </button>
                </div>
              </div>

              {/* Drawer Links */}
              <nav className="flex flex-col gap-1 pt-2">
                <button
                  type="button"
                  aria-label="Add Game or Scan Folders"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    audioEngine.playSelect();
                    onOpenAddModal();
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--game-accent)] text-black font-bold text-xs cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Game to Library</span>
                </button>

                <button
                  type="button"
                  aria-label="Search games (Ctrl+K)"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    audioEngine.playSelect();
                    onOpenSearch();
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-xs cursor-pointer"
                >
                  <Search className="w-4 h-4 text-[var(--game-accent)]" />
                  <span>Search Games (Ctrl+K)</span>
                </button>

                {onOpenRecommendations && (
                  <button
                    type="button"
                    aria-label="AI Recommendations"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      audioEngine.playSelect();
                      onOpenRecommendations();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-cyan-300 hover:text-white text-xs cursor-pointer font-semibold"
                  >
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>AI Recommendations</span>
                  </button>
                )}

                <button
                  type="button"
                  aria-label="Field Notes and Cheats (F1)"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    audioEngine.playSelect();
                    onOpenNotes();
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-xs cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-[var(--game-accent)]" />
                  <span>Field Notes & Cheats</span>
                </button>

                {onOpenJukebox && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Astra Jukebox"
                      onClick={() => {
                        setIsDrawerOpen(false);
                        audioEngine.playSelect();
                        onOpenJukebox();
                      }}
                      className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-xs cursor-pointer"
                    >
                      <Music className="w-4 h-4 text-[var(--game-accent)]" />
                      <span>Astra Jukebox {jukeboxPlaying ? '• Playing' : ''}</span>
                    </button>
                    {jukeboxPlaying && (
                      <button
                        type="button"
                        aria-label="Stop Jukebox"
                        onClick={() => {
                          audioEngine.playSelect();
                          jukeboxEngine.stop();
                        }}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs cursor-pointer"
                        title="Stop audio"
                      >
                        <Square className="w-3.5 h-3.5 text-[var(--game-accent)]" />
                      </button>
                    )}
                  </div>
                )}

                {onOpenActivity && (
                  <button
                    type="button"
                    aria-label="Activity Dashboard"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      audioEngine.playSelect();
                      onOpenActivity();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-xs cursor-pointer"
                  >
                    <BarChart2 className="w-4 h-4 text-emerald-400" />
                    <span>Activity Heatmap</span>
                  </button>
                )}

                {onOpenRetroHub && (
                  <button
                    type="button"
                    aria-label="Retro and Emulation Hub"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      audioEngine.playSelect();
                      onOpenRetroHub();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-xs cursor-pointer"
                  >
                    <Gamepad2 className="w-4 h-4 text-amber-400" />
                    <span>Retro & Emulation Hub</span>
                  </button>
                )}

                {onOpenMiniHud && (
                  <button
                    type="button"
                    aria-label="In-Game Companion Mini-HUD"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      audioEngine.playSelect();
                      onOpenMiniHud();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white text-xs cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Companion Mini-HUD</span>
                  </button>
                )}
              </nav>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                aria-label="Open Settings"
                onClick={() => {
                  setIsDrawerOpen(false);
                  audioEngine.playSelect();
                  onOpenSettings();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl glass-pill text-xs font-semibold text-white/90 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-[var(--game-accent)]" />
                <span>Settings</span>
              </button>

              <button
                type="button"
                aria-label={sfxEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
                onClick={() => {
                  onToggleMute();
                  audioEngine.playSelect();
                }}
                className="p-2 rounded-xl glass-pill text-white/80 hover:text-white cursor-pointer"
              >
                {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
