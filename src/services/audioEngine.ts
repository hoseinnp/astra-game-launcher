class AudioEngine {
  private ctx: AudioContext | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private currentBgmUrl: string | null = null;
  private sfxEnabled: boolean = true;
  private sfxVolume: number = 0.7;
  private bgmEnabled: boolean = true;
  private bgmVolume: number = 0.4;
  private fadeInterval: number | null = null;

  // Procedural theme-based ambient soundscape synthesizer
  private currentAmbientVibe: string | null = null;
  private ambientMasterGain: GainNode | null = null;
  private ambientCleanup: (() => void) | null = null;
  private isSynthesizingAmbient: boolean = false;

  constructor() {
    // Lazy initialize AudioContext on user interaction
    const initAudio = () => {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    };
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });

    // Handle window blur / focus to save CPU and audio resources
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.ctx && this.ctx.state === 'running') {
            this.ctx.suspend().catch(() => {});
          }
          if (this.bgmAudio && !this.bgmAudio.paused) {
            this.bgmAudio.pause();
          }
        } else {
          if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
          }
          if (this.bgmAudio && this.bgmEnabled) {
            this.bgmAudio.play().catch(() => {});
          }
        }
      });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public updateConfig(config: { sfxEnabled?: boolean; sfxVolume?: number; bgmEnabled?: boolean; bgmVolume?: number }) {
    if (config.sfxEnabled !== undefined) this.sfxEnabled = config.sfxEnabled;
    if (config.sfxVolume !== undefined) this.sfxVolume = config.sfxVolume;
    if (config.bgmEnabled !== undefined) {
      this.bgmEnabled = config.bgmEnabled;
      if (!this.bgmEnabled) {
        this.stopBgm();
        this.stopThemeAmbient();
      }
    }
    if (config.bgmVolume !== undefined) {
      this.bgmVolume = config.bgmVolume;
      if (this.bgmAudio) {
        this.bgmAudio.volume = this.bgmVolume;
      }
      if (this.ambientMasterGain && this.ctx) {
        this.ambientMasterGain.gain.setTargetAtTime(this.bgmVolume, this.ctx.currentTime, 0.1);
      }
    }
  }

  public isBgmActive(): boolean {
    return (this.bgmAudio !== null && !this.bgmAudio.paused) || this.isSynthesizingAmbient;
  }

  public getCurrentVibe(): string | null {
    return this.currentAmbientVibe;
  }

  // ASTRA SIGNATURE SONIC IDENTITY: "The Prism Tick" (Dual-tone crystal glass transient)
  public playHover() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // High glass transient ping (A6: 1760Hz & E7: 2637Hz)
      const freqs = [1760, 2637];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.035);

        gain.gain.setValueAtTime((0.05 / (idx + 1)) * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };

        osc.start(now);
        osc.stop(now + 0.04);
      });
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  // ASTRA SIGNATURE SONIC IDENTITY: "The Astra Resonance" (Sub-implosion + E Major 9th glass harmonics)
  public playBoot() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Deep Sub-Bass Implosion (42Hz -> 84Hz inward pull)
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(42, now);
      sub.frequency.exponentialRampToValueAtTime(84, now + 0.55);
      subGain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
      sub.connect(subGain);
      subGain.connect(ctx.destination);

      sub.onended = () => {
        try {
          sub.disconnect();
          subGain.disconnect();
        } catch {}
      };

      sub.start(now);
      sub.stop(now + 0.96);

      // 2. Proprietary Astra E Major Ninth Chord: E2 (82.41), B2 (123.47), G#3 (207.65), D#4 (311.13), F#4 (369.99), E5 (659.25)
      const astraChord = [82.41, 123.47, 207.65, 311.13, 369.99, 659.25];
      astraChord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const delay = idx * 0.038;

        osc.type = idx < 2 ? 'sine' : idx < 4 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0.14 * this.sfxVolume, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35 + delay);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };

        osc.start(now + delay);
        osc.stop(now + 1.4 + delay);
      });
    } catch {}
  }

  // ASTRA SIGNATURE SONIC IDENTITY: "The Confirmation Chime"
  public playSelect() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [659.25, 987.77].forEach((freq) => { // E5 & B5
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.11 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };

        osc.start(now);
        osc.stop(now + 0.22);
      });
    } catch {}
  }

  // ASTRA SIGNATURE SONIC IDENTITY: "The Quantum Warp Launch" (Resonant sweep + sub drop)
  public playLaunch() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Quantum frequency sweep ascending
      const sweepOsc = ctx.createOscillator();
      const sweepGain = ctx.createGain();
      sweepOsc.type = 'sawtooth';
      sweepOsc.frequency.setValueAtTime(130.81, now);
      sweepOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.38);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.38);

      sweepGain.gain.setValueAtTime(0.18 * this.sfxVolume, now);
      sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

      sweepOsc.connect(filter);
      filter.connect(sweepGain);
      sweepGain.connect(ctx.destination);

      sweepOsc.onended = () => {
        try {
          sweepOsc.disconnect();
          filter.disconnect();
          sweepGain.disconnect();
        } catch {}
      };

      sweepOsc.start(now);
      sweepOsc.stop(now + 0.43);

      // 2. Cinematic Sub Drop (Sub-bass impact at climax)
      const subDrop = ctx.createOscillator();
      const subDropGain = ctx.createGain();
      subDrop.type = 'sine';
      subDrop.frequency.setValueAtTime(95, now + 0.1);
      subDrop.frequency.exponentialRampToValueAtTime(36, now + 0.55);

      subDropGain.gain.setValueAtTime(0.35 * this.sfxVolume, now + 0.1);
      subDropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      subDrop.connect(subDropGain);
      subDropGain.connect(ctx.destination);

      subDrop.onended = () => {
        try {
          subDrop.disconnect();
          subDropGain.disconnect();
        } catch {}
      };

      subDrop.start(now + 0.1);
      subDrop.stop(now + 0.6);
    } catch {}
  }

  // PlayStation Trophy / Achievement Unlock Chime
  public playTrophy() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Note 1: Sparkle intro (1046.5 Hz - C6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1046.5, now);
      gain1.gain.setValueAtTime(0.18 * this.sfxVolume, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.onended = () => {
        try {
          osc1.disconnect();
          gain1.disconnect();
        } catch {}
      };

      osc1.start(now);
      osc1.stop(now + 0.3);

      // Notes 2 & 3: Triumphant Shimmer chord
      [1318.5, 1567.98, 2093.0].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + 0.08);

        gain.gain.setValueAtTime(0.15 * this.sfxVolume, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55 + i * 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {}
        };

        osc.start(now + 0.08);
        osc.stop(now + 0.65);
      });
    } catch {}
  }

  // Play static game soundtrack / OST with smooth crossfade
  public playBgm(url?: string) {
    if (!url || !this.bgmEnabled) {
      this.stopBgm();
      return;
    }

    if (this.currentBgmUrl === url && this.bgmAudio && !this.bgmAudio.paused) {
      return;
    }

    this.stopThemeAmbient();
    this.stopBgm();
    this.currentBgmUrl = url;

    try {
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = 0;
      this.bgmAudio = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            let vol = 0;
            const targetVol = this.bgmVolume;
            const step = targetVol / 15;
            this.fadeInterval = window.setInterval(() => {
              if (!this.bgmAudio) {
                if (this.fadeInterval) clearInterval(this.fadeInterval);
                return;
              }
              vol = Math.min(targetVol, vol + step);
              this.bgmAudio.volume = vol;
              if (vol >= targetVol) {
                if (this.fadeInterval) clearInterval(this.fadeInterval);
              }
            }, 50);
          })
          .catch(() => {});
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  public stopBgm() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
    if (this.bgmAudio) {
      try {
        this.bgmAudio.pause();
        this.bgmAudio.removeAttribute('src');
        this.bgmAudio.load();
      } catch {}
      this.bgmAudio = null;
    }
    this.currentBgmUrl = null;
  }

  // =========================================================================
  // THEME-BASED PROCEDURAL AMBIENT SOUNDSCAPE SYNTHESIZER
  // =========================================================================

  /**
   * Dynamically generates and loops an ambient musical atmosphere tailored to the game's theme/vibe.
   * If a custom BGM file URL is specified, it plays that instead.
   */
  public playThemeAmbient(vibe: string = 'modern-cinematic', customBgmUrl?: string) {
    if (customBgmUrl) {
      this.playBgm(customBgmUrl);
      return;
    }

    if (!this.bgmEnabled) {
      this.stopThemeAmbient();
      return;
    }

    // If custom audio file is playing, stop it
    if (this.bgmAudio) {
      this.stopBgm();
    }

    const cleanVibe = vibe === 'auto' ? 'modern-cinematic' : vibe;
    if (this.currentAmbientVibe === cleanVibe && this.isSynthesizingAmbient) {
      return; // Already playing this soundscape
    }

    // Cross-fade out existing ambient soundscape
    this.stopThemeAmbient();

    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.currentAmbientVibe = cleanVibe;
    this.isSynthesizingAmbient = true;

    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      // Smooth fade-in over 1.6s
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.exponentialRampToValueAtTime(Math.max(0.001, this.bgmVolume), now + 1.6);
      masterGain.connect(ctx.destination);
      this.ambientMasterGain = masterGain;

      const activeOscillators: OscillatorNode[] = [];
      const activeGains: GainNode[] = [];
      const activeIntervals: number[] = [];

      // Route all vibe generators through masterGain
      switch (cleanVibe) {
        case 'cyberpunk':
          this.buildCyberpunkAmbient(ctx, masterGain, activeOscillators, activeGains, activeIntervals);
          break;
        case 'souls-fantasy':
          this.buildSoulsAmbient(ctx, masterGain, activeOscillators, activeGains, activeIntervals);
          break;
        case 'retro-arcade':
          this.buildRetroArcadeAmbient(ctx, masterGain, activeOscillators, activeGains, activeIntervals);
          break;
        case 'tactical-military':
          this.buildTacticalAmbient(ctx, masterGain, activeOscillators, activeGains, activeIntervals);
          break;
        case 'anime-stylized':
          this.buildAnimeAmbient(ctx, masterGain, activeOscillators, activeGains, activeIntervals);
          break;
        case 'cozy-wholesome':
          this.buildCozyAmbient(ctx, masterGain, activeOscillators, activeGains, activeIntervals);
          break;
        case 'space-stars':
        case 'cosmic':
          this.buildCosmicAmbient(ctx, masterGain, activeOscillators, activeGains, activeIntervals);
          break;
        case 'modern-cinematic':
        default:
          this.buildModernCinematicAmbient(ctx, masterGain, activeOscillators, activeGains, activeIntervals);
          break;
      }

      this.ambientCleanup = () => {
        try {
          activeIntervals.forEach((id) => clearInterval(id));
          const t = ctx.currentTime;
          masterGain.gain.cancelScheduledValues(t);
          masterGain.gain.setValueAtTime(masterGain.gain.value, t);
          masterGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);

          setTimeout(() => {
            try {
              activeOscillators.forEach((osc) => {
                try {
                  osc.stop();
                  osc.disconnect();
                } catch {}
              });
              activeGains.forEach((g) => {
                try {
                  g.disconnect();
                } catch {}
              });
              masterGain.disconnect();
            } catch {}
          }, 900);
        } catch {}
      };
    } catch (e) {
      console.warn('Failed to start ambient theme music:', e);
    }
  }

  public stopThemeAmbient() {
    if (this.ambientCleanup) {
      this.ambientCleanup();
      this.ambientCleanup = null;
    }
    this.ambientMasterGain = null;
    this.currentAmbientVibe = null;
    this.isSynthesizingAmbient = false;
  }

  // 1. CYBERPUNK: Deep analog sub drone (A1 = 55Hz) + slow resonant filter sweep + digital arpeggiated telemetry
  private buildCyberpunkAmbient(
    ctx: AudioContext,
    output: GainNode,
    oscs: OscillatorNode[],
    gains: GainNode[],
    intervals: number[]
  ) {
    const now = ctx.currentTime;

    // Sub Drone Oscillator (Sawtooth + Lowpass)
    const droneOsc = ctx.createOscillator();
    droneOsc.type = 'sawtooth';
    droneOsc.frequency.setValueAtTime(55, now); // A1
    oscs.push(droneOsc);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);
    filter.Q.setValueAtTime(4, now);

    // LFO to slowly sweep the cutoff (0.07 Hz breathing)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.07, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(90, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    oscs.push(lfo);

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.18, now);
    gains.push(droneGain);

    droneOsc.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(output);

    droneOsc.start(now);
    lfo.start(now);

    // Secondary fifth tone (E2 = 82.41Hz)
    const fifthOsc = ctx.createOscillator();
    fifthOsc.type = 'sine';
    fifthOsc.frequency.setValueAtTime(82.41, now);
    const fifthGain = ctx.createGain();
    fifthGain.gain.setValueAtTime(0.1, now);
    fifthOsc.connect(fifthGain);
    fifthGain.connect(output);
    oscs.push(fifthOsc);
    gains.push(fifthGain);
    fifthOsc.start(now);

    // Periodic Digital Telemetry Pulses (A4, C5, E5, G5)
    const telemetryNotes = [440, 523.25, 659.25, 783.99, 880];
    const pingInterval = window.setInterval(() => {
      if (!this.isSynthesizingAmbient || !this.ctx) return;
      try {
        const pingTime = this.ctx.currentTime;
        const note = telemetryNotes[Math.floor(Math.random() * telemetryNotes.length)];
        const pingOsc = this.ctx.createOscillator();
        const pingGain = this.ctx.createGain();

        pingOsc.type = 'square';
        pingOsc.frequency.setValueAtTime(note, pingTime);

        pingGain.gain.setValueAtTime(0.015, pingTime);
        pingGain.gain.exponentialRampToValueAtTime(0.0001, pingTime + 0.35);

        const pingFilter = this.ctx.createBiquadFilter();
        pingFilter.type = 'bandpass';
        pingFilter.frequency.setValueAtTime(note, pingTime);
        pingFilter.Q.setValueAtTime(6, pingTime);

        pingOsc.connect(pingFilter);
        pingFilter.connect(pingGain);
        pingGain.connect(output);

        pingOsc.onended = () => {
          pingOsc.disconnect();
          pingGain.disconnect();
          pingFilter.disconnect();
        };

        pingOsc.start(pingTime);
        pingOsc.stop(pingTime + 0.36);
      } catch {}
    }, 2400);

    intervals.push(pingInterval);
  }

  // 2. SOULS-FANTASY: Ethereal Gothic fifths pad (D2, A2, D3, F3) + cathedral reverb breathing swell
  private buildSoulsAmbient(
    ctx: AudioContext,
    output: GainNode,
    oscs: OscillatorNode[],
    gains: GainNode[],
    _intervals: number[]
  ) {
    const now = ctx.currentTime;
    const chords = [73.42, 110.0, 146.83, 174.61]; // D2, A2, D3, F3

    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320 + idx * 40, now);

      gain.gain.setValueAtTime(0.08 / chords.length, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(output);

      oscs.push(osc);
      gains.push(gain);
      osc.start(now);
    });

    // Dark Choir / Organ swell (A3 = 220Hz with slow sinusoidal amplitude swell)
    const swellOsc = ctx.createOscillator();
    const swellGain = ctx.createGain();
    swellOsc.type = 'sine';
    swellOsc.frequency.setValueAtTime(220, now);

    const swellLfo = ctx.createOscillator();
    swellLfo.type = 'sine';
    swellLfo.frequency.setValueAtTime(0.12, now); // ~8.3 second slow swell
    const swellLfoGain = ctx.createGain();
    swellLfoGain.gain.setValueAtTime(0.04, now);

    swellLfo.connect(swellLfoGain);
    swellLfoGain.connect(swellGain.gain);

    swellGain.gain.setValueAtTime(0.05, now);
    swellOsc.connect(swellGain);
    swellGain.connect(output);

    oscs.push(swellOsc, swellLfo);
    gains.push(swellGain, swellLfoGain);

    swellOsc.start(now);
    swellLfo.start(now);
  }

  // 3. RETRO-ARCADE: Warm 8-bit nostalgic pentatonic arpeggio sequence with lowpass warmth
  private buildRetroArcadeAmbient(
    ctx: AudioContext,
    output: GainNode,
    oscs: OscillatorNode[],
    gains: GainNode[],
    intervals: number[]
  ) {
    const now = ctx.currentTime;

    // Sub bass line (C2 = 65.4Hz)
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'triangle';
    bassOsc.frequency.setValueAtTime(65.4, now);
    bassGain.gain.setValueAtTime(0.12, now);
    bassOsc.connect(bassGain);
    bassGain.connect(output);
    oscs.push(bassOsc);
    gains.push(bassGain);
    bassOsc.start(now);

    // Warm filtered 8-bit arpeggios (C4, E4, G4, B4, D5)
    const arpNotes = [261.63, 329.63, 392.0, 493.88, 587.33, 493.88, 392.0, 329.63];
    let noteIdx = 0;

    const arpInterval = window.setInterval(() => {
      if (!this.isSynthesizingAmbient || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const note = arpNotes[noteIdx % arpNotes.length];
        noteIdx++;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'square';
        osc.frequency.setValueAtTime(note, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(680, t); // Soften square wave into nostalgic lo-fi tone
        filter.Q.setValueAtTime(2.5, t);

        gain.gain.setValueAtTime(0.025, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(output);

        osc.onended = () => {
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        };

        osc.start(t);
        osc.stop(t + 0.39);
      } catch {}
    }, 420);

    intervals.push(arpInterval);
  }

  // 4. TACTICAL-MILITARY: Low stealth rumble (45Hz) + periodic radar sonar ping
  private buildTacticalAmbient(
    ctx: AudioContext,
    output: GainNode,
    oscs: OscillatorNode[],
    gains: GainNode[],
    intervals: number[]
  ) {
    const now = ctx.currentTime;

    // Low tension sub rumble
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(46.25, now); // F#1
    subGain.gain.setValueAtTime(0.18, now);
    subOsc.connect(subGain);
    subGain.connect(output);
    oscs.push(subOsc);
    gains.push(subGain);
    subOsc.start(now);

    // Secondary tension harmonic (C#2 = 69.3Hz)
    const tenOsc = ctx.createOscillator();
    const tenGain = ctx.createGain();
    tenOsc.type = 'triangle';
    tenOsc.frequency.setValueAtTime(69.3, now);
    tenGain.gain.setValueAtTime(0.06, now);
    tenOsc.connect(tenGain);
    tenGain.connect(output);
    oscs.push(tenOsc);
    gains.push(tenGain);
    tenOsc.start(now);

    // Sonar Ping Tone every 4.5 seconds
    const sonarInterval = window.setInterval(() => {
      if (!this.isSynthesizingAmbient || !this.ctx) return;
      try {
        const pingTime = this.ctx.currentTime;
        const pingOsc = this.ctx.createOscillator();
        const pingGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        pingOsc.type = 'sine';
        pingOsc.frequency.setValueAtTime(1250, pingTime);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1250, pingTime);
        filter.Q.setValueAtTime(10, pingTime);

        pingGain.gain.setValueAtTime(0.04, pingTime);
        pingGain.gain.exponentialRampToValueAtTime(0.0001, pingTime + 1.2);

        pingOsc.connect(filter);
        filter.connect(pingGain);
        pingGain.connect(output);

        pingOsc.onended = () => {
          pingOsc.disconnect();
          filter.disconnect();
          pingGain.disconnect();
        };

        pingOsc.start(pingTime);
        pingOsc.stop(pingTime + 1.25);
      } catch {}
    }, 4500);

    intervals.push(sonarInterval);
  }

  // 5. ANIME-STYLIZED: High-energy uplifting Major 9th chord swells (Fmaj9 / Cmaj9)
  private buildAnimeAmbient(
    ctx: AudioContext,
    output: GainNode,
    oscs: OscillatorNode[],
    gains: GainNode[],
    _intervals: number[]
  ) {
    const now = ctx.currentTime;
    const animeNotes = [174.61, 220.0, 261.63, 329.63, 392.0]; // F3, A3, C4, E4, G4 (Fmaj9)

    animeNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550, now);

      // Subtle detune for shimmer chorus
      osc.detune.setValueAtTime((idx - 2) * 4, now);

      gain.gain.setValueAtTime(0.06 / animeNotes.length, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(output);

      oscs.push(osc);
      gains.push(gain);
      osc.start(now);
    });

    // Sparkling upper harmonic sweep
    const shimmerOsc = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmerOsc.type = 'triangle';
    shimmerOsc.frequency.setValueAtTime(783.99, now); // G5
    shimmerGain.gain.setValueAtTime(0.02, now);

    const shimmerLfo = ctx.createOscillator();
    shimmerLfo.type = 'sine';
    shimmerLfo.frequency.setValueAtTime(0.18, now);
    const shimmerLfoGain = ctx.createGain();
    shimmerLfoGain.gain.setValueAtTime(0.015, now);
    shimmerLfo.connect(shimmerLfoGain);
    shimmerLfoGain.connect(shimmerGain.gain);

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(output);

    oscs.push(shimmerOsc, shimmerLfo);
    gains.push(shimmerGain, shimmerLfoGain);

    shimmerOsc.start(now);
    shimmerLfo.start(now);
  }

  // 6. COZY-WHOLESOME: Soothing warm electric piano & music box pentatonic tones + gentle warmth
  private buildCozyAmbient(
    ctx: AudioContext,
    output: GainNode,
    oscs: OscillatorNode[],
    gains: GainNode[],
    intervals: number[]
  ) {
    const now = ctx.currentTime;

    // Warm foundational drone (C3 = 130.81Hz)
    const baseOsc = ctx.createOscillator();
    const baseGain = ctx.createGain();
    baseOsc.type = 'sine';
    baseOsc.frequency.setValueAtTime(130.81, now);
    baseGain.gain.setValueAtTime(0.08, now);
    baseOsc.connect(baseGain);
    baseGain.connect(output);
    oscs.push(baseOsc);
    gains.push(baseGain);
    baseOsc.start(now);

    // Fifth (G3 = 196Hz)
    const fifthOsc = ctx.createOscillator();
    const fifthGain = ctx.createGain();
    fifthOsc.type = 'sine';
    fifthOsc.frequency.setValueAtTime(196.0, now);
    fifthGain.gain.setValueAtTime(0.05, now);
    fifthOsc.connect(fifthGain);
    fifthGain.connect(output);
    oscs.push(fifthOsc);
    gains.push(fifthGain);
    fifthOsc.start(now);

    // Calm music box chimes playing soft pentatonic notes every 2.8s
    const bellNotes = [523.25, 659.25, 783.99, 987.77, 1046.5]; // C5, E5, G5, B5, C6
    const bellInterval = window.setInterval(() => {
      if (!this.isSynthesizingAmbient || !this.ctx) return;
      try {
        const bellTime = this.ctx.currentTime;
        const note = bellNotes[Math.floor(Math.random() * bellNotes.length)];
        const bellOsc = this.ctx.createOscillator();
        const bellGain = this.ctx.createGain();

        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(note, bellTime);

        bellGain.gain.setValueAtTime(0.02, bellTime);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, bellTime + 1.4);

        bellOsc.connect(bellGain);
        bellGain.connect(output);

        bellOsc.onended = () => {
          bellOsc.disconnect();
          bellGain.disconnect();
        };

        bellOsc.start(bellTime);
        bellOsc.stop(bellTime + 1.45);
      } catch {}
    }, 2800);

    intervals.push(bellInterval);
  }

  // 7. MODERN-CINEMATIC: PS5-style luxury atmospheric drone (C2 + G2 + Cmaj9) with stereo presence
  private buildModernCinematicAmbient(
    ctx: AudioContext,
    output: GainNode,
    oscs: OscillatorNode[],
    gains: GainNode[],
    _intervals: number[]
  ) {
    const now = ctx.currentTime;

    // Deep luxury sub-bass (C2 = 65.41Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(65.41, now);
    subGain.gain.setValueAtTime(0.15, now);
    subOsc.connect(subGain);
    subGain.connect(output);
    oscs.push(subOsc);
    gains.push(subGain);
    subOsc.start(now);

    // Warm orchestral fifth (G2 = 98.0Hz)
    const fifthOsc = ctx.createOscillator();
    const fifthGain = ctx.createGain();
    fifthOsc.type = 'sine';
    fifthOsc.frequency.setValueAtTime(98.0, now);
    fifthGain.gain.setValueAtTime(0.08, now);
    fifthOsc.connect(fifthGain);
    fifthGain.connect(output);
    oscs.push(fifthOsc);
    gains.push(fifthGain);
    fifthOsc.start(now);

    // Cinematic chord pad: E3 (164.81Hz), B3 (246.94Hz), D4 (293.66Hz)
    const padNotes = [164.81, 246.94, 293.66];
    padNotes.forEach((freq) => {
      const padOsc = ctx.createOscillator();
      const padGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      padOsc.type = 'triangle';
      padOsc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, now);

      padGain.gain.setValueAtTime(0.04 / padNotes.length, now);

      padOsc.connect(filter);
      filter.connect(padGain);
      padGain.connect(output);

      oscs.push(padOsc);
      gains.push(padGain);
      padOsc.start(now);
    });

    // Slow ambient breathing filter sweep on a high crystalline overtone (G4 = 392Hz)
    const airOsc = ctx.createOscillator();
    const airGain = ctx.createGain();
    airOsc.type = 'sine';
    airOsc.frequency.setValueAtTime(392.0, now);

    const airLfo = ctx.createOscillator();
    airLfo.type = 'sine';
    airLfo.frequency.setValueAtTime(0.09, now); // ~11 second breath
    const airLfoGain = ctx.createGain();
    airLfoGain.gain.setValueAtTime(0.02, now);

    airLfo.connect(airLfoGain);
    airLfoGain.connect(airGain.gain);

    airGain.gain.setValueAtTime(0.025, now);
    airOsc.connect(airGain);
    airGain.connect(output);

    oscs.push(airOsc, airLfo);
    gains.push(airGain, airLfoGain);

    airOsc.start(now);
    airLfo.start(now);
  }

  private buildCosmicAmbient(
    ctx: AudioContext,
    output: GainNode,
    oscs: OscillatorNode[],
    gains: GainNode[],
    intervals: number[]
  ) {
    const now = ctx.currentTime;

    // 1. Deep Sub-Bass Space Drone (43.65Hz F1 & 65.41Hz C2)
    [43.65, 65.41].forEach((freq, idx) => {
      const droneOsc = ctx.createOscillator();
      const droneGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      droneOsc.type = 'sine';
      droneOsc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, now);

      droneGain.gain.setValueAtTime((0.08 / (idx + 1)), now);

      droneOsc.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(output);

      oscs.push(droneOsc);
      gains.push(droneGain);
      droneOsc.start(now);
    });

    // 2. Cosmic Aurora Sweeping Resonance Pad
    const cosmicChord = [311.13, 466.16, 698.46];
    cosmicChord.forEach((freq) => {
      const padOsc = ctx.createOscillator();
      const padGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      padOsc.type = 'triangle';
      padOsc.frequency.setValueAtTime(freq, now);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(550, now);
      filter.Q.setValueAtTime(1.8, now);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.05, now);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(250, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      padGain.gain.setValueAtTime(0.035 / cosmicChord.length, now);

      padOsc.connect(filter);
      filter.connect(padGain);
      padGain.connect(output);

      oscs.push(padOsc, lfo);
      gains.push(padGain, lfoGain);
      padOsc.start(now);
      lfo.start(now);
    });

    // 3. Stardust Chime Interval
    const celestialNotes = [880.0, 1174.66, 1396.91, 1760.0];
    const chimeTimer = window.setInterval(() => {
      if (!this.isSynthesizingAmbient || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const note = celestialNotes[Math.floor(Math.random() * celestialNotes.length)];
        const bell = this.ctx.createOscillator();
        const bellGain = this.ctx.createGain();

        bell.type = 'sine';
        bell.frequency.setValueAtTime(note, t);

        bellGain.gain.setValueAtTime(0.015, t);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);

        bell.connect(bellGain);
        bellGain.connect(output);

        bell.start(t);
        bell.stop(t + 3.3);
      } catch {}
    }, 4500);

    intervals.push(chimeTimer);
  }

  /**
   * Preview Ambient soundscape for the Setup Wizard
   */
  public previewArchetypeAmbience(archetype: 'analog' | 'digital' | 'cosmic') {
    if (archetype === 'analog') {
      this.playThemeAmbient('cozy-wholesome');
    } else if (archetype === 'digital') {
      this.playThemeAmbient('cyberpunk');
    } else if (archetype === 'cosmic') {
      this.playThemeAmbient('space-stars');
    }
  }

  public stopArchetypePreview() {
    this.stopThemeAmbient();
  }

  /**
   * Dual-stage mechanical camera shutter sound for screenshot capture
   */
  public playShutter() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Stage 1: Shutter blade opening click (crisp noise burst)
    const noise1 = ctx.createBufferSource();
    const buffer1 = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.025), ctx.sampleRate);
    const data1 = buffer1.getChannelData(0);
    for (let i = 0; i < data1.length; i++) {
      data1[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.005));
    }
    noise1.buffer = buffer1;

    const filter1 = ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(2600, now);
    filter1.Q.setValueAtTime(3.5, now);

    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(this.sfxVolume * 0.45, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    noise1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(ctx.destination);
    noise1.start(now);

    // Stage 2: Mechanical latch snap (closing, ~45ms later)
    const latchTime = now + 0.045;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(820, latchTime);
    osc.frequency.exponentialRampToValueAtTime(140, latchTime + 0.035);

    const noise2 = ctx.createBufferSource();
    const buffer2 = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.035), ctx.sampleRate);
    const data2 = buffer2.getChannelData(0);
    for (let i = 0; i < data2.length; i++) {
      data2[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.007));
    }
    noise2.buffer = buffer2;

    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(1600, latchTime);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(this.sfxVolume * 0.55, latchTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, latchTime + 0.04);

    osc.connect(gain2);
    noise2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(ctx.destination);

    osc.start(latchTime);
    noise2.start(latchTime);
    osc.stop(latchTime + 0.045);
    noise2.stop(latchTime + 0.045);
  }

  /**
   * Mechanical ratchet click for the roulette wheel.
   * pitch: 0.5 to 1.5 multiplier (scales frequency as the wheel slows down).
   */
  public playRouletteTick(pitch: number = 1.0) {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const baseFreq = Math.max(120, Math.min(1800, 720 * pitch));
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(60, baseFreq * 0.35), now + 0.025);

    gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

    // Subtle metallic noise click
    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.012), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.003));
    }
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200 * pitch, now);

    osc.connect(gain);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.03);
    noise.stop(now + 0.03);
  }

  /**
   * Celebratory victory fanfare when the roulette wheel locks on a game.
   */
  public playJackpotWin() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Major chord arpeggio: C5, E5, G5, B5, C6 with warm reverb tail
    const freqs = [523.25, 659.25, 783.99, 987.77, 1046.5];

    freqs.forEach((freq, idx) => {
      const startTime = now + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === freqs.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      const noteDuration = idx === freqs.length - 1 ? 0.8 : 0.25;
      gain.gain.setValueAtTime(this.sfxVolume * 0.28, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + noteDuration + 0.05);
    });

    // Sub-bass thump on final note
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    const subTime = now + 0.24;
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, subTime);
    subOsc.frequency.exponentialRampToValueAtTime(55, subTime + 0.35);

    subGain.gain.setValueAtTime(this.sfxVolume * 0.4, subTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, subTime + 0.4);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(subTime);
    subOsc.stop(subTime + 0.45);
  }

  /**
   * 3D Physical Shelf: Friction slide sound when pulling a box from the shelf.
   */
  public playShelfSlide() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dur = 0.16;

    // Filtered noise swoosh (friction)
    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / data.length) * Math.PI);
    }
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + dur);
    filter.Q.setValueAtTime(2.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.sfxVolume * 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + dur);
  }

  /**
   * 3D Physical Shelf: Crisp snap click of opening or closing a plastic game keep case.
   */
  public playCaseClick() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Dual micro-transients simulating physical plastic latch
    [0, 0.024].forEach((delay) => {
      const clickTime = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2200, clickTime);
      osc.frequency.exponentialRampToValueAtTime(450, clickTime + 0.025);

      gain.gain.setValueAtTime(this.sfxVolume * 0.35, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(clickTime);
      osc.stop(clickTime + 0.035);
    });
  }

  /**
   * 3D Physical Shelf: Optical disc spin-up motor hum and laser seek beep when inserting game disc.
   */
  public playDiscSpin() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Motor acceleration pitch ramp
    const motor = ctx.createOscillator();
    const motorGain = ctx.createGain();
    motor.type = 'sawtooth';
    motor.frequency.setValueAtTime(110, now);
    motor.frequency.exponentialRampToValueAtTime(480, now + 0.55);

    const motorFilter = ctx.createBiquadFilter();
    motorFilter.type = 'lowpass';
    motorFilter.frequency.setValueAtTime(600, now);

    motorGain.gain.setValueAtTime(0.01, now);
    motorGain.gain.linearRampToValueAtTime(this.sfxVolume * 0.25, now + 0.15);
    motorGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    motor.connect(motorFilter);
    motorFilter.connect(motorGain);
    motorGain.connect(ctx.destination);

    motor.start(now);
    motor.stop(now + 0.75);

    // Laser seek chirps
    [0.28, 0.42].forEach((t) => {
      const laser = ctx.createOscillator();
      const laserGain = ctx.createGain();
      laser.type = 'sine';
      laser.frequency.setValueAtTime(1760, now + t);
      laser.frequency.setValueAtTime(2349, now + t + 0.03);

      laserGain.gain.setValueAtTime(this.sfxVolume * 0.18, now + t);
      laserGain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.06);

      laser.connect(laserGain);
      laserGain.connect(ctx.destination);

      laser.start(now + t);
      laser.stop(now + t + 0.07);
    });
  }

  /**
   * Astra Game Oracle: Shimmering celestial divination chime with ethereal harmonic overtones.
   */
  public playOracleChime() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Harmonic frequencies: F#5, A#5, C#6, F#6, G#6
    const freqs = [739.99, 932.33, 1108.73, 1479.98, 1661.22];

    freqs.forEach((freq, idx) => {
      const startTime = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      const dur = 1.2 - idx * 0.12;
      gain.gain.setValueAtTime(this.sfxVolume * 0.22, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + dur + 0.05);
    });
  }

  /**
   * Retro Cartridge: Heavy physical clunk and terminal friction when inserting a cartridge.
   */
  public playCartridgeInsert() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Heavy physical bottom-out thud (plastic shell seat)
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(120, now);
    thud.frequency.exponentialRampToValueAtTime(38, now + 0.08);

    thudGain.gain.setValueAtTime(this.sfxVolume * 0.45, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(now);
    thud.stop(now + 0.1);

    // 2. Connector spring blade friction click
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(1400, now + 0.015);
    click.frequency.exponentialRampToValueAtTime(320, now + 0.05);

    clickGain.gain.setValueAtTime(this.sfxVolume * 0.25, now + 0.015);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start(now + 0.015);
    click.stop(now + 0.07);
  }

  /**
   * Retro Easter Egg: Blowing dust off cartridge connector pins.
   */
  public playCartridgeBlow() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dur = 0.38;

    // Breathy air whoosh
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / data.length) * Math.PI);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.linearRampToValueAtTime(1100, now + dur * 0.5);
    filter.frequency.linearRampToValueAtTime(400, now + dur);
    filter.Q.setValueAtTime(1.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + dur);
  }

  /**
   * Resident Evil Style Item Inspection: Secret clue/detail discovered chime.
   */
  public playInspectClue() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Harmonic minor 3rd chime (C6: 1046.5Hz & Eb6: 1244.5Hz -> G6: 1567.98Hz)
    const notes = [1046.5, 1244.5, 1567.98];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(this.sfxVolume * 0.28, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.85);
    });
  }
}

export const audioEngine = new AudioEngine();
