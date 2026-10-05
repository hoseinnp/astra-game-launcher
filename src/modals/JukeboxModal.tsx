import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Radio,
  Plus,
  Trash2,
  X,
  Music,
  Search,
  Activity
} from 'lucide-react';
import type { Track, VisualizerDisplayMode } from '../types/Audio.types';
import { AudioService, type AudioServiceState } from '../services/AudioService';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { audioEngine } from '../services/audioEngine';

interface JukeboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
  gameThemeColor?: string;
}

export const JukeboxModal: React.FC<JukeboxModalProps> = ({
  isOpen,
  onClose,
  accentColor = '#2ee5ba',
  gameThemeColor
}) => {
  const [audioState, setAudioState] = useState<AudioServiceState>(AudioService.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [visualizerMode, setVisualizerMode] = useState<VisualizerDisplayMode>('bars');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackGameId, setNewTrackGameId] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Active reactive color adapts to game theme palette or accent
  const effectiveThemeColor = gameThemeColor || accentColor;

  useEffect(() => {
    return AudioService.subscribe((next) => {
      setAudioState(next);
    });
  }, []);

  // Keyboard shortcut: Space toggles play/pause when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        AudioService.togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handlePickLocalTrack = async () => {
    if (!window.api?.pickAudio) return;
    try {
      const filePath = await window.api.pickAudio();
      if (filePath) {
        audioEngine.playSelect();
        const fileName = filePath.split(/[/\\]/).pop() || 'Custom Track';
        const cleanTitle = fileName.replace(/\.[^/.]+$/, '');
        const newTrack: Track = {
          id: `local_${Date.now()}`,
          title: cleanTitle,
          gameId: 'local-library',
          artist: 'Local Soundtrack',
          filePath,
          duration: 180,
          source: 'local'
        };
        AudioService.addTrack(newTrack, true);
      }
    } catch (err) {
      console.error('[JukeboxModal] Failed to pick audio:', err);
    }
  };

  const handleAddCustomTrack = () => {
    if (!newTrackTitle.trim()) return;
    const newTrack: Track = {
      id: `custom_${Date.now()}`,
      title: newTrackTitle.trim(),
      gameId: newTrackGameId.trim() || 'custom-game',
      artist: 'Astra Audio Studio',
      duration: 180,
      source: 'synthesizer',
      filePath: 'synth:custom'
    };
    AudioService.addTrack(newTrack, true);
    setNewTrackTitle('');
    setNewTrackGameId('');
    setShowAddForm(false);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const filteredTracks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return audioState.playlist.tracks;
    return audioState.playlist.tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        (t.artist && t.artist.toLowerCase().includes(query)) ||
        (t.gameId && t.gameId.toLowerCase().includes(query))
    );
  }, [audioState.playlist.tracks, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn select-none">
      <div className="w-full max-w-4xl h-[650px] rounded-3xl bg-zinc-950/95 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-modalIn isolate relative">
        {/* Reactive ambient background glow */}
        <div
          className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-20 filter blur-3xl pointer-events-none transition-colors duration-700"
          style={{ background: effectiveThemeColor }}
        />

        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 z-10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-black font-black shadow-lg"
              style={{ background: effectiveThemeColor }}
            >
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wider uppercase">
                  Astra Jukebox & Audio Visualizer
                </h2>
                {audioState.isDucked && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    DUCKED (30%)
                  </span>
                )}
                {audioState.isLoFiRadio && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                    <Radio className="w-3 h-3 animate-pulse" /> LO-FI RADIO
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50">
                Interactive Game Soundtracks, Ambient Soundscapes & Reactive Frequency Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => AudioService.toggleLoFiRadio()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                audioState.isLoFiRadio
                  ? 'bg-emerald-400 text-black shadow-md font-bold'
                  : 'glass-pill hover:bg-white/15 text-white/80'
              }`}
              title="Toggle Lo-Fi Ambient Radio Stream"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Lo-Fi Radio</span>
            </button>

            <button
              onClick={handlePickLocalTrack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-pill hover:bg-white/15 text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer"
              title="Import Local Audio Track (MP3/FLAC/WAV)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Audio</span>
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

        {/* Visualizer Stage */}
        <div className="relative h-44 bg-black/60 border-b border-white/10 flex flex-col justify-end p-4 overflow-hidden group">
          {/* Active Canvas Visualizer */}
          <div className="absolute inset-0">
            <AudioVisualizer mode={visualizerMode} accentColor={effectiveThemeColor} />
          </div>

          {/* Visualizer mode switcher */}
          <div className="absolute top-3 right-4 z-10 flex items-center gap-1 bg-black/50 backdrop-blur-md p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setVisualizerMode('bars')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                visualizerMode === 'bars'
                  ? 'bg-white/20 text-white shadow'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              BARS
            </button>
            <button
              onClick={() => setVisualizerMode('wave')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                visualizerMode === 'wave'
                  ? 'bg-white/20 text-white shadow'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              WAVE
            </button>
            <button
              onClick={() => setVisualizerMode('pulsar')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                visualizerMode === 'pulsar'
                  ? 'bg-white/20 text-white shadow'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              ORB
            </button>
          </div>

          {/* Now Playing Info Bar Overlay */}
          <div className="relative z-10 flex items-center justify-between bg-zinc-950/70 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-lg">
            <div className="flex items-center gap-3 min-w-0">
              {audioState.currentTrack?.coverUrl ? (
                <img
                  src={audioState.currentTrack.coverUrl}
                  alt="Track Cover"
                  className="w-10 h-10 rounded-xl object-cover border border-white/10"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-black font-bold"
                  style={{ background: effectiveThemeColor }}
                >
                  <Music className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm text-white truncate">
                  {audioState.currentTrack ? audioState.currentTrack.title : 'No Track Selected'}
                </h3>
                <p className="text-xs text-white/50 truncate">
                  {audioState.currentTrack?.artist || 'Astra Jukebox'} • {audioState.currentTrack?.gameId || 'Launcher'}
                </p>
              </div>
            </div>

            {/* Time Indicator */}
            <div className="text-right font-mono text-xs text-white/60">
              <span className="text-white font-bold">{formatSeconds(audioState.currentTime)}</span>
              <span> / </span>
              <span>{formatSeconds(audioState.duration)}</span>
            </div>
          </div>
        </div>

        {/* Master Playback Controls Bar */}
        <div className="px-6 py-3 bg-white/[0.03] border-b border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                audioEngine.playHover();
                AudioService.previous();
              }}
              className="p-2.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                audioEngine.playSelect();
                AudioService.togglePlay();
              }}
              className="w-11 h-11 rounded-full text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
              style={{ background: effectiveThemeColor }}
              title={audioState.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {audioState.isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
            </button>

            <button
              onClick={() => {
                audioEngine.playHover();
                AudioService.next();
              }}
              className="p-2.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Scrubber / Progress slider */}
          <div className="flex-1 max-w-md hidden sm:flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/40">{formatSeconds(audioState.currentTime)}</span>
            <input
              type="range"
              min={0}
              max={audioState.duration || 100}
              value={audioState.currentTime}
              onChange={(e) => AudioService.seek(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              style={{ accentColor: effectiveThemeColor }}
            />
            <span className="text-[10px] font-mono text-white/40">{formatSeconds(audioState.duration)}</span>
          </div>

          {/* Volume control */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => AudioService.setVolume(audioState.volume > 0 ? 0 : 0.8)}
              className="text-white/60 hover:text-white cursor-pointer"
            >
              {audioState.volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={audioState.volume}
              onChange={(e) => AudioService.setVolume(parseFloat(e.target.value))}
              className="w-20 sm:w-24 h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              style={{ accentColor: effectiveThemeColor }}
            />
            <span className="text-[10px] font-mono text-white/50 w-7">
              {Math.round(audioState.volume * 100)}%
            </span>
          </div>
        </div>

        {/* Playlist & Game Filter Section */}
        <div className="flex-1 flex flex-col min-h-0 bg-zinc-950/40">
          {/* Search / Filter Bar */}
          <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search tracks or games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 font-sans"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 font-mono">
                {filteredTracks.length} {filteredTracks.length === 1 ? 'track' : 'tracks'}
              </span>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1.5 rounded-xl glass-pill hover:bg-white/15 text-xs text-white/70 hover:text-white transition-all cursor-pointer"
              >
                {showAddForm ? 'Cancel' : '+ New Track'}
              </button>
            </div>
          </div>

          {/* Quick Add Custom Track Form */}
          {showAddForm && (
            <div className="px-6 py-3 bg-white/[0.02] border-b border-white/10 flex items-center gap-3 animate-fadeIn">
              <input
                type="text"
                placeholder="Soundtrack Title..."
                value={newTrackTitle}
                onChange={(e) => setNewTrackTitle(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-400"
              />
              <input
                type="text"
                placeholder="Game Name / ID..."
                value={newTrackGameId}
                onChange={(e) => setNewTrackGameId(e.target.value)}
                className="w-40 px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-400"
              />
              <button
                onClick={handleAddCustomTrack}
                className="px-4 py-1.5 rounded-xl bg-emerald-400 text-black font-bold text-xs hover:brightness-110 cursor-pointer"
              >
                Add
              </button>
            </div>
          )}

          {/* Track List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5 no-scrollbar">
            {filteredTracks.length === 0 ? (
              <div className="py-16 text-center text-white/40 text-xs">
                No tracks matching "{searchQuery}"
              </div>
            ) : (
              filteredTracks.map((track, idx) => {
                const isCurrent = audioState.currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      audioEngine.playSelect();
                      AudioService.selectTrack(track);
                      AudioService.play();
                    }}
                    className={`group px-4 py-2.5 rounded-2xl flex items-center justify-between gap-4 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-white/10 border border-white/20 shadow-md'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/50 group-hover:text-white transition-colors flex-shrink-0">
                        {isCurrent && audioState.isPlaying ? (
                          <Activity className="w-4 h-4 animate-pulse" style={{ color: effectiveThemeColor }} />
                        ) : (
                          <span className="text-xs font-mono">{idx + 1}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4
                          className={`text-xs font-bold truncate transition-colors ${
                            isCurrent ? 'text-white' : 'text-white/80 group-hover:text-white'
                          }`}
                          style={isCurrent ? { color: effectiveThemeColor } : undefined}
                        >
                          {track.title}
                        </h4>
                        <p className="text-[11px] text-white/40 truncate">
                          {track.artist || 'Astra Studio'} • {track.gameId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-mono text-white/40">{formatSeconds(track.duration)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          AudioService.removeTrack(track.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-all cursor-pointer"
                        title="Remove track"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
