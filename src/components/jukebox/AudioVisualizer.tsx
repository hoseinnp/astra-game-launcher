import React, { useRef, useEffect } from 'react';
import type { VisualizerMode } from '../../types/game';
import { jukeboxEngine } from '../../services/jukeboxEngine';

interface AudioVisualizerProps {
  mode: VisualizerMode;
  accentColor?: string;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  mode,
  accentColor = '#2ee5ba',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(64);
    const timeArray = new Uint8Array(128);

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

      jukeboxEngine.getFrequencyData(dataArray);
      jukeboxEngine.getTimeDomainData(timeArray);

      if (mode === 'bars') {
        const barWidth = (width / dataArray.length) * 0.85;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const val = dataArray[i];
          const percent = val / 255;
          const barHeight = Math.max(3, percent * (height - 8));

          const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          grad.addColorStop(0, accentColor);
          grad.addColorStop(1, '#ffffff');

          ctx.fillStyle = grad;
          ctx.shadowBlur = 12;
          ctx.shadowColor = accentColor;

          // Draw rounded pill bar
          const y = height - barHeight;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
          ctx.fill();

          x += barWidth + (width / dataArray.length) * 0.15;
        }
      } else if (mode === 'wave') {
        ctx.lineWidth = 3;
        ctx.strokeStyle = accentColor;
        ctx.shadowBlur = 16;
        ctx.shadowColor = accentColor;

        ctx.beginPath();
        const sliceWidth = width / timeArray.length;
        let x = 0;

        for (let i = 0; i < timeArray.length; i++) {
          const v = timeArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else if (mode === 'pulsar') {
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) * 0.22;

        ctx.shadowBlur = 20;
        ctx.shadowColor = accentColor;

        // Draw radial frequency spikes
        const totalPoints = dataArray.length;
        const angleStep = (Math.PI * 2) / totalPoints;

        ctx.beginPath();
        for (let i = 0; i < totalPoints; i++) {
          const val = dataArray[i] / 255;
          const r = baseRadius + val * (baseRadius * 0.95);
          const angle = i * angleStep;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner glowing core
        const avg = dataArray.reduce((acc, v) => acc + v, 0) / dataArray.length / 255;
        const coreR = Math.max(8, baseRadius * 0.45 * (1 + avg * 0.4));
        ctx.beginPath();
        ctx.arc(centerX, centerY, coreR, 0, Math.PI * 2);
        ctx.fillStyle = accentColor;
        ctx.fill();
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mode, accentColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
    />
  );
};
