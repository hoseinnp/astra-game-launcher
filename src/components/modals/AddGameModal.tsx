import React, { useState, useMemo, useCallback } from 'react';
import { X, Folder, Image, Music, HardDrive, RefreshCw, Check, Plus, Gamepad2, Sparkles, Film, Loader2, Layers, Trash2, FolderPlus, Terminal } from 'lucide-react';
import type { Game, FolderScanResult, ProviderApiKeys, DetectedPlatformGame, PlatformId } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { ThemeEngine } from '../../services/themeEngine';
import { ArtworkService } from '../../services/artworkService';
import { QuotesService } from '../../services/quotesService';
import { normalizeMediaUrl } from '../../utils/mediaUrl';
import { useImportStore, type ImportQueueItem } from '../../store/useImportStore';

import { LaunchArgumentsService } from '../../services/launchArgumentsService';

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGame: (game: Game) => void;
  onAddBatchGames?: (games: Game[]) => void;
  apiKeys?: ProviderApiKeys;
  existingGames?: Game[];
}

export const AddGameModal: React.FC<AddGameModalProps> = ({
  isOpen,
  onClose,
  onAddGame,
  onAddBatchGames,
  apiKeys,
  existingGames = []
}) => {
  const [tab, setTab] = useState<'platforms' | 'folderScan' | 'standalone'>('platforms');

  // Multi-Platform Scanner State
  const [platformFilter, setPlatformFilter] = useState<'all' | PlatformId>('all');
  const [platformGames, setPlatformGames] = useState<DetectedPlatformGame[]>([]);
  const [selectedPlatformItems, setSelectedPlatformItems] = useState<Set<string>>(new Set());
  const [isPlatformScanning, setIsPlatformScanning] = useState(false);

  // Standalone Game Form State
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('');
  const [exePath, setExePath] = useState('');
  const [workingDir, setWorkingDir] = useState('');
  const [args, setArgs] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [backdropUrl, setBackdropUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [bgmUrl, setBgmUrl] = useState('');
  const [genreText, setGenreText] = useState('Action, Indie');
  const [description, setDescription] = useState('');

  // Scanner State (Multiple Folders Support)
  const [scannedGames, setScannedGames] = useState<FolderScanResult[]>([]);
  const [selectedScanItems, setSelectedScanItems] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [smartFilter, setSmartFilter] = useState(true);
  const [scannedFolderPaths, setScannedFolderPaths] = useState<string[]>([]);
  const [customFolderInput, setCustomFolderInput] = useState('');

  // Standalone and Video State
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
  const [isFetchingArt, setIsFetchingArt] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Duplicate Detector against user's current library
  const isDuplicate = useCallback((item: { executablePath?: string; gameId?: string; title?: string }) => {
    if (!existingGames || existingGames.length === 0) return false;
    const itemExe = (item.executablePath || '').toLowerCase();
    const itemTitle = (item.title || '').trim().toLowerCase();
    return existingGames.some((g) => {
      if (item.gameId && (g.id === item.gameId || g.id === `steam-${item.gameId}`)) return true;
      if (itemExe && g.executablePath && g.executablePath.toLowerCase() === itemExe) return true;
      if (itemTitle && g.title.trim().toLowerCase() === itemTitle) return true;
      return false;
    });
  }, [existingGames]);

  // Smart Engine & Launch Arguments Detection for Standalone Form
  const detectedLaunchInfo = useMemo(() => {
    return LaunchArgumentsService.detectSmartPresets({
      title,
      executablePath: exePath,
      workingDirectory: workingDir
    });
  }, [title, exePath, workingDir]);

  if (!isOpen) return null;

  const handleAutoFetchArt = async () => {
    if (!title.trim()) return;
    setIsFetchingArt(true);
    try {
      const art = await ArtworkService.searchArtwork(title, { apiKeys });
      if (art) {
        audioEngine.playSelect();
        setCoverUrl(art.coverUrl);
        setBackdropUrl(art.backdropUrl);
        if (art.logoUrl) setLogoUrl(art.logoUrl);
      }
    } finally {
      setIsFetchingArt(false);
    }
  };

  // Standalone Pickers
  const handlePickExe = async () => {
    if (window.api?.pickExe) {
      const p = await window.api.pickExe();
      if (p) {
        setExePath(p);
        const fileName = p.split(/[/\\]/).pop() || '';
        const baseTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const cleanTitle = baseTitle.charAt(0).toUpperCase() + baseTitle.slice(1);
        if (!title) setTitle(cleanTitle);
        const dir = p.substring(0, Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')));
        setWorkingDir(dir);

        // Auto-detect version if available
        if (window.api?.getExeVersion) {
          window.api.getExeVersion(p).then((detectedVersion) => {
            if (detectedVersion) {
              setVersion(detectedVersion);
            }
          });
        }

        // Auto-fetch artwork and transparent logo right away
        setIsFetchingArt(true);
        ArtworkService.searchArtwork(cleanTitle, { apiKeys }).then(async (art) => {
          if (art) {
            setCoverUrl(art.coverUrl);
            setBackdropUrl(art.backdropUrl);
            if (art.logoUrl) setLogoUrl(art.logoUrl);
          }
        }).finally(() => {
          setIsFetchingArt(false);
        });
      }
    }
  };

  const handlePickCover = async () => {
    if (window.api?.pickImage) {
      const p = await window.api.pickImage();
      if (p) setCoverUrl(normalizeMediaUrl(p));
    }
  };

  const handlePickBackdrop = async () => {
    if (window.api?.pickImage) {
      const p = await window.api.pickImage();
      if (p) setBackdropUrl(normalizeMediaUrl(p));
    }
  };

  const handlePickLogo = async () => {
    if (window.api?.pickImage) {
      const p = await window.api.pickImage();
      if (p) setLogoUrl(normalizeMediaUrl(p));
    }
  };

  const handlePickAudio = async () => {
    if (window.api?.pickAudio) {
      const p = await window.api.pickAudio();
      if (p) setBgmUrl(normalizeMediaUrl(p));
    }
  };

  const handlePickVideo = async () => {
    if (window.api?.pickVideo) {
      const p = await window.api.pickVideo();
      if (p) setVideoUrl(normalizeMediaUrl(p));
    }
  };

  const handleAutoFetchVideo = async () => {
    if (!title.trim()) return;
    setIsDownloadingVideo(true);
    try {
      audioEngine.playHover();
      if (window.api?.downloadLiveWallpaper) {
        const dlRes = await window.api.downloadLiveWallpaper({
          title,
          gameId: 'temp-' + Date.now(),
          quality: '1080p',
          forceAmbient: true
        });
        if (dlRes.success && dlRes.localPath) {
          audioEngine.playSelect();
          setVideoUrl(dlRes.localPath);
          return;
        }
      }

      const liveWp = await ArtworkService.fetchLiveWallpaper(title, { quality: '1080p' });
      if (liveWp?.videoUrl) {
        audioEngine.playSelect();
        if (window.api?.downloadVideo) {
          const dlRes = await window.api.downloadVideo({
            url: liveWp.videoUrl,
            gameId: 'temp-' + Date.now(),
            title
          });
          if (dlRes.success && dlRes.localPath) {
            setVideoUrl(dlRes.localPath);
            return;
          }
        }
        setVideoUrl(liveWp.videoUrl);
      }
    } finally {
      setIsDownloadingVideo(false);
    }
  };

  const handleSaveStandalone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !exePath) return;

    audioEngine.playSelect();

    let finalCover = coverUrl;
    let finalBackdrop = backdropUrl;
    let finalLogo = logoUrl;

    if (!finalCover || !finalBackdrop || !finalLogo) {
      try {
        const art = await ArtworkService.searchArtwork(title, { apiKeys });
        if (art) {
          if (!finalCover) finalCover = art.coverUrl;
          if (!finalBackdrop) finalBackdrop = art.backdropUrl;
          if (!finalLogo && art.logoUrl) finalLogo = art.logoUrl;
        }
      } catch {
        // Fallback
      }
    }

    const fallbackCover = finalCover || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop';
    const fallbackBackdrop = finalBackdrop || fallbackCover;

    // Extract dynamic theme color from cover art
    const palette = await ThemeEngine.extractDominantColor(fallbackCover);

    const gameId = 'game-' + Date.now();
    let finalVideo = videoUrl;

    // Automatically search & download Full HD ambient live wallpaper if not manually chosen
    if (!finalVideo) {
      try {
        setSaveStatus('Downloading Full HD Ambient live wallpaper (60fps loop)...');
        if (window.api?.downloadLiveWallpaper) {
          const dlRes = await window.api.downloadLiveWallpaper({
            title,
            gameId,
            quality: '1080p',
            forceAmbient: true
          });
          if (dlRes.success && dlRes.localPath) {
            finalVideo = dlRes.localPath;
          }
        } else {
          const liveWp = await ArtworkService.fetchLiveWallpaper(title, { quality: '1080p' });
          if (liveWp?.videoUrl) {
            finalVideo = liveWp.videoUrl;
          }
        }
      } catch (e) {
        console.warn('Auto live wallpaper download failed:', e);
      }
    } else if (/^(https?:\/\/)/i.test(finalVideo) && window.api?.downloadVideo) {
      try {
        setSaveStatus('Downloading live wallpaper to local disk (offline)...');
        const dlRes = await window.api.downloadVideo({
          url: finalVideo,
          gameId,
          title
        });
        if (dlRes.success && dlRes.localPath) {
          finalVideo = dlRes.localPath;
        }
      } catch (e) {
        console.warn('Live wallpaper download error:', e);
      }
    }

    const newGame: Game = {
      id: gameId,
      title,
      version: version.trim() || undefined,
      executablePath: exePath,
      workingDirectory: workingDir,
      launchArguments: args,
      type: 'standalone',
      coverUrl: fallbackCover,
      backdropUrl: fallbackBackdrop,
      videoUrl: finalVideo || undefined,
      description: description || 'Custom standalone game executable.',
      quote: QuotesService.getQuoteForGame(title) || undefined,
      genres: genreText.split(',').map((g) => g.trim()).filter(Boolean),
      tags: ['Standalone', 'Local'],
      favorite: false,
      theme: {
        accentColor: palette.accent,
        glowColor: palette.glow,
        badgeColor: palette.accent,
        logoUrl: finalLogo || undefined
      },
      audio: {
        bgmUrl: bgmUrl || undefined,
        bgmVolume: 0.5
      },
      stats: {
        playtimeMinutes: 0,
        playCount: 0
      }
    };

    setSaveStatus('');
    onAddGame(newGame);
    onClose();
  };

  // Folder Scanner Handlers (Support Multiple Locations & Background Queue)
  const handleAddFolderLocation = async () => {
    if (!window.api?.pickFolder) return;
    const picked = await window.api.pickFolder({ multi: true });
    if (!picked) return;
    const newPaths = Array.isArray(picked) ? picked : [picked];
    setScannedFolderPaths((prev) => {
      const combined = [...prev];
      for (const p of newPaths) {
        if (!combined.includes(p)) combined.push(p);
      }
      return combined;
    });
    audioEngine.playSelect();
  };

  const handleAddManualFolder = () => {
    const trimmed = customFolderInput.trim();
    if (!trimmed) return;
    if (!scannedFolderPaths.includes(trimmed)) {
      setScannedFolderPaths((prev) => [...prev, trimmed]);
      setCustomFolderInput('');
      audioEngine.playSelect();
    }
  };

  const handleRemoveFolderLocation = (dirToRemove: string) => {
    setScannedFolderPaths((prev) => prev.filter((p) => p !== dirToRemove));
    audioEngine.playHover();
  };

  const handleScanFolders = async (foldersToScan?: string[]) => {
    const targets = foldersToScan || scannedFolderPaths;
    if (!targets || targets.length === 0) {
      // Prompt user to pick if none configured
      await handleAddFolderLocation();
      return;
    }

    if (!window.api?.scanFolder) return;
    setIsScanning(true);
    audioEngine.playHover();
    try {
      const results = await window.api.scanFolder(targets, { smartFilter });
      setScannedGames(results);
      const nonDupes = results.filter((r) => !isDuplicate(r));
      setSelectedScanItems(new Set(nonDupes.map((r) => r.executablePath)));
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleSmartFilter = async (enabled: boolean) => {
    setSmartFilter(enabled);
    if (scannedFolderPaths.length > 0 && window.api?.scanFolder) {
      setIsScanning(true);
      try {
        const results = await window.api.scanFolder(scannedFolderPaths, { smartFilter: enabled });
        setScannedGames(results);
        const nonDupes = results.filter((r) => !isDuplicate(r));
        setSelectedScanItems(new Set(nonDupes.map((r) => r.executablePath)));
      } finally {
        setIsScanning(false);
      }
    }
  };

  // Background Async Batch Import for Local Scanned Games
  const handleImportScanned = async () => {
    const toImport = scannedGames.filter((g) => selectedScanItems.has(g.executablePath));
    if (toImport.length === 0) return;

    audioEngine.playSelect();

    const queueItems: ImportQueueItem[] = toImport.map((item, i) => ({
      id: `scan-${Date.now()}-${i}`,
      title: item.title,
      sourceType: 'standalone',
      platformName: 'Local Game',
      executablePath: item.executablePath,
      directory: item.directory,
      version: item.version
    }));

    // Trigger background import task in global store
    useImportStore.getState().startBatchImport(queueItems, {
      apiKeys,
      onGameImported: (newGame) => {
        onAddGame(newGame);
      },
      onAllCompleted: (games) => {
        onAddBatchGames?.(games);
      }
    });

    // Close modal immediately so user can explore library while import runs in background!
    onClose();
  };

  // Multi-Platform Scanner Handlers
  const handleScanPlatforms = async (target?: PlatformId) => {
    if (!window.api?.scanPlatformGames) return;
    setIsPlatformScanning(true);
    audioEngine.playHover();
    try {
      const results = await window.api.scanPlatformGames(target);
      setPlatformGames(results);
      const nonDupes = results.filter((r) => !isDuplicate(r));
      setSelectedPlatformItems(new Set(nonDupes.map((r) => r.gameId)));
    } catch (err) {
      console.warn('Failed to scan platform games:', err);
    } finally {
      setIsPlatformScanning(false);
    }
  };

  const handleImportSinglePlatformGame = async (pg: DetectedPlatformGame) => {
    audioEngine.playSelect();

    let cover = pg.headerUrl || '';
    let backdrop = pg.backdropUrl || '';
    let logo = pg.logoUrl;

    if (!cover) {
      try {
        const art = await ArtworkService.searchArtwork(pg.title, { apiKeys });
        if (art) {
          cover = art.coverUrl;
          backdrop = art.backdropUrl;
          if (art.logoUrl) logo = art.logoUrl;
        }
      } catch {}
    }

    if (!cover) {
      cover = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop';
      backdrop = cover;
    }

    const palette = await ThemeEngine.extractDominantColor(cover);

    let videoUrl: string | undefined = undefined;
    try {
      if (window.api?.downloadLiveWallpaper) {
        const dlRes = await window.api.downloadLiveWallpaper({
          title: pg.title,
          gameId: pg.gameId,
          quality: '1080p',
          forceAmbient: true
        });
        if (dlRes.success && dlRes.localPath) {
          videoUrl = dlRes.localPath;
        }
      }
    } catch {}

    const platformGenre = pg.platformName || 'PC';

    const newGame: Game = {
      id: pg.gameId,
      title: pg.title,
      version: pg.version,
      executablePath: pg.executablePath,
      workingDirectory: pg.installDir || undefined,
      type: pg.platformId,
      coverUrl: cover,
      backdropUrl: backdrop || cover,
      videoUrl: videoUrl || undefined,
      description: `Installed ${pg.platformName} title (${pg.title}).`,
      quote: QuotesService.getQuoteForGame(pg.title) || undefined,
      genres: [platformGenre, 'Action'],
      tags: [pg.platformName, 'Imported'],
      favorite: false,
      theme: {
        accentColor: palette.accent,
        glowColor: palette.glow,
        logoUrl: logo
      },
      stats: {
        playtimeMinutes: 0,
        playCount: 0
      }
    };

    onAddGame(newGame);
    setPlatformGames((prev) => prev.filter((g) => g.gameId !== pg.gameId));
    setSelectedPlatformItems((prev) => {
      const next = new Set(prev);
      next.delete(pg.gameId);
      return next;
    });
  };

  const handleImportBatchPlatformGames = async () => {
    const toImport = platformGames.filter((g) => selectedPlatformItems.has(g.gameId));
    if (toImport.length === 0) return;

    audioEngine.playSelect();

    const queueItems: ImportQueueItem[] = toImport.map((pg) => ({
      id: pg.gameId,
      title: pg.title,
      sourceType: pg.platformId,
      platformName: pg.platformName,
      executablePath: pg.executablePath,
      directory: pg.installDir,
      version: pg.version,
      headerUrl: pg.headerUrl,
      backdropUrl: pg.backdropUrl,
      logoUrl: pg.logoUrl
    }));

    useImportStore.getState().startBatchImport(queueItems, {
      apiKeys,
      onGameImported: (newGame) => {
        onAddGame(newGame);
      }
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-[#0c101b] border border-white/15 shadow-2xl overflow-hidden animate-modalIn transform-gpu will-change-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header & Tabs */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--game-accent)] flex items-center justify-center text-black">
              <Plus className="w-5 h-5 font-bold" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">Add Games to Library</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-6 pt-3 gap-2 border-b border-white/5 bg-black/20 overflow-x-auto">
          <button
            onClick={() => {
              setTab('platforms');
              if (platformGames.length === 0) handleScanPlatforms();
            }}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'platforms'
                ? 'bg-white/10 text-[var(--game-accent)] border-b-2 border-[var(--game-accent)]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Launcher Libraries</span>
          </button>

          <button
            onClick={() => setTab('standalone')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'standalone'
                ? 'bg-white/10 text-[var(--game-accent)] border-b-2 border-[var(--game-accent)]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Standalone .EXE</span>
          </button>

          <button
            onClick={() => setTab('folderScan')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'folderScan'
                ? 'bg-white/10 text-[var(--game-accent)] border-b-2 border-[var(--game-accent)]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Folder Auto-Scanner</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: STANDALONE FORM */}
          {tab === 'standalone' && (
            <form onSubmit={handleSaveStandalone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Executable File (.exe, .bat, .lnk)*</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={exePath}
                    onChange={(e) => setExePath(e.target.value)}
                    placeholder="C:\Games\MyGame\game.exe"
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--game-accent)]"
                  />
                  <button
                    type="button"
                    onClick={handlePickExe}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-pill text-xs font-medium text-white/90 hover:bg-white/15"
                  >
                    <Folder className="w-4 h-4 text-[var(--game-accent)]" />
                    <span>Browse</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-white/70">Game Title*</label>
                    {title.trim() && (
                      <button
                        type="button"
                        onClick={handleAutoFetchArt}
                        disabled={isFetchingArt}
                        className="flex items-center gap-1 text-[10px] text-[var(--game-accent)] hover:underline font-bold cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{isFetchingArt ? 'Fetching Art...' : 'Auto-Fetch Art'}</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Hades II"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--game-accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">Game Version (optional)</label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g. v1.0.4 (auto-detected on browse)"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--game-accent)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">Genres (comma separated)</label>
                  <input
                    type="text"
                    value={genreText}
                    onChange={(e) => setGenreText(e.target.value)}
                    placeholder="Action, Roguelike, Indie"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--game-accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">Launch Arguments (optional)</label>
                  <input
                    type="text"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    placeholder="-fullscreen -novid"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--game-accent)]"
                  />
                </div>
              </div>

              {/* Artwork pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">Cover Poster (URL or File)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      placeholder="https://... or file"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--game-accent)]"
                    />
                    <button
                      type="button"
                      onClick={handlePickCover}
                      className="p-2 rounded-xl glass-pill text-white hover:bg-white/15 cursor-pointer flex-shrink-0"
                    >
                      <Image className="w-4 h-4 text-[var(--game-accent)]" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1">Cinematic Backdrop (URL or File)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={backdropUrl}
                      onChange={(e) => setBackdropUrl(e.target.value)}
                      placeholder="https://... or file"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--game-accent)]"
                    />
                    <button
                      type="button"
                      onClick={handlePickBackdrop}
                      className="p-2 rounded-xl glass-pill text-white hover:bg-white/15 cursor-pointer flex-shrink-0"
                    >
                      <Image className="w-4 h-4 text-[var(--game-accent)]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stylized Logo */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Stylized Transparent Title Logo (PNG or URL)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://.../logo.png or pick file"
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--game-accent)]"
                  />
                  <button
                    type="button"
                    onClick={handlePickLogo}
                    className="p-2 rounded-xl glass-pill text-white hover:bg-white/15 cursor-pointer flex-shrink-0"
                  >
                    <Sparkles className="w-4 h-4 text-[var(--game-accent)]" />
                  </button>
                </div>
              </div>

              {/* Looping Scene Video */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-white/70">
                    Looping Scene Video (MP4 / WebM) <span className="text-white/40 font-normal">(Full HD live wallpaper)</span>
                  </label>
                  {videoUrl && (
                    <span className="text-[10px] font-bold text-[var(--game-accent)]">✓ Live Scene Attached</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Local video path or direct URL (e.g. file:///...)"
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--game-accent)]"
                  />
                  <button
                    type="button"
                    onClick={handleAutoFetchVideo}
                    disabled={isDownloadingVideo || !title.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-pill text-xs font-semibold text-[var(--game-accent)] hover:bg-white/15 cursor-pointer flex-shrink-0 disabled:opacity-40"
                    title="Search & Download 1080p Live Wallpaper from Steam"
                  >
                    {isDownloadingVideo ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>{isDownloadingVideo ? 'Downloading...' : 'Auto-Fetch Live'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePickVideo}
                    className="p-2 rounded-xl glass-pill text-white hover:bg-white/15 cursor-pointer flex-shrink-0"
                    title="Browse local MP4/WebM video"
                  >
                    <Film className="w-4 h-4 text-[var(--game-accent)]" />
                  </button>
                </div>
                {videoUrl && (
                  <div className="mt-2 relative rounded-xl overflow-hidden h-24 border border-[var(--game-accent)]/30 bg-black/60">
                    <video
                      src={normalizeMediaUrl(videoUrl)}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/80 px-2 py-0.5 rounded text-[9px] text-[var(--game-accent)] font-bold">
                      <Film className="w-3 h-3" />
                      <span>OFFLINE LIVE SCENE READY</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Audio */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">OST Theme Music (MP3 / WAV / OGG)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bgmUrl}
                    onChange={(e) => setBgmUrl(e.target.value)}
                    placeholder="Local audio file or URL"
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--game-accent)]"
                  />
                  <button
                    type="button"
                    onClick={handlePickAudio}
                    className="p-2 rounded-xl glass-pill text-white hover:bg-white/15 cursor-pointer flex-shrink-0"
                  >
                    <Music className="w-4 h-4 text-[var(--game-accent)]" />
                  </button>
                </div>
              </div>

              {/* Launch Arguments with Smart Auto-Detected Presets */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[var(--game-accent)]" />
                    <label className="text-xs font-bold text-white uppercase tracking-wider">
                      Launch Arguments
                    </label>
                  </div>
                  {detectedLaunchInfo && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--game-accent)]/15 text-[var(--game-accent)] border border-[var(--game-accent)]/30 font-semibold">
                      ⚡ Detected: {detectedLaunchInfo.engineName}
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="e.g. -fullscreen -novid --launcher-skip"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-[var(--game-accent)]"
                />

                {/* Smart Preset Chips */}
                {detectedLaunchInfo?.recommendedPresets && detectedLaunchInfo.recommendedPresets.length > 0 && (
                  <div>
                    <span className="text-[10px] text-white/50 block mb-1.5 font-medium">
                      Recommended presets for {detectedLaunchInfo.engineName} (click to toggle):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {detectedLaunchInfo.recommendedPresets.map((preset) => {
                        const isApplied = args.includes(preset.arg);
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              audioEngine.playSelect();
                              if (isApplied) {
                                setArgs(LaunchArgumentsService.removeArgument(args, preset.arg));
                              } else {
                                setArgs(LaunchArgumentsService.appendArgument(args, preset.arg));
                              }
                            }}
                            title={preset.description}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              isApplied
                                ? 'bg-[var(--game-accent)] text-black shadow-sm'
                                : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white border border-white/10'
                            }`}
                          >
                            <span>{preset.label}</span>
                            <span className="text-[9px] opacity-75">({preset.arg})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Description (optional)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short notes or synopsis..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--game-accent)] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  {saveStatus && (
                    <div className="flex items-center gap-2 text-xs text-[var(--game-accent)] animate-pulse font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{saveStatus}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl glass-pill text-xs font-semibold text-white/70 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!!saveStatus}
                    className="px-6 py-2 rounded-xl bg-[var(--game-accent)] text-black text-xs font-extrabold shadow-lg hover:brightness-110 cursor-pointer disabled:opacity-50"
                  >
                    Save & Add Game
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: FOLDER SCANNER */}
          {tab === 'folderScan' && (
            <div className="space-y-4">
              {/* Multi-Location Management Box */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-[var(--game-accent)]" />
                      <span>Scan Game Folders</span>
                    </h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      Select one or multiple directories across any hard drive to search for games
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddFolderLocation}
                      disabled={isScanning}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-[var(--game-accent)]" />
                      <span>Add Folder</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScanFolders()}
                      disabled={isScanning || scannedFolderPaths.length === 0}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--game-accent)] text-black text-xs font-extrabold hover:brightness-110 disabled:opacity-50 cursor-pointer shadow-md transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                      <span>{isScanning ? 'Scanning...' : 'Scan All Folders'}</span>
                    </button>
                  </div>
                </div>

                {/* Manual Path Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customFolderInput}
                    onChange={(e) => setCustomFolderInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddManualFolder();
                      }
                    }}
                    placeholder="Or type/paste folder path (e.g. D:\Games or E:\SteamLibrary\steamapps\common)..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 text-xs text-white placeholder-white/30 focus:border-[var(--game-accent)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualFolder}
                    disabled={!customFolderInput.trim()}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Add Path
                  </button>
                </div>

                {/* List of configured scan locations */}
                {scannedFolderPaths.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                      Selected Folders ({scannedFolderPaths.length})
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                      {scannedFolderPaths.map((dir) => (
                        <div
                          key={dir}
                          className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 text-xs text-white/80 group"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <Folder className="w-3.5 h-3.5 text-[var(--game-accent)] flex-shrink-0" />
                            <span className="truncate font-mono text-[11px]">{dir}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFolderLocation(dir)}
                            title="Remove folder"
                            className="text-white/40 hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-2 px-3 rounded-xl bg-white/5 border border-dashed border-white/10 text-xs text-white/40 text-center">
                    No folders selected yet. Click "Add Folder" or paste a path above to begin scanning.
                  </div>
                )}
              </div>

              {/* Filter controls */}
              <div className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl border border-white/10 text-xs">
                <label className="flex items-center gap-2 text-white/80 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={smartFilter}
                    onChange={(e) => handleToggleSmartFilter(e.target.checked)}
                    className="w-4 h-4 rounded accent-[var(--game-accent)] cursor-pointer"
                  />
                  <span>Smart Game Filter <span className="text-white/40">(Filters out helper/setup executables)</span></span>
                </label>

                {scannedGames.length > 0 && (
                  <button
                    onClick={handleImportScanned}
                    disabled={selectedScanItems.size === 0}
                    className="px-4 py-1.5 rounded-xl bg-[var(--game-accent)] text-black font-bold hover:brightness-110 disabled:opacity-50 cursor-pointer transition-all shadow-sm"
                  >
                    Import Selected ({selectedScanItems.size})
                  </button>
                )}
              </div>

              {scannedGames.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs text-white/60 px-1">
                    Found <span className="text-white font-bold">{scannedGames.length}</span> {smartFilter ? 'main game titles' : 'executables'}
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {scannedGames.map((item) => {
                      const isChecked = selectedScanItems.has(item.executablePath);
                      const isDupe = isDuplicate(item);
                      return (
                        <div
                          key={item.executablePath}
                          onClick={() => {
                            const next = new Set(selectedScanItems);
                            if (isChecked) next.delete(item.executablePath);
                            else next.add(item.executablePath);
                            setSelectedScanItems(next);
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-[var(--game-accent)]/10 border-[var(--game-accent)]/40 text-white'
                              : isDupe
                              ? 'bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/5 opacity-75'
                              : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs">{item.title}</span>
                              {isDupe && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider">
                                  In Library
                                </span>
                              )}
                              {item.version && (
                                <span className="px-1.5 py-0.5 rounded bg-[var(--game-accent)]/20 text-[var(--game-accent)] text-[10px] font-mono font-bold">
                                  {item.version.startsWith('v') || item.version.startsWith('V') ? item.version : `v${item.version}`}
                                </span>
                              )}
                              {item.sizeMB && (
                                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/70 font-mono">
                                  {item.sizeMB} MB
                                </span>
                              )}
                              {smartFilter && (
                                <span className="px-1.5 py-0.5 rounded bg-[var(--game-accent)]/20 text-[var(--game-accent)] text-[9px] font-bold uppercase">
                                  Game
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-white/40 truncate max-w-md mt-0.5">{item.executablePath}</div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center ${
                              isChecked ? 'bg-[var(--game-accent)] text-black font-bold' : 'border border-white/20'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}



          {/* TAB 4: MULTI-PLATFORM SCANNER (Steam, Epic, GOG, Ubisoft, EA) */}
          {tab === 'platforms' && (
            <div className="space-y-4">
              {/* Header Box */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[var(--game-accent)]" />
                    <span>Auto-Detect Platform Games</span>
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Scans Steam, Epic Games, GOG Galaxy, Ubisoft Connect, and EA App across all drives
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleScanPlatforms(platformFilter === 'all' ? undefined : platformFilter)}
                    disabled={isPlatformScanning}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--game-accent)] text-black text-xs font-extrabold hover:brightness-110 disabled:opacity-50 cursor-pointer shadow-md transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPlatformScanning ? 'animate-spin' : ''}`} />
                    <span>{isPlatformScanning ? 'Scanning...' : 'Scan Now'}</span>
                  </button>
                </div>
              </div>

              {/* Platform Selector Filter Chips */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 pb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(
                    [
                      { id: 'all', label: 'All Platforms' },
                      { id: 'steam', label: 'Steam' },
                      { id: 'epic', label: 'Epic Games' },
                      { id: 'gog', label: 'GOG Galaxy' },
                      { id: 'ubisoft', label: 'Ubisoft Connect' },
                      { id: 'ea', label: 'EA App' }
                    ] as const
                  ).map((p) => {
                    const isSelected = platformFilter === p.id;
                    const count =
                      p.id === 'all'
                        ? platformGames.length
                        : platformGames.filter((g) => g.platformId === p.id).length;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPlatformFilter(p.id);
                          audioEngine.playHover();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[var(--game-accent)] text-black shadow-sm'
                            : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span>{p.label}</span>
                        {platformGames.length > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                              isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-white/70'
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {platformGames.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const filtered =
                          platformFilter === 'all'
                            ? platformGames
                            : platformGames.filter((g) => g.platformId === platformFilter);
                        const allSelected = filtered.every((g) => selectedPlatformItems.has(g.gameId));
                        const next = new Set(selectedPlatformItems);
                        if (allSelected) {
                          filtered.forEach((g) => next.delete(g.gameId));
                        } else {
                          filtered.forEach((g) => next.add(g.gameId));
                        }
                        setSelectedPlatformItems(next);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-white/60 hover:text-white cursor-pointer"
                    >
                      Toggle All
                    </button>
                    <button
                      type="button"
                      onClick={handleImportBatchPlatformGames}
                      disabled={selectedPlatformItems.size === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--game-accent)] text-black text-xs font-bold hover:brightness-110 disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {`Import Selected (${selectedPlatformItems.size})`}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Games List */}
              {platformGames.length > 0 ? (
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {platformGames
                    .filter((g) => platformFilter === 'all' || g.platformId === platformFilter)
                    .map((pg) => {
                      const isChecked = selectedPlatformItems.has(pg.gameId);
                      const isDupe = isDuplicate({ gameId: pg.gameId, title: pg.title, executablePath: pg.executablePath });
                      const platformBadgeColor =
                        pg.platformId === 'steam'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : pg.platformId === 'epic'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : pg.platformId === 'gog'
                          ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                          : pg.platformId === 'ubisoft'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          : 'bg-red-500/20 text-red-300 border-red-500/30';

                      return (
                        <div
                          key={pg.gameId}
                          onClick={() => {
                            const next = new Set(selectedPlatformItems);
                            if (isChecked) next.delete(pg.gameId);
                            else next.add(pg.gameId);
                            setSelectedPlatformItems(next);
                          }}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-[var(--game-accent)]/10 border-[var(--game-accent)]/40 text-white'
                              : isDupe
                              ? 'bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/5 opacity-75'
                              : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {pg.headerUrl ? (
                              <img
                                src={pg.headerUrl}
                                alt={pg.title}
                                className="w-14 h-9 object-cover rounded-lg flex-shrink-0 bg-black/40 border border-white/10"
                              />
                            ) : (
                              <div className="w-14 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                <Gamepad2 className="w-5 h-5 text-white/30" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-white truncate max-w-xs">{pg.title}</span>
                                {isDupe && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider">
                                    In Library
                                  </span>
                                )}
                                <span
                                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border uppercase tracking-wider ${platformBadgeColor}`}
                                >
                                  {pg.platformName}
                                </span>
                                {pg.version && (
                                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/70 font-mono">
                                    {pg.version}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-white/40 truncate max-w-sm mt-0.5">
                                {pg.installDir || pg.executablePath}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImportSinglePlatformGame(pg);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-[var(--game-accent)] hover:text-black text-white text-xs font-bold transition-all cursor-pointer"
                            >
                              Import
                            </button>

                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                                isChecked ? 'bg-[var(--game-accent)] text-black font-bold' : 'border border-white/20'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                !isPlatformScanning && (
                  <div className="py-10 text-center rounded-2xl bg-white/5 border border-dashed border-white/10">
                    <Layers className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <p className="text-xs text-white/60 font-semibold">No platform games detected yet</p>
                    <p className="text-[11px] text-white/40 max-w-xs mx-auto mt-1">
                      Click &ldquo;Scan Now&rdquo; to automatically detect games installed via Steam, Epic Games, GOG, Ubisoft, or EA App.
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
