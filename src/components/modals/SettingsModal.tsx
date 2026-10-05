import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Volume2,
  Palette,
  Monitor,
  Database,
  ExternalLink,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Activity,
  Gamepad2,
  Film,
  Trash2,
  HardDrive,
  Camera,
  FolderOpen,
  Download,
  Upload
} from 'lucide-react';
import type { AppSettings, GlobalTheme, ViewMode, Game } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { GLOBAL_THEMES } from '../../services/themeEngine';
import { ArtworkService } from '../../services/artworkService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetLibrary: () => void;
  onRestoreLibrary?: (games: Game[]) => void;
  games?: Game[];
  onUpdateGame?: (updated: Game) => void;
  onBatchUpdateGames?: (updatedGames: Game[]) => void;
  onOpenSetupWizard?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetLibrary,
  onRestoreLibrary,
  games,
  onUpdateGame,
  onBatchUpdateGames,
  onOpenSetupWizard
}) => {
  const [rawgStatus, setRawgStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [rawgMessage, setRawgMessage] = useState('');
  const [showRawgKey, setShowRawgKey] = useState(false);

  const [sgdbStatus, setSgdbStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [sgdbMessage, setSgdbMessage] = useState('');
  const [showSgdbKey, setShowSgdbKey] = useState(false);

  const [videoStorage, setVideoStorage] = useState<{ totalSizeBytes: number; count: number }>({ totalSizeBytes: 0, count: 0 });
  const [isClearingVideos, setIsClearingVideos] = useState(false);
  const [clearedMessage, setClearedMessage] = useState('');

  // Batch Live Wallpaper Downloader State
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    gameTitle: string;
  } | null>(null);
  const [batchStatusMessage, setBatchStatusMessage] = useState('');
  const cancelBatchRef = useRef(false);

  const handleTestRawg = useCallback(async (keyToTest?: string) => {
    const key = keyToTest !== undefined ? keyToTest : (settings.apiKeys?.rawg || '');
    if (!key.trim()) {
      setRawgStatus('idle');
      setRawgMessage('');
      return;
    }
    setRawgStatus('checking');
    setRawgMessage('Testing RAWG connection...');
    const res = await ArtworkService.validateRawgKey(key.trim());
    if (res.valid) {
      setRawgStatus('valid');
      setRawgMessage(res.message);
    } else {
      setRawgStatus('invalid');
      setRawgMessage(res.message);
    }
  }, [settings.apiKeys?.rawg]);

  const handleTestSgdb = useCallback(async (keyToTest?: string) => {
    const key = keyToTest !== undefined ? keyToTest : (settings.apiKeys?.steamGridDb || '');
    if (!key.trim()) {
      setSgdbStatus('idle');
      setSgdbMessage('');
      return;
    }
    setSgdbStatus('checking');
    setSgdbMessage('Testing SteamGridDB connection...');
    const res = await ArtworkService.validateSteamGridDbKey(key.trim());
    if (res.valid) {
      setSgdbStatus('valid');
      setSgdbMessage(res.message);
    } else {
      setSgdbStatus('invalid');
      setSgdbMessage(res.message);
    }
  }, [settings.apiKeys?.steamGridDb]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    queueMicrotask(() => {
      if (!isMounted) return;
      if (settings.apiKeys?.rawg?.trim()) {
        handleTestRawg(settings.apiKeys.rawg.trim());
      } else {
        setRawgStatus('idle');
        setRawgMessage('');
      }

      if (settings.apiKeys?.steamGridDb?.trim()) {
        handleTestSgdb(settings.apiKeys.steamGridDb.trim());
      } else {
        setSgdbStatus('idle');
        setSgdbMessage('');
      }

      if (window.api?.getVideoStorage) {
        window.api.getVideoStorage().then((data) => {
          if (isMounted) setVideoStorage(data);
        });
      }
      setClearedMessage('');
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen, settings.apiKeys?.rawg, settings.apiKeys?.steamGridDb, handleTestRawg, handleTestSgdb]);

  const handleClearVideos = async () => {
    if (!window.api?.clearVideoCache) return;
    setIsClearingVideos(true);
    try {
      audioEngine.playSelect();
      const res = await window.api.clearVideoCache();
      if (res.success) {
        const freedMb = (res.freedBytes / 1024 / 1024).toFixed(1);
        setClearedMessage(`Freed ${freedMb} MB of disk space`);
        setVideoStorage({ totalSizeBytes: 0, count: 0 });
      }
    } finally {
      setIsClearingVideos(false);
    }
  };

  const handleStartBatchDownload = async (targetGames: Game[]) => {
    if (!window.api?.downloadLiveWallpaper || targetGames.length === 0) return;
    setIsBatchDownloading(true);
    cancelBatchRef.current = false;
    setBatchStatusMessage('');
    audioEngine.playSelect();

    let completed = 0;
    let currentGames = [...(games || [])];

    for (let i = 0; i < targetGames.length; i++) {
      if (cancelBatchRef.current) {
        setBatchStatusMessage('Batch download paused/cancelled by user.');
        break;
      }

      const g = targetGames[i];
      setBatchProgress({
        current: i + 1,
        total: targetGames.length,
        gameTitle: g.title
      });

      try {
        const res = await window.api.downloadLiveWallpaper({
          title: g.title,
          gameId: g.id,
          quality: settings.liveWallpaperQuality || '1080p',
          forceAmbient: (settings.liveWallpaperEngine ?? 'ambient') === 'ambient'
        });

        if (res.success && res.localPath) {
          completed++;
          const updatedGame: Game = {
            ...g,
            videoUrl: res.localPath
          };
          currentGames = currentGames.map((item) => (item.id === g.id ? updatedGame : item));
          if (onUpdateGame) onUpdateGame(updatedGame);
        }
      } catch (err) {
        console.warn(`Failed to download live wallpaper for ${g.title}:`, err);
      }
    }

    if (onBatchUpdateGames) {
      onBatchUpdateGames(currentGames);
    }

    // Refresh video storage size
    if (window.api?.getVideoStorage) {
      const storage = await window.api.getVideoStorage();
      setVideoStorage(storage);
    }

    setIsBatchDownloading(false);
    setBatchProgress(null);
    setBatchStatusMessage(`✓ Finished! Downloaded live wallpapers for ${completed} games.`);
    audioEngine.playSelect();
  };

  const [backupMessage, setBackupMessage] = useState<string>('');
  const restoreFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportBackup = () => {
    if (!games || games.length === 0) {
      setBackupMessage('No games to export in current library.');
      return;
    }
    try {
      audioEngine.playSelect();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(games, null, 2));
      const downloadAnchor = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `astra_library_backup_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setBackupMessage(`Exported backup with ${games.length} games!`);
    } catch (err) {
      console.error('Export failed:', err);
      setBackupMessage('Export failed. Check console for details.');
    }
  };

  const handleRestoreBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].title) {
          audioEngine.playSelect();
          onRestoreLibrary?.(parsed as Game[]);
          setBackupMessage(`Successfully restored ${parsed.length} games from backup!`);
          if (restoreFileInputRef.current) {
            restoreFileInputRef.current.value = '';
          }
        } else {
          setBackupMessage('Invalid backup format: expected an array of games.');
        }
      } catch (err) {
        console.error('Failed to parse backup JSON:', err);
        setBackupMessage('Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  const [appShortcutMessage, setAppShortcutMessage] = useState('');
  const handleCreateAppShortcut = async () => {
    if (!window.api?.createAppDesktopShortcut) return;
    audioEngine.playSelect();
    const res = await window.api.createAppDesktopShortcut();
    if (res.success) {
      setAppShortcutMessage('✓ Created!');
      setTimeout(() => setAppShortcutMessage(''), 4000);
    } else {
      setAppShortcutMessage('Failed');
      setTimeout(() => setAppShortcutMessage(''), 4000);
    }
  };

  if (!isOpen) return null;

  const handleThemeSelect = (t: GlobalTheme) => {
    audioEngine.playSelect();
    onUpdateSettings({ ...settings, globalTheme: t });
  };

  const handleViewModeSelect = (m: ViewMode) => {
    audioEngine.playSelect();
    onUpdateSettings({ ...settings, viewMode: m });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-[#0c101b] border border-white/15 shadow-2xl overflow-hidden flex flex-col animate-modalIn transform-gpu will-change-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--game-accent)] text-black flex items-center justify-center font-bold">
              <Monitor className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-wide">Launcher Preferences</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Setup Wizard Recalibration Banner */}
          {onOpenSetupWizard && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 via-[var(--game-accent,#2ee5ba)]/15 to-amber-500/20 border border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 via-[var(--game-accent,#2ee5ba)] to-purple-600 text-black shadow-md">
                  <Sparkles className="w-5 h-5 fill-black" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Astra OS Realm Calibration</h4>
                  <p className="text-[11px] text-white/60">
                    Switch experiential realms (Analog, Digital, Starfield Cosmic) with live acoustic & haptic previews.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenSetupWizard();
                }}
                className="px-4 py-2 rounded-xl bg-[var(--game-accent,#2ee5ba)] text-black text-xs font-bold whitespace-nowrap hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                Launch Wizard
              </button>
            </div>
          )}

          {/* Global Theme Selector */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white/80 uppercase tracking-wider">
              <Palette className="w-4 h-4 text-[var(--game-accent)]" />
              <span>Visual Theme</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(GLOBAL_THEMES) as GlobalTheme[]).map((key) => {
                const item = GLOBAL_THEMES[key];
                const isActive = settings.globalTheme === key;
                return (
                  <div
                    key={key}
                    onClick={() => handleThemeSelect(key)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                      isActive
                        ? 'border-[var(--game-accent)] bg-[var(--game-accent)]/10 ring-2 ring-[var(--game-accent)]'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{item.name}</span>
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: item.colors.accent }}
                      />
                    </div>
                    <span className="text-[10px] text-white/40">{key}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Default View Mode */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white/80 uppercase tracking-wider">
              <Monitor className="w-4 h-4 text-[var(--game-accent)]" />
              <span>Default Layout</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleViewModeSelect('ps5')}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                  settings.viewMode === 'ps5'
                    ? 'border-[var(--game-accent)] bg-[var(--game-accent)]/10 text-white font-bold'
                    : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold">Console Mode</div>
                <div className="text-[10px] text-white/40 mt-0.5">Horizontal ribbon & cinematic backdrop</div>
              </button>

              <button
                onClick={() => handleViewModeSelect('grid')}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                  settings.viewMode === 'grid'
                    ? 'border-[var(--game-accent)] bg-[var(--game-accent)]/10 text-white font-bold'
                    : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold">Poster Grid</div>
                <div className="text-[10px] text-white/40 mt-0.5">Steam/GOG style library grid</div>
              </button>

              <button
                onClick={() => handleViewModeSelect('shelf')}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                  settings.viewMode === 'shelf'
                    ? 'border-[var(--game-accent)] bg-[var(--game-accent)]/10 text-white font-bold'
                    : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold">Physical Shelf</div>
                <div className="text-[10px] text-white/40 mt-0.5">3D collectible shelf & retro cartridges</div>
              </button>
            </div>
          </div>

          {/* Display & Screen Mode */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white/80 uppercase tracking-wider">
              <Monitor className="w-4 h-4 text-[var(--game-accent)]" />
              <span>Display Mode</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <div className="text-xs font-bold text-white">Full Screen Mode (F11)</div>
                <div className="text-[10px] text-white/40">Immersive edge-to-edge console experience</div>
              </div>
              <button
                onClick={() => {
                  audioEngine.playSelect();
                  window.api?.toggleFullscreen();
                }}
                className="px-3 py-1.5 rounded-xl bg-[var(--game-accent)] text-black text-xs font-bold hover:brightness-110 cursor-pointer shadow-md"
              >
                Toggle Fullscreen
              </button>
            </div>
          </div>

          {/* Background Blur Setting */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white/80 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[var(--game-accent)]" />
              <span>Background Blur</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'none', label: 'Off', desc: 'Crisp' },
                { id: 'subtle', label: 'Subtle', desc: '4px' },
                { id: 'medium', label: 'Medium', desc: '12px' },
                { id: 'heavy', label: 'Heavy', desc: '24px' }
              ].map((lvl) => {
                const isSelected = (settings.backgroundBlur || 'medium') === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => {
                      audioEngine.playSelect();
                      onUpdateSettings({
                        ...settings,
                        backgroundBlur: lvl.id as 'none' | 'subtle' | 'medium' | 'heavy'
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[var(--game-accent)] bg-[var(--game-accent)]/15 text-white font-bold ring-1 ring-[var(--game-accent)]'
                        : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{lvl.label}</div>
                    <div className="text-[10px] text-white/40 mt-0.5">{lvl.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Startup & Boot Screen Setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white/80 uppercase tracking-wider">
                <Gamepad2 className="w-4 h-4 text-[var(--game-accent)]" />
                <span>Console Boot & Startup</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-white">Show "Press F or (A) to Start" on Launch</h4>
                <p className="text-[10px] text-white/40 mt-0.5">
                  When enabled, displays the console splash and profile selector ("Who is playing today?"). When disabled, boots straight into your game library.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playSelect();
                  onUpdateSettings({
                    ...settings,
                    skipStartupScreen: !settings.skipStartupScreen
                  });
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  !settings.skipStartupScreen ? 'bg-[var(--game-accent)]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    !settings.skipStartupScreen ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Start on Windows Startup */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white">Start on Windows Startup</h4>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    System Boot
                  </span>
                </div>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Automatically launch Astra Console when your PC powers on and boots into Windows.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  audioEngine.playSelect();
                  const nextState = !settings.startOnBoot;
                  if (window.api?.setAutoLaunch) {
                    await window.api.setAutoLaunch(nextState);
                  }
                  onUpdateSettings({
                    ...settings,
                    startOnBoot: nextState
                  });
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.startOnBoot ? 'bg-[var(--game-accent)]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.startOnBoot ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Bottom Command Help / Navigation HUD */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-white">Show Bottom Command Help (HUD)</h4>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Displays the floating controller and keyboard shortcut bar at the bottom of the screen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playSelect();
                  onUpdateSettings({
                    ...settings,
                    showNavigationHud: !settings.showNavigationHud
                  });
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.showNavigationHud ? 'bg-[var(--game-accent)]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.showNavigationHud ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Live Video Wallpapers (Offline Backgrounds) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white/80 uppercase tracking-wider">
                <Film className="w-4 h-4 text-[var(--game-accent)]" />
                <span>Live Video Wallpapers</span>
              </div>
              <span className="text-[10px] text-cyan-400 font-bold">
                Ambient 60fps Loops
              </span>
            </div>

            {/* Auto-Download Toggle */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-white">Auto-Download Live Wallpaper when Adding Games</h4>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Automatically downloads pure 1080p ambient in-game scene loops (Wallpaper Engine style: resting characters, campfires, scenic vistas) to your local drive. Commercial trailers and promotional cutscenes are strictly blocked launcher-wide.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playSelect();
                  onUpdateSettings({
                    ...settings,
                    autoDownloadLiveWallpaper: settings.autoDownloadLiveWallpaper !== false ? false : true
                  });
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.autoDownloadLiveWallpaper !== false ? 'bg-[var(--game-accent)]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.autoDownloadLiveWallpaper !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Video Storage Cache Monitor & Clear */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white">Offline Video Storage Cache</h4>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {(videoStorage.totalSizeBytes / 1024 / 1024).toFixed(1)} MB ({videoStorage.count} {videoStorage.count === 1 ? 'game' : 'games'})
                  </span>
                </div>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Locally cached Full HD MP4 video loops stored in <code className="text-white/60 font-mono">%APPDATA%\Astra Launcher\media\videos</code>.
                </p>
                {clearedMessage && (
                  <p className="text-[10px] text-emerald-400 font-bold mt-1">✓ {clearedMessage}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleClearVideos}
                disabled={isClearingVideos || videoStorage.count === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-pill text-xs font-semibold text-rose-400 hover:bg-rose-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearingVideos ? 'Clearing...' : 'Clear Video Cache'}</span>
              </button>
            </div>
          </div>

          {/* Metadata & Artwork Providers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white/80 uppercase tracking-wider">
                <Database className="w-4 h-4 text-[var(--game-accent)]" />
                <span>Artwork & Metadata Providers</span>
              </div>
              <span className="text-[10px] text-white/40">Multi-Provider Search</span>
            </div>

            {/* Built-in No-Key Providers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Steam CDN</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 mt-1">Official high-res covers & backdrops</p>
                </div>
                <span className="text-[9px] text-white/30 mt-2 font-mono">No Key Required</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">GOG Galaxy CDN</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 mt-1">DRM-Free & classic PC artwork</p>
                </div>
                <span className="text-[9px] text-white/30 mt-2 font-mono">No Key Required</span>
              </div>
            </div>

            {/* SteamGridDB API Key */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-white">SteamGridDB API</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    Transparent Logos
                  </span>

                  {/* Status Badge */}
                  {sgdbStatus === 'checking' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1 animate-pulse">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      Testing...
                    </span>
                  )}
                  {sgdbStatus === 'valid' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Active · Connected
                    </span>
                  )}
                  {sgdbStatus === 'invalid' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5" />
                      Invalid Key
                    </span>
                  )}
                  {sgdbStatus === 'idle' && (
                    settings.apiKeys?.steamGridDb?.trim() ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        Configured
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white/40 border border-white/10">
                        Not Configured
                      </span>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => window.open('https://www.steamgriddb.com/profile/preferences/api', '_blank')}
                  className="text-[10px] text-[var(--game-accent)] hover:underline flex items-center gap-1 cursor-pointer flex-shrink-0"
                >
                  <span>Get Free Key</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  type={showSgdbKey ? 'text' : 'password'}
                  placeholder="Paste SteamGridDB API key..."
                  value={settings.apiKeys?.steamGridDb || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateSettings({
                      ...settings,
                      apiKeys: {
                        ...settings.apiKeys,
                        steamGridDb: val
                      }
                    });
                    if (!val.trim()) {
                      setSgdbStatus('idle');
                      setSgdbMessage('');
                    } else {
                      setSgdbStatus('idle');
                    }
                  }}
                  className="w-full pl-3 pr-20 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[var(--game-accent)] font-mono"
                />
                <div className="absolute right-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowSgdbKey(!showSgdbKey)}
                    title={showSgdbKey ? 'Hide key' : 'Show key'}
                    className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {showSgdbKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    disabled={sgdbStatus === 'checking' || !settings.apiKeys?.steamGridDb?.trim()}
                    onClick={() => handleTestSgdb()}
                    title="Test connection"
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      sgdbStatus === 'valid'
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white disabled:opacity-40 disabled:pointer-events-none'
                    }`}
                  >
                    {sgdbStatus === 'checking' ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-2.5 h-2.5" />
                    )}
                    <span>Test</span>
                  </button>
                </div>
              </div>

              {sgdbMessage && (
                <div
                  className={`text-[10px] flex items-center gap-1 px-1 ${
                    sgdbStatus === 'valid'
                      ? 'text-emerald-400'
                      : sgdbStatus === 'invalid'
                      ? 'text-rose-400'
                      : 'text-white/50'
                  }`}
                >
                  {sgdbStatus === 'valid' && <Check className="w-3 h-3 flex-shrink-0" />}
                  {sgdbStatus === 'invalid' && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                  <span>{sgdbMessage}</span>
                </div>
              )}
            </div>

            {/* RAWG API Key */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-white">RAWG.io API</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    500k+ Database
                  </span>

                  {/* Status Badge */}
                  {rawgStatus === 'checking' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1 animate-pulse">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      Testing...
                    </span>
                  )}
                  {rawgStatus === 'valid' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.25)]">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Active · Connected
                    </span>
                  )}
                  {rawgStatus === 'invalid' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5" />
                      Invalid Key
                    </span>
                  )}
                  {rawgStatus === 'idle' && (
                    settings.apiKeys?.rawg?.trim() ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        Configured
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white/40 border border-white/10">
                        Not Configured
                      </span>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => window.open('https://rawg.io/apidocs', '_blank')}
                  className="text-[10px] text-[var(--game-accent)] hover:underline flex items-center gap-1 cursor-pointer flex-shrink-0"
                >
                  <span>Get Free Key</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  type={showRawgKey ? 'text' : 'password'}
                  placeholder="Paste RAWG.io API key..."
                  value={settings.apiKeys?.rawg || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateSettings({
                      ...settings,
                      apiKeys: {
                        ...settings.apiKeys,
                        rawg: val
                      }
                    });
                    if (!val.trim()) {
                      setRawgStatus('idle');
                      setRawgMessage('');
                    } else {
                      setRawgStatus('idle');
                    }
                  }}
                  className="w-full pl-3 pr-20 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[var(--game-accent)] font-mono"
                />
                <div className="absolute right-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowRawgKey(!showRawgKey)}
                    title={showRawgKey ? 'Hide key' : 'Show key'}
                    className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {showRawgKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    disabled={rawgStatus === 'checking' || !settings.apiKeys?.rawg?.trim()}
                    onClick={() => handleTestRawg()}
                    title="Test connection"
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      rawgStatus === 'valid'
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white disabled:opacity-40 disabled:pointer-events-none'
                    }`}
                  >
                    {rawgStatus === 'checking' ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-2.5 h-2.5" />
                    )}
                    <span>Test</span>
                  </button>
                </div>
              </div>

              {rawgMessage && (
                <div
                  className={`text-[10px] flex items-center gap-1 px-1 ${
                    rawgStatus === 'valid'
                      ? 'text-emerald-400'
                      : rawgStatus === 'invalid'
                      ? 'text-rose-400'
                      : 'text-white/50'
                  }`}
                >
                  {rawgStatus === 'valid' && <Check className="w-3 h-3 flex-shrink-0" />}
                  {rawgStatus === 'invalid' && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                  <span>{rawgMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Live Wallpaper Backgrounds */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white/80 uppercase tracking-wider">
                <Film className="w-4 h-4 text-[var(--game-accent)]" />
                <span>Live Video Backgrounds</span>
              </div>
              <span className="text-[10px] text-cyan-400 font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                Offline Full HD
              </span>
            </div>

            {/* Auto-Download Toggle on Add */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <div className="text-xs font-bold text-white">Auto-Download on Game Import</div>
                <div className="text-[10px] text-white/40">
                  Automatically download 1080p ambient loops when adding EA, Epic, Steam, or PC games
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoDownloadLiveWallpaper ?? true}
                onChange={(e) => {
                  audioEngine.playSelect();
                  onUpdateSettings({ ...settings, autoDownloadLiveWallpaper: e.target.checked });
                }}
                className="w-4 h-4 accent-[var(--game-accent)] cursor-pointer"
              />
            </div>

            {/* Engine & Source Selection */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              <div className="text-xs font-bold text-white">Wallpaper Engine & Style</div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playSelect();
                    onUpdateSettings({ ...settings, liveWallpaperEngine: 'ambient' });
                  }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    (settings.liveWallpaperEngine ?? 'ambient') === 'ambient'
                      ? 'border-[var(--game-accent)] bg-[var(--game-accent)]/10 text-white font-bold'
                      : 'border-white/10 bg-black/20 text-white/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--game-accent)]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ambient 60fps Loop</span>
                  </div>
                  <div className="text-[10px] text-white/50 mt-1">
                    Wallpaper Engine style. Clean, seamless scenic loop without logos, ESRB cards, or voiceovers. Works for EA, Epic, Steam & standalone.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playSelect();
                    onUpdateSettings({ ...settings, liveWallpaperEngine: 'steam' });
                  }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    settings.liveWallpaperEngine === 'steam'
                      ? 'border-[var(--game-accent)] bg-[var(--game-accent)]/10 text-white font-bold'
                      : 'border-white/10 bg-black/20 text-white/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Film className="w-3.5 h-3.5" />
                    <span>Steam Store Trailers</span>
                  </div>
                  <div className="text-[10px] text-white/50 mt-1">
                    Official store trailer highlights from Steam CDN (Steam titles only).
                  </div>
                </button>
              </div>
            </div>

            {/* Library Batch Downloader Card */}
            {games && games.length > 0 && (() => {
              const gamesWithVideo = games.filter((g) => Boolean(g.videoUrl));
              const gamesWithoutVideo = games.filter((g) => !g.videoUrl);
              const coveragePct = Math.round((gamesWithVideo.length / games.length) * 100);

              return (
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Library Live Wallpaper Coverage</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/80">
                          {gamesWithVideo.length} / {games.length} ({coveragePct}%)
                        </span>
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">
                        {gamesWithoutVideo.length > 0
                          ? `${gamesWithoutVideo.length} games have no live video wallpaper configured`
                          : 'All games in library have live video backgrounds!'}
                      </div>
                    </div>
                  </div>

                  {/* Coverage Progress Bar */}
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-[var(--game-accent,#2ee5ba)] transition-all duration-500"
                      style={{ width: `${coveragePct}%` }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      disabled={isBatchDownloading || gamesWithoutVideo.length === 0}
                      onClick={() => handleStartBatchDownload(gamesWithoutVideo)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--game-accent,#2ee5ba)] text-black hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all shadow"
                    >
                      {isBatchDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isBatchDownloading
                          ? 'Downloading Queue...'
                          : `Download Missing (${gamesWithoutVideo.length})`}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isBatchDownloading}
                      onClick={() => {
                        if (confirm(`Download ambient live wallpapers for ALL ${games.length} games in your library? Existing wallpapers will be upgraded.`)) {
                          handleStartBatchDownload(games);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white/80 hover:bg-white/15 hover:text-white disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Upgrade All ({games.length})</span>
                    </button>

                    {isBatchDownloading && (
                      <button
                        type="button"
                        onClick={() => {
                          cancelBatchRef.current = true;
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 cursor-pointer transition-all"
                      >
                        Stop Batch
                      </button>
                    )}
                  </div>

                  {/* Active Batch Progress Notification */}
                  {batchProgress && (
                    <div className="p-2.5 rounded-xl bg-black/40 border border-cyan-500/30 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Downloading {batchProgress.current} of {batchProgress.total}</span>
                        </span>
                        <span className="text-white/60 font-mono text-[10px]">
                          {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                        </span>
                      </div>
                      <div className="text-[11px] text-white truncate font-medium">
                        "{batchProgress.gameTitle}" (Ambient 60fps loop)
                      </div>
                      <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 transition-all duration-300"
                          style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {batchStatusMessage && (
                    <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{batchStatusMessage}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Storage Usage & Cache Clear */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-white/60" />
                  <span>Video Wallpaper Storage</span>
                </div>
                <div className="text-[10px] text-white/40">
                  {videoStorage.count > 0
                    ? `${(videoStorage.totalSizeBytes / 1024 / 1024).toFixed(1)} MB used across ${videoStorage.count} cached offline wallpapers`
                    : 'No offline video files cached (0 MB)'}
                </div>
                {clearedMessage && (
                  <div className="text-[10px] text-emerald-400 font-medium">{clearedMessage}</div>
                )}
              </div>
              <button
                type="button"
                disabled={isClearingVideos || videoStorage.count === 0}
                onClick={() => {
                  if (confirm('Clear all downloaded video wallpapers from disk cache?')) {
                    handleClearVideos();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                {isClearingVideos ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                <span>Clear Cache</span>
              </button>
            </div>

            {/* Screenshots Vault */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-sky-400" />
                  <span>Screenshots & Gallery Vault</span>
                </div>
                <div className="text-[10px] text-white/40">
                  Screenshots saved in Pictures/Astra Screenshots • Press <kbd className="px-1 py-0.2 rounded bg-white/10 text-white/80 font-mono text-[9px]">F12</kbd> anytime
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playSelect();
                  window.api?.openScreenshotsFolder?.();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 glass-pill text-white/80 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Open Folder</span>
              </button>
            </div>
          </div>

          {/* Audio Immersion */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-white/80 uppercase tracking-wider">
              <Volume2 className="w-4 h-4 text-[var(--game-accent)]" />
              <span>Audio Immersion</span>
            </div>

            {/* SFX */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <div className="text-xs font-bold text-white">Console Navigation SFX</div>
                <div className="text-[10px] text-white/40">Tactile blips and confirm chimes</div>
              </div>
              <input
                type="checkbox"
                checked={settings.sfxEnabled}
                onChange={(e) => {
                  audioEngine.playSelect();
                  onUpdateSettings({ ...settings, sfxEnabled: e.target.checked });
                }}
                className="w-4 h-4 accent-[var(--game-accent)] cursor-pointer"
              />
            </div>

            {/* BGM / OST */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <div className="text-xs font-bold text-white">Background Game OST Playback</div>
                <div className="text-[10px] text-white/40">Seamless soundtrack preview on selection</div>
              </div>
              <input
                type="checkbox"
                checked={settings.bgmEnabled}
                onChange={(e) => {
                  audioEngine.playSelect();
                  onUpdateSettings({ ...settings, bgmEnabled: e.target.checked });
                }}
                className="w-4 h-4 accent-[var(--game-accent)] cursor-pointer"
              />
            </div>
          </div>

          {/* Social & Discord Rich Presence */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-white/80 uppercase tracking-wider">
              <Activity className="w-4 h-4 text-[var(--game-accent)]" />
              <span>Social & Rich Presence</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <div className="text-xs font-bold text-white">Discord Rich Presence (RPC)</div>
                <div className="text-[10px] text-white/40">Broadcast active game, playtime, and library status to Discord via local IPC</div>
              </div>
              <input
                type="checkbox"
                checked={settings.discordRpcEnabled ?? true}
                onChange={(e) => {
                  audioEngine.playSelect();
                  const enabled = e.target.checked;
                  onUpdateSettings({ ...settings, discordRpcEnabled: enabled });
                  if (!enabled) {
                    window.api?.clearDiscordActivity();
                  } else {
                    window.api?.setDiscordActivity({
                      details: 'Browsing Library',
                      state: 'Astra Launcher',
                      largeImageKey: 'astra_logo',
                      largeImageText: 'Astra Console',
                      startTimestamp: Math.floor(Date.now() / 1000)
                    });
                  }
                }}
                className="w-4 h-4 accent-[var(--game-accent)] cursor-pointer"
              />
            </div>
          </div>

          {/* Library Backup & Restore */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-white/80 uppercase tracking-wider">
              <Database className="w-4 h-4 text-[var(--game-accent)]" />
              <span>Library Backup & Portability</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-white">Full JSON Library Backup</h4>
                <p className="text-[11px] text-white/50 mt-0.5">
                  Save your complete library (custom artwork, notes, launch arguments, playtime history, and tags) to a portable JSON file or restore it on any machine.
                </p>
              </div>

              {backupMessage && (
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white/90 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--game-accent)] flex-shrink-0" />
                  <span>{backupMessage}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--game-accent)] text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Backup (JSON)</span>
                </button>

                <input
                  ref={restoreFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleRestoreBackupFile}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => {
                    restoreFileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/20 glass-pill text-white/80 hover:text-white text-xs font-semibold hover:border-white/40 active:scale-95 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-sky-400" />
                  <span>Restore from JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* Windows Desktop Shortcut Integration */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-white/80 uppercase tracking-wider">
              <Monitor className="w-4 h-4 text-[var(--game-accent)]" />
              <span>Windows Desktop Integration</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white">Create Desktop Shortcut for Astra</div>
                <div className="text-[10px] text-white/40">
                  Places an Astra Game Launcher shortcut on your Windows desktop for quick access
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateAppShortcut}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-white/15 glass-pill text-white/80 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                <Monitor className="w-3.5 h-3.5 text-sky-400" />
                <span>{appShortcutMessage || 'Create Shortcut'}</span>
              </button>
            </div>
          </div>

          {/* Reset Library */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-white/40">Restore default demo games</span>
            <button
              onClick={() => {
                if (confirm('Reset library to default curated games?')) {
                  audioEngine.playSelect();
                  onResetLibrary();
                  onClose();
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold"
            >
              Reset Library
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
