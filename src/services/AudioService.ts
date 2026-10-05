import type { Track, Playlist, VisualizerConfig } from '../types/Audio.types';

const PLAYLIST_STORAGE_KEY = 'astra_jukebox_playlist_v3';
const DEFAULT_CONFIG: VisualizerConfig = {
  barCount: 64,
  smoothing: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
  fftSize: 512
};

const DEFAULT_TRACKS: Track[] = [
  {
    id: 'cyber-pulse',
    title: 'Night City Cyber Pulse',
    gameId: 'cyberpunk-2077',
    artist: 'Astra Sound Labs',
    album: 'Neon Horizon OST',
    duration: 184,
    source: 'synthesizer',
    filePath: 'synth:cyberpunk',
    coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'golden-horizon',
    title: 'Limgrave Golden Horizon',
    gameId: 'elden-ring',
    artist: 'Astra Philharmonic',
    album: 'Lands Between Chronicles',
    duration: 210,
    source: 'synthesizer',
    filePath: 'synth:souls',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'lofi-tokyo',
    title: 'Neo-Tokyo Midnight Coffee',
    gameId: 'astra-lofi-radio',
    artist: 'Chilled Astra Beats',
    album: 'Rain & Holograms',
    duration: 195,
    source: 'synthesizer',
    filePath: 'synth:lofi',
    coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'arcade-86',
    title: 'Akihabara 1986 Quarter Drop',
    gameId: 'retro-arcade',
    artist: 'Pixel Pulse Collective',
    album: 'Insert Coin Anthology',
    duration: 142,
    source: 'synthesizer',
    filePath: 'synth:arcade',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'stellar-drift',
    title: 'Cosmic Stellar Nebula Drift',
    gameId: 'starfield',
    artist: 'Astra Deep Space Observatory',
    album: 'Zero Gravity Solitude',
    duration: 240,
    source: 'synthesizer',
    filePath: 'synth:space',
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80'
  }
];

export interface AudioServiceState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number; // 0 to 1
  currentTime: number;
  duration: number;
  isDucked: boolean;
  isLoFiRadio: boolean;
  playlist: Playlist;
}

export type AudioServiceListener = (state: AudioServiceState) => void;

class AudioServiceClass {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private duckGain: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;

  // Ambient synthesizer nodes for fallback / lo-fi radio mode
  private synthGain: GainNode | null = null;
  private synthOscillators: OscillatorNode[] = [];
  private synthInterval: any = null;

  private listeners: Set<AudioServiceListener> = new Set();

  private state: AudioServiceState = {
    currentTrack: null,
    isPlaying: false,
    volume: 0.8,
    currentTime: 0,
    duration: 0,
    isDucked: false,
    isLoFiRadio: false,
    playlist: {
      id: 'default-playlist',
      name: 'Astra Soundtracks & Beats',
      tracks: DEFAULT_TRACKS,
      currentTrackIndex: 0
    }
  };

  private config: VisualizerConfig = DEFAULT_CONFIG;

  constructor() {
    this.loadPersistedPlaylist();
  }

  private loadPersistedPlaylist() {
    try {
      const stored = localStorage.getItem(PLAYLIST_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.tracks) && parsed.tracks.length > 0) {
          this.state.playlist = parsed;
          const idx = Math.max(0, Math.min(parsed.currentTrackIndex || 0, parsed.tracks.length - 1));
          this.state.currentTrack = parsed.tracks[idx] || parsed.tracks[0];
          this.state.duration = this.state.currentTrack?.duration || 0;
          return;
        }
      }
    } catch (e) {
      console.warn('[AudioService] Failed to load persisted playlist:', e);
    }

    this.state.currentTrack = DEFAULT_TRACKS[0];
    this.state.duration = DEFAULT_TRACKS[0].duration;
  }

  private persistPlaylist() {
    try {
      localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(this.state.playlist));
    } catch (e) {
      console.warn('[AudioService] Failed to persist playlist:', e);
    }
  }

  private initAudio() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.state.volume, this.ctx.currentTime);

    this.duckGain = this.ctx.createGain();
    this.duckGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.config.fftSize;
    this.analyser.smoothingTimeConstant = this.config.smoothing;
    this.analyser.minDecibels = this.config.minDecibels;
    this.analyser.maxDecibels = this.config.maxDecibels;

    // Graph: AudioElement/Synth -> masterGain -> duckGain -> analyser -> destination
    this.masterGain.connect(this.duckGain);
    this.duckGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Audio Element setup
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';

    try {
      this.mediaSourceNode = this.ctx.createMediaElementSource(this.audioElement);
      this.mediaSourceNode.connect(this.masterGain);
    } catch (err) {
      console.warn('[AudioService] Could not connect MediaElementSource:', err);
    }

    this.audioElement.addEventListener('timeupdate', () => {
      if (!this.audioElement) return;
      this.state.currentTime = Math.floor(this.audioElement.currentTime);
      if (this.audioElement.duration && !isNaN(this.audioElement.duration)) {
        this.state.duration = Math.floor(this.audioElement.duration);
      }
      this.emit();
    });

    this.audioElement.addEventListener('ended', () => {
      this.next();
    });

    this.audioElement.addEventListener('error', () => {
      // Fallback to synthesizer mode if local/external audio fails
      if (this.state.isPlaying && this.state.currentTrack) {
        this.startSynthesizerVibe(this.state.currentTrack.gameId || 'lofi');
      }
    });
  }

  public getAnalyser(): AnalyserNode | null {
    this.initAudio();
    return this.analyser;
  }

  public getFrequencyData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array as any);
    } else {
      array.fill(0);
    }
  }

  public getTimeDomainData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(array as any);
    } else {
      array.fill(128);
    }
  }

  public getState(): AudioServiceState {
    return { ...this.state };
  }

  public subscribe(listener: AudioServiceListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const s = { ...this.state };
    this.listeners.forEach((l) => l(s));
  }

  public async play(): Promise<void> {
    this.initAudio();
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }

    if (!this.state.currentTrack && this.state.playlist.tracks.length > 0) {
      this.state.currentTrack = this.state.playlist.tracks[this.state.playlist.currentTrackIndex || 0];
    }

    if (!this.state.currentTrack) return;

    this.state.isPlaying = true;
    const track = this.state.currentTrack;

    if (track.source === 'synthesizer' || track.filePath?.startsWith('synth:') || !track.filePath) {
      this.stopAudioElement();
      this.startSynthesizerVibe(track.gameId || 'lofi');
    } else {
      this.stopSynthesizer();
      this.playAudioFile(track.filePath);
    }

    this.emit();
  }

  private playAudioFile(filePath: string) {
    if (!this.audioElement) return;
    let url = filePath;
    if (url.startsWith('file://') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
      // standard url
    } else {
      const normalized = filePath.replace(/\\/g, '/');
      url = /^[a-zA-Z]:\//.test(normalized) ? `file:///${normalized}` : `file://${normalized}`;
    }

    this.audioElement.src = url;
    this.audioElement.play().catch((err) => {
      console.warn('[AudioService] Playback failed, falling back to ambient synth:', err);
      this.startSynthesizerVibe(this.state.currentTrack?.gameId || 'lofi');
    });
  }

  private stopAudioElement() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  public pause(): void {
    this.state.isPlaying = false;
    this.stopAudioElement();
    this.stopSynthesizer();
    this.emit();
  }

  public togglePlay(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public next(): void {
    const list = this.state.playlist.tracks;
    if (list.length === 0) return;
    const nextIdx = (this.state.playlist.currentTrackIndex + 1) % list.length;
    this.selectTrackByIndex(nextIdx);
  }

  public previous(): void {
    const list = this.state.playlist.tracks;
    if (list.length === 0) return;
    const prevIdx = (this.state.playlist.currentTrackIndex - 1 + list.length) % list.length;
    this.selectTrackByIndex(prevIdx);
  }

  public selectTrack(track: Track): void {
    const idx = this.state.playlist.tracks.findIndex((t) => t.id === track.id);
    if (idx !== -1) {
      this.selectTrackByIndex(idx);
    } else {
      // Add track to playlist then select
      this.addTrack(track, true);
    }
  }

  public selectTrackByIndex(index: number): void {
    const list = this.state.playlist.tracks;
    if (index < 0 || index >= list.length) return;

    this.state.playlist.currentTrackIndex = index;
    this.state.currentTrack = list[index];
    this.state.duration = list[index].duration || 0;
    this.state.currentTime = 0;
    this.persistPlaylist();

    if (this.state.isPlaying) {
      this.play();
    } else {
      this.emit();
    }
  }

  public addTrack(track: Track, autoPlay = false): void {
    const exists = this.state.playlist.tracks.some((t) => t.id === track.id);
    if (!exists) {
      this.state.playlist.tracks.push(track);
    }
    const idx = this.state.playlist.tracks.findIndex((t) => t.id === track.id);
    this.persistPlaylist();

    if (autoPlay && idx !== -1) {
      this.selectTrackByIndex(idx);
      this.play();
    } else {
      this.emit();
    }
  }

  public removeTrack(trackId: string): void {
    const list = this.state.playlist.tracks;
    const idx = list.findIndex((t) => t.id === trackId);
    if (idx === -1) return;

    list.splice(idx, 1);
    if (this.state.playlist.currentTrackIndex >= list.length) {
      this.state.playlist.currentTrackIndex = Math.max(0, list.length - 1);
    }
    if (this.state.currentTrack?.id === trackId) {
      this.state.currentTrack = list[this.state.playlist.currentTrackIndex] || null;
      if (this.state.isPlaying && this.state.currentTrack) {
        this.play();
      } else if (!this.state.currentTrack) {
        this.pause();
      }
    }
    this.persistPlaylist();
    this.emit();
  }

  public setVolume(val: number): void {
    const clamped = Math.max(0, Math.min(1, val));
    this.state.volume = clamped;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
    this.emit();
  }

  public seek(seconds: number): void {
    this.state.currentTime = seconds;
    if (this.audioElement && !isNaN(seconds)) {
      this.audioElement.currentTime = seconds;
    }
    this.emit();
  }

  public toggleLoFiRadio(): void {
    this.state.isLoFiRadio = !this.state.isLoFiRadio;
    if (this.state.isLoFiRadio) {
      const radioTrack: Track = {
        id: 'lofi-radio-stream',
        title: 'Astra Lo-Fi Radio — 24/7 Chill Space',
        gameId: 'lofi-radio',
        artist: 'Astra Chill Network',
        album: 'Endless Horizons',
        duration: 9999,
        source: 'radio',
        filePath: 'synth:lofi',
        coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80'
      };
      this.addTrack(radioTrack, true);
    } else {
      this.emit();
    }
  }

  /**
   * Auto-duck volume when game launches (reduce to 30%)
   */
  public duckVolume(): void {
    this.initAudio();
    this.state.isDucked = true;
    if (this.duckGain && this.ctx) {
      this.duckGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.duckGain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.6);
    }
    this.emit();
  }

  /**
   * Restore volume when game closes
   */
  public restoreVolume(): void {
    this.initAudio();
    this.state.isDucked = false;
    if (this.duckGain && this.ctx) {
      this.duckGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.duckGain.gain.linearRampToValueAtTime(1.0, this.ctx.currentTime + 0.8);
    }
    this.emit();
  }

  /**
   * Synthesizer ambient loops for procedural game vibe soundtracking
   */
  private startSynthesizerVibe(vibe: string): void {
    this.stopSynthesizer();
    if (!this.ctx || !this.masterGain) return;

    this.synthGain = this.ctx.createGain();
    this.synthGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    this.synthGain.connect(this.masterGain);

    const baseFrequencies = vibe.includes('cyber')
      ? [110, 164.81, 220, 329.63]
      : vibe.includes('soul') || vibe.includes('fantasy')
      ? [65.41, 130.81, 196.0, 261.63]
      : [130.81, 164.81, 196.0, 246.94]; // Lofi major 7th chords

    this.synthOscillators = baseFrequencies.map((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const panner = typeof this.ctx?.createStereoPanner === 'function' ? this.ctx.createStereoPanner() : null;
      const filter = this.ctx!.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600 + idx * 200, this.ctx!.currentTime);

      if (panner) {
        panner.pan.setValueAtTime((idx / baseFrequencies.length) * 2 - 1, this.ctx!.currentTime);
        osc.connect(filter);
        filter.connect(panner);
        panner.connect(this.synthGain!);
      } else {
        osc.connect(filter);
        filter.connect(this.synthGain!);
      }

      osc.start();
      return osc;
    });

    let currentChordIndex = 0;
    this.synthInterval = setInterval(() => {
      if (!this.ctx || this.synthOscillators.length === 0) return;
      currentChordIndex = (currentChordIndex + 1) % 4;
      const mod = [1, 1.125, 1.25, 1.333][currentChordIndex];
      this.synthOscillators.forEach((osc, i) => {
        const base = baseFrequencies[i] || 110;
        try {
          osc.frequency.setTargetAtTime(base * mod, this.ctx!.currentTime, 1.2);
        } catch {}
      });
    }, 4000);
  }

  private stopSynthesizer(): void {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    this.synthOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.synthOscillators = [];
    if (this.synthGain) {
      try {
        this.synthGain.disconnect();
      } catch {}
      this.synthGain = null;
    }
  }
}

export const AudioService = new AudioServiceClass();
