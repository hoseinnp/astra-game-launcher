import React, { useEffect, useState } from 'react';
import { Play, X, BarChart2, Sparkles, Clock } from 'lucide-react';
import type { PlayPattern } from '../types/Activity.types';
import type { Game } from '../types/game';
import { GameLauncherService } from '../services/GameLauncherService';
import { audioEngine } from '../services/audioEngine';

interface SmartResumePopupProps {
  pattern: PlayPattern | null;
  games: Game[];
  onOpenStats: () => void;
  onDismiss: () => void;
}

export const SmartResumePopup: React.FC<SmartResumePopupProps> = ({
  pattern,
  games,
  onOpenStats,
  onDismiss
}) => {
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (!pattern) return;

    setTimeLeft(5);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pattern, onDismiss]);

  if (!pattern) return null;

  const targetGame = games.find((g) => g.id === pattern.gameId);
  const gameTitle = targetGame?.title || pattern.gameName || 'Game';

  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const num = h % 12 === 0 ? 12 : h % 12;
    return `${num}:00 ${period}`;
  };

  const handleResume = () => {
    audioEngine.playLaunch();
    onDismiss();
    if (targetGame) {
      GameLauncherService.launchGame(targetGame);
    }
  };

  return (
    <div className="fixed bottom-3 sm:bottom-6 right-3 sm:right-6 z-50 animate-slideUp max-w-[calc(100vw-1.5rem)]">
      <div className="w-[360px] max-w-full rounded-2xl sm:rounded-3xl bg-zinc-950/95 border border-white/20 p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col gap-3.5 sm:gap-4 relative isolate overflow-hidden min-w-0">
        {/* Ambient background glow */}
        <div
          className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-20 filter blur-2xl pointer-events-none"
          style={{ background: targetGame?.theme?.accentColor || '#10b981' }}
        />

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-400 uppercase">
                Smart Resume
              </span>
              <h4 className="text-xs text-white/50 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Usually played at {formatHour(pattern.hour)}
              </h4>
            </div>
          </div>

          <button
            onClick={() => {
              audioEngine.playSelect();
              onDismiss();
            }}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="text-xs text-white/90 leading-relaxed">
          You usually play <span className="font-bold text-white">{gameTitle}</span> around this time ({pattern.occurrences} previous sessions). Would you like to resume?
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleResume}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-[1.02]"
          >
            <Play className="w-3.5 h-3.5 fill-black" /> Resume Game
          </button>

          <button
            onClick={() => {
              audioEngine.playSelect();
              onDismiss();
              onOpenStats();
            }}
            className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="View Gaming Stats"
          >
            <BarChart2 className="w-3.5 h-3.5" /> Stats
          </button>

          <button
            onClick={() => {
              audioEngine.playSelect();
              onDismiss();
            }}
            className="py-2 px-2.5 rounded-xl text-white/40 hover:text-white/70 text-xs transition-colors cursor-pointer"
          >
            Dismiss ({timeLeft}s)
          </button>
        </div>

        {/* 5-second progress countdown bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
          <div
            className="h-full bg-emerald-400 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 5) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
