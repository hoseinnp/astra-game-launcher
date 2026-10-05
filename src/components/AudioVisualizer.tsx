import React, { useRef, useEffect } from 'react';
import type { VisualizerDisplayMode } from '../types/Audio.types';
import { useAudioVisualization } from '../hooks/useAudioVisualization';

export interface AudioVisualizerProps {
  mode?: VisualizerDisplayMode | 'bars' | 'wave' | 'pulsar';
  color?: string;
  accentColor?: string;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  mode = 'bars',
  color,
  accentColor,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const { getFrequencyData, getTimeDomainData, isPlaying } = useAudioVisualization({ barCount: 64 }, mode as VisualizerDisplayMode);

  // Support both `color` and `accentColor` prop
  const activeColor = color || accentColor || '#2ee5ba';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = Math.round(rect.width || 480);
      const displayHeight = Math.round(rect.height || 140);

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }
      ctx.resetTransform?.();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 480;
      const height = rect.height || 140;

      ctx.clearRect(0, 0, width, height);

      // Get real-time frequency and time-domain data from hook
      const freqData = getFrequencyData();
      const timeData = getTimeDomainData();

      // Idle animated breathing pulse if paused
      if (!isPlaying) {
        const time = Date.now() * 0.003;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        for (let x = 0; x < width; x += 6) {
          const y = height / 2 + Math.sin(x * 0.03 + time) * 4;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `${activeColor}40`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        return;
      }

      if (mode === 'bars') {
        // Mode 1: Frequency Bars
        const barCount = 48;
        const totalGap = 4;
        const barWidth = Math.max(2, (width - barCount * totalGap) / barCount);

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * freqData.length);
          const rawValue = freqData[dataIndex] || 0;
          const percent = rawValue / 255;
          const barHeight = Math.max(3, percent * (height * 0.85));

          const x = i * (barWidth + totalGap);
          const y = height - barHeight;

          // Reactive gradient colored using the `color` prop
          const grad = ctx.createLinearGradient(0, y, 0, height);
          grad.addColorStop(0, activeColor);
          grad.addColorStop(0.6, `${activeColor}cc`);
          grad.addColorStop(1, `${activeColor}22`);

          ctx.fillStyle = grad;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
          } else {
            ctx.rect(x, y, barWidth, barHeight);
          }
          ctx.fill();

          // Highlight top tip
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, barWidth, 1.5);
        }
      } else if (mode === 'wave') {
        // Mode 2: Waveform
        ctx.beginPath();
        const sliceWidth = width / timeData.length;
        let x = 0;

        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (mode === 'pulsar') {
        // Mode 3: Center Pulsar Orb
        const centerX = width / 2;
        const centerY = height / 2;
        let avg = 0;
        const sampleCount = Math.min(32, freqData.length);
        for (let i = 0; i < sampleCount; i++) {
          avg += freqData[i] || 0;
        }
        avg = sampleCount > 0 ? avg / sampleCount : 0;
        const baseRadius = 15;
        const pulseRadius = baseRadius + (avg / 255) * 35;

        // Outer glow
        const glow = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, pulseRadius * 1.6);
        glow.addColorStop(0, `${activeColor}99`);
        glow.addColorStop(0.7, `${activeColor}33`);
        glow.addColorStop(1, 'transparent');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Core orb
        ctx.fillStyle = activeColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [mode, activeColor, isPlaying, getFrequencyData, getTimeDomainData]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
