import React from 'react';
import { Keyboard, Gamepad2 } from 'lucide-react';

export type ControllerBrand =
  | '8bitdo'
  | 'playstation'
  | 'xbox'
  | 'nintendo'
  | 'steam'
  | 'logitech'
  | 'razer'
  | 'generic';

export interface ControllerDetails {
  brand: ControllerBrand;
  modelName: string;
  shortName: string;
  vendorId?: string;
  productId?: string;
  rawId: string;
}

/**
 * Custom tailored SVG icons for specific controller models & keyboard.
 */
export const DeviceIcon: React.FC<{
  type: 'keyboard' | ControllerBrand;
  className?: string;
}> = ({ type, className = 'w-4 h-4' }) => {
  switch (type) {
    case 'keyboard':
      return <Keyboard className={className} />;

    case '8bitdo':
      // 8BitDo Retro-Modern Silhouette: rounded body, cross d-pad, face buttons, dual sticks
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* Classic rounded controller shell */}
          <rect x="2" y="5" width="20" height="14" rx="7" />
          {/* D-Pad cross */}
          <path d="M7 9v6M4 12h6" />
          {/* Face buttons */}
          <circle cx="16" cy="10" r="0.8" fill="currentColor" />
          <circle cx="18" cy="12" r="0.8" fill="currentColor" />
          <circle cx="14" cy="12" r="0.8" fill="currentColor" />
          <circle cx="16" cy="14" r="0.8" fill="currentColor" />
          {/* Center heart / select & start dots */}
          <circle cx="11" cy="9" r="0.6" fill="currentColor" />
          <circle cx="13" cy="9" r="0.6" fill="currentColor" />
          {/* Twin Thumbsticks */}
          <circle cx="9.5" cy="14" r="1.5" />
          <circle cx="14.5" cy="14" r="1.5" />
        </svg>
      );

    case 'playstation':
      // DualSense / DualShock silhouette with signature handles and touchpad
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* DualSense ergonomic handle contours */}
          <path d="M6 19l-3.5-7C1.5 8.5 3 6 6 6h12c3 0 4.5 2.5 3.5 6L18 19c-.8 1.6-2.8 2-4 1l-2-2-2 2c-1.2 1-3.2.6-4-1z" />
          {/* Central Touchpad */}
          <path d="M9 8h6v3H9z" />
          {/* D-Pad indicator */}
          <path d="M6 11v2M5 12h2" />
          {/* PlayStation geometric face button cluster */}
          <circle cx="17.5" cy="12" r="0.75" fill="currentColor" />
          <circle cx="16" cy="10.5" r="0.75" fill="currentColor" />
          {/* Symmetric thumbsticks */}
          <circle cx="9.5" cy="15" r="1.5" />
          <circle cx="14.5" cy="15" r="1.5" />
        </svg>
      );

    case 'xbox':
      // Xbox Controller with offset asymmetrical thumbsticks & center jewel
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* Xbox controller body */}
          <path d="M5.5 19L2.5 11C1.8 8.8 3.2 6 6 6h12c2.8 0 4.2 2.8 3.5 5l-3 8c-.7 1.7-2.7 2-3.8 1l-2.7-2.5-2.7 2.5c-1.1 1-3.1.7-3.8-1z" />
          {/* Center Xbox Guide button */}
          <circle cx="12" cy="9" r="1.3" />
          <path d="M11.2 8.3l1.6 1.4M12.8 8.3l-1.6 1.4" strokeWidth="1.2" />
          {/* Asymmetrical Left Stick (high) */}
          <circle cx="7" cy="11" r="1.5" />
          {/* Asymmetrical Right Stick (low) */}
          <circle cx="14.5" cy="14.5" r="1.5" />
          {/* D-Pad (low left) */}
          <path d="M9.5 14v2M8.5 15h2" strokeWidth="1.6" />
          {/* A/B/X/Y (high right) */}
          <circle cx="17" cy="11" r="0.75" fill="currentColor" />
          <circle cx="15.8" cy="9.8" r="0.75" fill="currentColor" />
        </svg>
      );

    case 'nintendo':
      // Nintendo Switch Joy-Con / Pro Controller silhouette
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* Controller outline */}
          <rect x="3" y="6" width="18" height="12" rx="4" />
          <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="1 2" strokeOpacity="0.6" />
          {/* Left Joy-Con Stick & Buttons */}
          <circle cx="7.5" cy="10" r="1.5" />
          <circle cx="7.5" cy="14" r="0.8" fill="currentColor" />
          <circle cx="6.3" cy="14" r="0.5" fill="currentColor" />
          <circle cx="8.7" cy="14" r="0.5" fill="currentColor" />
          {/* Right Joy-Con Buttons & Stick */}
          <circle cx="16.5" cy="14" r="1.5" />
          <circle cx="16.5" cy="10" r="0.8" fill="currentColor" />
          <circle cx="15.3" cy="10" r="0.5" fill="currentColor" />
          <circle cx="17.7" cy="10" r="0.5" fill="currentColor" />
          {/* Minus and Plus */}
          <path d="M8.5 7.5h1.5" />
          <path d="M14.5 7.5h1.5M15.25 6.75v1.5" />
        </svg>
      );

    case 'steam':
      // Steam Deck / Steam Controller with dual touchpads
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <rect x="2" y="6" width="20" height="12" rx="5" />
          {/* Left circular touchpad */}
          <circle cx="6.5" cy="12" r="2.2" strokeDasharray="2 1" />
          {/* Right circular touchpad */}
          <circle cx="17.5" cy="12" r="2.2" strokeDasharray="2 1" />
          {/* Twin sticks */}
          <circle cx="9.5" cy="10" r="1.2" />
          <circle cx="14.5" cy="10" r="1.2" />
        </svg>
      );

    case 'generic':
    case 'logitech':
    case 'razer':
    default:
      return <Gamepad2 className={className} />;
  }
};
