import React, { useState, useEffect } from 'react';

export interface GameCoverProps {
  src?: string | null;
  title: string;
  accent?: string;
  className?: string;
}

function getInitials(title: string): string {
  if (!title) return '?';
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';

  const letters = words
    .slice(0, 2)
    .map((w) => {
      const match = w.match(/\p{L}|\p{N}/u);
      return match ? match[0].toUpperCase() : '';
    })
    .filter(Boolean);

  return letters.length > 0 ? letters.join('') : '?';
}

function getAccentWithAlpha(color: string, alpha: number = 0.33): string {
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
}

export const GameCover: React.FC<GameCoverProps> = ({
  src,
  title,
  accent = '#2ee5ba',
  className = ''
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setFailed(false);
  }, [src]);

  const hasSrc = Boolean(src && src.trim());

  if (!hasSrc || failed) {
    const initials = getInitials(title);
    const accentAlpha = getAccentWithAlpha(accent, 0.33);

    return (
      <div
        role="img"
        aria-label={title}
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(circle at center, ${accentAlpha} 0%, transparent 70%), linear-gradient(180deg, #1b2233 0%, #0b0f1a 100%)`
        }}
      >
        <span
          className="font-black tracking-widest text-white/70 uppercase select-none"
          style={{
            fontSize: 'clamp(1rem, 22%, 2.5rem)',
            textShadow: `0 0 12px ${accent}, 0 0 24px ${accent}`
          }}
        >
          {initials}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src!}
      alt={title}
      loading="lazy"
      draggable={false}
      className={className}
      onError={() => setFailed(true)}
    />
  );
};

export default GameCover;
