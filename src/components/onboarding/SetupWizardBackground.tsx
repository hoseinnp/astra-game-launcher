import React, { useEffect, useRef } from 'react';
import type { ExperienceArchetype } from '../../types/game';

interface SetupWizardBackgroundProps {
  activeArchetype: ExperienceArchetype | null;
}

export const SetupWizardBackground: React.FC<SetupWizardBackgroundProps> = ({ activeArchetype }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle pool for Starfield / Dust / Cyber data
    const particleCount = 140;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 1000 + 1,
      size: Math.random() * 2 + 0.8,
      speed: Math.random() * 0.8 + 0.2,
      alpha: Math.random() * 0.7 + 0.2,
      color: '#ffffff'
    }));

    let cyberGridOffset = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. BASE BACKGROUND GRADIENTS PER ARCHETYPE
      if (activeArchetype === 'analog') {
        // Warm mahogany wood & amber incandescent lamp ambience
        const grad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.45,
          100,
          width * 0.5,
          height * 0.5,
          width * 0.8
        );
        grad.addColorStop(0, 'rgba(45, 24, 16, 0.95)');
        grad.addColorStop(0.5, 'rgba(24, 12, 8, 0.98)');
        grad.addColorStop(1, '#090503');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Gentle floating amber dust motes
        particles.forEach((p) => {
          p.y -= p.speed * 0.5;
          p.x += Math.sin(p.y * 0.01) * 0.3;
          if (p.y < 0) p.y = height;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(245, 158, 11, ${p.alpha * 0.45})`;
          ctx.fill();
        });
      } else if (activeArchetype === 'digital') {
        // High-tech cybernetic grid & neon telemetry
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#060a14');
        grad.addColorStop(0.6, '#03050a');
        grad.addColorStop(1, '#010204');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Perspective 3D wireframe floor grid
        cyberGridOffset = (cyberGridOffset + 1.2) % 40;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
        ctx.lineWidth = 1;

        const horizon = height * 0.55;
        // Perspective lines radiating from vanishing point
        for (let x = -width; x <= width * 2; x += 80) {
          ctx.beginPath();
          ctx.moveTo(width * 0.5, horizon);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // Horizontal scrolling grid lines
        for (let y = horizon; y <= height; y += (y - horizon + 10) * 0.25) {
          const actualY = y + (cyberGridOffset * (y - horizon)) / 100;
          if (actualY <= height) {
            ctx.beginPath();
            ctx.moveTo(0, actualY);
            ctx.lineTo(width, actualY);
            ctx.stroke();
          }
        }

        // Cyan / Magenta data particles
        particles.slice(0, 70).forEach((p, idx) => {
          p.y += p.speed * 1.8;
          if (p.y > height) p.y = 0;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = idx % 2 === 0 ? 'rgba(0, 240, 255, 0.6)' : 'rgba(255, 0, 85, 0.5)';
          ctx.shadowColor = idx % 2 === 0 ? '#00f0ff' : '#ff0055';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      } else if (activeArchetype === 'cosmic') {
        // Deep Space Obsidian & Stardust Observatory
        const grad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.4,
          50,
          width * 0.5,
          height * 0.5,
          width * 0.9
        );
        grad.addColorStop(0, '#0c0d24');
        grad.addColorStop(0.4, '#070817');
        grad.addColorStop(0.8, '#03040a');
        grad.addColorStop(1, '#010103');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Subtle nebula cloud glow
        const nebula = ctx.createRadialGradient(width * 0.7, height * 0.35, 20, width * 0.7, height * 0.35, 450);
        nebula.addColorStop(0, 'rgba(168, 85, 247, 0.15)');
        nebula.addColorStop(0.6, 'rgba(59, 130, 246, 0.08)');
        nebula.addColorStop(1, 'transparent');
        ctx.fillStyle = nebula;
        ctx.fillRect(0, 0, width, height);

        // 3D Parallax Starfield warp drift
        particles.forEach((p) => {
          p.z -= 1.8;
          if (p.z <= 0) {
            p.z = 1000;
            p.x = Math.random() * width;
            p.y = Math.random() * height;
          }

          const k = 280 / p.z;
          const px = (p.x - width * 0.5) * k + width * 0.5;
          const py = (p.y - height * 0.5) * k + height * 0.5;

          if (px >= 0 && px <= width && py >= 0 && py <= height) {
            const size = Math.max(0.6, (1 - p.z / 1000) * 3);
            const alpha = Math.max(0.1, (1 - p.z / 1000) * 0.9);

            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(240, 245, 255, ${alpha})`;
            ctx.fill();
          }
        });
      } else {
        // Neutral clean console dark gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0a0d18');
        grad.addColorStop(1, '#020306');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeArchetype]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
    />
  );
};
