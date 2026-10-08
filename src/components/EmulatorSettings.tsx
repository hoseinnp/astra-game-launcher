import React, { useState } from 'react';
import {
  FolderPlus,
  Trash2,
  Cpu,
  RefreshCw,
  FolderOpen,
  HardDrive,
  Check,
  AlertCircle
} from 'lucide-react';
import type { RetroSettings, EmulatorInfo, RetroSystem } from '../types/Retro.types';
import { EmulatorDetectionService } from '../services/EmulatorDetectionService';
import { RomDiscoveryService } from '../services/RomDiscoveryService';

interface EmulatorSettingsProps {
  settings: RetroSettings;
  emulators: EmulatorInfo[];
  onSettingsChange: (newSettings: RetroSettings) => void;
  onShowToast: (msg: string) => void;
}

const ALL_SYSTEMS: { id: RetroSystem; label: string }[] = [
  { id: 'nes', label: 'Nintendo Entertainment System (NES)' },
  { id: 'snes', label: 'Super Nintendo (SNES)' },
  { id: 'gb', label: 'Game Boy (GB / GBC)' },
  { id: 'gba', label: 'Game Boy Advance (GBA)' },
  { id: 'n64', label: 'Nintendo 64 (N64)' },
  { id: 'ps1', label: 'PlayStation 1 (PS1)' },
  { id: 'genesis', label: 'Sega Genesis / Mega Drive' },
  { id: 'arcade', label: 'Arcade (MAME / FBNeo)' }
];

export const EmulatorSettings: React.FC<EmulatorSettingsProps> = ({
  settings,
  emulators,
  onSettingsChange,
  onShowToast
}) => {
  const [isDetecting, setIsDetecting] = useState(false);

  const handleAddFolder = async () => {
    if (typeof window !== 'undefined' && window.api?.pickRetroFolder) {
      const folder = await window.api.pickRetroFolder();
      if (folder) {
        if (!settings.romFolders.includes(folder)) {
          const updated = [...settings.romFolders, folder];
          const newSettings = EmulatorDetectionService.saveSettings({ romFolders: updated });
          onSettingsChange(newSettings);
          onShowToast(`📁 Added ROM folder: ${folder}`);
          RomDiscoveryService.addFolderAndScan(folder);
        } else {
          onShowToast('Folder already in list');
        }
      }
    }
  };

  const handleRemoveFolder = (folder: string) => {
    RomDiscoveryService.removeFolder(folder);
    const updated = settings.romFolders.filter((f) => f !== folder);
    const newSettings = EmulatorDetectionService.saveSettings({ romFolders: updated });
    onSettingsChange(newSettings);
    onShowToast(`Removed ROM folder: ${folder}`);
  };

  const handleAutoDetectEmulators = async () => {
    setIsDetecting(true);
    try {
      const detected = await EmulatorDetectionService.detectInstalledEmulators();
      const installedCount = detected.filter((e) => e.installed).length;
      onShowToast(`🕹️ Detected ${installedCount} emulator(s) on your system`);
    } finally {
      setIsDetecting(false);
    }
  };

  const handlePickEmulatorExe = async (emulatorId: string) => {
    if (typeof window !== 'undefined' && window.api?.pickEmulatorExe) {
      const exe = await window.api.pickEmulatorExe();
      if (exe) {
        EmulatorDetectionService.setCustomEmulatorPath(emulatorId, exe);
        const newSettings = EmulatorDetectionService.getSettings();
        onSettingsChange(newSettings);
        onShowToast(`Configured executable for ${emulatorId.toUpperCase()}`);
      }
    }
  };

  const handlePreferredChange = (system: RetroSystem, emuId: string) => {
    EmulatorDetectionService.setPreferredEmulator(system, emuId);
    const newSettings = EmulatorDetectionService.getSettings();
    onSettingsChange(newSettings);
  };

  return (
    <div className="space-y-6 text-white text-xs select-none">
      {/* 1. ROM Folders */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-cyan-400" />
              <span>ROM Directories</span>
            </h3>
            <p className="text-[11px] text-neutral-400">
              Recursive folder paths where ROMs (.nes, .snes, .gba, .gb, .z64, .n64, .iso, .cue) will be discovered
            </p>
          </div>
          <button
            onClick={handleAddFolder}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-xl transition text-xs font-semibold cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Add Folder</span>
          </button>
        </div>

        {settings.romFolders.length === 0 ? (
          <div className="p-4 rounded-xl bg-black/30 border border-white/5 text-center text-neutral-500 text-xs">
            No ROM directories added yet. Click &quot;Add Folder&quot; to configure a games directory.
          </div>
        ) : (
          <div className="space-y-1.5">
            {settings.romFolders.map((folder) => (
              <div
                key={folder}
                className="flex items-center justify-between px-3 py-2 bg-black/40 border border-white/5 rounded-xl text-neutral-300 font-mono text-[11px]"
              >
                <span className="truncate max-w-[500px]" title={folder}>
                  {folder}
                </span>
                <button
                  onClick={() => handleRemoveFolder(folder)}
                  className="p-1 text-neutral-400 hover:text-red-400 transition"
                  title="Remove folder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Emulator Detection & Paths */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>Installed Emulators</span>
            </h3>
            <p className="text-[11px] text-neutral-400">
              Auto-detected emulator binaries and manually configured paths
            </p>
          </div>
          <button
            onClick={handleAutoDetectEmulators}
            disabled={isDetecting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl transition text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDetecting ? 'animate-spin' : ''}`} />
            <span>Auto-Detect</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {emulators.map((emu) => (
            <div
              key={emu.id}
              className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 ${
                emu.installed
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-black/30 border-white/5 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{emu.name}</span>
                {emu.installed ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                    <Check className="w-2.5 h-2.5" />
                    Installed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-2.5 h-2.5" />
                    Missing
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Executable path (.exe)"
                  value={emu.executablePath || ''}
                  onChange={(e) => {
                    EmulatorDetectionService.setCustomEmulatorPath(emu.id, e.target.value);
                    onSettingsChange(EmulatorDetectionService.getSettings());
                  }}
                  className="flex-1 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-neutral-300 font-mono focus:border-cyan-400 outline-none truncate"
                />
                <button
                  onClick={() => handlePickEmulatorExe(emu.id)}
                  className="px-2 py-1 bg-white/10 hover:bg-white/15 rounded-lg text-[10px] text-neutral-200 border border-white/10 whitespace-nowrap transition cursor-pointer"
                >
                  Browse
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Preferred Emulator per System */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-400" />
            <span>Default System Mappings</span>
          </h3>
          <p className="text-[11px] text-neutral-400">
            Choose which emulator launches each classic console by default
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {ALL_SYSTEMS.map(({ id, label }) => {
            const compatibleEmus = emulators.filter((e) => e.systems.includes(id));
            const currentPref = settings.preferredEmulators[id];

            return (
              <div
                key={id}
                className="bg-black/30 border border-white/5 p-2 rounded-xl flex items-center justify-between gap-2"
              >
                <div className="truncate max-w-[200px]">
                  <span className="text-[11px] font-semibold text-neutral-200 block truncate">{label}</span>
                  <span className="text-[9px] uppercase tracking-wider text-indigo-400 font-mono">{id}</span>
                </div>

                <select
                  value={currentPref || ''}
                  onChange={(e) => handlePreferredChange(id, e.target.value)}
                  className="bg-neutral-900 border border-white/15 rounded-lg px-2 py-1 text-[10px] text-neutral-200 outline-none focus:border-indigo-400 cursor-pointer"
                >
                  {compatibleEmus.length === 0 ? (
                    <option value="">No emulators found</option>
                  ) : (
                    compatibleEmus.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} {e.installed ? '✓' : '(Not installed)'}
                      </option>
                    ))
                  )}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
