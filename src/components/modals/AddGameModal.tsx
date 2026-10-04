import React, { useState } from 'react';
import { X, Folder, Image, Music, HardDrive, RefreshCw, Check, Plus, Gamepad2, Sparkles, Film, Loader2 } from 'lucide-react';
import type { Game, FolderScanResult, SteamGameInfo, ProviderApiKeys } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { ThemeEngine } from '../../services/themeEngine';
import { ArtworkService } from '../../services/artworkService';
import { QuotesService } from '../../services/quotesService';
import { normalizeMediaUrl } from '../../utils/mediaUrl';

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGame: (game: Game) => void;
  onAddBatchGames: (games: Game[]) => void;
  apiKeys?: ProviderApiKeys;
}

export const AddGameModal: React.FC<AddGameModalProps> = ({
  isOpen,
  onClose,
  onAddGame,
  onAddBatchGames,
  apiKeys
}) => {
  const [tab, setTab] = useState<'standalone' | 'folderScan' | 'steam'>('standalone');

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

  // Scanner State
  const [scannedGames, setScannedGames] = useState<FolderScanResult[]>([]);
  const [selectedScanItems, setSelectedScanItems] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [smartFilter, setSmartFilter] = useState(true);
  const [scannedFolderPath, setScannedFolderPath] = useState('');

  // Steam State
  const [steamGames, setSteamGames] = useState<SteamGameInfo[]>([]);
  const [isSteamScanning, setIsSteamScanning] = useState(false);
  const [isFetchingArt, setIsFetchingArt] = useState(false);
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

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

  // Folder Scanner Handler
  const handleSelectFolderAndScan = async () => {
    if (!window.api?.pickFolder || !window.api?.scanFolder) return;
    const folder = await window.api.pickFolder();
    if (!folder) return;

    setScannedFolderPath(folder);
    setIsScanning(true);
    try {
      const results = await window.api.scanFolder(folder, { smartFilter });
      setScannedGames(results);
      setSelectedScanItems(new Set(results.map((r) => r.executablePath)));
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleSmartFilter = async (enabled: boolean) => {
    setSmartFilter(enabled);
    if (scannedFolderPath && window.api?.scanFolder) {
      setIsScanning(true);
      try {
        const results = await window.api.scanFolder(scannedFolderPath, { smartFilter: enabled });
        setScannedGames(results);
        setSelectedScanItems(new Set(results.map((r) => r.executablePath)));
      } finally {
        setIsScanning(false);
      }
    }
  };

  const handleImportScanned = async () => {
    const toImport = scannedGames.filter((g) => selectedScanItems.has(g.executablePath));
    if (toImport.length === 0) return;

    audioEngine.playSelect();

    const newGames: Game[] = await Promise.all(
      toImport.map(async (item, i) => {
        let cover = '';
        let backdrop = '';
        let logo: string | undefined = undefined;

        try {
          const art = await ArtworkService.searchArtwork(item.title, { apiKeys });
          if (art) {
            cover = art.coverUrl;
            backdrop = art.backdropUrl;
            logo = art.logoUrl;
          }
        } catch {
          // Fallback
        }

        if (!cover) {
          cover = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=800&auto=format&fit=crop';
          backdrop = cover;
        }

        const palette = await ThemeEngine.extractDominantColor(cover);
        const gameId = `scan-${Date.now()}-${i}`;
        let videoUrl: string | undefined = undefined;

        try {
          const liveWp = await ArtworkService.fetchLiveWallpaper(item.title, { quality: '1080p' });
          if (liveWp?.videoUrl) {
            if (window.api?.downloadVideo) {
              const dlRes = await window.api.downloadVideo({
                url: liveWp.videoUrl,
                gameId,
                title: item.title
              });
              if (dlRes.success && dlRes.localPath) {
                videoUrl = dlRes.localPath;
              } else {
                videoUrl = liveWp.videoUrl;
              }
            } else {
              videoUrl = liveWp.videoUrl;
            }
          }
        } catch {}

        return {
          id: gameId,
          title: item.title,
          version: item.version,
          executablePath: item.executablePath,
          workingDirectory: item.directory,
          type: 'standalone',
          coverUrl: cover,
          backdropUrl: backdrop || cover,
          videoUrl: videoUrl || undefined,
          quote: QuotesService.getQuoteForGame(item.title) || undefined,
          genres: ['Indie', 'Standalone'],
          tags: ['Scanned'],
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
      })
    );

    onAddBatchGames(newGames);
    onClose();
  };

  // Steam Scanner Handler
  const handleScanSteam = async () => {
    if (!window.api?.scanSteam) return;
    setIsSteamScanning(true);
    try {
      const games = await window.api.scanSteam();
      setSteamGames(games);
    } finally {
      setIsSteamScanning(false);
    }
  };

  const handleImportSteam = async (sg: SteamGameInfo) => {
    audioEngine.playSelect();

    let cover = sg.headerUrl;
    let backdrop = sg.backdropUrl;
    let logo = sg.logoUrl;
    const gameId = `steam-${sg.appId}`;

    if (window.api?.downloadSteamAssets) {
      try {
        const localAssets = await window.api.downloadSteamAssets(sg.appId);
        if (localAssets.coverUrl) cover = localAssets.coverUrl;
        if (localAssets.backdropUrl) backdrop = localAssets.backdropUrl;
        if (localAssets.logoUrl) logo = localAssets.logoUrl;
      } catch {
        // Fallback
      }
    }

    let videoUrl: string | undefined = undefined;
    try {
      if (window.api?.downloadLiveWallpaper) {
        const dlRes = await window.api.downloadLiveWallpaper({
          title: sg.title,
          gameId,
          quality: '1080p',
          forceAmbient: true
        });
        if (dlRes.success && dlRes.localPath) {
          videoUrl = dlRes.localPath;
        }
      }
      if (!videoUrl) {
        const liveWp = await ArtworkService.fetchLiveWallpaper(sg.title, { quality: '1080p' });
        if (liveWp?.videoUrl) {
          videoUrl = liveWp.videoUrl;
        }
      }
    } catch {}

    const palette = await ThemeEngine.extractDominantColor(cover);

    const newGame: Game = {
      id: gameId,
      title: sg.title,
      executablePath: `steam://run/${sg.appId}`,
      workingDirectory: sg.installDir,
      type: 'steam',
      coverUrl: cover,
      backdropUrl: backdrop,
      videoUrl: videoUrl || undefined,
      description: `Installed Steam game (${sg.title}).`,
      quote: QuotesService.getQuoteForGame(sg.title) || undefined,
      genres: ['Steam', 'PC'],
      tags: ['Steam'],
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
    // Remove from local list to indicate imported
    setSteamGames((prev) => prev.filter((g) => g.appId !== sg.appId));
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
        <div className="flex px-6 pt-3 gap-2 border-b border-white/5 bg-black/20">
          <button
            onClick={() => setTab('standalone')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer ${
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
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer ${
              tab === 'folderScan'
                ? 'bg-white/10 text-[var(--game-accent)] border-b-2 border-[var(--game-accent)]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Folder Auto-Scanner</span>
          </button>

          <button
            onClick={() => setTab('steam')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer ${
              tab === 'steam'
                ? 'bg-white/10 text-[var(--game-accent)] border-b-2 border-[var(--game-accent)]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Steam Discovery</span>
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
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <h3 className="text-sm font-bold text-white">Scan Games Directory</h3>
                  <p className="text-xs text-white/50">Point to any folder containing game executables (e.g. D:\Games)</p>
                </div>
                <button
                  onClick={handleSelectFolderAndScan}
                  disabled={isScanning}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--game-accent)] text-black text-xs font-bold hover:brightness-110 disabled:opacity-50"
                >
                  <Folder className="w-4 h-4" />
                  <span>{isScanning ? 'Scanning...' : 'Select Folder'}</span>
                </button>
              </div>

              {/* Filter controls */}
              <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded-xl border border-white/10 text-xs">
                <label className="flex items-center gap-2 text-white/80 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={smartFilter}
                    onChange={(e) => handleToggleSmartFilter(e.target.checked)}
                    className="w-4 h-4 rounded accent-[var(--game-accent)] cursor-pointer"
                  />
                  <span>Smart Game Filter <span className="text-white/40">(Primary Game Executables Only)</span></span>
                </label>

                {scannedGames.length > 0 && (
                  <button
                    onClick={handleImportScanned}
                    className="px-4 py-1.5 rounded-xl bg-[var(--game-accent)] text-black font-bold hover:brightness-110 cursor-pointer"
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
                              : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs">{item.title}</span>
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

          {/* TAB 3: STEAM DISCOVERY */}
          {tab === 'steam' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <h3 className="text-sm font-bold text-white">Auto-Discover Steam Games</h3>
                  <p className="text-xs text-white/50">Finds locally installed games from your Steam libraries</p>
                </div>
                <button
                  onClick={handleScanSteam}
                  disabled={isSteamScanning}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--game-accent)] text-black text-xs font-bold hover:brightness-110 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSteamScanning ? 'animate-spin' : ''}`} />
                  <span>{isSteamScanning ? 'Scanning...' : 'Scan Steam'}</span>
                </button>
              </div>

              {steamGames.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>Discovered {steamGames.length} installed Steam games</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {steamGames.map((sg) => (
                      <div
                        key={sg.appId}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={sg.headerUrl}
                            alt={sg.title}
                            className="w-16 h-8 object-cover rounded-md flex-shrink-0"
                          />
                          <div>
                            <div className="font-bold text-xs text-white truncate max-w-sm">{sg.title}</div>
                            <div className="text-[10px] text-white/40">AppID: {sg.appId}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleImportSteam(sg)}
                          className="px-3 py-1.5 rounded-xl bg-[var(--game-accent)] text-black text-xs font-bold hover:brightness-110"
                        >
                          Import
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
