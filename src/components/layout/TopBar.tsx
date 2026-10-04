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
  Dices,
  Disc,
  Music,
  BarChart2,
  Zap,
  Activity
} from 'lucide-react';
import type { ViewMode, UserProfile } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { jukeboxEngine } from '../../services/jukeboxEngine';
import { SessionTimer } from './SessionTimer';
import { WeatherWidget } from './WeatherWidget';
import { DeviceIcon, type ControllerDetails } from '../../utils/deviceDetector';
import { AstraCoreIcon } from './AstraCoreIcon';

interface TopBarProps {
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onOpenSearch: () => void;
  onOpenAddModal: () => void;
  onOpenWhatToPlay?: () => void;
  onOpenSettings: () => void;
  onOpenNotes: () => void;
  onOpenEasterEgg?: () => void;
  onOpenJukebox?: () => void;
  onOpenActivity?: () => void;
  onOpenRetroHub?: () => void;
  onOpenMiniHud?: () => void;
  onTimeExpired: () => void;
  sfxEnabled: boolean;
  onToggleMute: () => void;
  activeInputMode?: 'keyboard' | 'controller';
  controllerDetails?: ControllerDetails | null;
  gamepadConnected: boolean;
  gamepadName: string;
  hasRecentlyChangedInput?: boolean;
  currentUser: UserProfile | null;
  onSwitchUser?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  viewMode,
  onToggleViewMode,
  onOpenSearch,
  onOpenAddModal,
  onOpenWhatToPlay,
  onOpenSettings,
  onOpenNotes,
  onOpenEasterEgg,
  onOpenJukebox,
  onOpenActivity,
  onOpenRetroHub,
  onOpenMiniHud,
  onTimeExpired,
  sfxEnabled,
  onToggleMute,
  activeInputMode = 'keyboard',
  controllerDetails,
  gamepadConnected,
  gamepadName,
  hasRecentlyChangedInput = false,
  currentUser,
  onSwitchUser
}) => {
  const [logoClicks, setLogoClicks] = useState(0);
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [jukeboxPlaying, setJukeboxPlaying] = useState(false);
  const [currentTrackTitle, setCurrentTrackTitle] = useState('');

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
    <header className="h-14 w-full flex items-center justify-between px-5 select-none drag-region z-50">
      {/* Left: Brand & Mode Switcher */}
      <div className="flex items-center gap-4 no-drag">
        <div
          onClick={() => {
            const next = logoClicks + 1;
            setLogoClicks(next);
            audioEngine.playHover();
            if (next >= 5) {
              setLogoClicks(0);
              audioEngine.playLaunch();
              if (onOpenEasterEgg) onOpenEasterEgg();
            }
          }}
          title="ASTRA (Click 5 times for Easter Egg)"
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity group"
        >
          <AstraCoreIcon
            size="sm"
            isEnergetic={logoClicks > 0}
            className="transition-transform group-hover:scale-110"
          />
          <div className="flex flex-col select-none">
            <span className="font-black tracking-widest text-sm uppercase text-white drop-shadow-[0_0_10px_var(--game-glow)]">
              ASTRA
            </span>
            <span className="text-[9px] font-mono tracking-widest text-[var(--game-accent)] opacity-85 uppercase -mt-0.5">
              OS 3.0
            </span>
          </div>
        </div>

        {/* Active User Profile Badge */}
        {currentUser && (
          <button
            onClick={() => {
              if (onSwitchUser) {
                audioEngine.playSelect();
                onSwitchUser();
              }
            }}
            title={`Active Profile: ${currentUser.name} (${currentUser.tag || 'Host'})\nClick to switch profile or log out`}
            className="flex items-center gap-2 px-2.5 py-1 rounded-full glass-pill border-white/15 hover:border-white/35 hover:bg-white/10 transition-all cursor-pointer group"
          >
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-[var(--game-accent)] group-hover:scale-105 transition-transform"
            />
            <span className="text-xs font-bold text-white/90 group-hover:text-white">{currentUser.name}</span>
          </button>
        )}

        {/* View Mode Toggle Pill (Console / Grid / 3D Physical Shelf) */}
        <button
          onClick={() => {
            audioEngine.playSelect();
            onToggleViewMode();
          }}
          title="Cycle View Modes: Console Ribbon -> Grid Library -> 3D Physical Shelf (Press Tab)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium glass-pill text-white/80 hover:text-white hover:border-white/30 transition-all cursor-pointer"
        >
          {viewMode === 'ps5' ? (
            <>
              <Gamepad2 className="w-3.5 h-3.5 text-[var(--game-accent)]" />
              <span>Console View</span>
            </>
          ) : viewMode === 'grid' ? (
            <>
              <LayoutGrid className="w-3.5 h-3.5 text-[var(--game-accent)]" />
              <span>Grid Library</span>
            </>
          ) : (
            <>
              <Disc className="w-3.5 h-3.5 text-[var(--game-accent)] animate-spin" />
              <span>3D Physical Shelf</span>
            </>
          )}
          <span className="text-[10px] text-white/40 ml-1">Tab</span>
        </button>
      </div>

      {/* Center: Live Clock, Date & Weather Widget (Merged Pill with Vertical Divider) */}
      <div className="flex items-center text-white/70 text-xs tracking-wider no-drag">
        <WeatherWidget timeStr={timeStr} dateStr={dateStr} />
      </div>

      {/* Right: Quick Tools & Window Controls */}
      <div className="flex items-center gap-2 no-drag">
        {/* Active Input Device Status Indicator (Keyboard / Controller with exact model detection) */}
        <div
          title={
            activeInputMode === 'controller'
              ? `Connected & Active: ${controllerDetails?.modelName || gamepadName || 'Controller'}\nPress any key on Keyboard to switch`
              : gamepadConnected
                ? `Active Input: Keyboard (PC)\nController in standby: ${controllerDetails?.modelName || gamepadName || 'Connected'}\nPress any button on controller to switch`
                : 'Active Input: Keyboard (PC)\nNo controller detected'
          }
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-500 transform ${
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
              <span className="truncate max-w-[125px] tracking-wide">
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
              {/* If controller is also connected in standby, show small secondary icon */}
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

        {/* Gaming Session Timer */}
        <SessionTimer onTimeExpired={onTimeExpired} />

        {/* Notes & Cheats Drawer */}
        <button
          onClick={() => {
            audioEngine.playSelect();
            onOpenNotes();
          }}
          title="Field Notes & Cheats (F1 or Gamepad X)"
          className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        {/* Search */}
        <button
          onClick={() => {
            audioEngine.playSelect();
            onOpenSearch();
          }}
          title="Search games (Ctrl+K)"
          className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Astra Jukebox Mini-Player */}
        {onOpenJukebox && (
          <button
            onClick={() => {
              audioEngine.playSelect();
              onOpenJukebox();
            }}
            title={jukeboxPlaying ? `Playing: ${currentTrackTitle} (J)` : 'Astra Jukebox & Audio Visualizer (J)'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all cursor-pointer ${
              jukeboxPlaying
                ? 'bg-[var(--game-accent,#2ee5ba)]/20 text-white border border-[var(--game-accent,#2ee5ba)] shadow-[0_0_12px_var(--game-glow)]'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {jukeboxPlaying ? (
              <Activity className="w-3.5 h-3.5 text-[var(--game-accent,#2ee5ba)] animate-pulse" />
            ) : (
              <Music className="w-4 h-4" />
            )}
            {jukeboxPlaying && (
              <span className="hidden xl:inline text-[11px] font-mono font-bold max-w-[100px] truncate text-[var(--game-accent,#2ee5ba)]">
                {currentTrackTitle}
              </span>
            )}
          </button>
        )}

        {/* Gaming Activity Heatmap */}
        {onOpenActivity && (
          <button
            onClick={() => {
              audioEngine.playSelect();
              onOpenActivity();
            }}
            title="Gaming Activity Heatmap & Streaks (H)"
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
        )}

        {/* Retro & Emulation Hub */}
        {onOpenRetroHub && (
          <button
            onClick={() => {
              audioEngine.playSelect();
              onOpenRetroHub();
            }}
            title="Retro & Emulation Hub (ROM Scanner)"
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4" />
          </button>
        )}

        {/* In-Game Companion Mini-HUD */}
        {onOpenMiniHud && (
          <button
            onClick={() => {
              audioEngine.playSelect();
              onOpenMiniHud();
            }}
            title="Companion Mini-HUD (Shift+Tab / F10)"
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300" />
          </button>
        )}

        {/* Audio Mute Switch */}
        <button
          onClick={() => {
            onToggleMute();
            audioEngine.playSelect();
          }}
          title={sfxEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
        </button>

        {/* What to Play? Suggester Button */}
        {onOpenWhatToPlay && (
          <button
            onClick={() => {
              audioEngine.playSelect();
              onOpenWhatToPlay();
            }}
            title="What to Play? Decision Engine & Roulette (R or Gamepad Y)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400/20 via-[var(--game-accent,#2ee5ba)]/25 to-cyan-400/20 border border-[var(--game-accent,#2ee5ba)]/40 text-[var(--game-accent,#2ee5ba)] hover:text-white hover:bg-[var(--game-accent,#2ee5ba)]/30 hover:shadow-[0_0_15px_var(--game-glow)] transition-all cursor-pointer text-xs font-bold shadow-sm"
          >
            <Dices className="w-4 h-4 text-amber-300" />
            <span className="hidden md:inline tracking-wide">What to Play?</span>
          </button>
        )}

        {/* Add Game */}
        <button
          onClick={() => {
            audioEngine.playSelect();
            onOpenAddModal();
          }}
          title="Add Game or Scan Folders"
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--game-accent)] text-[var(--game-accent-contrast,#000000)] hover:brightness-110 transition-all cursor-pointer font-semibold shadow-md"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Game</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => {
            audioEngine.playSelect();
            onOpenSettings();
          }}
          title="Settings"
          className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-white/15 mx-1" />

        {/* Frameless Window Controls */}
        <button
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
          title="Maximize / Restore"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-red-500/80 rounded transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
