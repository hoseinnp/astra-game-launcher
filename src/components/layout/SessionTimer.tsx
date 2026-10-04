import React, { useState, useEffect } from 'react';
import { Timer, BellRing } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

interface SessionTimerProps {
  onTimeExpired: () => void;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({ onTimeExpired }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          audioEngine.playLaunch(); // alert chime
          onTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds, onTimeExpired]);

  const handleSetTimer = (mins: number | null) => {
    audioEngine.playSelect();
    setTargetMinutes(mins);
    if (mins === null) {
      setRemainingSeconds(null);
    } else {
      setRemainingSeconds(mins * 60);
    }
    setIsOpen(false);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="relative no-drag">
      <button
        onClick={() => {
          audioEngine.playHover();
          setIsOpen(!isOpen);
        }}
        title="Gaming Session Timer"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all ${
          remainingSeconds !== null && remainingSeconds > 0
            ? 'bg-[var(--game-accent)] text-black font-bold shadow-md animate-pulse'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
      >
        <Timer className="w-3.5 h-3.5" />
        {remainingSeconds !== null && remainingSeconds > 0 ? (
          <span>{formatCountdown(remainingSeconds)}</span>
        ) : null}
      </button>

      {isOpen && (
        <div
          className="absolute top-10 right-0 w-48 rounded-2xl bg-[#0d111d] border border-white/15 shadow-2xl p-3 z-50 space-y-2 animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-white/80 pb-1 border-b border-white/10">
            <BellRing className="w-3.5 h-3.5 text-[var(--game-accent)]" />
            <span>Session Reminder</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {[30, 45, 60, 90].map((mins) => (
              <button
                key={mins}
                onClick={() => handleSetTimer(mins)}
                className={`px-2 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  targetMinutes === mins && remainingSeconds !== 0
                    ? 'bg-[var(--game-accent)] text-black'
                    : 'bg-white/5 text-white/70 hover:bg-white/15'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>

          {remainingSeconds !== null && (
            <button
              onClick={() => handleSetTimer(null)}
              className="w-full py-1 text-[11px] text-red-400 hover:underline text-center"
            >
              Cancel Timer
            </button>
          )}
        </div>
      )}
    </div>
  );
};
