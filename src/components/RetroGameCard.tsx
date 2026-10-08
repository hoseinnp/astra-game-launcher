import React, { useState, useEffect } from 'react';
import {
  Play,
  HardDrive,
  Save,
  AlertTriangle,
  MoreVertical,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import type { RomItem, EmulatorInfo } from '../types/Retro.types';
import { EmulatorDetectionService } from '../services/EmulatorDetectionService';
import { SaveStateService } from '../services/SaveStateService';

interface RetroGameCardProps {
  rom: RomItem;
  onLaunch: (rom: RomItem, emulator?: EmulatorInfo) => void;
  onOpenSaveStates: (rom: RomItem) => void;
  onMissingEmulator: (rom: RomItem) => void;
}

const SYSTEM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  nes: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  snes: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  gb: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  gba: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  n64: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  ps1: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  genesis: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  arcade: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' }
};

export const RetroGameCard: React.FC<RetroGameCardProps> = ({
  rom,
  onLaunch,
  onOpenSaveStates,
  onMissingEmulator
}) => {
  const [preferredEmu, setPreferredEmu] = useState<EmulatorInfo | null>(null);
  const [availableEmus, setAvailableEmus] = useState<EmulatorInfo[]>([]);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [saveCount, setSaveCount] = useState<number>(rom.saveStateCount || 0);
  const [lastSaveAgo, setLastSaveAgo] = useState<string>('No saves yet');

  useEffect(() => {
    const emu = EmulatorDetectionService.getPreferredEmulator(rom.system);
    setPreferredEmu(emu);
    setAvailableEmus(EmulatorDetectionService.getEmulatorsForSystem(rom.system));

    // Check save states
    SaveStateService.getSaveStates(rom.romPath).then((states) => {
      setSaveCount(states.length);
      if (states.length > 0) {
        // Sort newest
        const sorted = [...states].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setLastSaveAgo(SaveStateService.formatTimeAgo(sorted[0].timestamp));
      }
    });
  }, [rom]);

  const colors = SYSTEM_COLORS[rom.system] || {
    bg: 'bg-white/10',
    text: 'text-white',
    border: 'border-white/20'
  };

  const handleCardClick = () => {
    if (!preferredEmu || !preferredEmu.installed) {
      onMissingEmulator(rom);
    } else {
      onLaunch(rom, preferredEmu);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleCardClick();
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className="group relative bg-[#0d121f]/90 hover:bg-[#131b2e] border border-white/10 hover:border-cyan-500/40 rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 shadow-lg hover:shadow-cyan-500/10 cursor-pointer select-none"
    >
      {/* Top Bar: System Badge & Context Menu */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
        >
          {rom.system}
        </span>

        {rom.releaseYear && (
          <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {rom.releaseYear}
          </span>
        )}

        {/* Menu button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowContextMenu(!showContextMenu);
            }}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {showContextMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-6 z-50 w-44 bg-[#0a0e17] border border-white/15 rounded-xl p-1 shadow-2xl text-[10px] space-y-0.5"
            >
              <div className="px-2 py-1 text-[9px] text-neutral-400 font-semibold border-b border-white/10 uppercase">
                Launch With
              </div>
              {availableEmus.length === 0 ? (
                <div className="px-2 py-1 text-neutral-500">No emulators detected</div>
              ) : (
                availableEmus.map((emu) => (
                  <button
                    key={emu.id}
                    onClick={() => {
                      setShowContextMenu(false);
                      if (emu.installed) {
                        onLaunch(rom, emu);
                      } else {
                        onMissingEmulator(rom);
                      }
                    }}
                    className={`w-full text-left px-2 py-1 rounded-lg flex items-center justify-between transition ${
                      emu.installed
                        ? 'hover:bg-cyan-500/20 text-neutral-200 hover:text-cyan-300'
                        : 'text-neutral-500 opacity-60'
                    }`}
                  >
                    <span className="truncate">{emu.name}</span>
                    {emu.installed && <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400" />}
                  </button>
                ))
              )}

              <div className="border-t border-white/10 my-0.5" />
              <button
                onClick={() => {
                  setShowContextMenu(false);
                  onOpenSaveStates(rom);
                }}
                className="w-full text-left px-2 py-1 rounded-lg hover:bg-white/10 text-neutral-200 flex items-center gap-1.5 transition"
              >
                <Save className="w-3 h-3 text-amber-400" />
                <span>Manage Save States</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center Game Icon / Title */}
      <div className="my-1.5 flex flex-col items-center justify-center text-center py-2">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 group-hover:scale-105 group-hover:border-cyan-500/40 transition">
          <HardDrive className="w-6 h-6 text-neutral-300 group-hover:text-cyan-400 transition" />
        </div>
        <h4
          className="text-xs font-bold text-white line-clamp-2 title-case leading-snug px-1"
          title={rom.title}
        >
          {rom.title}
        </h4>
      </div>

      {/* Hover Card Details & Emulator Info */}
      <div className="border-t border-white/5 pt-2 mt-1 space-y-1 text-[10px]">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="truncate max-w-[130px]">
            {preferredEmu && preferredEmu.installed ? preferredEmu.name : 'Missing Emulator'}
          </span>
          {(!preferredEmu || !preferredEmu.installed) && (
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
          )}
        </div>

        <div className="flex items-center justify-between text-[9px] text-neutral-400">
          <span className="flex items-center gap-1">
            <Save className="w-2.5 h-2.5 text-cyan-400" />
            <span>{saveCount} saves</span>
          </span>
          <span className="truncate text-neutral-400">{lastSaveAgo}</span>
        </div>
      </div>

      {/* Quick Launch Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleCardClick();
        }}
        className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-xl transition text-[11px] font-semibold cursor-pointer"
      >
        <Play className="w-3 h-3 fill-current" />
        <span>Quick Launch</span>
      </button>
    </div>
  );
};
