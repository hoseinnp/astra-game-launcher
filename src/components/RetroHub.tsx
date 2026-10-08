import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Search,
  RefreshCw,
  FolderOpen,
  Settings,
  X,
  Play,
  Save,
  AlertCircle,
  Download
} from 'lucide-react';
import type { RomItem, EmulatorInfo, SaveStateItem } from '../types/Retro.types';
import { RomDiscoveryService } from '../services/RomDiscoveryService';
import { EmulatorDetectionService } from '../services/EmulatorDetectionService';
import { SaveStateService } from '../services/SaveStateService';
import { GameLauncherService } from '../services/GameLauncherService';
import { RetroGameCard } from './RetroGameCard';
import { EmulatorSettings } from './EmulatorSettings';
import { audioEngine } from '../services/audioEngine';

interface RetroHubProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

const SYSTEMS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Systems' },
  { id: 'nes', label: 'NES' },
  { id: 'snes', label: 'SNES' },
  { id: 'gb', label: 'Game Boy' },
  { id: 'gba', label: 'GBA' },
  { id: 'n64', label: 'N64' },
  { id: 'ps1', label: 'PlayStation' },
  { id: 'genesis', label: 'Genesis' },
  { id: 'arcade', label: 'Arcade' }
];

export const RetroHub: React.FC<RetroHubProps> = ({
  isOpen,
  onClose,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'games' | 'settings'>('games');
  const [roms, setRoms] = useState<RomItem[]>(RomDiscoveryService.getRoms());
  const [emulators, setEmulators] = useState<EmulatorInfo[]>(EmulatorDetectionService.getEmulators());
  const [settings, setSettings] = useState(EmulatorDetectionService.getSettings());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'system' | 'recently_played'>('title');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ scanned: number; found: number }>({ scanned: 0, found: 0 });

  // Missing Emulator Alert Modal
  const [missingEmuGame, setMissingEmuGame] = useState<RomItem | null>(null);

  // Manage Save States Modal
  const [activeSaveRom, setActiveSaveRom] = useState<RomItem | null>(null);
  const [saveStatesList, setSaveStatesList] = useState<SaveStateItem[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(false);

  // Launching loading overlay state
  const [launchingGameTitle, setLaunchingGameTitle] = useState<string | null>(null);

  useEffect(() => {
    const unsubRoms = RomDiscoveryService.subscribe(setRoms);
    const unsubEmus = EmulatorDetectionService.subscribe(setEmulators);
    const unsubSettings = EmulatorDetectionService.subscribeSettings(setSettings);
    const unsubProgress = RomDiscoveryService.onScanProgress((prog) => {
      setScanProgress({ scanned: prog.scannedFiles, found: prog.foundRoms });
    });

    return () => {
      unsubRoms();
      unsubEmus();
      unsubSettings();
      unsubProgress();
    };
  }, []);

  const handleRescanRoms = async () => {
    setIsScanning(true);
    setScanProgress({ scanned: 0, found: 0 });
    audioEngine.playSelect();
    try {
      const results = await RomDiscoveryService.scanFolders();
      onShowToast(`🕹️ Scan complete: Discovered ${results.length} retro games`);
      audioEngine.playLaunch();
    } catch (err: any) {
      onShowToast(`⚠️ Scan error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen && settings.romFolders.length > 0 && roms.length === 0) {
      handleRescanRoms();
    }
  }, [isOpen, settings.romFolders.length, roms.length]);

  const handleLaunchGame = async (rom: RomItem, emulatorOverride?: EmulatorInfo) => {
    const targetEmu = emulatorOverride || EmulatorDetectionService.getPreferredEmulator(rom.system);
    if (!targetEmu || !targetEmu.installed) {
      setMissingEmuGame(rom);
      return;
    }

    setLaunchingGameTitle(rom.title);
    audioEngine.playLaunch();

    // 3-second timeout loading screen before game window appears
    const res = await GameLauncherService.launchRetroRom(rom, targetEmu);
    RomDiscoveryService.markRomPlayed(rom.id);

    setTimeout(() => {
      setLaunchingGameTitle(null);
    }, 3000);

    if (res.success) {
      onShowToast(`🚀 Launched ${rom.title} via ${targetEmu.name}`);
    } else {
      setLaunchingGameTitle(null);
      onShowToast(`⚠️ Failed to launch: ${res.error}`);
    }
  };

  const handleOpenSaveStates = async (rom: RomItem) => {
    setActiveSaveRom(rom);
    setIsLoadingStates(true);
    const states = await SaveStateService.getSaveStates(rom.romPath);
    setSaveStatesList(states);
    setIsLoadingStates(false);
  };

  const handleBackupState = async (state: SaveStateItem) => {
    if (!activeSaveRom) return;
    const ok = await SaveStateService.backupWithSaveVault(
      activeSaveRom.id,
      activeSaveRom.title,
      state.statePath
    );
    if (ok) {
      onShowToast('💾 Save state backed up to Save Vault');
      const refreshed = await SaveStateService.getSaveStates(activeSaveRom.romPath);
      setSaveStatesList(refreshed);
    } else {
      onShowToast('⚠️ Save state backup failed');
    }
  };

  // Filter & Sort ROMs
  const filteredRoms = roms.filter((rom) => {
    const matchesSystem = selectedSystem === 'all' || rom.system === selectedSystem;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      rom.title.toLowerCase().includes(q) ||
      rom.system.toLowerCase().includes(q) ||
      (rom.releaseYear && String(rom.releaseYear).includes(q));
    return matchesSystem && matchesQuery;
  });

  filteredRoms.sort((a, b) => {
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    } else if (sortBy === 'system') {
      return a.system.localeCompare(b.system);
    } else if (sortBy === 'recently_played') {
      const aTime = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
      const bTime = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
      return bTime - aTime;
    }
    return 0;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-6xl h-[90vh] bg-[#070b13]/95 border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Retro Hub</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {roms.length} ROMs
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Multi-system emulation & save state preservation center
              </p>
            </div>
          </div>

          {/* Tab Selection & Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-xl">
              <button
                onClick={() => {
                  audioEngine.playSelect();
                  setActiveTab('games');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'games'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Game Library
              </button>
              <button
                onClick={() => {
                  audioEngine.playSelect();
                  setActiveTab('settings');
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Emulators & Paths</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Games Library */}
        {activeTab === 'games' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Filter and Search Bar */}
            <div className="px-6 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 bg-black/20 shrink-0">
              {/* System Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {SYSTEMS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      audioEngine.playSelect();
                      setSelectedSystem(s.id);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                      selectedSystem === s.id
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'bg-white/5 text-neutral-400 hover:text-neutral-200 border border-white/5'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Search & Sort Controls */}
              <div className="flex items-center gap-2.5">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search ROMs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1 text-xs text-white placeholder-neutral-500 outline-none focus:border-amber-400 transition"
                  />
                </div>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-neutral-300 outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="title">Sort: Title (A-Z)</option>
                  <option value="system">Sort: System</option>
                  <option value="recently_played">Sort: Recently Played</option>
                </select>

                {/* Rescan Button */}
                <button
                  onClick={handleRescanRoms}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  title="Rescan configured ROM folders"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Scanning...' : 'Scan'}</span>
                </button>
              </div>
            </div>

            {/* Scan Progress Banner (if active) */}
            {isScanning && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-1.5 flex items-center justify-between text-xs text-amber-300 shrink-0">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning ROM directory for classic games...</span>
                </span>
                <span className="font-mono text-[11px]">
                  Files scanned: {scanProgress.scanned} • ROMs found: {scanProgress.found}
                </span>
              </div>
            )}

            {/* Main Game Grid View */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {filteredRoms.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <FolderOpen className="w-8 h-8 text-neutral-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">No ROMs Found</h3>
                    <p className="text-xs text-neutral-400 max-w-md">
                      {settings.romFolders.length === 0
                        ? 'You haven’t configured any ROM directories yet. Switch to "Emulators & Paths" to add a games folder.'
                        : 'No matching classic ROM files were found with current filters. Try rescanning or adjusting filters.'}
                    </p>
                  </div>
                  {settings.romFolders.length === 0 && (
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Configure ROM Directories
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                  {filteredRoms.map((rom) => (
                    <RetroGameCard
                      key={rom.id}
                      rom={rom}
                      onLaunch={handleLaunchGame}
                      onOpenSaveStates={handleOpenSaveStates}
                      onMissingEmulator={(r) => setMissingEmuGame(r)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Settings */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            <EmulatorSettings
              settings={settings}
              emulators={emulators}
              onSettingsChange={(newSet) => setSettings(newSet)}
              onShowToast={onShowToast}
            />
          </div>
        )}
      </div>

      {/* Missing Emulator Alert Modal */}
      {missingEmuGame && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0e1422] border border-amber-500/40 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3.5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Emulator Not Found</h3>
                <p className="text-[11px] text-neutral-400">
                  Required system: <span className="uppercase font-mono text-amber-300">{missingEmuGame.system}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              No configured or installed emulator was detected for &quot;{missingEmuGame.title}&quot;. Please download an emulator (e.g. Mesen, FCEUX, DuckStation, Project64, VBA) and set its path in Settings.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setMissingEmuGame(null)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-xl text-xs text-neutral-300 font-semibold transition cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setMissingEmuGame(null);
                  setActiveTab('settings');
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Configure in Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save States Management Modal */}
      {activeSaveRom && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0e1422] border border-white/20 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Save className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold truncate max-w-[340px]">
                    {activeSaveRom.title}
                  </h3>
                  <span className="text-[10px] text-neutral-400 uppercase font-mono">
                    Save States & Backups
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveSaveRom(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingStates ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                Scanning save states...
              </div>
            ) : saveStatesList.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400 bg-black/30 rounded-xl border border-white/5 p-4">
                No emulator save states detected for this ROM yet. In-game save states (.state, .srm, .sav) created by your emulator in the ROM directory will appear here.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {saveStatesList.map((state) => (
                  <div
                    key={state.id}
                    className="p-2.5 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono text-neutral-200 text-[11px] truncate max-w-[260px]">
                        {state.id.replace('state_', '')}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {new Date(state.timestamp).toLocaleString()} • {Math.round(state.fileSizeBytes / 1024)} KB
                      </div>
                    </div>

                    <button
                      onClick={() => handleBackupState(state)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Backup State</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveSaveRom(null)}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-neutral-200 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Launching Overlay Screen (3-second feedback) */}
      {launchingGameTitle && (
        <div className="fixed inset-0 z-70 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in text-white space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center animate-pulse">
            <Play className="w-8 h-8 text-amber-400 fill-current" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold">Launching Game...</h3>
            <p className="text-xs text-neutral-400 mt-1">{launchingGameTitle}</p>
          </div>
        </div>
      )}
    </div>
  );
};
