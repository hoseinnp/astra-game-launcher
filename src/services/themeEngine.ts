import type { GlobalTheme, Game, GameVibe } from '../types/game';

export interface ThemeColors {
  accent: string;
  glow: string;
  bgGradStart: string;
  bgGradEnd: string;
}

export interface VibeConfig {
  id: Exclude<GameVibe, 'auto'>;
  name: string;
  tagline: string;
  badgeLabel: string;
  badgeIcon: string;
  fontFamily: string;
  buttonShape: string;
  buttonClipPath?: string;
  buttonBorder?: string;
  buttonShadow?: string;
  buttonTypography: string;
  buttonBgOverride?: string;
  secondaryBtnShape: string;
  secondaryBtnClipPath?: string;
  secondaryBtnBorder?: string;
  secondaryBtnBg?: string;
  secondaryBtnTypography?: string;
  cardShape: string;
  cardSelectedShape: string;
  cardSelectedRing: string;
  cardSelectedBorder?: string;
  cardClipPath?: string;
  badgeShape: string;
  overlayType:
    | 'cyber-grid'
    | 'souls-embers'
    | 'retro-crt'
    | 'tactical-hud'
    | 'anime-halftone'
    | 'cozy-bokeh'
    | 'modern-acrylic'
    | 'horror-static'
    | 'racing-speedlines'
    | 'western-dust'
    | 'stealth-radar'
    | 'space-stars'
    | 'wasteland-ash'
    | 'stadium-lights';
  playLabelPrefix?: string;
  playLabelSuffix?: string;
  resumeLabelPrefix?: string;
}

export const GAME_VIBES: Record<Exclude<GameVibe, 'auto'>, VibeConfig> = {
  'cyberpunk': {
    id: 'cyberpunk',
    name: 'Cyberpunk / High-Tech',
    tagline: 'Chamfered polygon cuts, neon telemetry, digital grid HUD',
    badgeLabel: 'CYBERPUNK HUD',
    badgeIcon: '⚡',
    fontFamily: 'font-mono',
    buttonShape: 'rounded-none transform-gpu',
    buttonClipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
    buttonBorder: 'border-2 border-[var(--game-accent)]',
    buttonShadow: 'shadow-[0_0_30px_var(--game-glow),inset_0_0_15px_rgba(255,255,255,0.2)]',
    buttonTypography: 'font-mono tracking-[0.22em] font-black uppercase text-sm',
    secondaryBtnShape: 'rounded-none',
    secondaryBtnClipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
    secondaryBtnBorder: 'border border-[var(--game-accent)]/50 hover:border-[var(--game-accent)]',
    secondaryBtnBg: 'bg-black/70 backdrop-blur-md',
    secondaryBtnTypography: 'font-mono text-xs uppercase tracking-wider',
    cardShape: 'rounded-none',
    cardSelectedShape: 'rounded-none',
    cardSelectedRing: 'ring-4 ring-[var(--game-accent)]',
    cardSelectedBorder: 'border-2 border-cyan-400',
    cardClipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
    badgeShape: 'rounded-none border border-cyan-400/40 bg-black/80 font-mono tracking-widest',
    overlayType: 'cyber-grid',
    playLabelPrefix: '[ EXECUTE: ',
    playLabelSuffix: ' ]',
    resumeLabelPrefix: '[ RESUME_SYS: '
  },
  'souls-fantasy': {
    id: 'souls-fantasy',
    name: 'Souls-like / Dark Fantasy',
    tagline: 'Antique heraldic double-borders, gilded serif, gothic embers',
    badgeLabel: 'GOTHIC SOULS',
    badgeIcon: '⚔',
    fontFamily: 'font-serif',
    buttonShape: 'rounded-full border-2 border-double border-amber-300/80',
    buttonBorder: 'border-2 border-double border-amber-300/80',
    buttonBgOverride: 'bg-gradient-to-b from-[#241505] via-[#100903] to-[#241505] text-amber-100',
    buttonShadow: 'shadow-[0_0_35px_rgba(234,179,8,0.45),inset_0_1px_2px_rgba(255,255,255,0.4)]',
    buttonTypography: 'font-serif tracking-[0.28em] font-bold uppercase text-sm',
    secondaryBtnShape: 'rounded-full',
    secondaryBtnBorder: 'border border-amber-500/50 hover:border-amber-400',
    secondaryBtnBg: 'bg-[#0f0a06]/85 backdrop-blur-md text-amber-200/90',
    secondaryBtnTypography: 'font-serif text-xs uppercase tracking-[0.18em]',
    cardShape: 'rounded-2xl',
    cardSelectedShape: 'rounded-2xl',
    cardSelectedRing: 'ring-4 ring-amber-500/50',
    cardSelectedBorder: 'border-2 border-double border-amber-400/90 shadow-[0_0_30px_rgba(234,179,8,0.35)]',
    badgeShape: 'rounded-full border border-amber-400/50 bg-[#120a05]/90 text-amber-300 font-serif tracking-widest',
    overlayType: 'souls-embers',
    playLabelPrefix: '✧ COMMENCE ✧',
    playLabelSuffix: '',
    resumeLabelPrefix: '✧ AWAKEN ✧'
  },
  'retro-arcade': {
    id: 'retro-arcade',
    name: 'Retro Arcade / Pixel',
    tagline: 'Chunky 3D push-down arcade buttons, 8-bit borders, CRT raster',
    badgeLabel: 'RETRO ARCADE',
    badgeIcon: '🕹',
    fontFamily: 'font-mono',
    buttonShape: 'rounded-none border-4 border-black shadow-[5px_5px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none',
    buttonTypography: 'font-mono tracking-wider font-black uppercase text-sm',
    secondaryBtnShape: 'rounded-none border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
    secondaryBtnBorder: 'border-2 border-black',
    secondaryBtnBg: 'bg-neutral-900 text-white',
    secondaryBtnTypography: 'font-mono text-xs uppercase font-bold tracking-wider',
    cardShape: 'rounded-none border-2 border-black',
    cardSelectedShape: 'rounded-none',
    cardSelectedRing: 'ring-4 ring-[var(--game-accent)]',
    cardSelectedBorder: 'border-4 border-black shadow-[6px_6px_0px_#000]',
    badgeShape: 'rounded-none border-2 border-black bg-neutral-900 shadow-[2px_2px_0px_#000] font-mono',
    overlayType: 'retro-crt',
    playLabelPrefix: '▶ START 1P: ',
    playLabelSuffix: '',
    resumeLabelPrefix: '▶ CONTINUE: '
  },
  'tactical-military': {
    id: 'tactical-military',
    name: 'Tactical Military / Shooter',
    tagline: 'Carbon fiber armor plates, hazard diagonals, stencil telemetry',
    badgeLabel: 'TACTICAL MIL-SPEC',
    badgeIcon: '🎯',
    fontFamily: 'font-mono',
    buttonShape: 'rounded-none transform-gpu',
    buttonClipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
    buttonBorder: 'border-l-4 border-r-2 border-y border-[var(--game-accent)]',
    buttonBgOverride: 'bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white',
    buttonShadow: 'shadow-[0_0_25px_var(--game-glow),inset_0_1px_0_rgba(255,255,255,0.2)]',
    buttonTypography: 'font-mono tracking-[0.2em] font-black uppercase text-sm',
    secondaryBtnShape: 'rounded-none',
    secondaryBtnClipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
    secondaryBtnBorder: 'border border-neutral-600 hover:border-[var(--game-accent)]',
    secondaryBtnBg: 'bg-neutral-900/90 text-neutral-200',
    secondaryBtnTypography: 'font-mono text-xs uppercase font-bold tracking-wider',
    cardShape: 'rounded-lg',
    cardSelectedShape: 'rounded-lg',
    cardSelectedRing: 'ring-4 ring-[var(--game-accent)]',
    cardSelectedBorder: 'border-2 border-white/60 shadow-[0_0_30px_var(--game-glow)]',
    badgeShape: 'rounded-sm border border-neutral-600 bg-neutral-900/95 font-mono text-[10px] tracking-wider uppercase',
    overlayType: 'tactical-hud',
    playLabelPrefix: 'DEPLOY // ',
    playLabelSuffix: '',
    resumeLabelPrefix: 'RESUME // '
  },
  'anime-stylized': {
    id: 'anime-stylized',
    name: 'Anime / Stylized Action',
    tagline: 'Dynamic tilted parallelograms, high-contrast comic shadows, action speed',
    badgeLabel: 'ANIME POP',
    badgeIcon: '💥',
    fontFamily: 'font-sans',
    buttonShape: 'rounded-md transform -skew-x-8 hover:-skew-x-12 active:scale-95 shadow-[5px_5px_0px_#ffffff]',
    buttonBorder: 'border-2 border-white',
    buttonTypography: 'font-black italic uppercase tracking-wider text-base',
    secondaryBtnShape: 'rounded-md transform -skew-x-8 hover:-skew-x-12',
    secondaryBtnBorder: 'border border-white/40 hover:border-white shadow-[3px_3px_0px_rgba(255,255,255,0.4)]',
    secondaryBtnBg: 'bg-black/80 text-white',
    secondaryBtnTypography: 'font-bold italic text-xs uppercase tracking-wider',
    cardShape: 'rounded-2xl',
    cardSelectedShape: 'rounded-2xl transform -skew-x-2',
    cardSelectedRing: 'ring-4 ring-white',
    cardSelectedBorder: 'border-4 border-[var(--game-accent)] shadow-[8px_8px_0px_rgba(0,0,0,0.85)]',
    badgeShape: 'rounded-md transform -skew-x-8 border border-white/60 bg-black/80 font-black italic tracking-wide',
    overlayType: 'anime-halftone',
    playLabelPrefix: 'GO!! ▶ ',
    playLabelSuffix: '',
    resumeLabelPrefix: 'RE:START ▶ '
  },
  'cozy-wholesome': {
    id: 'cozy-wholesome',
    name: 'Cozy / Wholesome / Nature',
    tagline: 'Ultra-plush pillowy squircles, velvety frosted glass, dreamy warm bokeh',
    badgeLabel: 'COZY HARVEST',
    badgeIcon: '🍃',
    fontFamily: 'font-sans',
    buttonShape: 'rounded-full px-9 py-4 shadow-[0_12px_28px_-6px_rgba(46,229,186,0.5)]',
    buttonBorder: 'border-2 border-white/40',
    buttonBgOverride: 'bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-slate-900',
    buttonTypography: 'font-bold tracking-wide text-sm',
    secondaryBtnShape: 'rounded-full',
    secondaryBtnBorder: 'border border-white/30 hover:border-white/60',
    secondaryBtnBg: 'bg-white/10 backdrop-blur-xl text-white',
    secondaryBtnTypography: 'font-semibold text-xs tracking-wide',
    cardShape: 'rounded-2xl',
    cardSelectedShape: 'rounded-2xl',
    cardSelectedRing: 'ring-4 ring-emerald-300/80',
    cardSelectedBorder: 'border-2 border-white/70 shadow-[0_16px_36px_-6px_rgba(0,0,0,0.5)]',
    badgeShape: 'rounded-full border border-white/30 bg-white/15 backdrop-blur-md font-medium tracking-wide',
    overlayType: 'cozy-bokeh',
    playLabelPrefix: '✦ Play: ',
    playLabelSuffix: ' ✦',
    resumeLabelPrefix: '✦ Continue: '
  },
  'modern-cinematic': {
    id: 'modern-cinematic',
    name: 'Modern Cinematic / PS5',
    tagline: 'Luxury frosted acrylic glass, fluid curves, luminous HDR glow',
    badgeLabel: 'MODERN CINEMA',
    badgeIcon: '✦',
    fontFamily: 'font-sans',
    buttonShape: 'rounded-2xl shadow-[0_0_30px_var(--game-glow)]',
    buttonBorder: 'border border-white/20',
    buttonTypography: 'font-extrabold tracking-wide text-base',
    secondaryBtnShape: 'rounded-2xl',
    secondaryBtnBorder: 'border border-white/15 hover:border-white/40',
    secondaryBtnBg: 'glass-panel text-white/80 hover:text-white',
    secondaryBtnTypography: 'font-semibold text-xs tracking-wide',
    cardShape: 'rounded-2xl',
    cardSelectedShape: 'rounded-2xl',
    cardSelectedRing: 'ring-4 ring-[var(--game-accent)]',
    cardSelectedBorder: 'border-2 border-white/50 shadow-[0_16px_36px_-6px_rgba(0,0,0,0.75)]',
    badgeShape: 'rounded-md glass-pill border border-white/20 text-[11px] font-bold tracking-wider uppercase',
    overlayType: 'modern-acrylic',
    playLabelPrefix: '',
    playLabelSuffix: '',
    resumeLabelPrefix: ''
  },
  'horror-survival': {
    id: 'horror-survival',
    name: 'Survival Horror / Psychological',
    tagline: 'Distressed crimson boundaries, claustrophobic static, survival terror',
    badgeLabel: 'SURVIVAL HORROR',
    badgeIcon: '🩸',
    fontFamily: 'font-mono',
    buttonShape: 'rounded-none transform-gpu',
    buttonBorder: 'border-2 border-red-600',
    buttonBgOverride: 'bg-gradient-to-r from-red-950 via-black to-red-950 text-red-200',
    buttonShadow: 'shadow-[0_0_30px_rgba(239,68,68,0.5),inset_0_0_12px_rgba(0,0,0,0.9)]',
    buttonTypography: 'font-mono tracking-[0.25em] font-black uppercase text-sm',
    secondaryBtnShape: 'rounded-none',
    secondaryBtnBorder: 'border border-red-800 hover:border-red-500',
    secondaryBtnBg: 'bg-black/90 text-red-300',
    secondaryBtnTypography: 'font-mono text-xs uppercase tracking-wider',
    cardShape: 'rounded-none',
    cardSelectedShape: 'rounded-none',
    cardSelectedRing: 'ring-4 ring-red-600',
    cardSelectedBorder: 'border-2 border-red-500',
    badgeShape: 'rounded-none border border-red-700/60 bg-red-950/80 text-red-300 font-mono tracking-widest',
    overlayType: 'horror-static',
    playLabelPrefix: 'SURVIVE // ',
    playLabelSuffix: '',
    resumeLabelPrefix: 'RESTORE SANITY // '
  },
  'racing-motorsport': {
    id: 'racing-motorsport',
    name: 'Racing / Motorsport Apex',
    tagline: 'Aerodynamic speed angles, carbon-weave textures, high-octane velocity',
    badgeLabel: 'MOTORSPORT APEX',
    badgeIcon: '🏁',
    fontFamily: 'font-sans',
    buttonShape: 'rounded-lg transform -skew-x-12 hover:-skew-x-16 active:scale-95 shadow-[5px_5px_0px_#000]',
    buttonBorder: 'border-2 border-white',
    buttonBgOverride: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950',
    buttonShadow: 'shadow-[0_0_35px_rgba(250,204,21,0.6)]',
    buttonTypography: 'font-black italic uppercase tracking-wider text-base',
    secondaryBtnShape: 'rounded-lg transform -skew-x-12 hover:-skew-x-16',
    secondaryBtnBorder: 'border border-yellow-400/50 hover:border-yellow-300',
    secondaryBtnBg: 'bg-black/85 text-yellow-300',
    secondaryBtnTypography: 'font-black italic text-xs uppercase tracking-wider',
    cardShape: 'rounded-xl transform -skew-x-2',
    cardSelectedShape: 'rounded-xl transform -skew-x-4',
    cardSelectedRing: 'ring-4 ring-yellow-400',
    cardSelectedBorder: 'border-2 border-white',
    badgeShape: 'rounded-md transform -skew-x-8 border border-yellow-400/60 bg-black/85 text-yellow-300 font-black italic tracking-wide',
    overlayType: 'racing-speedlines',
    playLabelPrefix: 'IGNITION ▶ ',
    playLabelSuffix: '',
    resumeLabelPrefix: 'PIT STOP ▶ '
  },
  'western-outlaw': {
    id: 'western-outlaw',
    name: 'Western / Frontier Outlaw',
    tagline: 'Weathered parchment serif, bounty poster accents, smoking iron',
    badgeLabel: 'FRONTIER OUTLAW',
    badgeIcon: '🤠',
    fontFamily: 'font-serif',
    buttonShape: 'rounded-sm border-2 border-amber-600/80',
    buttonBorder: 'border-2 border-amber-600/80',
    buttonBgOverride: 'bg-gradient-to-b from-[#2b180a] via-[#1a0e05] to-[#2b180a] text-amber-200',
    buttonShadow: 'shadow-[0_0_25px_rgba(217,119,6,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)]',
    buttonTypography: 'font-serif tracking-[0.25em] font-bold uppercase text-sm',
    secondaryBtnShape: 'rounded-sm',
    secondaryBtnBorder: 'border border-amber-700/60 hover:border-amber-500',
    secondaryBtnBg: 'bg-[#150c05]/90 text-amber-300',
    secondaryBtnTypography: 'font-serif text-xs uppercase tracking-[0.16em]',
    cardShape: 'rounded-sm',
    cardSelectedShape: 'rounded-sm',
    cardSelectedRing: 'ring-4 ring-amber-600',
    cardSelectedBorder: 'border-2 border-amber-400',
    badgeShape: 'rounded-sm border border-amber-600/60 bg-[#1c0f06]/90 text-amber-300 font-serif tracking-widest',
    overlayType: 'western-dust',
    playLabelPrefix: 'DRAW! ⚡ ',
    playLabelSuffix: '',
    resumeLabelPrefix: 'SADDLE UP ▶ '
  },
  'stealth-espionage': {
    id: 'stealth-espionage',
    name: 'Tactical Espionage / Stealth',
    tagline: 'Night-vision phosphor green, sonar sweep telemetry, classified markings',
    badgeLabel: 'SHADOW OPERATIVE',
    badgeIcon: '👁',
    fontFamily: 'font-mono',
    buttonShape: 'rounded-none border-2 border-emerald-400',
    buttonBorder: 'border-2 border-emerald-400',
    buttonBgOverride: 'bg-gradient-to-r from-emerald-950/80 via-black to-emerald-950/80 text-emerald-300',
    buttonShadow: 'shadow-[0_0_30px_rgba(16,185,129,0.5),inset_0_0_10px_rgba(16,185,129,0.3)]',
    buttonTypography: 'font-mono tracking-[0.22em] font-bold uppercase text-sm',
    secondaryBtnShape: 'rounded-none',
    secondaryBtnBorder: 'border border-emerald-700/50 hover:border-emerald-400',
    secondaryBtnBg: 'bg-black/90 text-emerald-300',
    secondaryBtnTypography: 'font-mono text-xs uppercase tracking-wider',
    cardShape: 'rounded-md',
    cardSelectedShape: 'rounded-md',
    cardSelectedRing: 'ring-4 ring-emerald-500',
    cardSelectedBorder: 'border-2 border-emerald-400',
    badgeShape: 'rounded-none border border-emerald-500/50 bg-black/90 text-emerald-400 font-mono tracking-widest',
    overlayType: 'stealth-radar',
    playLabelPrefix: 'INFILTRATE // ',
    playLabelSuffix: '',
    resumeLabelPrefix: 'RESUME OP // '
  },
  'space-cosmic': {
    id: 'space-cosmic',
    name: 'Cosmic / Space Opera',
    tagline: 'Stellar orbital curves, luminous nebula stardust, orbital trajectory',
    badgeLabel: 'COSMIC VOYAGER',
    badgeIcon: '🪐',
    fontFamily: 'font-sans',
    buttonShape: 'rounded-2xl border border-sky-400/60',
    buttonBorder: 'border border-sky-400/60',
    buttonBgOverride: 'bg-gradient-to-r from-indigo-950 via-slate-900 to-sky-950 text-sky-200',
    buttonShadow: 'shadow-[0_0_35px_rgba(56,189,248,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)]',
    buttonTypography: 'font-sans tracking-[0.2em] font-black uppercase text-sm',
    secondaryBtnShape: 'rounded-2xl',
    secondaryBtnBorder: 'border border-sky-500/40 hover:border-sky-300',
    secondaryBtnBg: 'bg-slate-950/85 text-sky-300',
    secondaryBtnTypography: 'font-sans text-xs tracking-wide',
    cardShape: 'rounded-2xl',
    cardSelectedShape: 'rounded-2xl',
    cardSelectedRing: 'ring-4 ring-sky-400',
    cardSelectedBorder: 'border-2 border-cyan-300',
    badgeShape: 'rounded-full border border-sky-400/50 bg-indigo-950/80 text-sky-300 font-medium tracking-wider',
    overlayType: 'space-stars',
    playLabelPrefix: 'ENGAGE WARP ▶ ',
    playLabelSuffix: '',
    resumeLabelPrefix: 'ORBITAL RESUME ▶ '
  },
  'post-apocalyptic': {
    id: 'post-apocalyptic',
    name: 'Post-Apocalyptic / Wasteland',
    tagline: 'Radiation hazard stencils, oxidized steel, toxic ash fallout',
    badgeLabel: 'RAD WASTELAND',
    badgeIcon: '☣',
    fontFamily: 'font-mono',
    buttonShape: 'rounded-none border-2 border-yellow-500',
    buttonBorder: 'border-2 border-yellow-500',
    buttonBgOverride: 'bg-gradient-to-r from-yellow-950/90 via-neutral-900 to-yellow-950/90 text-yellow-200',
    buttonShadow: 'shadow-[0_0_30px_rgba(234,179,8,0.45),inset_0_0_10px_rgba(234,179,8,0.2)]',
    buttonTypography: 'font-mono tracking-[0.25em] font-black uppercase text-sm',
    secondaryBtnShape: 'rounded-none',
    secondaryBtnBorder: 'border border-yellow-600/50 hover:border-yellow-400',
    secondaryBtnBg: 'bg-neutral-900/90 text-yellow-300',
    secondaryBtnTypography: 'font-mono text-xs uppercase tracking-wider',
    cardShape: 'rounded-none',
    cardSelectedShape: 'rounded-none',
    cardSelectedRing: 'ring-4 ring-yellow-500',
    cardSelectedBorder: 'border-2 border-yellow-400',
    badgeShape: 'rounded-none border border-yellow-500/60 bg-neutral-950/90 text-yellow-400 font-mono tracking-widest',
    overlayType: 'wasteland-ash',
    playLabelPrefix: 'SCAVENGE ▶ ',
    playLabelSuffix: '',
    resumeLabelPrefix: 'RETURN TO WASTES ▶ '
  },
  'sports-arena': {
    id: 'sports-arena',
    name: 'Sports / Championship Arena',
    tagline: 'Stadium floodlights, dynamic team jersey stripes, championship glory',
    badgeLabel: 'CHAMPIONS ARENA',
    badgeIcon: '🏆',
    fontFamily: 'font-sans',
    buttonShape: 'rounded-xl border-2 border-cyan-400',
    buttonBorder: 'border-2 border-cyan-400',
    buttonBgOverride: 'bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 text-white font-black',
    buttonShadow: 'shadow-[0_0_30px_rgba(6,182,212,0.6),inset_0_1px_2px_rgba(255,255,255,0.5)]',
    buttonTypography: 'font-sans tracking-wide font-black uppercase text-base',
    secondaryBtnShape: 'rounded-xl',
    secondaryBtnBorder: 'border border-cyan-400/50 hover:border-cyan-300',
    secondaryBtnBg: 'bg-slate-900/85 text-cyan-300',
    secondaryBtnTypography: 'font-sans text-xs font-bold tracking-wide',
    cardShape: 'rounded-xl',
    cardSelectedShape: 'rounded-xl',
    cardSelectedRing: 'ring-4 ring-cyan-400',
    cardSelectedBorder: 'border-2 border-white',
    badgeShape: 'rounded-lg border border-cyan-400/60 bg-blue-950/80 text-cyan-300 font-bold tracking-wide',
    overlayType: 'stadium-lights',
    playLabelPrefix: 'KICK OFF! ▶ ',
    playLabelSuffix: '',
    resumeLabelPrefix: 'RESUME MATCH ▶ '
  }
};

export const GLOBAL_THEMES: Record<GlobalTheme, { name: string; colors: ThemeColors }> = {
  'ps5-dark': {
    name: 'PlayStation Modern',
    colors: {
      accent: '#0070d1',
      glow: 'rgba(0, 112, 209, 0.45)',
      bgGradStart: '#070a14',
      bgGradEnd: '#020307'
    }
  },
  'cyberpunk': {
    name: 'Cyberpunk 2077 Neon',
    colors: {
      accent: '#00f0ff',
      glow: 'rgba(0, 240, 255, 0.5)',
      bgGradStart: '#090814',
      bgGradEnd: '#030208'
    }
  },
  'oled-minimal': {
    name: 'OLED Minimalist',
    colors: {
      accent: '#ffffff',
      glow: 'rgba(255, 255, 255, 0.25)',
      bgGradStart: '#000000',
      bgGradEnd: '#000000'
    }
  },
  'retro-arcade': {
    name: 'Retro Arcade CRT',
    colors: {
      accent: '#39ff14',
      glow: 'rgba(57, 255, 20, 0.45)',
      bgGradStart: '#08110b',
      bgGradEnd: '#020603'
    }
  },
  '8bitdo-mint': {
    name: '8BitDo 2C Mint Edition',
    colors: {
      accent: '#2ee5ba',
      glow: 'rgba(46, 229, 186, 0.5)',
      bgGradStart: '#071612',
      bgGradEnd: '#020705'
    }
  },
  'starfield-cosmic': {
    name: 'Starfield Deep Space Observatory',
    colors: {
      accent: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.55)',
      bgGradStart: '#050713',
      bgGradEnd: '#010206'
    }
  },
  'analog-collector': {
    name: 'The Analog Archive',
    colors: {
      accent: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.45)',
      bgGradStart: '#140c08',
      bgGradEnd: '#060302'
    }
  }
};

export class ThemeEngine {
  // Extract vibrant dominant color from an image URL
  public static async extractDominantColor(imageUrl: string): Promise<{ accent: string; glow: string }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ accent: '#0070d1', glow: 'rgba(0, 112, 209, 0.4)' });
            return;
          }

          canvas.width = 40;
          canvas.height = 40;
          ctx.drawImage(img, 0, 0, 40, 40);

          const data = ctx.getImageData(0, 0, 40, 40).data;
          let bestR = 0, bestG = 112, bestB = 209;
          let maxScore = -1;

          for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a < 128) continue;

            // Compute brightness and saturation
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const l = (max + min) / 2;
            const sat = max === min ? 0 : (max - min) / (l > 128 ? (510 - max - min) : (max + min));

            // Skip dull grays, pure whites, and pure blacks
            if (sat < 0.25 || l < 35 || l > 225) continue;

            // Score favoring saturated, energetic colors
            const score = sat * 2 + (l > 60 && l < 180 ? 1 : 0.5);
            if (score > maxScore) {
              maxScore = score;
              bestR = r;
              bestG = g;
              bestB = b;
            }
          }

          const hex = `#${((1 << 24) + (bestR << 16) + (bestG << 8) + bestB).toString(16).slice(1)}`;
          const glow = `rgba(${bestR}, ${bestG}, ${bestB}, 0.45)`;
          resolve({ accent: hex, glow });
        } catch {
          resolve({ accent: '#0070d1', glow: 'rgba(0, 112, 209, 0.4)' });
        }
      };

      img.onerror = () => {
        resolve({ accent: '#0070d1', glow: 'rgba(0, 112, 209, 0.4)' });
      };

      img.src = imageUrl;
    });
  }

  // Compute high-contrast text color (#ffffff or #000000) based on WCAG luminance
  public static getContrastColor(color: string): string {
    if (!color) return '#000000';
    let r = 0, g = 0, b = 0;
    const clean = color.trim().toLowerCase();

    if (clean.startsWith('#')) {
      const hex = clean.replace('#', '');
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else {
        r = parseInt(hex.substring(0, 2), 16) || 0;
        g = parseInt(hex.substring(2, 4), 16) || 0;
        b = parseInt(hex.substring(4, 6), 16) || 0;
      }
    } else if (clean.startsWith('rgb')) {
      const matches = clean.match(/\d+/g);
      if (matches && matches.length >= 3) {
        r = parseInt(matches[0], 10);
        g = parseInt(matches[1], 10);
        b = parseInt(matches[2], 10);
      }
    }

    // Relative luminance calculation according to WCAG guidelines
    const a = [r, g, b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    const luminance = 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];

    // If luminance > 0.38, background is bright/light -> black text (#000000)
    // Otherwise background is dark/deep -> crisp white text (#ffffff)
    return luminance > 0.38 ? '#000000' : '#ffffff';
  }

  // Automatically detect game vibe from title, genres, tags and description using weighted regex scoring
  public static detectGameVibe(game?: Game | null): Exclude<GameVibe, 'auto'> {
    if (!game) return 'modern-cinematic';
    if (game.theme?.vibe && game.theme.vibe !== 'auto') {
      return game.theme.vibe;
    }

    const titleStr = (game.title || '').toLowerCase();
    const genreStr = (game.genres || []).join(' ').toLowerCase();
    const tagStr = (game.tags || []).join(' ').toLowerCase();
    const descStr = (game.description || '').toLowerCase();

    // Vibe rules with keyword patterns
    const vibeRules: {
      vibe: Exclude<GameVibe, 'auto'>;
      keywords: RegExp[];
    }[] = [
      {
        vibe: 'horror-survival',
        keywords: [
          /\b(survival horror|psychological horror|resident evil|silent hill|dead space|evil within|outlast|alan wake|amnesia|soma|callisto protocol|fatal frame|fears to fathom|slender)\b/i,
          /\b(horror|jump scare|terrifying|haunted|undead|slasher)\b/i
        ]
      },
      {
        vibe: 'racing-motorsport',
        keywords: [
          /\b(need for speed|forza|gran turismo|formula 1|f1 2\d|dirt rally|assetto corsa|wreckfest|burnout|asphalt|trackmania|wipeout|iracing|project cars|grid legends|midnight club)\b/i,
          /\b(racing|motorsport|motorcycle|drift|drifting|rally|hypercar|supercar|circuit)\b/i
        ]
      },
      {
        vibe: 'western-outlaw',
        keywords: [
          /\b(red dead|call of juarez|desperados|weird west|hard west|outlaw|six-shooter|gunslinger|cowboy|wild west|bounty hunter)\b/i,
          /\b(western|saloon|frontier)\b/i
        ]
      },
      {
        vibe: 'stealth-espionage',
        keywords: [
          /\b(metal gear|splinter cell|hitman|dishonored|deus ex|deathloop|mark of the ninja|sniper elite|shadow tactics|aragami)\b/i,
          /\b(stealth|espionage|assassin|infiltrate|infiltration|covert|silent assassin)\b/i
        ]
      },
      {
        vibe: 'post-apocalyptic',
        keywords: [
          /\b(post-apocalyptic|wasteland|fallout|metro 2033|metro exodus|s\.t\.a\.l\.k\.e\.r|stalker|mad max|days gone|the last of us|frostpunk|rage 2)\b/i,
          /\b(apocalypse|irradiated|nuclear fallout|scavenger|ruins of humanity)\b/i
        ]
      },
      {
        vibe: 'space-cosmic',
        keywords: [
          /\b(starfield|mass effect|no man's sky|outer wilds|elite dangerous|everspace|chorus|stellaris|star wars|homeworld|kerbal|dead space|halo)\b/i,
          /\b(space exploration|spaceship|interstellar|galaxy|cosmic|orbit|orbital|nebula|planetary)\b/i
        ]
      },
      {
        vibe: 'sports-arena',
        keywords: [
          /\b(fifa|fc 2\d|nba 2k\d|madden|nhl 2\d|wwe 2k\d|rocket league|tony hawk|skate 3|pga tour|pro evolution|ufc 2\d)\b/i,
          /\b(sports|football|soccer|basketball|baseball|hockey|skateboarding)\b/i
        ]
      },
      {
        vibe: 'cyberpunk',
        keywords: [
          /\b(cyberpunk|ghostrunner|system shock|deus ex|blade runner|the ascent|ruiner|cloudpunk|synced)\b/i,
          /\b(cyber|neon city|cyborg|hack|hacker|high-tech|dystopian future|android|cyberware)\b/i
        ]
      },
      {
        vibe: 'souls-fantasy',
        keywords: [
          /\b(elden ring|bloodborne|dark souls|demon's souls|sekiro|lies of p|mortal shell|lords of the fallen|remnant|hollow knight|diablo|witcher|grim dawn)\b/i,
          /\b(souls-like|soulslike|dark fantasy|gothic fantasy|tarnished|undead curse)\b/i
        ]
      },
      {
        vibe: 'anime-stylized',
        keywords: [
          /\b(persona|genshin|final fantasy|nier|hi-fi rush|kingdom hearts|guilty gear|devil may cry|bayonetta|monster hunter|dragon ball|naruto|yakuza|like a dragon|tales of|zenless|honkai)\b/i,
          /\b(anime|jrpg|hack and slash|cel-shaded|manga style)\b/i
        ]
      },
      {
        vibe: 'tactical-military',
        keywords: [
          /\b(call of duty|battlefield|warzone|tarkov|escape from tarkov|rainbow six|counter-strike|cs:go|cs2|ghost recon|arma|squad|insurgency|ready or not|hell let loose)\b/i,
          /\b(tactical shooter|military simulation|mil-spec|first-person shooter|cqb)\b/i
        ]
      },
      {
        vibe: 'retro-arcade',
        keywords: [
          /\b(celeste|shovel knight|dead cells|stardew valley|undertale|sea of stars|pac-man|sonic|super mario|street fighter|tekken|mega man|castlevania|contra)\b/i,
          /\b(pixel art|8-bit|16-bit|arcade|retro platformer|metroidvania|beat 'em up)\b/i
        ]
      },
      {
        vibe: 'cozy-wholesome',
        keywords: [
          /\b(animal crossing|ori and|journey|a short hike|slime rancher|zelda|dorfromantik|unpacking|stardew valley|dave the diver|gris)\b/i,
          /\b(cozy|wholesome|relaxing|peaceful|farming sim|chill)\b/i
        ]
      }
    ];

    let highestScore = 0;
    let selectedVibe: Exclude<GameVibe, 'auto'> = 'modern-cinematic';

    for (const rule of vibeRules) {
      let score = 0;
      for (const regex of rule.keywords) {
        if (regex.test(titleStr)) score += 12;
        if (regex.test(genreStr)) score += 6;
        if (regex.test(tagStr)) score += 4;
        if (regex.test(descStr)) score += 1.5;
      }
      if (score > highestScore) {
        highestScore = score;
        selectedVibe = rule.vibe;
      }
    }

    return highestScore >= 3.5 ? selectedVibe : 'modern-cinematic';
  }

  // Get active vibe configuration
  public static getVibeConfig(vibe?: GameVibe, game?: Game | null): VibeConfig {
    if (!vibe || vibe === 'auto') {
      const detected = this.detectGameVibe(game);
      return GAME_VIBES[detected] || GAME_VIBES['modern-cinematic'];
    }
    return GAME_VIBES[vibe] || GAME_VIBES['modern-cinematic'];
  }

  // Inject CSS variables into the root DOM
  public static applyGameTheme(accent: string, glow: string, vibe: GameVibe = 'modern-cinematic') {
    const root = document.documentElement;
    const contrast = this.getContrastColor(accent);
    root.style.setProperty('--game-accent', accent);
    root.style.setProperty('--game-accent-contrast', contrast);
    root.style.setProperty('--game-glow', glow);
    root.style.setProperty('--game-vibe', vibe);
  }

  public static applyGlobalTheme(theme: GlobalTheme) {
    const root = document.documentElement;
    const t = GLOBAL_THEMES[theme] || GLOBAL_THEMES['8bitdo-mint'];
    const contrast = this.getContrastColor(t.colors.accent);
    root.style.setProperty('--global-accent', t.colors.accent);
    root.style.setProperty('--global-glow', t.colors.glow);
    root.style.setProperty('--global-bg-start', t.colors.bgGradStart);
    root.style.setProperty('--global-bg-end', t.colors.bgGradEnd);
    root.style.setProperty('--game-accent', t.colors.accent);
    root.style.setProperty('--game-accent-contrast', contrast);
    root.style.setProperty('--game-glow', t.colors.glow);
    root.style.setProperty('--game-vibe', 'modern-cinematic');
  }

  public static applyArchetype(archetype: 'analog' | 'digital' | 'cosmic') {
    const root = document.documentElement;
    
    // Remove old classes
    root.classList.remove('archetype-analog', 'archetype-digital', 'archetype-cosmic');
    
    // Apply new class for CSS targeting
    root.classList.add(`archetype-${archetype}`);

    // Update global typography and spacing via CSS variables
    if (archetype === 'analog') {
      root.style.setProperty('--ui-font', '"Courier New", Courier, monospace');
      root.style.setProperty('--ui-rounding', '4px');
    } else if (archetype === 'digital') {
      root.style.setProperty('--ui-font', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace');
      root.style.setProperty('--ui-rounding', '0px');
    } else if (archetype === 'cosmic') {
      root.style.setProperty('--ui-font', 'system-ui, -apple-system, sans-serif');
      root.style.setProperty('--ui-rounding', '24px');
    }
  }
}
