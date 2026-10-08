import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckSquare,
  Square,
  Camera,
  Cpu,
  X,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Zap,
  Volume2
} from 'lucide-react';
import type { Game, SystemPerformanceStats } from '../../types/game';
import { jukeboxEngine, type JukeboxState } from '../../services/jukeboxEngine';
import { audioEngine } from '../../services/audioEngine';

interface InGameMiniHudProps {
  isOpen: boolean;
  activeGame: Game | null;
  onClose: () => void;
  onTakeScreenshot: () => void;
  onOpenJukebox: () => void;
  onShowToast: (msg: string) => void;
}

const DEFAULT_CHECKLIST = [
  { id: '1', text: 'Clear area milestone / main quest', done: false },
  { id: '2', text: 'Upgrade primary weapon & armor', done: true },
  { id: '3', text: 'Capture in-game scenic screenshot (F12)', done: false }
];

export const InGameMiniHud: React.FC<InGameMiniHudProps> = ({
  isOpen,
  activeGame,
  onClose,
  onTakeScreenshot,
  onOpenJukebox,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'perf' | 'jukebox'>('notes');
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [jukeboxState, setJukeboxState] = useState<JukeboxState>(jukeboxEngine.getState());
  const [perfStats, setPerfStats] = useState<SystemPerformanceStats | null>(null);

  const storageKey = activeGame?.id ? `hud_checklist_${activeGame.id}` : 'hud_checklist_default';

  // Local checklist state for quick gaming objectives (persisted per game)
  const [checklists, setChecklists] = useState<{ id: string; text: string; done: boolean }[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CHECKLIST;
  });

  // Re-sync checklist when activeGame changes
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setChecklists(JSON.parse(saved));
          return;
        }
      } catch {}
      setChecklists(DEFAULT_CHECKLIST);
    });
  }, [storageKey]);

  useEffect(() => {
    return jukeboxEngine.subscribe(setJukeboxState);
  }, []);

  // Clock & Stopwatch Timer
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Live Performance Stats Polling
  useEffect(() => {
    if (!isOpen) return;
    const pollPerf = async () => {
      if (window.api?.getSystemPerformance) {
        try {
          const stats = await window.api.getSystemPerformance();
          setPerfStats(stats);
        } catch {}
      }
    };
    pollPerf();
    const interval = setInterval(pollPerf, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const toggleChecklistItem = (id: string) => {
    audioEngine.playSelect();
    setChecklists((prev) => {
      const next = prev.map((item) => {
        if (item.id === id) {
          const nextDone = !item.done;
          if (nextDone && onShowToast) {
            onShowToast(`🎯 Objective Complete: ${item.text}`);
          }
          return { ...item, done: nextDone };
        }
        return item;
      });
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const formatStopwatch = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-3 sm:top-6 right-3 sm:right-6 z-50 w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl sm:rounded-3xl bg-zinc-950/95 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl flex flex-col overflow-hidden animate-slideLeft select-none isolate max-h-[calc(100vh-1.5rem)] min-w-0">
      {/* Top Header */}
      <div className="p-3.5 sm:p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--game-accent,#2ee5ba)] text-black flex items-center justify-center font-black shadow-md">
            <Zap className="w-4 h-4 fill-black" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Companion Mini-HUD</h3>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-white/50 truncate max-w-[180px]">
              {activeGame?.title || 'System Dashboard'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              audioEngine.playSelect();
              onTakeScreenshot();
            }}
            title="Instant Screenshot (F12)"
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              audioEngine.playSelect();
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clock & Stopwatch Bar */}
      <div className="px-4 py-2.5 bg-black/40 border-b border-white/10 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 text-white/80">
          <Clock className="w-3.5 h-3.5 text-[var(--game-accent,#2ee5ba)]" />
          <span className="font-bold">{currentTimeStr || '12:00:00 PM'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/50">
          <span>Session:</span>
          <span className="text-emerald-400 font-bold">{formatStopwatch(sessionSeconds)}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 p-1.5 bg-white/5 border-b border-white/10 gap-1 text-[11px] font-mono">
        <button
          onClick={() => setActiveTab('notes')}
          className={`py-1 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === 'notes' ? 'bg-white/20 text-white shadow-xs' : 'text-white/50 hover:text-white'
          }`}
        >
          Checklist
        </button>
        <button
          onClick={() => setActiveTab('jukebox')}
          className={`py-1 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === 'jukebox' ? 'bg-white/20 text-white shadow-xs' : 'text-white/50 hover:text-white'
          }`}
        >
          Jukebox
        </button>
        <button
          onClick={() => setActiveTab('perf')}
          className={`py-1 rounded-lg font-bold transition-all cursor-pointer ${
            activeTab === 'perf' ? 'bg-white/20 text-white shadow-xs' : 'text-white/50 hover:text-white'
          }`}
        >
          Hardware
        </button>
      </div>

      {/* Tab 1: Checklist & In-Game Objectives */}
      {activeTab === 'notes' && (
        <div className="p-4 space-y-2.5 max-h-56 overflow-y-auto no-scrollbar">
          {checklists.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleChecklistItem(item.id)}
              className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all"
            >
              {item.done ? (
                <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-white/40 flex-shrink-0" />
              )}
              <span
                className={`text-xs truncate ${
                  item.done ? 'line-through text-white/40' : 'text-white/90 font-medium'
                }`}
              >
                {item.text}
              </span>
            </div>
          ))}
          <div className="pt-1">
            <span className="text-[10px] font-mono text-white/40 italic">
              Press F1 or click in library to edit detailed game strategy notes.
            </span>
          </div>
        </div>
      )}

      {/* Tab 2: Jukebox Mini-Player */}
      {activeTab === 'jukebox' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">
                {jukeboxState.currentTrack?.title || 'No Audio Playing'}
              </h4>
              <p className="text-[10px] text-white/50 truncate">
                {jukeboxState.currentTrack?.artist || 'Astra Jukebox'}
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenJukebox();
              }}
              className="text-[10px] font-mono text-[var(--game-accent,#2ee5ba)] hover:underline ml-2 flex-shrink-0"
            >
              Open Deck ↗
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => jukeboxEngine.prevTrack()}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                title="Previous Track"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => jukeboxEngine.togglePlay()}
                className="p-2 rounded-xl bg-[var(--game-accent,#2ee5ba)] text-black font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
                title={jukeboxState.isPlaying ? 'Pause' : 'Play'}
              >
                {jukeboxState.isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
              </button>
              <button
                onClick={() => jukeboxEngine.stop()}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                title="Stop Audio"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
              <button
                onClick={() => jukeboxEngine.nextTrack()}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                title="Next Track"
              >
                <SkipForward className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 w-24">
              <Volume2 className="w-3.5 h-3.5 text-white/50" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={jukeboxState.volume}
                onChange={(e) => jukeboxEngine.setVolume(parseFloat(e.target.value))}
                className="w-full accent-[var(--game-accent,#2ee5ba)] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Hardware Telemetry */}
      {activeTab === 'perf' && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[10px] text-white/50 mb-1 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-sky-400" />
                <span>CPU Load</span>
              </div>
              <div className="text-base font-bold text-white">
                {perfStats ? `${perfStats.cpuUsage}%` : '18%'}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[10px] text-white/50 mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>RAM Usage</span>
              </div>
              <div className="text-base font-bold text-white">
                {perfStats ? `${perfStats.ramUsedGB} GB` : '6.4 GB'}
                <span className="text-[10px] text-white/40 ml-1">
                  ({perfStats ? `${perfStats.ramPercent}%` : '42%'})
                </span>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-white/40 text-center">
            System Uptime: {perfStats ? `${perfStats.uptimeHours} hrs` : '4.2 hrs'} • Direct Hardware Telemetry
          </div>
        </div>
      )}
    </div>
  );
};
