import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Palette, Image, Music, Sparkles, RefreshCw, Check, Volume2, Trash2, Film, Tag, Bookmark, Shield, Loader2, Compass, Quote, Dices } from 'lucide-react';
import type { Game, GameCollection, GameVibe, ProviderApiKeys } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { ThemeEngine, GAME_VIBES } from '../../services/themeEngine';
import { ArtworkService } from '../../services/artworkService';
import { QuotesService } from '../../services/quotesService';
import { normalizeMediaUrl } from '../../utils/mediaUrl';

interface EditThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game | null;
  onSaveGame: (updatedGame: Game) => void;
  onRequestRemoveGame?: (game: Game) => void;
  onRemoveGame?: (gameId: string) => void;
  apiKeys?: ProviderApiKeys;
}

export const EditThemeModal: React.FC<EditThemeModalProps> = ({
  isOpen,
  onClose,
  game,
  onSaveGame,
  onRequestRemoveGame,
  onRemoveGame,
  apiKeys
}) => {
  const [backdropUrl, setBackdropUrl] = useState(() => game?.backdropUrl || game?.coverUrl || '');
  const [coverUrl, setCoverUrl] = useState(() => game?.coverUrl || '');
  const [logoUrl, setLogoUrl] = useState(() => game?.theme?.logoUrl || '');
  const [videoUrl, setVideoUrl] = useState(() => game?.videoUrl || '');
  const [accentColor, setAccentColor] = useState(() => game?.theme?.accentColor || '#2ee5ba');
  const [glowColor, setGlowColor] = useState(() => game?.theme?.glowColor || 'rgba(46, 229, 186, 0.45)');
  const [bgmUrl, setBgmUrl] = useState(() => game?.audio?.bgmUrl || '');
  const [bgmVolume, setBgmVolume] = useState(() => game?.audio?.bgmVolume ?? 0.5);
  const [version, setVersion] = useState(() => game?.version || '');
  const [collection, setCollection] = useState<GameCollection>(() => game?.collection || 'none');
  const [runAsAdmin, setRunAsAdmin] = useState(() => game?.compatibility?.runAsAdmin || false);
  const [displayMode, setDisplayMode] = useState<'fullscreen' | 'windowed' | 'borderless'>(() => game?.compatibility?.displayMode || 'fullscreen');
  const [directX, setDirectX] = useState<'default' | 'dx11' | 'dx12' | 'vulkan'>(() => game?.compatibility?.directX || 'default');
  const [resolution, setResolution] = useState(() => game?.compatibility?.resolution || '');
  const [launchArgs, setLaunchArgs] = useState(() => game?.launchArguments || '');
  const [isDetectingVersion, setIsDetectingVersion] = useState(false);
  const [isFetchingArt, setIsFetchingArt] = useState(false);
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
  const [videoStatusMessage, setVideoStatusMessage] = useState('');
  const [sceneQuery, setSceneQuery] = useState('');
  const [vibe, setVibe] = useState<GameVibe>(() => game?.theme?.vibe || 'auto');
  const [quoteText, setQuoteText] = useState(() => game?.quote?.text || '');
  const [quoteSpeaker, setQuoteSpeaker] = useState(() => game?.quote?.speaker || '');
  const [isExtractingColors, setIsExtractingColors] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const prevGameIdRef = useRef(game?.id);

  const detectedVibe = useMemo(() => {
    return ThemeEngine.detectGameVibe(game);
  }, [game]);

  useEffect(() => {
    let isMounted = true;
    if (game && game.id !== prevGameIdRef.current && isMounted) {
      prevGameIdRef.current = game.id;
      setBackdropUrl(game.backdropUrl || game.coverUrl || '');
      setCoverUrl(game.coverUrl || '');
      setLogoUrl(game.theme?.logoUrl || '');
      setVideoUrl(game.videoUrl || '');
      setAccentColor(game.theme?.accentColor || '#2ee5ba');
      setGlowColor(game.theme?.glowColor || 'rgba(46, 229, 186, 0.45)');
      setVibe(game.theme?.vibe || 'auto');
      setSceneQuery('');
      setBgmUrl(game.audio?.bgmUrl || '');
      setBgmVolume(game.audio?.bgmVolume ?? 0.5);
      setVersion(game.version || '');
      setCollection(game.collection || 'none');
      setRunAsAdmin(game.compatibility?.runAsAdmin || false);
      setDisplayMode(game.compatibility?.displayMode || 'fullscreen');
      setDirectX(game.compatibility?.directX || 'default');
      setResolution(game.compatibility?.resolution || '');
      setLaunchArgs(game.launchArguments || '');
      setQuoteText(game.quote?.text || '');
      setQuoteSpeaker(game.quote?.speaker || '');
      setIsPlayingPreview(false);
    }
    return () => {
      isMounted = false;
    };
  }, [game]);

  if (!isOpen || !game) return null;

  const handleDetectVersion = async () => {
    if (!window.api?.getExeVersion || !game.executablePath) return;
    setIsDetectingVersion(true);
    try {
      const detected = await window.api.getExeVersion(game.executablePath);
      if (detected) {
        audioEngine.playSelect();
        setVersion(detected);
      }
    } finally {
      setIsDetectingVersion(false);
    }
  };

  const handlePickBackdrop = async () => {
    if (window.api?.pickImage) {
      const p = await window.api.pickImage();
      if (p) setBackdropUrl(normalizeMediaUrl(p));
    }
  };

  const handlePickCover = async () => {
    if (window.api?.pickImage) {
      const p = await window.api.pickImage();
      if (p) setCoverUrl(normalizeMediaUrl(p));
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

  const handleAutoExtractColors = async () => {
    const targetImg = backdropUrl || coverUrl;
    if (!targetImg) return;
    setIsExtractingColors(true);
    try {
      const palette = await ThemeEngine.extractDominantColor(targetImg);
      setAccentColor(palette.accent);
      setGlowColor(palette.glow);
      audioEngine.playSelect();
    } finally {
      setIsExtractingColors(false);
    }
  };

  const handleAutoFetchSteamAssets = async () => {
    setIsFetchingArt(true);
    try {
      const art = await ArtworkService.searchArtwork(game.title, { apiKeys });
      if (art) {
        audioEngine.playSelect();
        setCoverUrl(art.coverUrl);
        setBackdropUrl(art.backdropUrl);
        if (art.logoUrl) setLogoUrl(art.logoUrl);
        const palette = await ThemeEngine.extractDominantColor(art.coverUrl);
        setAccentColor(palette.accent);
        setGlowColor(palette.glow);
      }
    } finally {
      setIsFetchingArt(false);
    }
  };

  const handleAutoFetchLiveWallpaper = async () => {
    if (!game) return;
    setIsDownloadingVideo(true);
    setVideoStatusMessage('Searching for 1080p Ambient Live Wallpaper (60fps loop)...');
    try {
      audioEngine.playHover();
      if (window.api?.downloadLiveWallpaper) {
        const dlRes = await window.api.downloadLiveWallpaper({
          title: game.title,
          gameId: game.id,
          quality: '1080p',
          sceneQuery: sceneQuery.trim() || undefined,
          forceAmbient: true
        });

        if (dlRes.success && dlRes.localPath) {
          audioEngine.playSelect();
          setVideoUrl(dlRes.localPath);
          const mb = (dlRes.sizeBytes ? dlRes.sizeBytes / 1024 / 1024 : 0).toFixed(1);
          const typeLabel = dlRes.source === 'ambient' ? 'Ambient 60fps Loop' : 'Showcase Video';
          setVideoStatusMessage(`✓ Full HD ${typeLabel} saved (${mb} MB offline)`);
          return;
        } else if (dlRes.error) {
          setVideoStatusMessage(dlRes.error);
          return;
        }
      }

      // Fallback
      const liveWp = await ArtworkService.fetchLiveWallpaper(game.title, { quality: '1080p' });
      if (liveWp?.videoUrl) {
        setVideoUrl(liveWp.videoUrl);
        setVideoStatusMessage('✓ Live wallpaper attached');
      } else {
        setVideoStatusMessage('No live wallpaper found for this title');
      }
    } catch (err: any) {
      setVideoStatusMessage(err.message || 'Failed to download live wallpaper');
    } finally {
      setIsDownloadingVideo(false);
    }
  };

  const handleTogglePreviewAudio = () => {
    if (isPlayingPreview) {
      audioEngine.stopBgm();
      setIsPlayingPreview(false);
    } else {
      if (bgmUrl) {
        audioEngine.playBgm(bgmUrl);
        setIsPlayingPreview(true);
      }
    }
  };

  const handleSuggestQuote = () => {
    audioEngine.playSelect();
    const available = QuotesService.getQuotesForGame(game.title);
    if (available.length > 0) {
      const currentIdx = available.findIndex((q) => q.text === quoteText);
      const nextQuote = available[(currentIdx + 1) % available.length];
      setQuoteText(nextQuote.text);
      setQuoteSpeaker(nextQuote.speaker || '');
    } else {
      const randomQ = QuotesService.getRandomQuote();
      setQuoteText(randomQ.text);
      setQuoteSpeaker(randomQ.speaker || '');
    }
  };

  const handleSave = () => {
    audioEngine.playSelect();
    if (isPlayingPreview) {
      audioEngine.stopBgm();
      setIsPlayingPreview(false);
    }

    const updatedGame: Game = {
      ...game,
      version: version.trim() || undefined,
      collection: collection,
      launchArguments: launchArgs.trim() || undefined,
      quote: quoteText.trim()
        ? {
            text: quoteText.trim(),
            speaker: quoteSpeaker.trim() || undefined
          }
        : undefined,
      compatibility: {
        runAsAdmin,
        displayMode,
        directX,
        resolution: resolution.trim() || undefined
      },
      coverUrl: coverUrl || game.coverUrl,
      backdropUrl: backdropUrl || game.backdropUrl,
      videoUrl: videoUrl || undefined,
      theme: {
        ...game.theme,
        accentColor,
        glowColor,
        logoUrl: logoUrl || undefined,
        vibe
      },
      audio: {
        ...game.audio,
        bgmUrl: bgmUrl || undefined,
        bgmVolume
      }
    };

    onSaveGame(updatedGame);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={() => {
        if (isPlayingPreview) audioEngine.stopBgm();
        onClose();
      }}
    >
      <div
        className="w-full max-w-3xl max-w-[calc(100vw-1.5rem)] rounded-2xl sm:rounded-3xl bg-[#0b0e17] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] max-h-[calc(100vh-1.5rem)] animate-modalIn transform-gpu will-change-transform min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-black shadow-md"
              style={{ backgroundColor: accentColor }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Dedicated Theme Editor
              </h2>
              <p className="text-xs text-white/50">{game.title}</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isPlayingPreview) audioEngine.stopBgm();
              onClose();
            }}
            className="text-white/40 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Theme Preview Card */}
        <div className="relative h-44 overflow-hidden border-b border-white/10 select-none">
          {videoUrl ? (
            <video
              key={videoUrl}
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover filter brightness-75 contrast-105"
            />
          ) : backdropUrl ? (
            <img
              src={backdropUrl}
              alt="Backdrop"
              className="w-full h-full object-cover filter brightness-75 contrast-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-900 to-slate-800" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e17] via-black/40 to-transparent" />

          <div
            className="absolute inset-0 opacity-40 transition-all duration-500"
            style={{
              background: `radial-gradient(circle at 30% 60%, ${glowColor} 0%, transparent 65%)`
            }}
          />

          <div className="absolute bottom-4 left-6 z-10 flex items-center gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="max-h-16 max-w-xs object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <h3 className="text-2xl font-black text-white uppercase drop-shadow-md">
                {game.title}
              </h3>
            )}
          </div>

          <div className="absolute top-3 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFetchSteamAssets}
              disabled={isFetchingArt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer shadow-lg backdrop-blur-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingArt ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isFetchingArt ? 'Scraping CDN...' : 'Fetch Steam CDN Theme'}</span>
            </button>
          </div>
        </div>

        {/* Customization Inputs */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-18rem)]">
          {/* Wallpaper, Poster, Video & Logo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Cover Poster */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">Cover Poster (Box Art)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="Cover image URL or local path"
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-white/40"
                />
                <button
                  type="button"
                  onClick={handlePickCover}
                  className="p-2 rounded-xl glass-pill text-white hover:bg-white/15 cursor-pointer flex-shrink-0"
                  title="Browse cover art"
                >
                  <Image className="w-4 h-4 text-white/80" />
                </button>
              </div>
            </div>

            {/* 2. Cinematic Backdrop */}
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1">Cinematic Backdrop (4K)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={backdropUrl}
                  onChange={(e) => setBackdropUrl(e.target.value)}
                  placeholder="Backdrop URL or local path"
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-white/40"
                />
                <button
                  type="button"
                  onClick={handlePickBackdrop}
                  className="p-2 rounded-xl glass-pill text-white hover:bg-white/15 cursor-pointer flex-shrink-0"
                  title="Browse local backdrop"
                >
                  <Image className="w-4 h-4 text-white/80" />
                </button>
              </div>
            </div>

            {/* 3. Looping Scene Video */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-white/80">Looping Scene Video (Live Wallpaper)</label>
                <span className="text-[10px] text-cyan-400 font-medium">MP4 / WebM Full HD (Offline)</span>
              </div>

              {/* Scene Focus Presets & Custom Looper Input */}
              <div className="p-3 mb-2 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-cyan-300">Ambient Scene Focus / Idle Location</span>
                  <span className="text-[10px] text-white/40">Zero trailers or cutscenes</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    'Campfire / Resting',
                    'Sitting on Bench',
                    'Rain / Balcony',
                    'Scenic Landscape',
                    'Idle Scenery',
                    'Night Sky'
                  ].map((preset) => {
                    const isActive = sceneQuery.toLowerCase() === preset.toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          audioEngine.playSelect();
                          setSceneQuery(isActive ? '' : preset);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-cyan-500 text-black font-bold shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={sceneQuery}
                  onChange={(e) => setSceneQuery(e.target.value)}
                  placeholder="Custom loop query (e.g. sitting on rooftop, bonfire, rain on window)..."
                  className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Local video path or direct URL (e.g. file:///...)"
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-white/40"
                />
                <button
                  type="button"
                  onClick={handleAutoFetchLiveWallpaper}
                  disabled={isDownloadingVideo}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-pill text-xs font-semibold text-[var(--game-accent,#2ee5ba)] hover:bg-white/15 cursor-pointer flex-shrink-0 disabled:opacity-40"
                  title="Search & Download 1080p Ambient Live Wallpaper Loop (Wallpaper Engine Style)"
                >
                  {isDownloadingVideo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{isDownloadingVideo ? 'Downloading...' : 'Auto-Download Live'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePickVideo}
                  className="p-2 rounded-xl glass-pill text-white hover:bg-white/15 cursor-pointer flex-shrink-0"
                  title="Browse local MP4/WebM video"
                >
                  <Film className="w-4 h-4 text-cyan-400" />
                </button>
                {videoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playSelect();
                      setVideoUrl('');
                      setVideoStatusMessage('Live wallpaper removed');
                    }}
                    className="p-2 rounded-xl glass-pill text-rose-400 hover:bg-rose-500/20 cursor-pointer flex-shrink-0"
                    title="Remove live wallpaper"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {videoStatusMessage && (
                <p className="mt-1.5 text-[11px] text-[var(--game-accent,#2ee5ba)] font-medium flex items-center gap-1.5">
                  {isDownloadingVideo && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{videoStatusMessage}</span>
                </p>
              )}
              {videoUrl && (
                <div className="mt-2.5 relative rounded-xl overflow-hidden h-28 border border-cyan-500/30 bg-black/60">
                  <video
                    src={normalizeMediaUrl(videoUrl)}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/75 px-2 py-0.5 rounded-md text-[10px] text-cyan-400 font-medium shadow">
                    <Film className="w-3 h-3" />
                    <span>Looping Scene Active (Offline Ready)</span>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Title Logo */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-white/80">Title Logo</label>
                <span className="text-[10px] text-white/40">Transparent PNG recommended</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Logo URL or local path"
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-white/40"
                />
                <button
                  type="button"
                  onClick={handlePickLogo}
                  className="p-2 rounded-xl glass-pill text-white hover:bg-white/15 cursor-pointer flex-shrink-0"
                  title="Browse local PNG"
                >
                  <Sparkles className="w-4 h-4 text-white/80" />
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Colors */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" style={{ color: accentColor }} />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Dynamic Palette</span>
              </div>
              <button
                type="button"
                onClick={handleAutoExtractColors}
                disabled={isExtractingColors}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white font-medium cursor-pointer transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Extract from Wallpaper</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-white/60 mb-1">Accent Highlight Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-white/60 mb-1">Ambient Glow (CSS)</label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg shadow-sm"
                    style={{ backgroundColor: glowColor }}
                  />
                  <input
                    type="text"
                    value={glowColor}
                    onChange={(e) => setGlowColor(e.target.value)}
                    className="flex-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Game Vibe & UI Aesthetic Engine */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4" style={{ color: accentColor }} />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Game Vibe & UI Aesthetic Engine</span>
              </div>
              <span className="text-[10px] text-white/40">Physical UI Geometry & Atmosphere</span>
            </div>

            <p className="text-[11px] text-white/60 leading-relaxed">
              Morphs the launcher's physical button cuts, shapes, typography, and atmospheric overlays to match the game's aesthetic soul.
            </p>

            {/* Grid of Vibe Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {/* Auto-Detect Card */}
              <div
                onClick={() => {
                  audioEngine.playSelect();
                  setVibe('auto');
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  vibe === 'auto'
                    ? 'border-[var(--game-accent,#2ee5ba)] bg-[var(--game-accent,#2ee5ba)]/15 ring-2 ring-[var(--game-accent,#2ee5ba)]'
                    : 'border-white/10 bg-black/40 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>🔮</span> Auto-Detect
                    </span>
                    {vibe === 'auto' && <Check className="w-3.5 h-3.5 text-[var(--game-accent,#2ee5ba)]" />}
                  </div>
                  <p className="text-[10px] text-white/40 mt-1 line-clamp-2">
                    Adaptive vibe from title & tags. Detected: <strong className="text-white/80">{GAME_VIBES[detectedVibe]?.name}</strong>
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/10 flex justify-center">
                  <span className="text-[9px] font-mono uppercase text-white/50">Adaptive Active</span>
                </div>
              </div>

              {/* Specific Vibes */}
              {(Object.keys(GAME_VIBES) as (keyof typeof GAME_VIBES)[]).map((vibeKey) => {
                const item = GAME_VIBES[vibeKey];
                const isSelected = vibe === vibeKey;
                return (
                  <div
                    key={vibeKey}
                    onClick={() => {
                      audioEngine.playSelect();
                      setVibe(vibeKey);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-[var(--game-accent,#2ee5ba)] bg-[var(--game-accent,#2ee5ba)]/15 ring-2 ring-[var(--game-accent,#2ee5ba)]'
                        : 'border-white/10 bg-black/40 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                          <span>{item.badgeIcon}</span> {item.name.split('/')[0].trim()}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[var(--game-accent,#2ee5ba)] flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-white/40 mt-1 line-clamp-2">
                        {item.tagline}
                      </p>
                    </div>

                    {/* Live Mini Button Preview */}
                    <div className="mt-3 pt-2 border-t border-white/10 flex justify-center">
                      <div
                        style={{
                          clipPath: item.buttonClipPath,
                          color: item.buttonBgOverride ? undefined : '#000000',
                          backgroundColor: item.buttonBgOverride ? undefined : accentColor
                        }}
                        className={`px-2.5 py-1 ${item.buttonShape} ${item.buttonBorder || ''} ${item.buttonBgOverride || ''} ${item.buttonTypography} text-[9px] pointer-events-none drop-shadow-sm truncate max-w-full text-center`}
                      >
                        {item.id === 'souls-fantasy'
                          ? '✧ PLAY ✧'
                          : item.id === 'cozy-wholesome'
                          ? '✦ Play ✦'
                          : item.playLabelPrefix
                          ? `${item.playLabelPrefix}PLAY${item.playLabelSuffix || ''}`
                          : 'PLAY'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Background Audio / OST */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Soundtrack (OST Loop)</span>
              </div>
              {bgmUrl && (
                <button
                  type="button"
                  onClick={handleTogglePreviewAudio}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                    isPlayingPreview ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isPlayingPreview ? 'Stop Audio' : 'Preview Audio'}</span>
                </button>
              )}
            </div>

            <div>
              <label className="block text-[11px] text-white/60 mb-1">OST Audio File (MP3 / WAV / OGG or Web Stream)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bgmUrl}
                  onChange={(e) => setBgmUrl(e.target.value)}
                  placeholder="Local music file or audio URL"
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-white/40"
                />
                <button
                  type="button"
                  onClick={handlePickAudio}
                  className="p-2 rounded-xl glass-pill text-white hover:bg-white/15 cursor-pointer flex-shrink-0"
                  title="Browse local MP3"
                >
                  <Music className="w-4 h-4 text-cyan-400" />
                </button>
              </div>
            </div>

            {bgmUrl && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[11px] text-white/50">OST Volume:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={bgmVolume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setBgmVolume(v);
                    audioEngine.updateConfig({ bgmVolume: v });
                  }}
                  className="w-36 accent-cyan-400 cursor-pointer"
                />
                <span className="text-[11px] font-mono text-white/70">{Math.round(bgmVolume * 100)}%</span>
              </div>
            )}
          </div>

          {/* Game Version & Build Metadata */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[var(--game-accent)]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Game Version & Build</span>
              </div>
              {game.executablePath && (
                <button
                  type="button"
                  onClick={handleDetectVersion}
                  disabled={isDetectingVersion}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white font-medium cursor-pointer transition-all disabled:opacity-50"
                  title="Auto-detect version from Windows executable"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDetectingVersion ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>{isDetectingVersion ? 'Detecting...' : 'Detect from .EXE'}</span>
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. v1.0.4, v2.12, Build 517"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-mono placeholder-white/30 focus:outline-none focus:border-white/40"
              />
            </div>
            <p className="text-[10px] text-white/40">
              Displays as a console version badge on the home screen and in your library cards.
            </p>
          </div>

          {/* Iconic Dialogue & Monologue */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Quote className="w-4 h-4 text-[var(--game-accent)]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Iconic Dialogue & Monologue</span>
              </div>
              <button
                type="button"
                onClick={handleSuggestQuote}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white font-medium cursor-pointer transition-all"
                title="Cycle through famous quotes or get a suggestion from the gaming encyclopedia"
              >
                <Dices className="w-3.5 h-3.5 text-amber-400" />
                <span>Suggest Quote</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-white/60 mb-1">Famous Quote / Dialogue</label>
                <input
                  type="text"
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="e.g. Wake the fuck up, Samurai. We have a city to burn."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white italic placeholder-white/30 focus:outline-none focus:border-white/40"
                />
              </div>

              <div>
                <label className="block text-[11px] text-white/60 mb-1">Speaker / Attribution (Optional)</label>
                <input
                  type="text"
                  value={quoteSpeaker}
                  onChange={(e) => setQuoteSpeaker(e.target.value)}
                  placeholder="e.g. Johnny Silverhand, Margit the Fell Omen, Arthur Morgan"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/40"
                />
              </div>
            </div>

            <p className="text-[10px] text-white/40">
              Showcases the signature phrase beside or below the game's name across your library cards, drawer intel, and PS5 hero deck.
            </p>
          </div>

          {/* Library Collection */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[var(--game-accent)]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Library Collection & Status</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'none', label: 'None', color: 'text-white/60' },
                { id: 'playing', label: 'Currently Playing', color: 'text-emerald-400' },
                { id: 'backlog', label: 'In Backlog', color: 'text-amber-400' },
                { id: 'completed', label: 'Completed 100%', color: 'text-purple-400' }
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCollection(c.id as GameCollection)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    collection === c.id
                      ? 'bg-white/15 border-[var(--game-accent)] text-white shadow-md'
                      : 'bg-black/20 border-white/5 text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  <span className={c.color}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Launch & Compatibility Profile */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--game-accent)]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Launch Compatibility & Presets</span>
            </div>

            {/* Run as Admin */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
              <div>
                <span className="text-xs font-bold text-white block">Always Run as Administrator</span>
                <span className="text-[10px] text-white/40">Triggers Windows UAC elevation on launch (for games like NFS Heat)</span>
              </div>
              <input
                type="checkbox"
                checked={runAsAdmin}
                onChange={(e) => setRunAsAdmin(e.target.checked)}
                className="w-4 h-4 accent-[var(--game-accent)] cursor-pointer"
              />
            </div>

            {/* Display Mode & DirectX API */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Display Mode</label>
                <select
                  value={displayMode}
                  onChange={(e) => setDisplayMode(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--game-accent)] cursor-pointer"
                >
                  <option value="fullscreen" className="bg-[#0b0e17]">Fullscreen</option>
                  <option value="windowed" className="bg-[#0b0e17]">Windowed</option>
                  <option value="borderless" className="bg-[#0b0e17]">Borderless</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Graphics API</label>
                <select
                  value={directX}
                  onChange={(e) => setDirectX(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--game-accent)] cursor-pointer"
                >
                  <option value="default" className="bg-[#0b0e17]">Default</option>
                  <option value="dx11" className="bg-[#0b0e17]">DirectX 11 (-dx11)</option>
                  <option value="dx12" className="bg-[#0b0e17]">DirectX 12 (-dx12)</option>
                  <option value="vulkan" className="bg-[#0b0e17]">Vulkan (-vulkan)</option>
                </select>
              </div>
            </div>

            {/* Launch Arguments & Quick Presets */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-white/50 uppercase">Launch Arguments</label>
                <div className="flex items-center gap-1.5">
                  {['-novid', '-fullscreen', '-high', '-dx11'].map((flag) => (
                    <button
                      key={flag}
                      type="button"
                      onClick={() => {
                        if (!launchArgs.includes(flag)) {
                          setLaunchArgs((prev) => (prev ? `${prev} ${flag}` : flag));
                        }
                      }}
                      className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white/80 font-mono transition-colors"
                    >
                      +{flag}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={launchArgs}
                onChange={(e) => setLaunchArgs(e.target.value)}
                placeholder="-novid -high -fullscreen"
                className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs text-white font-mono placeholder-white/30 focus:outline-none focus:border-[var(--game-accent)]"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/10 bg-white/5">
          {(onRequestRemoveGame || onRemoveGame) ? (
            <button
              type="button"
              onClick={() => {
                if (isPlayingPreview) audioEngine.stopBgm();
                if (onRequestRemoveGame) {
                  onRequestRemoveGame(game);
                  onClose();
                } else if (onRemoveGame) {
                  onRemoveGame(game.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/15 text-xs font-semibold cursor-pointer transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remove Game</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (isPlayingPreview) audioEngine.stopBgm();
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl border border-white/15 text-xs font-semibold text-white/70 hover:text-white hover:border-white/30 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--game-accent)] text-black text-xs font-extrabold tracking-wide hover:brightness-110 cursor-pointer shadow-lg active:scale-95 transition-all"
            >
              <Check className="w-4 h-4 font-bold" />
              <span>Apply Game Theme</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
