import React from 'react';
import type { ControllerDetails, ControllerBrand } from '../../utils/deviceDetector';

interface NavigationHudProps {
  activeInputMode?: 'keyboard' | 'controller';
  controllerDetails?: ControllerDetails | null;
  viewMode: 'ps5' | 'grid' | 'shelf';
  gridDensity?: 'poster' | 'banner' | 'compact';
  onLaunch?: () => void;
  onOpenDetails?: () => void;
  onOpenNotes?: () => void;
  onOpenWhatToPlay?: () => void;
  onToggleViewMode?: () => void;
  onToggleDensity?: () => void;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
}

export const NavigationHud: React.FC<NavigationHudProps> = ({
  activeInputMode = 'keyboard',
  controllerDetails,
  viewMode,
  gridDensity = 'poster',
  onLaunch,
  onOpenDetails,
  onOpenNotes,
  onOpenWhatToPlay,
  onToggleViewMode,
  onToggleDensity,
  onOpenSearch,
  onOpenSettings
}) => {
  const brand: ControllerBrand = controllerDetails?.brand || 'generic';
  const isController = activeInputMode === 'controller';

  // Render platform specific button glyphs
  const renderGlyph = (actionKey: 'CONFIRM' | 'DETAILS' | 'NOTES' | 'SUGGEST' | 'BUMPERS' | 'VIEW_TOGGLE' | 'DENSITY' | 'SEARCH' | 'SETTINGS') => {
    if (!isController) {
      // Keyboard Keycaps
      switch (actionKey) {
        case 'CONFIRM':
          return (
            <kbd className="px-1.5 py-0.5 min-w-[20px] text-center rounded bg-white/20 text-white font-mono font-bold text-[10px] border border-white/30 shadow-sm">
              ↵ Enter
            </kbd>
          );
        case 'DETAILS':
          return (
            <kbd className="px-1.5 py-0.5 min-w-[20px] text-center rounded bg-white/20 text-white font-mono font-bold text-[10px] border border-white/30 shadow-sm">
              Space
            </kbd>
          );
        case 'NOTES':
          return (
            <kbd className="px-1.5 py-0.5 min-w-[20px] text-center rounded bg-white/20 text-white font-mono font-bold text-[10px] border border-white/30 shadow-sm">
              F1
            </kbd>
          );
        case 'SUGGEST':
          return (
            <kbd className="px-1.5 py-0.5 min-w-[20px] text-center rounded bg-amber-400/20 text-amber-300 font-mono font-bold text-[10px] border border-amber-400/40 shadow-sm">
              R
            </kbd>
          );
        case 'VIEW_TOGGLE':
        case 'BUMPERS':
          return (
            <kbd className="px-1.5 py-0.5 min-w-[20px] text-center rounded bg-white/20 text-white font-mono font-bold text-[10px] border border-white/30 shadow-sm">
              Tab
            </kbd>
          );
        case 'DENSITY':
          return (
            <kbd className="px-1.5 py-0.5 min-w-[20px] text-center rounded bg-white/20 text-white font-mono font-bold text-[10px] border border-white/30 shadow-sm">
              V
            </kbd>
          );
        case 'SEARCH':
          return (
            <kbd className="px-1.5 py-0.5 min-w-[20px] text-center rounded bg-white/20 text-white font-mono font-bold text-[10px] border border-white/30 shadow-sm">
              Ctrl+K
            </kbd>
          );
        case 'SETTINGS':
          return (
            <kbd className="px-1.5 py-0.5 min-w-[20px] text-center rounded bg-white/20 text-white font-mono font-bold text-[10px] border border-white/30 shadow-sm">
              Esc
            </kbd>
          );
      }
    }

    // PlayStation Style Glyphs
    if (brand === 'playstation') {
      switch (actionKey) {
        case 'CONFIRM':
          return (
            <span className="w-5 h-5 rounded-full bg-[#003791] text-white flex items-center justify-center font-black text-xs shadow-[0_0_8px_rgba(0,55,145,0.7)] border border-white/40">
              ✕
            </span>
          );
        case 'DETAILS':
          return (
            <span className="w-5 h-5 rounded-full bg-[#d6006e] text-white flex items-center justify-center font-black text-xs shadow-[0_0_8px_rgba(214,0,110,0.7)] border border-white/40">
              □
            </span>
          );
        case 'NOTES':
          return (
            <span className="w-5 h-5 rounded-full bg-[#00a368] text-white flex items-center justify-center font-black text-xs shadow-[0_0_8px_rgba(0,163,104,0.7)] border border-white/40">
              △
            </span>
          );
        case 'SUGGEST':
          return (
            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-black text-xs shadow-[0_0_8px_rgba(245,158,11,0.7)] border border-white/40">
              R
            </span>
          );
        case 'BUMPERS':
        case 'VIEW_TOGGLE':
          return (
            <span className="px-1.5 py-0.5 rounded bg-white/20 text-white/95 font-bold text-[9px] border border-white/30 tracking-tight">
              L1 / R1
            </span>
          );
        case 'DENSITY':
          return (
            <span className="w-5 h-5 rounded-full bg-white/25 text-white flex items-center justify-center font-bold text-[10px] border border-white/30">
              R3
            </span>
          );
        case 'SEARCH':
          return (
            <span className="px-1.5 py-0.5 rounded bg-white/20 text-white/95 font-bold text-[9px] border border-white/30">
              Share
            </span>
          );
        case 'SETTINGS':
          return (
            <span className="px-1.5 py-0.5 rounded bg-white/20 text-white/95 font-bold text-[9px] border border-white/30">
              Options
            </span>
          );
      }
    }

    // Nintendo Switch Layout (A/B inverted)
    if (brand === 'nintendo') {
      switch (actionKey) {
        case 'CONFIRM':
          return (
            <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-[0_0_8px_rgba(225,29,72,0.6)] border border-white/40">
              A
            </span>
          );
        case 'DETAILS':
          return (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-black text-xs shadow-[0_0_8px_rgba(245,158,11,0.6)] border border-white/40">
              Y
            </span>
          );
        case 'NOTES':
          return (
            <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-xs shadow-[0_0_8px_rgba(14,165,233,0.6)] border border-white/40">
              X
            </span>
          );
        case 'SUGGEST':
          return (
            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-black text-xs shadow-[0_0_8px_rgba(245,158,11,0.7)] border border-white/40">
              R
            </span>
          );
        case 'BUMPERS':
        case 'VIEW_TOGGLE':
          return (
            <span className="px-1.5 py-0.5 rounded bg-white/20 text-white/95 font-bold text-[9px] border border-white/30">
              L / R
            </span>
          );
        case 'DENSITY':
          return (
            <span className="w-5 h-5 rounded-full bg-white/25 text-white flex items-center justify-center font-bold text-[10px] border border-white/30">
              R
            </span>
          );
        case 'SEARCH':
          return (
            <span className="px-1.5 py-0.5 rounded bg-white/20 text-white/95 font-bold text-[9px] border border-white/30">
              -
            </span>
          );
        case 'SETTINGS':
          return (
            <span className="px-1.5 py-0.5 rounded bg-white/20 text-white/95 font-bold text-[9px] border border-white/30">
              +
            </span>
          );
      }
    }

    // Xbox & Standard Controllers (Default)
    switch (actionKey) {
      case 'CONFIRM':
        return (
          <span className="w-5 h-5 rounded-full bg-[#107c10] text-white flex items-center justify-center font-black text-xs shadow-[0_0_8px_rgba(16,124,16,0.7)] border border-white/40">
            A
          </span>
        );
      case 'DETAILS':
        return (
          <span className="w-5 h-5 rounded-full bg-[#0078d7] text-white flex items-center justify-center font-black text-xs shadow-[0_0_8px_rgba(0,120,215,0.7)] border border-white/40">
            X
          </span>
        );
      case 'NOTES':
        return (
          <span className="w-5 h-5 rounded-full bg-[#f6b400] text-slate-950 flex items-center justify-center font-black text-xs shadow-[0_0_8px_rgba(246,180,0,0.7)] border border-white/40">
            Y
          </span>
        );
      case 'SUGGEST':
        return (
          <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-[0_0_8px_rgba(245,158,11,0.7)] border border-white/40">
            Y
          </span>
        );
      case 'BUMPERS':
      case 'VIEW_TOGGLE':
        return (
          <span className="px-1.5 py-0.5 rounded bg-white/20 text-white/95 font-bold text-[9px] border border-white/30 tracking-tight">
            LB / RB
          </span>
        );
      case 'DENSITY':
        return (
          <span className="w-5 h-5 rounded-full bg-white/25 text-white flex items-center justify-center font-bold text-[10px] border border-white/30">
            RS
          </span>
        );
      case 'SEARCH':
        return (
          <span className="px-1.5 py-0.5 rounded bg-white/20 text-white/95 font-bold text-[9px] border border-white/30">
            View
          </span>
        );
      case 'SETTINGS':
        return (
          <span className="px-1.5 py-0.5 rounded bg-white/20 text-white/95 font-bold text-[9px] border border-white/30">
            Menu
          </span>
        );
    }
  };

  return (
    <footer
      role="region"
      aria-label="Navigation Shortcuts"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 px-5 py-2 rounded-full glass-panel border border-white/15 shadow-[0_12px_32px_rgba(0,0,0,0.65)] backdrop-blur-xl flex items-center gap-4 text-xs select-none transition-all duration-300 pointer-events-auto"
    >
      {/* 1. Launch Game */}
      <button
        onClick={onLaunch}
        className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors cursor-pointer group"
      >
        {renderGlyph('CONFIRM')}
        <span className="font-semibold tracking-wide text-[11px]">Play</span>
      </button>

      <span className="w-1 h-3 border-r border-white/15" />

      {/* 2. Game Hub / Details */}
      <button
        onClick={onOpenDetails}
        className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors cursor-pointer group"
      >
        {renderGlyph('DETAILS')}
        <span className="font-medium tracking-wide text-[11px]">Game Hub</span>
      </button>

      <span className="w-1 h-3 border-r border-white/15" />

      {/* 3. Field Notes */}
      <button
        onClick={onOpenNotes}
        className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors cursor-pointer group"
      >
        {renderGlyph('NOTES')}
        <span className="font-medium tracking-wide text-[11px]">Notes</span>
      </button>

      <span className="w-1 h-3 border-r border-white/15" />

      {/* 4. Switch View (PS5 Carousel vs. Library Grid) */}
      <button
        onClick={onToggleViewMode}
        className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors cursor-pointer group"
      >
        {renderGlyph('VIEW_TOGGLE')}
        <span className="font-medium tracking-wide text-[11px]">
          {viewMode === 'ps5' ? 'Grid View' : 'Console View'}
        </span>
      </button>

      {/* In Grid View, offer Density Switcher */}
      {viewMode === 'grid' && onToggleDensity && (
        <>
          <span className="w-1 h-3 border-r border-white/15" />
          <button
            onClick={onToggleDensity}
            className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors cursor-pointer group"
          >
            {renderGlyph('DENSITY')}
            <span className="font-medium tracking-wide text-[11px] capitalize">
              Density: {gridDensity}
            </span>
          </button>
        </>
      )}

      {/* Suggest / What to Play */}
      {onOpenWhatToPlay && (
        <>
          <span className="w-1 h-3 border-r border-white/15" />
          <button
            onClick={onOpenWhatToPlay}
            className="flex items-center gap-1.5 text-amber-300 hover:text-white transition-colors cursor-pointer group"
          >
            {renderGlyph('SUGGEST')}
            <span className="font-semibold tracking-wide text-[11px]">Suggest</span>
          </button>
        </>
      )}

      {/* 5. Search shortcut */}
      {onOpenSearch && (
        <>
          <span className="w-1 h-3 border-r border-white/15" />
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors cursor-pointer group"
          >
            {renderGlyph('SEARCH')}
            <span className="font-medium tracking-wide text-[11px]">Search</span>
          </button>
        </>
      )}

      {/* 6. Settings shortcut */}
      {onOpenSettings && (
        <>
          <span className="w-1 h-3 border-r border-white/15" />
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors cursor-pointer group"
          >
            {renderGlyph('SETTINGS')}
            <span className="font-medium tracking-wide text-[11px]">Settings</span>
          </button>
        </>
      )}

      {/* Screenshot shortcut */}
      <span className="w-1 h-3 border-r border-white/15" />
      <div className="flex items-center gap-1.5 text-white/70 group" title="Capture High-Res Screenshot (F12)">
        <kbd className="px-1.5 py-0.5 min-w-[20px] text-center rounded bg-white/20 text-white font-mono font-bold text-[10px] border border-white/30 shadow-sm">
          F12
        </kbd>
        <span className="font-medium tracking-wide text-[11px]">Capture</span>
      </div>

      {/* D-Pad Nav Indicator */}
      <div className="hidden md:flex items-center gap-1.5 pl-1 border-l border-white/15 text-white/50 text-[10px]">
        <span>{isController ? 'D-Pad / Sticks: Navigate' : 'Arrow Keys: Navigate'}</span>
      </div>
    </footer>
  );
};
