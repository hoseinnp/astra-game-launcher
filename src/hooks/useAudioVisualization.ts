import { useState, useEffect, useRef } from 'react';
import { AudioService } from '../services/AudioService';
import type { VisualizerConfig, VisualizerDisplayMode } from '../types/Audio.types';

export function useAudioVisualization(
  config?: Partial<VisualizerConfig>,
  mode: VisualizerDisplayMode = 'bars'
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(config?.barCount || 64));
  const timeArrayRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(128));

  useEffect(() => {
    const unsub = AudioService.subscribe((state) => {
      setIsPlaying(state.isPlaying);
    });
    return () => unsub();
  }, []);

  const getFrequencyData = () => {
    AudioService.getFrequencyData(dataArrayRef.current);
    return dataArrayRef.current;
  };

  const getTimeDomainData = () => {
    AudioService.getTimeDomainData(timeArrayRef.current);
    return timeArrayRef.current;
  };

  return {
    isPlaying,
    mode,
    getFrequencyData,
    getTimeDomainData
  };
}
