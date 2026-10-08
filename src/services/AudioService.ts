import type { Track, Playlist, VisualizerConfig } from '../types/Audio.types';
import type { JukeboxTrack, VisualizerMode, AmbientLoFiLayer } from '../types/game';

const PLAYLIST_STORAGE_KEY = 'astra_jukebox_playlist_v3';
const DEFAULT_CONFIG: VisualizerConfig = {
  barCount: 64,
  smoothing: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
  fftSize: 512
};

export const DEFAULT_TRACKS: Track[] = [
  {
    id: 'cyber-pulse',
    title: 'Night City Cyber Pulse',
    gameId: 'cyberpunk-2077',
    artist: 'Astra Sound Labs',
    album: 'Neon Horizon OST',
    duration: 184,
    durationSeconds: 184,
    source: 'synthesizer',
    filePath: 'synth:cyberpunk',
    url: 'synth:cyberpunk',
    vibe: 'cyberpunk',
    coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'golden-horizon',
    title: 'Limgrave Golden Horizon',
    gameId: 'elden-ring',
    artist: 'Astra Philharmonic',
    album: 'Lands Between Chronicles',
    duration: 210,
    durationSeconds: 210,
    source: 'synthesizer',
    filePath: 'synth:souls',
    url: 'synth:souls',
    vibe: 'souls-fantasy',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'lofi-tokyo',
    title: 'Neo-Tokyo Midnight Coffee',
    gameId: 'astra-lofi-radio',
    artist: 'Chilled Astra Beats',
    album: 'Rain & Holograms',
    duration: 195,
    durationSeconds: 195,
    source: 'synthesizer',
    filePath: 'synth:lofi',
    url: 'synth:lofi',
    vibe: 'cozy-wholesome',
    coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'arcade-86',
    title: 'Akihabara 1986 Quarter Drop',
    gameId: 'retro-arcade',
    artist: 'Pixel Pulse Collective',
    album: 'Insert Coin Anthology',
    duration: 142,
    durationSeconds: 142,
    source: 'synthesizer',
    filePath: 'synth:arcade',
    url: 'synth:arcade',
    vibe: 'retro-arcade',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'stellar-drift',
    title: 'Cosmic Stellar Nebula Drift',
    gameId: 'starfield',
    artist: 'Astra Deep Space Observatory',
    album: 'Zero Gravity Solitude',
    duration: 240,
    durationSeconds: 240,
    source: 'synthesizer',
    filePath: 'synth:space',
    url: 'synth:space',
    vibe: 'space-cosmic',
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80'
  }
];

export interface AudioServiceState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number; // 0 to 1
  currentTime: number;
  duration: number;
  durationSeconds?: number;
  isDucked: boolean;
  isLoFiRadio: boolean;
  playlist: Playlist;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  activeAmbientLayers: Set<AmbientLoFiLayer>;
  visualizerMode: VisualizerMode;
}

export type AudioServiceListener = (state: AudioServiceState) => void;

function normalizeAudioUrl(url: string): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('file://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }
  const normalized = url.replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return `file:///${normalized}`;
  }
  if (normalized.startsWith('/')) {
    return `file://${normalized}`;
  }
  return `file:///${normalized}`;
}

class AudioServiceClass {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private duckGain: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;

  // Synthesizer nodes
  private synthGain: GainNode | null = null;
  private synthOscillators: OscillatorNode[] = [];
  private synthInterval: any = null;

  // Ambient soundscape layers (rain / vinyl)
  private rainGain: GainNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private vinylGain: GainNode | null = null;
  private vinylSource: AudioBufferSourceNode | null = null;

  // Progress timer for synthesized tracks
  private progressTimer: any = null;

  private listeners: Set<AudioServiceListener> = new Set();
  private playSessionId: number = 0;

  private state: AudioServiceState = {
    currentTrack: null,
    isPlaying: false,
    volume: 0.8,
    currentTime: 0,
    duration: 184,
    durationSeconds: 184,
    isDucked: false,
    isLoFiRadio: false,
    shuffle: false,
    repeat: 'all',
    activeAmbientLayers: new Set<AmbientLoFiLayer>(),
    visualizerMode: 'bars',
    playlist: {
      id: 'default-playlist',
      name: 'Astra Soundtracks & Beats',
      tracks: [...DEFAULT_TRACKS],
      currentTrackIndex: 0
    }
  };

  private config: VisualizerConfig = DEFAULT_CONFIG;

  constructor() {
    this.loadPersistedPlaylist();
    this.registerGlobalTeardown();
  }

  private registerGlobalTeardown() {
    if (typeof window === 'undefined') return;
    const teardown = () => {
      this.stop();
    };
    window.addEventListener('beforeunload', teardown);
    window.addEventListener('unload', teardown);
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
          const trackDuration = this.state.currentTrack?.duration || this.state.currentTrack?.durationSeconds || 0;
          this.state.duration = trackDuration;
          this.state.durationSeconds = trackDuration;
          return;
        }
      }
    } catch (e) {
      console.warn('[AudioService] Failed to load persisted playlist:', e);
    }

    this.state.currentTrack = DEFAULT_TRACKS[0];
    this.state.duration = DEFAULT_TRACKS[0].duration;
    this.state.durationSeconds = DEFAULT_TRACKS[0].duration;
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
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.state.volume, this.ctx.currentTime);

    this.duckGain = this.ctx.createGain();
    this.duckGain.gain.setValueAtTime(this.state.isDucked ? 0.3 : 1.0, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.config.fftSize;
    this.analyser.smoothingTimeConstant = this.config.smoothing;
    this.analyser.minDecibels = this.config.minDecibels;
    this.analyser.maxDecibels = this.config.maxDecibels;

    // Graph: sources -> masterGain -> duckGain -> analyser -> destination
    this.masterGain.connect(this.duckGain);
    this.duckGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Audio Element setup - single singleton instance
    this.audioElement = new Audio();

    try {
      this.mediaSourceNode = this.ctx.createMediaElementSource(this.audioElement);
      this.mediaSourceNode.connect(this.masterGain);
    } catch (err) {
      console.warn('[AudioService] Could not connect MediaElementSource:', err);
    }

    this.audioElement.addEventListener('timeupdate', () => {
      if (!this.audioElement || !this.state.isPlaying) return;
      this.state.currentTime = Math.floor(this.audioElement.currentTime);
      if (this.audioElement.duration && !isNaN(this.audioElement.duration)) {
        const dur = Math.floor(this.audioElement.duration);
        this.state.duration = dur;
        this.state.durationSeconds = dur;
      }
      this.emit();
    });

    this.audioElement.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audioElement.addEventListener('error', () => {
      // Fallback to synthesizer mode if audio element fails to load/decode
      if (this.state.isPlaying && this.state.currentTrack) {
        console.warn('[AudioService] Audio file error, falling back to synth');
        this.startSynthesizerVibe(this.state.currentTrack.vibe || this.state.currentTrack.gameId || 'lofi');
      }
    });
  }

  public getAnalyser(): AnalyserNode | null {
    this.initAudio();
    return this.analyser;
  }

  public getFrequencyData(array: Uint8Array): void {
    if (this.analyser && this.state.isPlaying) {
      this.analyser.getByteFrequencyData(array as any);
    } else {
      array.fill(0);
    }
  }

  public getTimeDomainData(array: Uint8Array): void {
    if (this.analyser && this.state.isPlaying) {
      this.analyser.getByteTimeDomainData(array as any);
    } else {
      array.fill(128);
    }
  }

  public getState(): AudioServiceState {
    return {
      ...this.state,
      activeAmbientLayers: new Set(this.state.activeAmbientLayers)
    };
  }

  public subscribe(listener: AudioServiceListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  /**
   * Stop all active audio output completely and release resources
   */
  public stop(): void {
    this.playSessionId++;
    this.state.isPlaying = false;
    this.state.currentTime = 0;
    this.stopAudioElement(true);
    this.stopSynthesizer();
    this.stopAmbientLayers();
    this.stopProgressTimer();
    this.emit();
  }

  public pause(): void {
    this.playSessionId++;
    this.state.isPlaying = false;
    this.stopAudioElement(false);
    this.stopSynthesizer();
    this.stopProgressTimer();
    this.emit();
  }

  public async play(): Promise<void> {
    this.initAudio();
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }

    if (!this.state.currentTrack && this.state.playlist.tracks.length > 0) {
      this.state.currentTrack = this.state.playlist.tracks[this.state.playlist.currentTrackIndex || 0];
    }

    if (!this.state.currentTrack) return;

    // Increment session id so any concurrent or scheduled playback cancels
    const currentSession = ++this.playSessionId;

    // Fully tear down any current playback before starting
    this.stopAudioElement(true);
    this.stopSynthesizer();
    this.stopProgressTimer();

    this.state.isPlaying = true;
    const track = this.state.currentTrack;
    const rawPath = track.filePath || track.url || '';

    const isSynth =
      track.source === 'synthesizer' ||
      rawPath.startsWith('synth:') ||
      !rawPath;

    if (isSynth) {
      this.startSynthesizerVibe(track.vibe || track.gameId || 'lofi');
      this.startProgressTimer();
    } else {
      this.playAudioFile(rawPath, currentSession);
    }

    this.updateAmbientLayers();
    this.emit();
  }

  public togglePlay(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  private playAudioFile(filePath: string, sessionId: number) {
    if (!this.audioElement) return;

    const url = normalizeAudioUrl(filePath);
    if (url.startsWith('file://')) {
      this.audioElement.removeAttribute('crossorigin');
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      this.audioElement.crossOrigin = 'anonymous';
    }

    this.audioElement.src = url;
    this.audioElement.currentTime = 0;

    this.audioElement
      .play()
      .then(() => {
        // If playback was stopped while promise was pending, pause immediately
        if (this.playSessionId !== sessionId || !this.state.isPlaying) {
          if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.removeAttribute('src');
            this.audioElement.load();
          }
        }
      })
      .catch((err) => {
        if (this.playSessionId === sessionId && this.state.isPlaying) {
          console.warn('[AudioService] Playback failed, falling back to ambient synth:', err);
          this.startSynthesizerVibe(this.state.currentTrack?.vibe || this.state.currentTrack?.gameId || 'lofi');
          this.startProgressTimer();
          this.emit();
        }
      });
  }

  private stopAudioElement(resetSrc = true) {
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        if (resetSrc) {
          this.audioElement.currentTime = 0;
          this.audioElement.removeAttribute('src');
          this.audioElement.load();
        }
      } catch {}
    }
  }

  private startProgressTimer() {
    this.stopProgressTimer();
    this.progressTimer = setInterval(() => {
      if (this.state.isPlaying) {
        this.state.currentTime += 1;
        if (this.state.duration > 0 && this.state.currentTime >= this.state.duration) {
          this.handleTrackEnded();
        } else {
          this.emit();
        }
      }
    }, 1000);
  }

  private stopProgressTimer() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private handleTrackEnded() {
    if (this.state.repeat === 'one' && this.state.currentTrack) {
      this.play();
    } else if (this.state.repeat === 'all' || this.state.shuffle) {
      this.next();
    } else {
      this.stop();
    }
  }

  public next(): void {
    const list = this.state.playlist.tracks;
    if (list.length === 0) return;
    if (this.state.shuffle) {
      const randIdx = Math.floor(Math.random() * list.length);
      this.selectTrackByIndex(randIdx);
      return;
    }
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
      this.addTrack(track, true);
    }
  }

  public selectTrackByIndex(index: number): void {
    const list = this.state.playlist.tracks;
    if (index < 0 || index >= list.length) return;

    this.state.playlist.currentTrackIndex = index;
    this.state.currentTrack = list[index];
    const dur = list[index].duration || list[index].durationSeconds || 0;
    this.state.duration = dur;
    this.state.durationSeconds = dur;
    this.state.currentTime = 0;
    this.persistPlaylist();

    if (this.state.isPlaying) {
      this.play();
    } else {
      this.emit();
    }
  }

  public playTrack(trackId: string): void {
    const idx = this.state.playlist.tracks.findIndex((t) => t.id === trackId);
    if (idx !== -1) {
      this.selectTrackByIndex(idx);
      this.play();
    } else {
      const defaultTrack = DEFAULT_TRACKS.find((t) => t.id === trackId);
      if (defaultTrack) {
        this.addTrack(defaultTrack, true);
      }
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
        this.stop();
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

  public setVisualizerMode(mode: VisualizerMode): void {
    this.state.visualizerMode = mode;
    this.emit();
  }

  public toggleShuffle(): void {
    this.state.shuffle = !this.state.shuffle;
    this.emit();
  }

  public toggleRepeat(): void {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const curIdx = modes.indexOf(this.state.repeat);
    this.state.repeat = modes[(curIdx + 1) % modes.length];
    this.emit();
  }

  public toggleAmbientLayer(layer: AmbientLoFiLayer): void {
    this.initAudio();
    if (this.state.activeAmbientLayers.has(layer)) {
      this.state.activeAmbientLayers.delete(layer);
    } else {
      this.state.activeAmbientLayers.add(layer);
    }
    this.updateAmbientLayers();
    this.emit();
  }

  public addLocalTrack(fileUrl: string, title: string, artist = 'Local Artist'): void {
    const newTrack: Track = {
      id: `local_${Date.now()}`,
      title,
      gameId: 'local-library',
      artist,
      duration: 210,
      durationSeconds: 210,
      filePath: fileUrl,
      url: fileUrl,
      source: 'local',
      vibe: 'modern-cinematic'
    };
    this.state.playlist.tracks.unshift(newTrack);
    this.persistPlaylist();
    this.selectTrackByIndex(0);
    this.play();
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
        durationSeconds: 9999,
        source: 'radio',
        filePath: 'synth:lofi',
        url: 'synth:lofi',
        vibe: 'cozy-wholesome',
        coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80'
      };
      this.addTrack(radioTrack, true);
    } else {
      this.emit();
    }
  }

  public duckVolume(): void {
    this.initAudio();
    this.state.isDucked = true;
    if (this.duckGain && this.ctx) {
      this.duckGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.duckGain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.6);
    }
    this.emit();
  }

  public restoreVolume(): void {
    this.initAudio();
    this.state.isDucked = false;
    if (this.duckGain && this.ctx) {
      this.duckGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.duckGain.gain.linearRampToValueAtTime(1.0, this.ctx.currentTime + 0.8);
    }
    this.emit();
  }

  public getTracks(): JukeboxTrack[] {
    return this.state.playlist.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist || 'Astra Sound Labs',
      album: t.album,
      durationSeconds: t.duration || t.durationSeconds || 180,
      url: t.filePath || t.url || '',
      source: t.source || 'synthesizer',
      vibe: (t.vibe as any) || 'modern-cinematic',
      coverUrl: t.coverUrl
    }));
  }

  public prevTrack(): void {
    this.previous();
  }

  public nextTrack(): void {
    this.next();
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

    let chords: number[][] = [];
    let bpm = 90;
    let waveType: OscillatorType = 'sine';

    if (vibe.includes('cyber')) {
      chords = [
        [110, 164.81, 220, 329.63],
        [130.81, 196, 261.63, 392],
        [98, 146.83, 196, 293.66],
        [87.31, 130.81, 174.61, 261.63]
      ];
      bpm = 110;
      waveType = 'sawtooth';
    } else if (vibe.includes('soul') || vibe.includes('fantasy')) {
      chords = [
        [146.83, 220, 293.66, 440],
        [110, 164.81, 220, 329.63],
        [123.47, 185, 246.94, 370],
        [98, 146.83, 196, 293.66]
      ];
      bpm = 68;
      waveType = 'triangle';
    } else if (vibe.includes('arcade')) {
      chords = [
        [261.63, 329.63, 392, 523.25],
        [220, 261.63, 329.63, 440],
        [174.61, 220, 261.63, 349.23],
        [196, 246.94, 293.66, 392]
      ];
      bpm = 128;
      waveType = 'square';
    } else {
      // Lo-fi & Space ambient
      chords = [
        [130.81, 164.81, 196, 246.94, 329.63],
        [110, 146.83, 174.61, 220, 293.66],
        [98, 130.81, 164.81, 196, 246.94],
        [87.31, 130.81, 164.81, 196, 261.63]
      ];
      bpm = 74;
      waveType = 'sine';
    }

    let chordStep = 0;
    const playChord = () => {
      if (!this.ctx || !this.synthGain || !this.state.isPlaying) return;
      const currentChord = chords[chordStep % chords.length];
      chordStep++;

      currentChord.forEach((freq, idx) => {
        if (!this.ctx || !this.synthGain) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        osc.type = waveType;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        const duration = (60 / bpm) * 3.8;
        noteGain.gain.setValueAtTime(0, this.ctx.currentTime);
        noteGain.gain.linearRampToValueAtTime(0.08 / (idx + 1), this.ctx.currentTime + 0.6);
        noteGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(noteGain);
        noteGain.connect(this.synthGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
        this.synthOscillators.push(osc);
      });
    };

    playChord();
    const intervalMs = (60 / bpm) * 4000;
    this.synthInterval = setInterval(playChord, intervalMs);
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

  private updateAmbientLayers() {
    if (!this.ctx || !this.masterGain) return;

    // Vinyl crackle simulation
    if (this.state.activeAmbientLayers.has('vinyl')) {
      if (!this.vinylGain) {
        this.vinylGain = this.ctx.createGain();
        this.vinylGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        this.vinylGain.connect(this.masterGain);

        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() > 0.985 ? (Math.random() * 2 - 1) * 0.4 : (Math.random() * 2 - 1) * 0.02;
        }
        this.vinylSource = this.ctx.createBufferSource();
        this.vinylSource.buffer = buffer;
        this.vinylSource.loop = true;
        this.vinylSource.connect(this.vinylGain);
        this.vinylSource.start();
      }
    } else {
      this.stopVinylLayer();
    }

    // Rain ambient simulation
    if (this.state.activeAmbientLayers.has('rain')) {
      if (!this.rainGain) {
        this.rainGain = this.ctx.createGain();
        this.rainGain.gain.setValueAtTime(0.09, this.ctx.currentTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);

        this.rainGain.connect(filter);
        filter.connect(this.masterGain);

        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        this.rainSource = this.ctx.createBufferSource();
        this.rainSource.buffer = buffer;
        this.rainSource.loop = true;
        this.rainSource.connect(this.rainGain);
        this.rainSource.start();
      }
    } else {
      this.stopRainLayer();
    }
  }

  private stopVinylLayer() {
    if (this.vinylSource) {
      try {
        this.vinylSource.stop();
        this.vinylSource.disconnect();
      } catch {}
      this.vinylSource = null;
    }
    if (this.vinylGain) {
      try {
        this.vinylGain.disconnect();
      } catch {}
      this.vinylGain = null;
    }
  }

  private stopRainLayer() {
    if (this.rainSource) {
      try {
        this.rainSource.stop();
        this.rainSource.disconnect();
      } catch {}
      this.rainSource = null;
    }
    if (this.rainGain) {
      try {
        this.rainGain.disconnect();
      } catch {}
      this.rainGain = null;
    }
  }

  private stopAmbientLayers() {
    this.stopVinylLayer();
    this.stopRainLayer();
  }
}

export const AudioService = new AudioServiceClass();
