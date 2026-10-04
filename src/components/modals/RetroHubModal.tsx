import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  FolderSearch,
  CheckCircle2,
  AlertCircle,
  Plus,
  X
} from 'lucide-react';
import type { Game, EmulatorConfig, RomScanItem } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';

function createRetroGameId(): string {
  return `retro_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

interface RetroHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGame: (game: Game) => void;
  onShowToast: (msg: string) => void;
}

export const RetroHubModal: React.FC<RetroHubModalProps> = ({
  isOpen,
  onClose,
  onAddGame,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'roms' | 'emulators'>('roms');
  const [emulators, setEmulators] = useState<EmulatorConfig[]>([]);
  const [scannedRoms, setScannedRoms] = useState<RomScanItem[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedFolderPath, setScannedFolderPath] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    if (window.api?.detectEmulators) {
      window.api.detectEmulators().then((list) => {
        if (isMounted && list) {
          setEmulators(list);
        }
      }).catch((err) => {
        console.error('Failed to detect emulators:', err);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handlePickAndScanFolder = async () => {
    if (!window.api?.pickFolder || !window.api?.scanRoms) return;
    const folder = await window.api.pickFolder();
    if (!folder) return;

    audioEngine.playSelect();
    setScannedFolderPath(folder);
    setIsScanning(true);

    try {
      const roms = await window.api.scanRoms(folder);
      setScannedRoms(roms);
      audioEngine.playLaunch();
      onShowToast(`🕹️ Found ${roms.length} retro ROM(s) in folder`);
    } catch (err: any) {
      onShowToast(`⚠️ Scan error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleImportRomToLibrary = (rom: RomScanItem) => {
    audioEngine.playSelect();
    const matchingEmu = emulators.find((e) => e.installed && e.platforms.includes(rom.platform));
    const emuExe = matchingEmu ? matchingEmu.executablePath : '';

    const newGame: Game = {
      id: createRetroGameId(),
      title: rom.title,
      executablePath: emuExe || rom.romPath,
      launchArguments: emuExe ? `"${rom.romPath}"` : undefined,
      type: 'emulator',
      coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
      genres: ['Retro', rom.platform.toUpperCase()],
      tags: ['Emulation', 'Classic', rom.platform],
      favorite: false,
      theme: {
        accentColor: '#fbbf24',
        glowColor: 'rgba(251, 191, 36, 0.45)',
        vibe: 'retro-arcade'
      },
      stats: {
        playtimeMinutes: 0,
        playCount: 0
      }
    };

    onAddGame(newGame);
    onShowToast(`🎮 Imported "${rom.title}" to library!`);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  const platformFilters = [
    { id: 'all', label: 'All Systems' },
    { id: 'snes', label: 'SNES' },
    { id: 'gba', label: 'GBA / GBC' },
    { id: 'ps1', label: 'PlayStation 1' },
    { id: 'ps2', label: 'PlayStation 2' },
    { id: 'ps3', label: 'PlayStation 3' },
    { id: 'n64', label: 'Nintendo 64' },
    { id: 'genesis', label: 'Genesis' }
  ];

  const filteredRoms = scannedRoms.filter((r) => {
    if (selectedPlatform === 'all') return true;
    if (selectedPlatform === 'gba') return r.platform === 'gba' || r.platform === 'gbc';
    return r.platform === selectedPlatform;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn select-none">
      <div className="w-full max-w-4xl max-h-[85vh] rounded-3xl bg-zinc-950/95 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-modalIn isolate relative">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 z-10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shadow-lg font-black">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wider uppercase">Retro & Emulation Hub</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                  V3 HUB
                </span>
              </div>
              <p className="text-xs text-white/50">ROM Directory Scanner, Standalone Emulators & Auto-Arguments</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePickAndScanFolder}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 text-black font-extrabold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <FolderSearch className="w-4 h-4" />
              <span>{isScanning ? 'Scanning Directory...' : 'Scan ROM Folder'}</span>
            </button>
            <button
              onClick={() => {
                audioEngine.playSelect();
                onClose();
              }}
              className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 py-2.5 bg-black/40 border-b border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('roms')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'roms'
                  ? 'bg-white/20 text-white shadow-xs'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              ROM Library ({scannedRoms.length})
            </button>
            <button
              onClick={() => setActiveTab('emulators')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'emulators'
                  ? 'bg-white/20 text-white shadow-xs'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Installed Cores & Engines ({emulators.filter((e) => e.installed).length}/{emulators.length})
            </button>
          </div>

          {scannedFolderPath && (
            <span className="text-[11px] font-mono text-white/40 truncate max-w-xs">
              Folder: {scannedFolderPath}
            </span>
          )}
        </div>

        {/* TAB 1: ROM SCANNER */}
        {activeTab === 'roms' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Platform Filter Pills */}
            <div className="p-4 border-b border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {platformFilters.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatform(p.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all flex-shrink-0 ${
                    selectedPlatform === p.id
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'glass-pill text-white/60 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* ROM List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2.5 no-scrollbar">
              {scannedRoms.length === 0 ? (
                <div className="py-20 text-center text-white/50 space-y-2">
                  <Gamepad2 className="w-12 h-12 text-white/20 mx-auto" />
                  <p className="font-semibold text-white/70">No ROMs scanned yet</p>
                  <p className="text-xs text-white/40">
                    Click "Scan ROM Folder" to auto-discover your NES, SNES, GBA, PS1, PS2, and N64 game dumps.
                  </p>
                </div>
              ) : filteredRoms.length === 0 ? (
                <div className="py-16 text-center text-white/40 text-xs">
                  No ROMs matching this platform filter.
                </div>
              ) : (
                filteredRoms.map((rom) => (
                  <div
                    key={rom.id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-4 group"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center font-mono flex-shrink-0">
                        {rom.platform.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-white truncate">{rom.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 mt-0.5">
                          <span className="uppercase">{rom.extension}</span>
                          <span>•</span>
                          <span>{formatSize(rom.fileSizeBytes)}</span>
                          <span>•</span>
                          <span className="truncate max-w-xs">{rom.romPath}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleImportRomToLibrary(rom)}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-black font-bold text-xs flex items-center gap-1.5 text-white transition-all cursor-pointer flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Library</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DETECTED EMULATORS */}
        {activeTab === 'emulators' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white/60 mb-2">
              Standalone Emulators on System
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {emulators.map((emu) => (
                <div
                  key={emu.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    emu.installed
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-white/[0.02] border-white/5 opacity-60 text-white/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{emu.name}</h4>
                        {emu.installed ? (
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            READY
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-white/30">NOT DETECTED</span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/40 mt-1">
                        Platforms: {emu.platforms.map((p) => p.toUpperCase()).join(', ')}
                      </p>
                    </div>

                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        emu.installed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/30'
                      }`}
                    >
                      {emu.installed ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                  </div>

                  {emu.installed && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/40">
                      <span className="truncate max-w-[240px]">{emu.executablePath}</span>
                      <span className="text-[var(--game-accent,#2ee5ba)] font-bold">1-Click Launch Ready</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
