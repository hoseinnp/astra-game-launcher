import React from 'react';
import type { GameVibe } from '../../types/game';

interface ProceduralTitleLogoProps {
  title: string;
  vibe?: GameVibe | string;
  accentColor?: string;
  className?: string;
}

export const ProceduralTitleLogo: React.FC<ProceduralTitleLogoProps> = ({
  title,
  vibe = 'modern-cinematic',
  accentColor = '#2ee5ba',
  className = ''
}) => {
  const cleanVibe = vibe === 'auto' ? 'modern-cinematic' : vibe;

  switch (cleanVibe) {
    case 'cyberpunk':
      return (
        <div className={`relative flex flex-col items-start select-none group ${className}`}>
          {/* Top Telemetry Bracket */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400 tracking-[0.3em] uppercase opacity-80 mb-1">
            <span>[SYS.KERNEL_EXEC]</span>
            <span className="text-[9px] text-pink-400">CHIP_REV 2.077</span>
          </div>

          {/* Glitched Chromatic Aberration Title */}
          <h1
            style={{
              textShadow: `2px 0 0 #00f0ff, -2px 0 0 #ff0077, 0 0 20px ${accentColor}`
            }}
            className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-wider uppercase text-white leading-none relative"
          >
            {title}
          </h1>

          {/* Bottom Telemetry Bracket */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-pink-400 tracking-[0.25em] uppercase opacity-80 mt-1">
            <span>// DIRECT_NEURAL_LINK</span>
            <span className="text-[9px] text-cyan-400">ACT_READY</span>
          </div>
        </div>
      );

    case 'souls-fantasy':
      return (
        <div className={`relative flex flex-col items-start select-none ${className}`}>
          {/* Gothic Flourish Arch */}
          <div className="flex items-center gap-2 text-amber-300/80 text-xs font-serif tracking-[0.35em] uppercase mb-1">
            <span>✧</span>
            <span>ELDEN CHRONICLE</span>
            <span>✧</span>
          </div>

          {/* Gilded Antique Serif Title */}
          <h1
            style={{
              textShadow: '0 4px 18px rgba(245, 158, 11, 0.4)'
            }}
            className="text-4xl sm:text-5xl md:text-6xl font-serif font-black tracking-[0.14em] uppercase bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 bg-clip-text text-transparent leading-none drop-shadow-md"
          >
            {title}
          </h1>

          {/* Bottom Latin / Heraldic Subtitle */}
          <div className="text-[10px] font-serif text-amber-200/50 tracking-[0.3em] uppercase mt-1 italic">
            In Cineribus Resurgemus • Volume I
          </div>
        </div>
      );

    case 'retro-arcade':
      return (
        <div className={`relative flex flex-col items-start select-none ${className}`}>
          {/* 1P Press Start */}
          <div className="text-[11px] font-mono font-bold tracking-widest text-yellow-300 uppercase mb-1 drop-shadow animate-pulse">
            ★ 1P READY ★ INSERT COIN
          </div>

          {/* 3D Extruded Layered Arcade Font */}
          <h1
            style={{
              textShadow: `
                3px 3px 0 #000,
                6px 6px 0 ${accentColor || '#ff0055'},
                9px 9px 0 #000,
                0 0 25px rgba(255, 255, 255, 0.4)
              `
            }}
            className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-wider uppercase text-white leading-none transform -rotate-1"
          >
            {title}
          </h1>

          <div className="text-[10px] font-mono text-cyan-300 tracking-widest uppercase mt-2 bg-black/80 px-2 py-0.5 border border-cyan-400">
            HI-SCORE: 999990 // LEVEL 01
          </div>
        </div>
      );

    case 'tactical-military':
      return (
        <div className={`relative flex flex-col items-start select-none ${className}`}>
          <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 tracking-[0.25em] uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>MIL-SPEC // SECURE CLASSIFIED TARGET</span>
          </div>

          <h1
            style={{
              textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 20px rgba(16, 185, 129, 0.3)'
            }}
            className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-tight uppercase text-white leading-none border-l-4 border-emerald-400 pl-3.5"
          >
            {title}
          </h1>

          <div className="text-[10px] font-mono text-neutral-400 tracking-[0.2em] uppercase mt-1 pl-3.5">
            SECTOR 07 • AUTH REQ: LVL 5
          </div>
        </div>
      );

    case 'anime-stylized':
      return (
        <div className={`relative flex flex-col items-start select-none ${className}`}>
          <div className="text-[11px] font-sans font-black italic tracking-wider text-rose-300 uppercase mb-1 drop-shadow">
            ⚡ ULTIMATE COMBO BURST! ⚡
          </div>

          <h1
            style={{
              textShadow: '5px 5px 0px #000, 8px 8px 0px #ffffff, 0 0 35px rgba(244, 63, 94, 0.5)'
            }}
            className="text-5xl sm:text-6xl md:text-7xl font-black italic uppercase text-rose-400 leading-none transform -skew-x-8 hover:-skew-x-12 transition-transform duration-200"
          >
            {title}
          </h1>

          <div className="text-[11px] font-black italic text-yellow-300 tracking-wider uppercase mt-1.5 drop-shadow">
            READY TO CLASH ▶▶ STAGE CLEAR
          </div>
        </div>
      );

    case 'cozy-wholesome':
      return (
        <div className={`relative flex flex-col items-start select-none ${className}`}>
          <div className="flex items-center gap-1.5 text-xs text-emerald-300/80 font-medium tracking-wide mb-1">
            <span>🍃</span>
            <span>A Peaceful Tale</span>
          </div>

          <h1
            style={{
              textShadow: '0 8px 24px rgba(46, 229, 186, 0.35)'
            }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-100 bg-clip-text text-transparent leading-none"
          >
            {title}
          </h1>

          <div className="text-[11px] text-white/50 tracking-wider mt-1.5 font-light">
            Relax • Explore • Settle In
          </div>
        </div>
      );

    case 'modern-cinematic':
    default:
      return (
        <div className={`relative flex flex-col items-start select-none ${className}`}>
          <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] font-semibold text-white/60 uppercase mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--game-accent)]" />
            <span>PLAYSTATION STUDIOS EXPERIENCE</span>
          </div>

          <h1
            style={{
              textShadow: '0 8px 24px rgba(0,0,0,0.8)'
            }}
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase text-white leading-none"
          >
            {title}
          </h1>

          <div className="text-[11px] font-medium text-white/50 tracking-[0.25em] uppercase mt-2">
            ASTRA MASTERWORK EDITION
          </div>
        </div>
      );
  }
};
