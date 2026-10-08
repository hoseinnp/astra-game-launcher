/**
 * Astra Jukebox Engine — Unified facade delegating to the singleton AudioService
 */
import type { JukeboxTrack, VisualizerMode, AmbientLoFiLayer } from '../types/game';
import { AudioService, type AudioServiceState } from './AudioService';

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

function mapAudioStateToJukeboxState(st: AudioServiceState): JukeboxState {
  return {
    currentTrack: st.currentTrack
      ? {
          id: st.currentTrack.id,
          title: st.currentTrack.title,
          artist: st.currentTrack.artist || 'Astra Sound Labs',
          album: st.currentTrack.album,
          durationSeconds: st.currentTrack.duration || st.currentTrack.durationSeconds || 180,
          url: st.currentTrack.filePath || st.currentTrack.url || '',
          source: st.currentTrack.source || 'synthesizer',
          vibe: (st.currentTrack.vibe as any) || 'modern-cinematic',
          coverUrl: st.currentTrack.coverUrl
        }
      : null,
    isPlaying: st.isPlaying,
    volume: st.volume,
    currentTime: st.currentTime,
    duration: st.duration || st.durationSeconds || 184,
    shuffle: st.shuffle,
    repeat: st.repeat,
    activeAmbientLayers: new Set(st.activeAmbientLayers),
    visualizerMode: st.visualizerMode,
    isDucked: st.isDucked
  };
}

class JukeboxEngineFacade {
  public subscribe(fn: JukeboxListener): () => void {
    return AudioService.subscribe((state) => {
      fn(mapAudioStateToJukeboxState(state));
    });
  }

  public getState(): JukeboxState {
    return mapAudioStateToJukeboxState(AudioService.getState());
  }

  public getTracks(): JukeboxTrack[] {
    return AudioService.getTracks();
  }

  public getAnalyser(): AnalyserNode | null {
    return AudioService.getAnalyser();
  }

  public getFrequencyData(array: Uint8Array<any>): void {
    AudioService.getFrequencyData(array);
  }

  public getTimeDomainData(array: Uint8Array<any>): void {
    AudioService.getTimeDomainData(array);
  }

  public playTrack(trackId: string): void {
    AudioService.playTrack(trackId);
  }

  public togglePlay(): void {
    AudioService.togglePlay();
  }

  public pause(): void {
    AudioService.pause();
  }

  public stop(): void {
    AudioService.stop();
  }

  public nextTrack(): void {
    AudioService.nextTrack();
  }

  public prevTrack(): void {
    AudioService.prevTrack();
  }

  public setVolume(vol: number): void {
    AudioService.setVolume(vol);
  }

  public setVisualizerMode(mode: VisualizerMode): void {
    AudioService.setVisualizerMode(mode);
  }

  public toggleShuffle(): void {
    AudioService.toggleShuffle();
  }

  public toggleRepeat(): void {
    AudioService.toggleRepeat();
  }

  public toggleAmbientLayer(layer: AmbientLoFiLayer): void {
    AudioService.toggleAmbientLayer(layer);
  }

  public addLocalTrack(fileUrl: string, title: string, artist = 'Local Artist'): void {
    AudioService.addLocalTrack(fileUrl, title, artist);
  }

  public duckVolume(): void {
    AudioService.duckVolume();
  }

  public restoreVolume(): void {
    AudioService.restoreVolume();
  }
}

export const jukeboxEngine = new JukeboxEngineFacade();
