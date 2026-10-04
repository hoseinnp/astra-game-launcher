import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  CloudRain,
  Disc,
  Activity,
  Radio,
  Plus,
  X,
  Music
} from 'lucide-react';
import type { VisualizerMode } from '../../types/game';
import { jukeboxEngine, type JukeboxState } from '../../services/jukeboxEngine';
import { audioEngine } from '../../services/audioEngine';
import { AudioVisualizer } from './AudioVisualizer';

interface JukeboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
}

export const JukeboxModal: React.FC<JukeboxModalProps> = ({
  isOpen,
  onClose,
  accentColor = '#2ee5ba'
}) => {
  const [state, setState] = useState<JukeboxState>(jukeboxEngine.getState());
  const tracks = jukeboxEngine.getTracks();

  useEffect(() => {
    return jukeboxEngine.subscribe((next) => {
      setState(next);
    });
  }, []);

  const handlePickLocalTrack = async () => {
    if (!window.api?.pickAudio) return;
    const filePath = await window.api.pickAudio();
    if (filePath) {
      audioEngine.playSelect();
      const fileName = filePath.split(/[/\\]/).pop() || 'Custom Track';
      const cleanTitle = fileName.replace(/\.[^/.]+$/, '');
      jukeboxEngine.addLocalTrack(filePath, cleanTitle, 'Local Library');
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn select-none">
      <div className="w-full max-w-4xl h-[620px] rounded-3xl bg-zinc-950/95 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-modalIn isolate relative">
        {/* Ambient background glow */}
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-25 filter blur-3xl pointer-events-none"
          style={{ background: accentColor }}
        />

        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 z-10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-black font-black shadow-lg"
              style={{ background: accentColor }}
            >
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wider uppercase">Astra Jukebox</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-bold border border-white/15">
                  V3 STUDIO
                </span>
              </div>
              <p className="text-xs text-white/50">Audiophile game OSTs, ambient radio & reactive visualizer</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePickLocalTrack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-pill hover:bg-white/15 text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Import Audio</span>
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

        {/* Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden z-10">
          {/* Left: Reactive Visualizer & Now Playing Deck */}
          <div className="flex-1 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 relative overflow-hidden bg-gradient-to-b from-transparent to-black/40">
            {/* Visualizer Mode Switcher */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                {(['bars', 'wave', 'pulsar'] as VisualizerMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      audioEngine.playHover();
                      jukeboxEngine.setVisualizerMode(mode);
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-mono uppercase font-bold transition-all cursor-pointer ${
                      state.visualizerMode === mode
                        ? 'bg-[var(--game-accent,#2ee5ba)] text-black shadow-md'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Ambient Lo-Fi FX Switches */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => jukeboxEngine.toggleAmbientLayer('rain')}
                  title="Rain Atmosphere"
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    state.activeAmbientLayers.has('rain')
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                      : 'border-white/10 text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <CloudRain className="w-4 h-4" />
                </button>
                <button
                  onClick={() => jukeboxEngine.toggleAmbientLayer('vinyl')}
                  title="Vinyl Crackle & Tape Flutter"
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    state.activeAmbientLayers.has('vinyl')
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                      : 'border-white/10 text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Disc className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Reactive Waveform Canvas */}
            <div className="my-auto py-4 relative flex items-center justify-center">
              <div className="w-full h-36 relative">
                <AudioVisualizer mode={state.visualizerMode} accentColor={accentColor} />
              </div>
            </div>

            {/* Current Track Info & Transport Bar */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {state.currentTrack?.coverUrl ? (
                  <img
                    src={state.currentTrack.coverUrl}
                    alt={state.currentTrack.title}
                    className="w-14 h-14 rounded-2xl object-cover shadow-xl border border-white/15 flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-black font-bold shadow-xl flex-shrink-0"
                    style={{ background: accentColor }}
                  >
                    <Disc className="w-7 h-7 animate-spin" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-black text-white truncate tracking-wide">
                    {state.currentTrack?.title || 'No Track Selected'}
                  </h3>
                  <p className="text-xs text-white/60 truncate mt-0.5">
                    {state.currentTrack?.artist} • {state.currentTrack?.album || 'Soundtrack'}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(100, (state.currentTime / (state.duration || 1)) * 100)}%`,
                      background: accentColor
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-white/40">
                  <span>{formatSeconds(state.currentTime)}</span>
                  <span>{formatSeconds(state.duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => jukeboxEngine.toggleShuffle()}
                    className={`p-2 rounded-xl cursor-pointer transition-all ${
                      state.shuffle ? 'text-[var(--game-accent,#2ee5ba)]' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => jukeboxEngine.toggleRepeat()}
                    className={`p-2 rounded-xl cursor-pointer transition-all ${
                      state.repeat !== 'off' ? 'text-[var(--game-accent,#2ee5ba)]' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    <Repeat className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary Playback controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      audioEngine.playHover();
                      jukeboxEngine.prevTrack();
                    }}
                    className="p-2.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white cursor-pointer transition-all"
                  >
                    <SkipBack className="w-5 h-5 fill-current" />
                  </button>
                  <button
                    onClick={() => {
                      audioEngine.playSelect();
                      jukeboxEngine.togglePlay();
                    }}
                    className="w-12 h-12 rounded-2xl text-black flex items-center justify-center font-bold shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    style={{ background: accentColor }}
                  >
                    {state.isPlaying ? <Pause className="w-6 h-6 fill-black" /> : <Play className="w-6 h-6 fill-black ml-0.5" />}
                  </button>
                  <button
                    onClick={() => {
                      audioEngine.playHover();
                      jukeboxEngine.nextTrack();
                    }}
                    className="p-2.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white cursor-pointer transition-all"
                  >
                    <SkipForward className="w-5 h-5 fill-current" />
                  </button>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-2 w-28">
                  {state.volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-white/40" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-white/70" />
                  )}
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={state.volume}
                    onChange={(e) => jukeboxEngine.setVolume(parseFloat(e.target.value))}
                    className="w-full accent-[var(--game-accent,#2ee5ba)] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Playlist Queue */}
          <div className="w-full md:w-80 flex flex-col bg-black/40 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/60">
                Studio Playlist ({tracks.length})
              </span>
              <span className="text-[10px] font-mono text-[var(--game-accent,#2ee5ba)] font-bold flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" />
                HQ AUDIO
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
              {tracks.map((track, idx) => {
                const isActive = state.currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      audioEngine.playSelect();
                      jukeboxEngine.playTrack(track.id);
                    }}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                      isActive
                        ? 'bg-white/15 border-[var(--game-accent,#2ee5ba)] shadow-md text-white'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                    }`}
                  >
                    <div className="w-6 text-center text-xs font-mono font-bold text-white/40">
                      {isActive && state.isPlaying ? (
                        <Activity className="w-4 h-4 text-[var(--game-accent,#2ee5ba)] animate-bounce mx-auto" />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold truncate text-white">{track.title}</h4>
                      <p className="text-[10px] text-white/40 truncate">{track.artist}</p>
                    </div>

                    <span className="text-[10px] font-mono text-white/40">
                      {formatSeconds(track.durationSeconds)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
