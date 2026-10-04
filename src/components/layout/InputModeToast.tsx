import React from 'react';
import { DeviceIcon, type ControllerDetails } from '../../utils/deviceDetector';

export interface InputModeToastData {
  mode: 'keyboard' | 'controller';
  title: string;
  subtitle: string;
  details?: ControllerDetails | null;
  exiting?: boolean;
}

interface InputModeToastProps {
  toast: InputModeToastData | null;
  onDismiss: () => void;
}

export const InputModeToast: React.FC<InputModeToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  const isController = toast.mode === 'controller';
  const brand = toast.details?.brand || 'generic';

  return (
    <aside
      aria-label="Input Mode Switch Notification"
      onClick={onDismiss}
      className={`fixed top-18 left-1/2 -translate-x-1/2 z-50 select-none cursor-pointer group transition-all duration-300 ${
        toast.exiting ? 'animate-inputHUDOut' : 'animate-inputHUDIn'
      }`}
    >
      <div
        className={`relative flex items-center gap-4 px-5 py-3 rounded-2xl backdrop-blur-2xl bg-zinc-950/90 border transition-all duration-500 shadow-2xl ${
          isController
            ? 'border-[var(--game-accent,#2ee5ba)]/70 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_var(--game-glow,rgba(46,229,186,0.4))] hover:border-[var(--game-accent,#2ee5ba)]'
            : 'border-emerald-400/70 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(52,211,153,0.35)] hover:border-emerald-300'
        }`}
      >
        {/* Subtle ambient back-glow aura */}
        <div
          className="absolute -inset-1 rounded-2xl opacity-40 blur-xl pointer-events-none transition-opacity duration-500 group-hover:opacity-75 -z-10"
          style={{
            background: isController
              ? 'radial-gradient(ellipse at center, var(--game-accent, #2ee5ba) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at center, rgba(52, 211, 153, 0.7) 0%, transparent 70%)'
          }}
        />

        {/* Glowing Pop-up Device Icon Orb */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center relative border transition-transform duration-500 group-hover:scale-105 animate-inputGlowPulse ${
              isController
                ? 'bg-[var(--game-accent,#2ee5ba)]/15 border-[var(--game-accent,#2ee5ba)]/50 text-[var(--game-accent,#2ee5ba)] shadow-[0_0_20px_var(--game-glow,rgba(46,229,186,0.5))]'
                : 'bg-emerald-500/15 border-emerald-400/50 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]'
            }`}
          >
            <DeviceIcon
              type={isController ? brand : 'keyboard'}
              className="w-6 h-6 transition-all drop-shadow-[0_0_8px_currentColor]"
            />
          </div>

          {/* Micro status ping indicator */}
          <span
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-950 ${
              isController ? 'bg-[var(--game-accent,#2ee5ba)]' : 'bg-emerald-400'
            } animate-ping`}
          />
          <span
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-950 ${
              isController ? 'bg-[var(--game-accent,#2ee5ba)]' : 'bg-emerald-400'
            }`}
          />
        </div>

        {/* Informative Body Content */}
        <div className="flex flex-col min-w-[210px] max-w-[340px]">
          <div className="flex items-center gap-2">
            <span
              className={`text-[9px] font-black tracking-widest uppercase ${
                isController ? 'text-[var(--game-accent,#2ee5ba)]' : 'text-emerald-400'
              }`}
            >
              {isController ? '🎮 Controller Active' : '⌨️ Keyboard & Mouse Active'}
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/70 font-mono tracking-wider">
              {isController ? 'AUTO-MAPPED' : 'DIRECT INPUT'}
            </span>
          </div>

          <h4 className="text-sm font-extrabold text-white tracking-wide truncate mt-0.5 drop-shadow-sm">
            {toast.title}
          </h4>

          <p className="text-[11px] text-white/60 tracking-tight leading-snug mt-0.5 truncate">
            {toast.subtitle}
          </p>
        </div>

        {/* Quick Shortcut Hint Badge on the Right */}
        <div className="hidden sm:flex flex-col items-end pl-3 border-l border-white/10 text-[10px] text-white/40 font-mono">
          <span className="text-white/30 text-[9px] uppercase tracking-wider">Switch</span>
          <span className="text-white/80 font-bold tracking-tight">
            {isController ? 'Esc / Keys' : 'Gamepad 🎮'}
          </span>
        </div>
      </div>
    </aside>
  );
};
