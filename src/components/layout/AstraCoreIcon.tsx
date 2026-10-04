import React from 'react';

export interface AstraCoreIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isEnergetic?: boolean;
  accentColor?: string;
  className?: string;
}

export const AstraCoreIcon: React.FC<AstraCoreIconProps> = ({
  size = 'md',
  isEnergetic = false,
  accentColor = 'var(--game-accent, #2ee5ba)',
  className = ''
}) => {
  const sizeMap = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const dim = sizeMap[size];

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${dim} ${className}`}>
      {/* Outer Ambient Glow Aura */}
      <div
        className="absolute inset-0 rounded-full blur-md opacity-60 animate-pulse pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`
        }}
      />

      {/* Outer Rotating Prismatic Halo */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`absolute inset-0 w-full h-full ${isEnergetic ? 'animate-core-spin-fast' : 'animate-core-spin'} pointer-events-none`}
      >
        {/* Outer Hex-Facet Geometry */}
        <polygon
          points="50,6 88,28 88,72 50,94 12,72 12,28"
          stroke={accentColor}
          strokeWidth="2.5"
          strokeDasharray="14 8"
          strokeOpacity="0.85"
        />

        {/* Orbiting Satellite Vertices */}
        <circle cx="50" cy="6" r="3" fill="#ffffff" />
        <circle cx="88" cy="72" r="3" fill="#ffffff" />
        <circle cx="12" cy="72" r="3" fill="#ffffff" />
      </svg>

      {/* Pulsing Energy Ring */}
      <div
        className="absolute inset-1 rounded-full border border-white/40 animate-core-ring pointer-events-none"
        style={{
          borderColor: accentColor,
          boxShadow: `0 0 15px ${accentColor}`
        }}
      />

      {/* Inner Central Polyhedral Core */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-[72%] h-[72%] filter drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]"
      >
        <defs>
          <linearGradient id="astraFacetGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="50%" stopColor={accentColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#020813" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="astraFacetGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ff007f" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        {/* Faceted Triangular Prism Wings */}
        <polygon points="50,15 78,50 50,50" fill="url(#astraFacetGrad1)" fillOpacity="0.85" />
        <polygon points="50,15 22,50 50,50" fill="url(#astraFacetGrad2)" fillOpacity="0.75" />
        <polygon points="50,85 78,50 50,50" fill="url(#astraFacetGrad2)" fillOpacity="0.8" />
        <polygon points="50,85 22,50 50,50" fill="url(#astraFacetGrad1)" fillOpacity="0.9" />

        {/* Central Converging Seam */}
        <line x1="50" y1="15" x2="50" y2="85" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        <line x1="22" y1="50" x2="78" y2="50" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.8" />

        {/* Central Luminous Singularity Core */}
        <circle cx="50" cy="50" r="5" fill="#ffffff" className="animate-pulse" />
        <circle cx="50" cy="50" r="2.5" fill={accentColor} />
      </svg>
    </div>
  );
};
