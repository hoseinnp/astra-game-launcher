import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Volume2,
  Palette,
  Monitor,
  Gamepad2,
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
  Film,
  Trash2,
  HardDrive,
  Camera,
  FolderOpen,
  Download,
  Upload,
  Search,
  ChevronDown,
  ChevronRight,
  SunMedium,
  Sliders
} from 'lucide-react';
import type { AppSettings, GlobalTheme, ViewMode, Game } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { GLOBAL_THEMES, ThemeEngine } from '../../services/themeEngine';
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

type SettingsCategory = 'appearance' | 'system' | 'audio' | 'integrations' | 'data';

const ACCENT_PRESETS = [
  { name: 'Mint Neon', hex: '#2ee5ba', label: 'Default' },
  { name: 'Cyber Cyan', hex: '#00f0ff', label: 'Cyan' },
  { name: 'Cosmic Violet', hex: '#a855f7', label: 'Violet' },
  { name: 'Solar Amber', hex: '#f59e0b', label: 'Amber' },
  { name: 'Cobalt Blue', hex: '#3b82f6', label: 'Blue' },
  { name: 'Electric Pink', hex: '#ec4899', label: 'Pink' },
] as const;

const CATEGORIES: {
  id: SettingsCategory;
  label: string;
  icon: React.FC<{ className?: string }>;
  description: string;
}[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Visual themes, accent glow, and layout' },
  { id: 'system', label: 'System', icon: Monitor, description: 'Startup boot, display, and live video wallpapers' },
  { id: 'audio', label: 'Audio', icon: Volume2, description: 'Console navigation SFX and background OST' },
  { id: 'integrations', label: 'Integrations', icon: Database, description: 'Discord RPC and metadata provider APIs' },
  { id: 'data', label: 'Data & Vault', icon: HardDrive, description: 'Library backups, screenshots, and reset' },
];

/** Accessible, animated toggle switch */
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  id?: string;
  disabled?: boolean;
}> = ({ checked, onChange, label, id, disabled = false }) => {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        audioEngine.playSelect();
        onChange(!checked);
      }}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent,#2ee5ba)] disabled:opacity-40 disabled:cursor-not-allowed ${
        checked
          ? 'bg-[var(--accent,#2ee5ba)] shadow-[0_0_10px_var(--accent-glow,rgba(46,229,186,0.3))]'
          : 'bg-white/20 hover:bg-white/30'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

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
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');
  const [searchQuery, setSearchQuery] = useState('');

  // Switch category tabs on gamepad LB/RB bumpers
  useEffect(() => {
    if (!isOpen) return;
    const handleBumper = (e: Event) => {
      const customEvent = e as CustomEvent<'BUMPER_LEFT' | 'BUMPER_RIGHT'>;
      const order: SettingsCategory[] = ['appearance', 'system', 'audio', 'integrations', 'data'];
      const currentIdx = order.indexOf(activeCategory);
      if (currentIdx === -1) return;
      audioEngine.playHover();
      if (customEvent.detail === 'BUMPER_RIGHT') {
        const next = order[(currentIdx + 1) % order.length];
        setActiveCategory(next);
      } else {
        const prev = order[(currentIdx - 1 + order.length) % order.length];
        setActiveCategory(prev);
      }
    };
    window.addEventListener('astra:bumper', handleBumper);
    return () => window.removeEventListener('astra:bumper', handleBumper);
  }, [isOpen, activeCategory]);

  const [advancedOpen, setAdvancedOpen] = useState<Record<string, boolean>>({
    appearance: false,
    system: false,
    audio: false,
    integrations: false,
    data: false
  });

  const [rawgStatus, setRawgStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [rawgMessage, setRawgMessage] = useState('');
  const [showRawgKey, setShowRawgKey] = useState(false);

  const [sgdbStatus, setSgdbStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [sgdbMessage, setSgdbMessage] = useState('');
  const [showSgdbKey, setShowSgdbKey] = useState(false);

  const [videoStorage, setVideoStorage] = useState<{ totalSizeBytes: number; count: number }>({
    totalSizeBytes: 0,
    count: 0
  });
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

  // Backup & Restore
  const [backupMessage, setBackupMessage] = useState<string>('');
  const restoreFileInputRef = useRef<HTMLInputElement | null>(null);

  // Desktop Shortcut
  const [appShortcutMessage, setAppShortcutMessage] = useState('');

  // Custom Hex Input State
  const [customHexInput, setCustomHexInput] = useState(settings.customAccent || '#2ee5ba');

  const toggleAdvanced = (cat: string) => {
    audioEngine.playSelect();
    setAdvancedOpen((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleTestRawg = useCallback(
    async (keyToTest?: string) => {
      const key = keyToTest !== undefined ? keyToTest : settings.apiKeys?.rawg || '';
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
    },
    [settings.apiKeys?.rawg]
  );

  const handleTestSgdb = useCallback(
    async (keyToTest?: string) => {
      const key = keyToTest !== undefined ? keyToTest : settings.apiKeys?.steamGridDb || '';
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
    },
    [settings.apiKeys?.steamGridDb]
  );

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

    if (window.api?.getVideoStorage) {
      const storage = await window.api.getVideoStorage();
      setVideoStorage(storage);
    }

    setIsBatchDownloading(false);
    setBatchProgress(null);
    setBatchStatusMessage(`✓ Finished! Downloaded live wallpapers for ${completed} games.`);
    audioEngine.playSelect();
  };

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

  const handleThemeSelect = (t: GlobalTheme) => {
    audioEngine.playSelect();
    ThemeEngine.applyGlobalTheme(t, {
      customAccent: settings.customAccent,
      glowIntensity: settings.glowIntensity
    });
    onUpdateSettings({ ...settings, globalTheme: t });
  };

  const handleViewModeSelect = (m: ViewMode) => {
    audioEngine.playSelect();
    onUpdateSettings({ ...settings, viewMode: m });
  };

  const handleAccentSelect = (accentHex?: string) => {
    audioEngine.playSelect();
    setCustomHexInput(accentHex || '#2ee5ba');
    if (accentHex) {
      localStorage.setItem('customAccent', accentHex);
    } else {
      localStorage.removeItem('customAccent');
    }
    ThemeEngine.applyGlobalTheme(settings.globalTheme, {
      customAccent: accentHex,
      glowIntensity: settings.glowIntensity
    });
    onUpdateSettings({ ...settings, customAccent: accentHex });
  };

  const handleHexInputChange = (val: string) => {
    setCustomHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      handleAccentSelect(val);
    }
  };

  const handleGlowChange = (intensity: number) => {
    localStorage.setItem('glowIntensity', String(intensity));
    ThemeEngine.applyGlobalTheme(settings.globalTheme, {
      customAccent: settings.customAccent,
      glowIntensity: intensity
    });
    onUpdateSettings({ ...settings, glowIntensity: intensity });
  };

  const currentGlow = settings.glowIntensity ?? 70;
  const currentAccent = settings.customAccent || '#2ee5ba';

  // Search Filter Matcher
  const filterMatches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return null;

    const matches: Record<string, boolean> = {
      theme: 'visual theme color preset dark light 8bitdo cyberpunk vaporwave'.includes(q),
      accent: 'accent color picker glow intensity swatch neon luminescence aura'.includes(q),
      layout: 'layout view mode ps5 console grid poster shelf 3d'.includes(q),
      fullscreen: 'fullscreen display mode monitor f11 window'.includes(q),
      blur: 'background blur subtle medium heavy backdrop'.includes(q),
      startup: 'startup boot splash profile f11 who is playing'.includes(q),
      boot: 'windows startup auto launch boot on system'.includes(q),
      hud: 'hud command navigation bottom bar shortcuts'.includes(q),
      reducedEffects: 'reduce animations glow accessibility performance low-spec'.includes(q),
      liveWallpaper: 'live video wallpaper ambient loop 60fps cache video storage'.includes(q),
      audio: 'audio sfx navigation chime sound volume bgm ost soundtrack'.includes(q),
      discord: 'discord rpc rich presence activity playing status'.includes(q),
      providers: 'artwork metadata providers steam cdn gog rawg steamgriddb api key'.includes(q),
      backup: 'backup restore library json export import'.includes(q),
      shortcut: 'desktop shortcut windows app'.includes(q),
      screenshots: 'screenshots vault gallery pictures f12 folder'.includes(q),
      reset: 'reset library default demo games clear'.includes(q),
      wizard: 'setup wizard realm calibration analog starfield'.includes(q)
    };

    return matches;
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-w-[calc(100vw-1rem)] rounded-2xl sm:rounded-3xl bg-[#0a0d16] border border-white/15 shadow-2xl overflow-hidden flex flex-col animate-modalIn transform-gpu will-change-transform max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent,#2ee5ba)] text-black flex items-center justify-center font-bold shadow-[0_0_12px_var(--accent-glow,rgba(46,229,186,0.3))]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">Launcher Preferences</h2>
              <p className="text-[10px] text-white/50 hidden sm:block">Personalize visuals, performance, audio & system services</p>
            </div>
          </div>

          {/* Search Box & Close Button */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings..."
                aria-label="Search launcher preferences"
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus-visible:outline-none focus-visible:border-[var(--accent,#2ee5ba)] focus-visible:ring-1 focus-visible:ring-[var(--accent,#2ee5ba)] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search input"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              aria-label="Close preferences modal"
              className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent,#2ee5ba)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Category Rail + Main Content Area */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Left Category Rail (<800px collapses to horizontal scrolling bar) */}
          <nav
            aria-label="Settings Categories"
            className="sm:w-52 md:w-60 shrink-0 border-b sm:border-b-0 sm:border-r border-white/10 bg-black/20 p-2 sm:p-3 flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto"
          >
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = !searchQuery && activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    audioEngine.playSelect();
                    setActiveCategory(cat.id);
                    if (searchQuery) setSearchQuery('');
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent,#2ee5ba)] ${
                    isActive
                      ? 'bg-[var(--accent,#2ee5ba)]/15 text-[var(--accent,#2ee5ba)] border border-[var(--accent,#2ee5ba)]/40 shadow-[0_0_12px_var(--accent-glow,rgba(46,229,186,0.2))] font-bold'
                      : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--accent,#2ee5ba)]' : 'text-white/50'}`} />
                  <div className="text-left hidden sm:block">
                    <div className="leading-tight">{cat.label}</div>
                  </div>
                  <span className="sm:hidden">{cat.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Search Active Notification */}
            {searchQuery && (
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs">
                <span className="text-white/70">
                  Showing matching preferences for <strong className="text-white">"{searchQuery}"</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[var(--accent,#2ee5ba)] hover:underline font-semibold"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* Realm Calibration Wizard Banner */}
            {onOpenSetupWizard && (!filterMatches || filterMatches.wizard) && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 via-[var(--accent,#2ee5ba)]/15 to-amber-500/20 border border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 via-[var(--accent,#2ee5ba)] to-purple-600 text-black shadow-md">
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
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSetupWizard();
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--accent,#2ee5ba)] text-black text-xs font-bold whitespace-nowrap hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Launch Wizard
                </button>
              </div>
            )}

            {/* ============================================================== */}
            {/* CATEGORY: APPEARANCE */}
            {/* ============================================================== */}
            {(activeCategory === 'appearance' || (filterMatches && (filterMatches.theme || filterMatches.accent || filterMatches.layout || filterMatches.blur || filterMatches.reducedEffects))) && (
              <div className="space-y-6 animate-fadeIn">
                {/* 1. Accent Glow System (Swatches + Slider + Live Preview) */}
                {(!filterMatches || filterMatches.accent) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-[var(--accent,#2ee5ba)]" />
                        <span>Accent Color & Aura Glow</span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--accent,#2ee5ba)]">Dynamic Engine</span>
                    </div>

                    {/* 6 Preset Accent Swatches */}
                    <div>
                      <div className="text-xs font-semibold text-white/80 mb-2">Preset Color Swatches</div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {ACCENT_PRESETS.map((preset) => {
                          const isSelected = (settings.customAccent || '#2ee5ba').toLowerCase() === preset.hex.toLowerCase();
                          return (
                            <button
                              key={preset.hex}
                              type="button"
                              onClick={() => handleAccentSelect(preset.hex)}
                              aria-label={`Select accent color ${preset.name}`}
                              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                                isSelected
                                  ? 'border-white bg-white/15 shadow-[0_0_12px_var(--accent-glow,rgba(46,229,186,0.3))]'
                                  : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                              }`}
                            >
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center shadow"
                                style={{ backgroundColor: preset.hex }}
                              >
                                {isSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                              </span>
                              <span className="text-[10px] font-medium text-white/80 truncate w-full text-center">
                                {preset.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Hex Color Input */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-black/30 border border-white/10">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="color"
                          id="custom-accent-color-picker"
                          aria-label="Custom Hex Color Picker"
                          value={currentAccent}
                          onChange={(e) => handleAccentSelect(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                        />
                        <div>
                          <div className="text-xs font-bold text-white">Custom Color Picker</div>
                          <div className="text-[10px] text-white/40">Pick any custom hex code</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="text"
                          value={customHexInput}
                          onChange={(e) => handleHexInputChange(e.target.value)}
                          placeholder="#2ee5ba"
                          maxLength={7}
                          aria-label="Hex color string input"
                          className="w-24 px-2.5 py-1 rounded-lg bg-black/50 border border-white/15 text-xs text-white font-mono uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent,#2ee5ba)]"
                        />
                        {settings.customAccent && (
                          <button
                            type="button"
                            onClick={() => handleAccentSelect(undefined)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Glow Intensity Range Slider */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor="glow-intensity-slider" className="text-xs font-bold text-white flex items-center gap-1.5">
                          <SunMedium className="w-3.5 h-3.5 text-[var(--accent,#2ee5ba)]" />
                          <span>Aura Glow Intensity</span>
                        </label>
                        <span className="font-mono text-xs font-bold text-[var(--accent,#2ee5ba)]">
                          {settings.reduceEffects ? '0% (Disabled by Reduced Effects)' : currentGlow === 0 ? '0% (Glow Off)' : `${currentGlow}%`}
                        </span>
                      </div>
                      <input
                        id="glow-intensity-slider"
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={currentGlow}
                        disabled={settings.reduceEffects}
                        onChange={(e) => handleGlowChange(Number(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent,#2ee5ba)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent,#2ee5ba)] disabled:opacity-40"
                      />
                      <div className="flex justify-between text-[10px] text-white/40 font-mono">
                        <span>0% (Off)</span>
                        <span>50%</span>
                        <span>100% (Maximum Aura)</span>
                      </div>
                    </div>

                    {/* Live Preview Card */}
                    <div
                      className="p-4 rounded-xl border transition-all mt-2"
                      style={{
                        borderColor: 'var(--accent, #2ee5ba)',
                        boxShadow: settings.reduceEffects || currentGlow === 0 ? 'none' : 'var(--accent-glow)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: 'var(--accent, #2ee5ba)' }}
                          />
                          <span className="text-xs font-bold text-white">Live System Preview</span>
                        </div>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
                          style={{
                            backgroundColor: 'var(--accent, #2ee5ba)',
                            color: 'var(--accent-contrast, #000)'
                          }}
                        >
                          {settings.reduceEffects ? 'Reduced Effects Active' : `${currentGlow}% Glow`}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/70 mt-2">
                        Accent luminesces across hero backdrops, poster cards, navigation pills, and active indicators with zero startup flash.
                      </p>
                      <div className="mt-3 flex items-center gap-2.5">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-transform hover:scale-105 cursor-default"
                          style={{
                            backgroundColor: 'var(--accent, #2ee5ba)',
                            color: 'var(--accent-contrast, #000)'
                          }}
                        >
                          Primary Action
                        </button>
                        <div
                          className="px-3 py-1.5 rounded-xl border text-xs font-semibold"
                          style={{
                            borderColor: 'var(--accent, #2ee5ba)',
                            color: 'var(--accent, #2ee5ba)'
                          }}
                        >
                          Active State Pill
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Global Visual Theme */}
                {(!filterMatches || filterMatches.theme) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 hover:border-white/20 transition-all">
                    <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                      <Palette className="w-4 h-4 text-[var(--accent,#2ee5ba)]" />
                      <span>Visual Color Themes</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      {(Object.keys(GLOBAL_THEMES) as GlobalTheme[]).map((key) => {
                        const item = GLOBAL_THEMES[key];
                        const isActive = settings.globalTheme === key;
                        return (
                          <div
                            key={key}
                            onClick={() => handleThemeSelect(key)}
                            className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1.5 ${
                              isActive
                                ? 'border-[var(--accent,#2ee5ba)] bg-[var(--accent,#2ee5ba)]/10 ring-2 ring-[var(--accent,#2ee5ba)] shadow-[0_0_12px_var(--accent-glow)]'
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
                )}

                {/* 3. Default Layout (View Mode) */}
                {(!filterMatches || filterMatches.layout) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 hover:border-white/20 transition-all">
                    <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                      <Monitor className="w-4 h-4 text-[var(--accent,#2ee5ba)]" />
                      <span>Default Library Layout</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => handleViewModeSelect('ps5')}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                          settings.viewMode === 'ps5'
                            ? 'border-[var(--accent,#2ee5ba)] bg-[var(--accent,#2ee5ba)]/10 text-white font-bold ring-1 ring-[var(--accent,#2ee5ba)]'
                            : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-bold">Console Mode</div>
                        <div className="text-[10px] text-white/40 mt-0.5">Horizontal ribbon & cinematic backdrop</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleViewModeSelect('grid')}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                          settings.viewMode === 'grid'
                            ? 'border-[var(--accent,#2ee5ba)] bg-[var(--accent,#2ee5ba)]/10 text-white font-bold ring-1 ring-[var(--accent,#2ee5ba)]'
                            : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-bold">Poster Grid</div>
                        <div className="text-[10px] text-white/40 mt-0.5">Steam/GOG style library grid</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleViewModeSelect('shelf')}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                          settings.viewMode === 'shelf'
                            ? 'border-[var(--accent,#2ee5ba)] bg-[var(--accent,#2ee5ba)]/10 text-white font-bold ring-1 ring-[var(--accent,#2ee5ba)]'
                            : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-bold">Physical Shelf</div>
                        <div className="text-[10px] text-white/40 mt-0.5">3D collectible shelf & retro cartridges</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Collapsible Advanced Appearance Section */}
                {(!filterMatches || filterMatches.blur || filterMatches.reducedEffects) && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleAdvanced('appearance')}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {advancedOpen.appearance || filterMatches ? (
                          <ChevronDown className="w-4 h-4 text-[var(--accent,#2ee5ba)]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white/40" />
                        )}
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Advanced Visual & Performance Controls
                        </span>
                      </div>
                      <span className="text-[10px] text-white/40 font-mono">
                        {advancedOpen.appearance || filterMatches ? 'Collapse' : 'Expand'}
                      </span>
                    </button>

                    {(advancedOpen.appearance || filterMatches) && (
                      <div className="p-4 pt-0 space-y-4 border-t border-white/10 animate-fadeIn">
                        {/* Background Blur Level */}
                        <div className="space-y-2.5 pt-3">
                          <div className="text-xs font-bold text-white">Background Glass Blur</div>
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
                                  type="button"
                                  onClick={() => {
                                    audioEngine.playSelect();
                                    onUpdateSettings({
                                      ...settings,
                                      backgroundBlur: lvl.id as 'none' | 'subtle' | 'medium' | 'heavy'
                                    });
                                  }}
                                  className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                                    isSelected
                                      ? 'border-[var(--accent,#2ee5ba)] bg-[var(--accent,#2ee5ba)]/15 text-white font-bold ring-1 ring-[var(--accent,#2ee5ba)]'
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

                        {/* Reduced Effects Accessibility Switch */}
                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-white">Reduce animations and glow</h4>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Accessibility
                              </span>
                            </div>
                            <p className="text-[10px] text-white/40 mt-0.5">
                              Disables transitions, heavy backdrop blurs, and neon glows for maximum performance or low-spec hardware. Also respected automatically when OS prefers-reduced-motion is active.
                            </p>
                          </div>
                          <ToggleSwitch
                            checked={Boolean(settings.reduceEffects)}
                            onChange={(checked) => {
                              onUpdateSettings({ ...settings, reduceEffects: checked });
                            }}
                            label="Reduce animations and glow"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* CATEGORY: SYSTEM */}
            {/* ============================================================== */}
            {(activeCategory === 'system' || (filterMatches && (filterMatches.startup || filterMatches.boot || filterMatches.hud || filterMatches.fullscreen || filterMatches.liveWallpaper))) && (
              <div className="space-y-6 animate-fadeIn">
                
                  {/* Controller & Gamepad Navigation */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-4 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <Gamepad2 className="w-4 h-4 text-[var(--accent,#2ee5ba)]" />
                          <span>Controller Support</span>
                        </div>
                        <div className="text-[10px] text-white/40 mt-0.5">Enable direct spatial navigation via gamepad</div>
                      </div>
                      <ToggleSwitch
                        checked={settings.controllerSupport !== false}
                        onChange={(checked) => onUpdateSettings({ ...settings, controllerSupport: checked })}
                        label="Controller Support"
                      />
                    </div>
                    {settings.controllerSupport !== false && (
                      <>
                        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-4">
                          <div className="w-1/2">
                            <h4 className="text-[11px] font-bold text-white">Analog Stick Deadzone</h4>
                            <p className="text-[9px] text-white/40 mt-0.5">Increase to prevent stick drift registering as input</p>
                          </div>
                          <div className="flex items-center gap-3 flex-1 justify-end">
                            <span className="text-[10px] text-white/40 font-mono w-6 text-right">
                              {Math.round((settings.gamepadDeadzone ?? 0.4) * 100)}%
                            </span>
                            <input
                              type="range"
                              min="0.1"
                              max="0.9"
                              step="0.05"
                              value={settings.gamepadDeadzone ?? 0.4}
                              onChange={(e) => onUpdateSettings({ ...settings, gamepadDeadzone: parseFloat(e.target.value) })}
                              className="w-32 accent-[var(--accent,#2ee5ba)]"
                            />
                          </div>
                        </div>

                        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-4">
                          <div>
                            <h4 className="text-[11px] font-bold text-white">Vibration Feedback</h4>
                            <p className="text-[9px] text-white/40 mt-0.5">Light rumble pulse on activate when supported by gamepad</p>
                          </div>
                          <ToggleSwitch
                            checked={Boolean(settings.gamepadVibration)}
                            onChange={(checked) => onUpdateSettings({ ...settings, gamepadVibration: checked })}
                            label="Vibration Feedback"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* 1. Display Mode & Full Screen */}
                {(!filterMatches || filterMatches.fullscreen) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4 hover:border-white/20 transition-all">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Monitor className="w-4 h-4 text-[var(--accent,#2ee5ba)]" />
                        <span>Full Screen Mode (F11)</span>
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">Immersive edge-to-edge console experience</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        audioEngine.playSelect();
                        window.api?.toggleFullscreen();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[var(--accent,#2ee5ba)] text-black text-xs font-bold hover:brightness-110 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-all"
                    >
                      Toggle Fullscreen
                    </button>
                  </div>
                )}

                {/* 2. Startup Screen Toggle */}
                {(!filterMatches || filterMatches.startup) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4 hover:border-white/20 transition-all">
                    <div>
                      <h4 className="text-xs font-bold text-white">Show "Press F or (A) to Start" on Launch</h4>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        When enabled, displays the console splash and profile selector ("Who is playing today?"). When disabled, boots straight into your game library.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={!settings.skipStartupScreen}
                      onChange={(checked) => {
                        onUpdateSettings({ ...settings, skipStartupScreen: !checked });
                      }}
                      label="Show splash and profile selector on launch"
                    />
                  </div>
                )}

                {/* 3. Start on Windows Startup */}
                {(!filterMatches || filterMatches.boot) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4 hover:border-white/20 transition-all">
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
                    <ToggleSwitch
                      checked={Boolean(settings.startOnBoot)}
                      onChange={async (checked) => {
                        if (window.api?.setAutoLaunch) {
                          await window.api.setAutoLaunch(checked);
                        }
                        onUpdateSettings({ ...settings, startOnBoot: checked });
                      }}
                      label="Start on Windows boot"
                    />
                  </div>
                )}

                {/* 4. Bottom Command Help HUD */}
                {(!filterMatches || filterMatches.hud) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4 hover:border-white/20 transition-all">
                    <div>
                      <h4 className="text-xs font-bold text-white">Show Bottom Command Help (HUD)</h4>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        Displays the floating controller and keyboard shortcut bar at the bottom of the screen.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={Boolean(settings.showNavigationHud)}
                      onChange={(checked) => {
                        onUpdateSettings({ ...settings, showNavigationHud: checked });
                      }}
                      label="Show Bottom Command Help HUD"
                    />
                  </div>
                )}

                {/* 5. Live Video Wallpapers Card */}
                {(!filterMatches || filterMatches.liveWallpaper) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                        <Film className="w-4 h-4 text-[var(--accent,#2ee5ba)]" />
                        <span>Live Video Wallpapers</span>
                      </div>
                      <span className="text-[10px] text-cyan-400 font-bold">Ambient 60fps Loops</span>
                    </div>

                    {/* Auto-Download Switch */}
                    <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-white">Auto-Download Live Wallpaper when Adding Games</h4>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          Automatically downloads pure 1080p ambient in-game scene loops to your local drive. Commercial trailers are strictly blocked launcher-wide.
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={settings.autoDownloadLiveWallpaper !== false}
                        onChange={(checked) => {
                          onUpdateSettings({ ...settings, autoDownloadLiveWallpaper: checked });
                        }}
                        label="Auto-Download live wallpaper"
                      />
                    </div>

                    {/* Library Batch Downloader Card */}
                    {games && games.length > 0 && (() => {
                      const gamesWithVideo = games.filter((g) => Boolean(g.videoUrl));
                      const gamesWithoutVideo = games.filter((g) => !g.videoUrl);
                      const coveragePct = Math.round((gamesWithVideo.length / games.length) * 100);

                      return (
                        <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-3">
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
                              className="h-full bg-gradient-to-r from-emerald-500 to-[var(--accent,#2ee5ba)] transition-all duration-500"
                              style={{ width: `${coveragePct}%` }}
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <button
                              type="button"
                              disabled={isBatchDownloading || gamesWithoutVideo.length === 0}
                              onClick={() => handleStartBatchDownload(gamesWithoutVideo)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--accent,#2ee5ba)] text-black hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all shadow"
                            >
                              {isBatchDownloading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {isBatchDownloading ? 'Downloading Queue...' : `Download Missing (${gamesWithoutVideo.length})`}
                              </span>
                            </button>

                            <button
                              type="button"
                              disabled={isBatchDownloading}
                              onClick={() => {
                                if (
                                  confirm(
                                    `Download ambient live wallpapers for ALL ${games.length} games in your library? Existing wallpapers will be upgraded.`
                                  )
                                ) {
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
                                  <span>
                                    Downloading {batchProgress.current} of {batchProgress.total}
                                  </span>
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
                  </div>
                )}

                {/* Collapsible Advanced System Section */}
                {(!filterMatches || filterMatches.liveWallpaper) && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleAdvanced('system')}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {advancedOpen.system || filterMatches ? (
                          <ChevronDown className="w-4 h-4 text-[var(--accent,#2ee5ba)]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white/40" />
                        )}
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Advanced Video Engine & Cache Storage
                        </span>
                      </div>
                      <span className="text-[10px] text-white/40 font-mono">
                        {advancedOpen.system || filterMatches ? 'Collapse' : 'Expand'}
                      </span>
                    </button>

                    {(advancedOpen.system || filterMatches) && (
                      <div className="p-4 pt-0 space-y-4 border-t border-white/10 animate-fadeIn">
                        {/* Engine Selection */}
                        <div className="space-y-2.5 pt-3">
                          <div className="text-xs font-bold text-white">Wallpaper Engine & Source</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                audioEngine.playSelect();
                                onUpdateSettings({ ...settings, liveWallpaperEngine: 'ambient' });
                              }}
                              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                                (settings.liveWallpaperEngine ?? 'ambient') === 'ambient'
                                  ? 'border-[var(--accent,#2ee5ba)] bg-[var(--accent,#2ee5ba)]/10 text-white font-bold ring-1 ring-[var(--accent,#2ee5ba)]'
                                  : 'border-white/10 bg-black/20 text-white/60 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent,#2ee5ba)]">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Ambient 60fps Loop</span>
                              </div>
                              <div className="text-[10px] text-white/50 mt-1">
                                Seamless scenic loop without logos, ESRB cards, or voiceovers. Works for EA, Epic, Steam & standalone.
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
                                  ? 'border-[var(--accent,#2ee5ba)] bg-[var(--accent,#2ee5ba)]/10 text-white font-bold ring-1 ring-[var(--accent,#2ee5ba)]'
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

                        {/* Storage Usage & Clear Cache */}
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/30 border border-white/10">
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <HardDrive className="w-3.5 h-3.5 text-white/60" />
                              <span>Offline Video Storage Cache</span>
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
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* CATEGORY: AUDIO */}
            {/* ============================================================== */}
            {(activeCategory === 'audio' || (filterMatches && filterMatches.audio)) && (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 hover:border-white/20 transition-all">
                  <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                    <Volume2 className="w-4 h-4 text-[var(--accent,#2ee5ba)]" />
                    <span>Acoustic Immersion</span>
                  </div>

                  {/* Navigation SFX Toggle */}
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-white">Console Navigation SFX</div>
                      <div className="text-[10px] text-white/40 mt-0.5">Tactile blips and confirm chimes</div>
                    </div>
                    <ToggleSwitch
                      checked={Boolean(settings.sfxEnabled)}
                      onChange={(checked) => {
                        onUpdateSettings({ ...settings, sfxEnabled: checked });
                      }}
                      label="Console Navigation SFX"
                    />
                  </div>

                  {/* Background Game OST Playback Toggle */}
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-white">Background Game OST Playback</div>
                      <div className="text-[10px] text-white/40 mt-0.5">Seamless soundtrack preview on selection</div>
                    </div>
                    <ToggleSwitch
                      checked={Boolean(settings.bgmEnabled)}
                      onChange={(checked) => {
                        onUpdateSettings({ ...settings, bgmEnabled: checked });
                      }}
                      label="Background Game OST Playback"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* CATEGORY: INTEGRATIONS */}
            {/* ============================================================== */}
            {(activeCategory === 'integrations' || (filterMatches && (filterMatches.discord || filterMatches.providers))) && (
              <div className="space-y-6 animate-fadeIn">
                {/* 1. Discord RPC */}
                {(!filterMatches || filterMatches.discord) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 hover:border-white/20 transition-all">
                    <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                      <Activity className="w-4 h-4 text-[var(--accent,#2ee5ba)]" />
                      <span>Social & Rich Presence</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-white">Discord Rich Presence (RPC)</div>
                        <div className="text-[10px] text-white/40 mt-0.5">
                          Broadcast active game, playtime, and library status to Discord via local IPC
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={settings.discordRpcEnabled ?? true}
                        onChange={(enabled) => {
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
                        label="Discord Rich Presence (RPC)"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Artwork Providers (Built-ins) */}
                {(!filterMatches || filterMatches.providers) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                        <Database className="w-4 h-4 text-[var(--accent,#2ee5ba)]" />
                        <span>Artwork & Metadata Providers</span>
                      </div>
                      <span className="text-[10px] text-white/40">Multi-Provider Search</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-2xl bg-black/30 border border-white/10 flex flex-col justify-between">
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

                      <div className="p-3 rounded-2xl bg-black/30 border border-white/10 flex flex-col justify-between">
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
                  </div>
                )}

                {/* Collapsible Advanced API Keys Section */}
                {(!filterMatches || filterMatches.providers) && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleAdvanced('integrations')}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {advancedOpen.integrations || filterMatches ? (
                          <ChevronDown className="w-4 h-4 text-[var(--accent,#2ee5ba)]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white/40" />
                        )}
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Custom API Keys (SteamGridDB & RAWG)
                        </span>
                      </div>
                      <span className="text-[10px] text-white/40 font-mono">
                        {advancedOpen.integrations || filterMatches ? 'Collapse' : 'Expand'}
                      </span>
                    </button>

                    {(advancedOpen.integrations || filterMatches) && (
                      <div className="p-4 pt-0 space-y-4 border-t border-white/10 animate-fadeIn">
                        {/* SteamGridDB API Key */}
                        <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-2.5 mt-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white">SteamGridDB API</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                Transparent Logos
                              </span>
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
                            </div>

                            <button
                              type="button"
                              onClick={() => window.open('https://www.steamgriddb.com/profile/preferences/api', '_blank')}
                              className="text-[10px] text-[var(--accent,#2ee5ba)] hover:underline flex items-center gap-1 cursor-pointer"
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
                                setSgdbStatus('idle');
                              }}
                              className="w-full pl-3 pr-20 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus-visible:outline-none focus-visible:border-[var(--accent,#2ee5ba)] font-mono"
                            />
                            <div className="absolute right-1.5 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setShowSgdbKey(!showSgdbKey)}
                                title={showSgdbKey ? 'Hide key' : 'Show key'}
                                className="p-1 rounded-lg text-white/40 hover:text-white"
                              >
                                {showSgdbKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                disabled={sgdbStatus === 'checking' || !settings.apiKeys?.steamGridDb?.trim()}
                                onClick={() => handleTestSgdb()}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/10 text-white/70 hover:bg-white/20 hover:text-white disabled:opacity-40 cursor-pointer"
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
                            <div className="text-[10px] text-white/60 px-1">{sgdbMessage}</div>
                          )}
                        </div>

                        {/* RAWG API Key */}
                        <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white">RAWG.io API</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                500k+ Database
                              </span>
                              {rawgStatus === 'checking' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1 animate-pulse">
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  Testing...
                                </span>
                              )}
                              {rawgStatus === 'valid' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
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
                            </div>

                            <button
                              type="button"
                              onClick={() => window.open('https://rawg.io/apidocs', '_blank')}
                              className="text-[10px] text-[var(--accent,#2ee5ba)] hover:underline flex items-center gap-1 cursor-pointer"
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
                                setRawgStatus('idle');
                              }}
                              className="w-full pl-3 pr-20 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus-visible:outline-none focus-visible:border-[var(--accent,#2ee5ba)] font-mono"
                            />
                            <div className="absolute right-1.5 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setShowRawgKey(!showRawgKey)}
                                title={showRawgKey ? 'Hide key' : 'Show key'}
                                className="p-1 rounded-lg text-white/40 hover:text-white"
                              >
                                {showRawgKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                disabled={rawgStatus === 'checking' || !settings.apiKeys?.rawg?.trim()}
                                onClick={() => handleTestRawg()}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/10 text-white/70 hover:bg-white/20 hover:text-white disabled:opacity-40 cursor-pointer"
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
                            <div className="text-[10px] text-white/60 px-1">{rawgMessage}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* CATEGORY: DATA & VAULT */}
            {/* ============================================================== */}
            {(activeCategory === 'data' || (filterMatches && (filterMatches.backup || filterMatches.shortcut || filterMatches.screenshots || filterMatches.reset))) && (
              <div className="space-y-6 animate-fadeIn">
                {/* 1. Full JSON Backup & Restore */}
                {(!filterMatches || filterMatches.backup) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 hover:border-white/20 transition-all">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <Database className="w-4 h-4 text-[var(--accent,#2ee5ba)]" />
                        <span>Full JSON Library Backup</span>
                      </h4>
                      <p className="text-[11px] text-white/50 mt-1">
                        Save your complete library (custom artwork, notes, launch arguments, playtime history, and tags) to a portable JSON file or restore it on any machine.
                      </p>
                    </div>

                    {backupMessage && (
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white/90 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[var(--accent,#2ee5ba)] flex-shrink-0" />
                        <span>{backupMessage}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={handleExportBackup}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--accent,#2ee5ba)] text-black text-xs font-bold hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/20 glass-pill text-white/80 hover:text-white text-xs font-semibold hover:border-white/40 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        <Upload className="w-3.5 h-3.5 text-sky-400" />
                        <span>Restore from JSON</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Screenshots Vault */}
                {(!filterMatches || filterMatches.screenshots) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4 hover:border-white/20 transition-all">
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
                )}

                {/* 3. Windows Desktop Shortcut */}
                {(!filterMatches || filterMatches.shortcut) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4 hover:border-white/20 transition-all">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-sky-400" />
                        <span>Create Desktop Shortcut for Astra</span>
                      </div>
                      <div className="text-[10px] text-white/40">
                        Places an Astra Game Launcher shortcut on your Windows desktop for quick access
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateAppShortcut}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-white/15 glass-pill text-white/80 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <span>{appShortcutMessage || 'Create Shortcut'}</span>
                    </button>
                  </div>
                )}

                {/* Collapsible Advanced Maintenance (Reset Library) */}
                {(!filterMatches || filterMatches.reset) && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleAdvanced('data')}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {advancedOpen.data || filterMatches ? (
                          <ChevronDown className="w-4 h-4 text-red-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white/40" />
                        )}
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                          Danger Zone & Library Reset
                        </span>
                      </div>
                      <span className="text-[10px] text-white/40 font-mono">
                        {advancedOpen.data || filterMatches ? 'Collapse' : 'Expand'}
                      </span>
                    </button>

                    {(advancedOpen.data || filterMatches) && (
                      <div className="p-4 pt-0 border-t border-white/10 animate-fadeIn">
                        <div className="flex items-center justify-between pt-3">
                          <div>
                            <div className="text-xs font-bold text-white">Reset to Default Curated Games</div>
                            <div className="text-[10px] text-white/40">Restores standard initial demo title collection</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Reset library to default curated games?')) {
                                audioEngine.playSelect();
                                onResetLibrary();
                                onClose();
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          >
                            Reset Library
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
