import React, { useEffect } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import type { Game } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { ThemeEngine } from '../../services/themeEngine';

interface ConfirmRemoveModalProps {
  isOpen: boolean;
  game: Game | null;
  onClose: () => void;
  onConfirm: (gameId: string) => void;
}

export const ConfirmRemoveModal: React.FC<ConfirmRemoveModalProps> = ({
  isOpen,
  game,
  onClose,
  onConfirm
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        audioEngine.playSelect();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (game) {
          audioEngine.playSelect();
          onConfirm(game.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, game, onClose, onConfirm]);

  if (!isOpen || !game) return null;

  const accentColor = game.theme?.accentColor || 'var(--game-accent, #2ee5ba)';
  const glowColor = game.theme?.glowColor || 'rgba(46, 229, 186, 0.45)';
  const backdrop = game.backdropUrl || game.coverUrl;

  const handleConfirm = () => {
    audioEngine.playSelect();
    onConfirm(game.id);
  };

  const handleCancel = () => {
    audioEngine.playSelect();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn select-none"
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-md max-w-[calc(100vw-1.5rem)] rounded-2xl sm:rounded-3xl bg-[#0c101b] border overflow-hidden shadow-2xl flex flex-col transform-gpu will-change-transform animate-modalIn max-h-[92vh] min-w-0"
        style={{
          borderColor: accentColor,
          boxShadow: `0 0 50px ${glowColor}, 0 20px 60px rgba(0,0,0,0.9)`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Themed Game Backdrop Header */}
        <div className="relative h-44 w-full overflow-hidden bg-black">
          {backdrop && (
            <img
              src={backdrop}
              alt={game.title}
              className="w-full h-full object-cover filter brightness-65 contrast-110"
            />
          )}

          {/* Color Wash & Vignette */}
          <div
            className="absolute inset-0 opacity-40 mix-blend-color pointer-events-none"
            style={{ backgroundColor: accentColor }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c101b] via-[#0c101b]/60 to-black/30 pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={handleCancel}
            title="Cancel (Esc)"
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white/60 hover:text-white hover:bg-black/80 transition-colors z-20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Game Identification in Header */}
          <div className="absolute bottom-3 left-5 right-5 flex items-end gap-4 z-10">
            <img
              src={game.coverUrl}
              alt={game.title}
              className="w-16 h-22 rounded-xl object-cover shadow-2xl border-2 flex-shrink-0"
              style={{ borderColor: accentColor }}
            />
            <div className="min-w-0 pb-1 flex-1">
              {game.theme?.logoUrl ? (
                <img
                  src={game.theme.logoUrl}
                  alt={game.title}
                  className="max-h-9 max-w-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
                />
              ) : (
                <h3 className="text-base font-black text-white uppercase tracking-tight truncate drop-shadow-md">
                  {game.title}
                </h3>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                  style={{ backgroundColor: accentColor, color: ThemeEngine.getContrastColor(accentColor) }}
                >
                  {game.type}
                </span>
                {game.genres[0] && (
                  <span className="text-[10px] text-white/70 font-medium tracking-wide">
                    {game.genres[0]}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-white/80 leading-relaxed">
              Are you sure you want to remove <strong className="text-white">{game.title}</strong> from your launcher library?
              <div className="text-[11px] text-white/40 mt-1">
                Your actual game files and save data on your disk will NOT be modified or deleted.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 rounded-2xl border border-white/15 text-xs font-bold text-white/70 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all cursor-pointer"
            >
              Cancel (Esc)
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-extrabold tracking-wide transition-all shadow-[0_0_25px_rgba(244,63,94,0.4)] cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remove Game</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
