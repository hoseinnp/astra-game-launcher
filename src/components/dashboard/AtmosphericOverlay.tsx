import React from 'react';
import type { VibeConfig } from '../../services/themeEngine';

interface AtmosphericOverlayProps {
  vibe?: VibeConfig['overlayType'];
  vibeConfig?: VibeConfig;
  accentColor?: string;
}

export const AtmosphericOverlay: React.FC<AtmosphericOverlayProps> = ({ vibe, vibeConfig, accentColor }) => {
  const type = vibeConfig?.overlayType || vibe || 'modern-acrylic';

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden select-none">
      {/* 1. CYBERPUNK / HIGH-TECH HUD */}
      {type === 'cyber-grid' && (
        <>
          {/* Cyber Perspective Grid at bottom (Clean 3D floor, zero scanlines) */}
          <div
            className="absolute bottom-0 inset-x-0 h-44 opacity-20 pointer-events-none"
            style={{
              background:
                'linear-gradient(to top, rgba(0, 240, 255, 0.18), transparent), repeating-linear-gradient(to right, transparent 0, transparent 48px, rgba(0, 240, 255, 0.25) 48px, rgba(0, 240, 255, 0.25) 49px)',
              maskImage: 'linear-gradient(to top, black 20%, transparent)'
            }}
          />
          {/* HUD Telemetry Corner Elements */}
          <div
            className="absolute top-16 left-12 font-mono text-[9px] tracking-widest uppercase opacity-60"
            style={{ color: accentColor || 'var(--game-accent)' }}
          >
            [SYS_NODE // 0x7F41A] ── ONLINE
          </div>
          <div
            className="absolute top-16 right-12 font-mono text-[9px] tracking-widest uppercase opacity-60"
            style={{ color: accentColor || 'var(--game-accent)' }}
          >
            SYNC_RATE: 60FPS // HUD_VIBE_READY
          </div>
        </>
      )}

      {/* 2. SOULS-LIKE / DARK FANTASY */}
      {type === 'souls-embers' && (
        <>
          {/* Ominous Dark Gothic Vignette */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 35%, rgba(12, 7, 3, 0.6) 75%, rgba(5, 2, 1, 0.9) 100%)'
            }}
          />
          {/* Floating Embers Simulation */}
          <div className="absolute inset-0 overflow-hidden opacity-50">
            <div className="absolute bottom-10 left-[15%] w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
            <div className="absolute bottom-24 left-[35%] w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_12px_#fbbf24] animate-ping" />
            <div className="absolute bottom-16 right-[25%] w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_#f97316] animate-pulse" />
            <div className="absolute bottom-32 right-[40%] w-1 h-1 rounded-full bg-amber-200 shadow-[0_0_6px_#fef3c7] animate-ping" />
          </div>
          {/* Ornate Corner Flourishes */}
          <div className="absolute bottom-6 left-8 font-serif text-amber-500/30 text-xs tracking-[0.3em] uppercase">
            ✧ LANDS BETWEEN ✧
          </div>
        </>
      )}

      {/* 3. RETRO ARCADE / CRT (Smooth curved vignette without scanlines) */}
      {type === 'retro-crt' && (
        <>
          {/* CRT Barrel Curvature Vignette */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at center, transparent 55%, rgba(0, 0, 0, 0.7) 100%)'
            }}
          />
          <div className="absolute top-16 left-12 font-mono text-xs font-black text-white/40 tracking-wider">
            CREDIT: 02 // 1P READY
          </div>
        </>
      )}

      {/* 4. TACTICAL MILITARY */}
      {type === 'tactical-hud' && (
        <>
          {/* Corner Crosshair Reticles */}
          <div className="absolute top-16 left-12 text-white/35 font-mono text-xs">
            ┌──────── 10.45.92 N
          </div>
          <div className="absolute top-16 right-12 text-white/35 font-mono text-xs text-right">
            08.12.77 E ────────┐
          </div>
          <div className="absolute bottom-8 right-12 text-white/35 font-mono text-xs text-right">
            [SEC_STATUS // ARMED]
          </div>
          {/* Tactical Grid crosshair tickmark */}
          <div className="absolute top-1/2 left-10 -translate-y-1/2 w-4 h-[1px] bg-white/30" />
          <div className="absolute top-1/2 right-10 -translate-y-1/2 w-4 h-[1px] bg-white/30" />
        </>
      )}

      {/* 5. ANIME / STYLIZED ACTION */}
      {type === 'anime-halftone' && (
        <>
          <div className="absolute top-16 right-16 font-black italic text-lg text-white/20 tracking-widest transform -skew-x-12">
            ACTION // STAGE 01
          </div>
        </>
      )}

      {/* 6. COZY / WHOLESOME */}
      {type === 'cozy-bokeh' && (
        <>
          {/* Soft warm bokeh simulation */}
          <div className="absolute -top-10 -left-10 w-96 h-96 rounded-full bg-emerald-400/10 filter blur-3xl" />
          <div className="absolute bottom-0 right-10 w-80 h-80 rounded-full bg-amber-400/10 filter blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-60 h-60 rounded-full bg-cyan-400/10 filter blur-2xl animate-pulse" />
        </>
      )}

      {/* 7. MODERN CINEMATIC */}
      {type === 'modern-acrylic' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </>
      )}

      {/* 8. SURVIVAL HORROR / PSYCHOLOGICAL */}
      {type === 'horror-static' && (
        <>
          {/* Deep Blood & Darkness Vignette */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at center, transparent 40%, rgba(60, 5, 5, 0.4) 75%, rgba(10, 0, 0, 0.95) 100%)'
            }}
          />
          <div className="absolute top-16 left-12 font-mono text-[10px] tracking-widest text-red-500/40 uppercase">
            [PULSE: ELEVATED // HEARTBEAT: 138 BPM]
          </div>
        </>
      )}

      {/* 9. RACING / MOTORSPORT */}
      {type === 'racing-speedlines' && (
        <>
          <div className="absolute top-16 right-16 font-sans font-black italic text-yellow-400/25 tracking-wider text-xl transform -skew-x-12">
            RPM: 8,500 // GEAR: 6
          </div>
          <div className="absolute bottom-10 left-12 font-mono text-[9px] text-white/30 tracking-widest">
            SECTOR 1: -0.420s ▲ APEX VELOCITY
          </div>
        </>
      )}

      {/* 10. WESTERN / FRONTIER OUTLAW */}
      {type === 'western-dust' && (
        <>
          {/* Sepia warm dust vignette */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(45, 25, 10, 0.4) 75%, rgba(15, 8, 3, 0.9) 100%)'
            }}
          />
          <div className="absolute top-16 left-12 font-serif text-amber-500/30 text-xs tracking-[0.25em] uppercase">
            ★ TERRITORY OF NEW AUSTIN ★
          </div>
          <div className="absolute bottom-8 right-12 font-serif text-amber-600/40 text-[11px] tracking-widest">
            DEAD OR ALIVE // REWARD $5,000
          </div>
        </>
      )}

      {/* 11. TACTICAL ESPIONAGE / STEALTH (Clean, noise-free radar HUD) */}
      {type === 'stealth-radar' && (
        <>
          <div className="absolute top-16 left-12 font-mono text-[10px] tracking-widest text-emerald-400/50 uppercase">
            [RADAR: 080° // SILENT // CAMOUFLAGE 98%]
          </div>
          <div className="absolute bottom-10 right-12 font-mono text-[9px] text-emerald-500/40 tracking-wider">
            FREQUENCY: 140.85 MHz // CODEC READY
          </div>
        </>
      )}

      {/* 12. SPACE / COSMIC OPERA */}
      {type === 'space-stars' && (
        <>
          {/* Deep space nebula glow */}
          <div className="absolute -top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 filter blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] rounded-full bg-cyan-500/10 filter blur-3xl" />
          <div className="absolute top-16 right-16 font-sans text-xs tracking-[0.3em] text-sky-400/40 uppercase">
            ORBIT: GEO-STATIONARY // WARP READY
          </div>
          <div className="absolute bottom-8 left-12 font-mono text-[9px] text-sky-300/30 tracking-widest">
            PARSEC: 14.82 // LIGHT-SPEED FACTOR 9.2
          </div>
        </>
      )}

      {/* 13. POST-APOCALYPTIC / WASTELAND */}
      {type === 'wasteland-ash' && (
        <>
          {/* Toxic irradiated vignette */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at center, transparent 40%, rgba(35, 25, 5, 0.4) 75%, rgba(10, 8, 2, 0.92) 100%)'
            }}
          />
          <div className="absolute top-16 left-12 font-mono text-[10px] tracking-widest text-yellow-500/40 uppercase">
            [RAD: 4.8 R/hr // GEIGER ALERT]
          </div>
          <div className="absolute bottom-8 right-12 font-mono text-[9px] text-yellow-600/40 tracking-widest">
            SURVIVAL ZONE // FILTER: 82% LIFE
          </div>
        </>
      )}

      {/* 14. SPORTS / CHAMPIONSHIP ARENA */}
      {type === 'stadium-lights' && (
        <>
          {/* Floodlight beams from top corners */}
          <div className="absolute -top-10 -left-10 w-96 h-96 rounded-full bg-cyan-400/10 filter blur-3xl" />
          <div className="absolute -top-10 -right-10 w-96 h-96 rounded-full bg-blue-500/10 filter blur-3xl" />
          <div className="absolute top-16 right-16 font-sans font-black italic text-cyan-300/30 tracking-wider text-base">
            CHAMPIONS CUP // 90+4'
          </div>
          <div className="absolute bottom-8 left-12 font-sans font-bold text-[10px] text-white/40 tracking-widest uppercase">
            STADIUM CAPACITY: 82,000 // ATMOSPHERE: PEAK
          </div>
        </>
      )}
    </div>
  );
};
