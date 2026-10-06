import React, { useState, useEffect, useRef } from 'react';
import { Search, Play, Clock, Star, X, Compass } from 'lucide-react';
import type { Game } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  onLaunchGame: (game: Game) => void;
  onSelectGame: (index: number) => void;
  onOpenRecommendations?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  games,
  onLaunchGame,
  onSelectGame,
  onOpenRecommendations
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setQuery('');
        setSelectedIndex(0);
      });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = games.filter(
    (g) =>
      g.title.toLowerCase().includes(query.toLowerCase()) ||
      g.genres.some((genre) => genre.toLowerCase().includes(query.toLowerCase())) ||
      g.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    queueMicrotask(() => {
      setSelectedIndex(0);
    });
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      audioEngine.playHover();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      audioEngine.playHover();
      setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filtered[selectedIndex];
      if (target) {
        audioEngine.playLaunch();
        onLaunchGame(target);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-[#0c101b] border border-white/15 shadow-2xl overflow-hidden animate-modalIn transform-gpu will-change-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          <Search className="w-5 h-5 text-[var(--game-accent)]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a game name or genre to launch..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
          />
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Recommendations / Discover Option */}
        {onOpenRecommendations && !query && (
          <div
            onClick={() => {
              audioEngine.playSelect();
              onClose();
              onOpenRecommendations();
            }}
            className="m-2 p-3 rounded-xl bg-gradient-to-r from-cyan-500/15 via-indigo-500/15 to-cyan-500/15 border border-cyan-500/30 hover:border-cyan-500/60 cursor-pointer flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-2.5 text-xs text-white">
              <Compass className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div>
                <span className="font-bold text-cyan-300">Discover & Recommendations</span>
                <span className="text-white/60 text-[11px] ml-2 hidden sm:inline">AI suggestions for unplayed games</span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/80 font-bold border border-white/20">
              R
            </span>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-white/40">No matching games found.</div>
          ) : (
            filtered.map((game, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={game.id}
                  onClick={() => {
                    const originalIdx = games.findIndex((g) => g.id === game.id);
                    if (originalIdx !== -1) onSelectGame(originalIdx);
                    audioEngine.playLaunch();
                    onLaunchGame(game);
                    onClose();
                  }}
                  onMouseEnter={() => {
                    if (!isSelected) {
                      audioEngine.playHover();
                      setSelectedIndex(idx);
                    }
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[var(--game-accent)] text-black font-semibold'
                      : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={game.coverUrl}
                      alt={game.title}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold truncate">{game.title}</span>
                        {game.favorite && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
                      </div>
                      <div className={`text-[11px] truncate ${isSelected ? 'text-black/70' : 'text-white/40'}`}>
                        {game.genres.join(', ') || game.type}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 opacity-70" />
                      <span>{Math.floor(game.stats.playtimeMinutes / 60)}h</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audioEngine.playLaunch();
                        onLaunchGame(game);
                        onClose();
                      }}
                      className={`p-2 rounded-lg transition-transform hover:scale-110 ${
                        isSelected ? 'bg-black text-white' : 'bg-white/10 text-white'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
          <span>Navigate with <kbd className="px-1 py-0.5 rounded bg-white/10 text-white">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-white/10 text-white">↓</kbd></span>
          <span>Launch with <kbd className="px-1 py-0.5 rounded bg-white/10 text-white">Enter</kbd></span>
        </div>
      </div>
    </div>
  );
};
