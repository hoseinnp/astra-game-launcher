/**
 * Astra Jukebox Engine — Web Audio API Sound Studio & Real-Time Audio Visualizer
 */
import type { JukeboxTrack, VisualizerMode, AmbientLoFiLayer } from '../types/game';

export interface JukeboxState {
  currentTrack: JukeboxTrack | null;
  isPlaying: boolean;
  volume: number; // 0 to 1
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  activeAmbientLayers: Set<AmbientLoFiLayer>;
  visualizerMode: VisualizerMode;
  isDucked: boolean;
}

export type JukeboxListener = (state: JukeboxState) => void;

function normalizeAudioUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://') || url.startsWith('blob:') || url.startsWith('data:')) {
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

class JukeboxEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;

  // Synthesized Ambient Loop Nodes
  private synthGain: GainNode | null = null;
  private synthOscillators: OscillatorNode[] = [];
  private synthInterval: any = null;
  private rainGain: GainNode | null = null;
  private vinylGain: GainNode | null = null;

  private listeners: Set<JukeboxListener> = new Set();

  private tracks: JukeboxTrack[] = [
    {
      id: 'cyber-pulse',
      title: 'Night City Cyber Pulse',
      artist: 'Astra Sound Labs',
      album: 'Neon Horizon OST',
      durationSeconds: 184,
      url: 'synth:cyberpunk',
      source: 'synthesizer',
      vibe: 'cyberpunk',
      coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: 'golden-horizon',
      title: 'Limgrave Golden Horizon',
      artist: 'Astra Philharmonic',
      album: 'Lands Between Chronicles',
      durationSeconds: 210,
      url: 'synth:souls',
      source: 'synthesizer',
      vibe: 'souls-fantasy',
      coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: 'lofi-tokyo',
      title: 'Neo-Tokyo Midnight Coffee',
      artist: 'Chilled Astra Beats',
      album: 'Rain & Holograms',
      durationSeconds: 195,
      url: 'synth:lofi',
      source: 'synthesizer',
      vibe: 'cozy-wholesome',
      coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: 'arcade-86',
      title: 'Akihabara 1986 Quarter Drop',
      artist: 'Pixel Pulse Collective',
      album: 'Insert Coin Anthology',
      durationSeconds: 142,
      url: 'synth:arcade',
      source: 'synthesizer',
      vibe: 'retro-arcade',
      coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: 'stellar-drift',
      title: 'Cosmic Stellar Nebula Drift',
      artist: 'Astra Deep Space Observatory',
      album: 'Event Horizon Suite',
      durationSeconds: 240,
      url: 'synth:space',
      source: 'synthesizer',
      vibe: 'space-cosmic',
      coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80'
    }
  ];

  private state: JukeboxState = {
    currentTrack: null,
    isPlaying: false,
    volume: 0.75,
    currentTime: 0,
    duration: 184,
    shuffle: false,
    repeat: 'all',
    activeAmbientLayers: new Set<AmbientLoFiLayer>(),
    visualizerMode: 'bars',
    isDucked: false
  };

  private timerInterval: any = null;

  constructor() {
    this.state.currentTrack = this.tracks[0];
  }

  private initAudio() {
    if (this.ctx) return;
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;

    this.ctx = new AudioCtxClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.state.volume, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.82;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Synth Sub-Mixer
    this.synthGain = this.ctx.createGain();
    this.synthGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.synthGain.connect(this.masterGain);

    // Audio element for local MP3/WAV playback
    this.audioElement = new Audio();
    this.mediaSourceNode = this.ctx.createMediaElementSource(this.audioElement);
    this.mediaSourceNode.connect(this.masterGain);

    this.audioElement.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.audioElement && this.state.currentTrack?.source === 'local') {
        this.state.currentTime = this.audioElement.currentTime;
        this.notify();
      }
    });
  }

  public subscribe(fn: JukeboxListener): () => void {
    this.listeners.add(fn);
    fn(this.getState());
    return () => this.listeners.delete(fn);
  }

  private notify() {
    const copy = this.getState();
    this.listeners.forEach((fn) => fn(copy));
  }

  public getState(): JukeboxState {
    return {
      ...this.state,
      activeAmbientLayers: new Set(this.state.activeAmbientLayers)
    };
  }

  public getTracks(): JukeboxTrack[] {
    return [...this.tracks];
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getFrequencyData(array: Uint8Array<any>) {
    if (this.analyser && this.state.isPlaying) {
      (this.analyser as any).getByteFrequencyData(array);
    } else {
      array.fill(0);
    }
  }

  public getTimeDomainData(array: Uint8Array<any>) {
    if (this.analyser && this.state.isPlaying) {
      (this.analyser as any).getByteTimeDomainData(array);
    } else {
      array.fill(128);
    }
  }

  public async playTrack(trackId: string) {
    this.initAudio();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) return;

    this.stopCurrentAudio();
    this.state.currentTrack = track;
    this.state.isPlaying = true;
    this.state.currentTime = 0;
    this.state.duration = track.durationSeconds;

    if (track.source === 'local' && this.audioElement) {
      const srcUrl = normalizeAudioUrl(track.url);
      if (srcUrl.startsWith('file://')) {
        this.audioElement.removeAttribute('crossorigin');
      } else if (srcUrl.startsWith('http://') || srcUrl.startsWith('https://')) {
        this.audioElement.crossOrigin = 'anonymous';
      }
      this.audioElement.src = srcUrl;
      this.audioElement.play().catch(() => {});
    } else {
      this.startSynthesizedSuite(track.id);
    }

    this.startProgressTimer();
    this.notify();
  }

  public togglePlay() {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      if (this.state.currentTrack) {
        this.playTrack(this.state.currentTrack.id);
      } else if (this.tracks.length > 0) {
        this.playTrack(this.tracks[0].id);
      }
    }
  }

  public pause() {
    this.state.isPlaying = false;
    this.stopCurrentAudio();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.notify();
  }

  public nextTrack() {
    if (this.tracks.length === 0) return;
    if (this.state.shuffle) {
      const randIdx = Math.floor(Math.random() * this.tracks.length);
      this.playTrack(this.tracks[randIdx].id);
      return;
    }
    const curIdx = this.tracks.findIndex((t) => t.id === this.state.currentTrack?.id);
    const nextIdx = (curIdx + 1) % this.tracks.length;
    this.playTrack(this.tracks[nextIdx].id);
  }

  public prevTrack() {
    if (this.tracks.length === 0) return;
    const curIdx = this.tracks.findIndex((t) => t.id === this.state.currentTrack?.id);
    const prevIdx = (curIdx - 1 + this.tracks.length) % this.tracks.length;
    this.playTrack(this.tracks[prevIdx].id);
  }

  public setVolume(vol: number) {
    this.initAudio();
    const clamped = Math.max(0, Math.min(1, vol));
    this.state.volume = clamped;
    if (this.masterGain && this.ctx && !this.state.isDucked) {
      this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public setVisualizerMode(mode: VisualizerMode) {
    this.state.visualizerMode = mode;
    this.notify();
  }

  public toggleShuffle() {
    this.state.shuffle = !this.state.shuffle;
    this.notify();
  }

  public toggleRepeat() {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const curIdx = modes.indexOf(this.state.repeat);
    this.state.repeat = modes[(curIdx + 1) % modes.length];
    this.notify();
  }

  public toggleAmbientLayer(layer: AmbientLoFiLayer) {
    this.initAudio();
    if (this.state.activeAmbientLayers.has(layer)) {
      this.state.activeAmbientLayers.delete(layer);
    } else {
      this.state.activeAmbientLayers.add(layer);
    }
    this.updateAmbientLayers();
    this.notify();
  }

  public addLocalTrack(fileUrl: string, title: string, artist = 'Local Artist') {
    const newTrack: JukeboxTrack = {
      id: `local_${Date.now()}`,
      title,
      artist,
      durationSeconds: 210,
      url: fileUrl,
      source: 'local',
      vibe: 'modern-cinematic'
    };
    this.tracks.unshift(newTrack);
    this.playTrack(newTrack.id);
  }

  /**
   * Smart Volume Ducking: smooth fade when game launches
   */
  public duckVolume() {
    if (!this.masterGain || !this.ctx) return;
    this.state.isDucked = true;
    this.masterGain.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.4);
    this.notify();
  }

  public restoreVolume() {
    if (!this.masterGain || !this.ctx) return;
    this.state.isDucked = false;
    this.masterGain.gain.setTargetAtTime(this.state.volume, this.ctx.currentTime, 0.5);
    this.notify();
  }

  private handleTrackEnded() {
    if (this.state.repeat === 'one' && this.state.currentTrack) {
      this.playTrack(this.state.currentTrack.id);
    } else if (this.state.repeat === 'all' || this.state.shuffle) {
      this.nextTrack();
    } else {
      this.pause();
    }
  }

  private startProgressTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.state.isPlaying) {
        this.state.currentTime += 1;
        if (this.state.currentTime >= this.state.duration) {
          this.handleTrackEnded();
        } else {
          this.notify();
        }
      }
    }, 1000);
  }

  private stopCurrentAudio() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
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
  }

  /**
   * Generates dynamic algorithmic harmonic progressions for synth tracks
   */
  private startSynthesizedSuite(trackId: string) {
    if (!this.ctx || !this.synthGain) return;

    let chords: number[][] = [];
    let bpm = 90;
    let waveType: OscillatorType = 'sine';

    if (trackId === 'cyber-pulse') {
      chords = [
        [110, 164.81, 220, 329.63], // A2 chord
        [130.81, 196, 261.63, 392],  // C3 chord
        [98, 146.83, 196, 293.66],   // G2 chord
        [87.31, 130.81, 174.61, 261.63] // F2 chord
      ];
      bpm = 110;
      waveType = 'sawtooth';
    } else if (trackId === 'golden-horizon') {
      chords = [
        [146.83, 220, 293.66, 440], // D3
        [110, 164.81, 220, 329.63], // A2
        [123.47, 185, 246.94, 370], // B2
        [98, 146.83, 196, 293.66]   // G2
      ];
      bpm = 68;
      waveType = 'triangle';
    } else if (trackId === 'arcade-86') {
      chords = [
        [261.63, 329.63, 392, 523.25], // C4
        [220, 261.63, 329.63, 440],    // A3
        [174.61, 220, 261.63, 349.23], // F3
        [196, 246.94, 293.66, 392]     // G3
      ];
      bpm = 128;
      waveType = 'square';
    } else {
      // Lo-fi & Space ambient
      chords = [
        [130.81, 164.81, 196, 246.94, 329.63], // Cmaj9
        [110, 146.83, 174.61, 220, 293.66],    // Dm9
        [98, 130.81, 164.81, 196, 246.94],     // Em7
        [87.31, 130.81, 164.81, 196, 261.63]   // Fmaj7
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
        const osc = this.ctx!.createOscillator();
        const noteGain = this.ctx!.createGain();

        osc.type = waveType;
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

        const duration = (60 / bpm) * 3.8;
        noteGain.gain.setValueAtTime(0, this.ctx!.currentTime);
        noteGain.gain.linearRampToValueAtTime(0.08 / (idx + 1), this.ctx!.currentTime + 0.6);
        noteGain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + duration);

        osc.connect(noteGain);
        noteGain.connect(this.synthGain!);

        osc.start();
        osc.stop(this.ctx!.currentTime + duration);
        this.synthOscillators.push(osc);
      });
    };

    playChord();
    const intervalMs = (60 / bpm) * 4000;
    this.synthInterval = setInterval(playChord, intervalMs);
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
        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;
        whiteNoise.loop = true;
        whiteNoise.connect(this.vinylGain);
        whiteNoise.start();
      }
    } else if (this.vinylGain) {
      this.vinylGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.vinylGain.disconnect();
      this.vinylGain = null;
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
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        noise.connect(this.rainGain);
        noise.start();
      }
    } else if (this.rainGain) {
      this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.rainGain.disconnect();
      this.rainGain = null;
    }
  }
}

export const jukeboxEngine = new JukeboxEngine();
