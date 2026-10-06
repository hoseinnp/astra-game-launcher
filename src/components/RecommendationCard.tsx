import {
  Play,
  Sparkles,
  Clock,
  Tv
} from 'lucide-react';
import type { RecommendedGameItem } from '../types/Recommendations.types';
import type { Game } from '../types/game';

interface RecommendationCardProps {
  item: RecommendedGameItem;
  onLaunch: (game: Game) => void;
}

const GENRE_COLORS: Record<string, string> = {
  Action: 'bg-red-500/20 text-red-300 border-red-500/30',
  RPG: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Strategy: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Puzzle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Sports: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  Adventure: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Simulation: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  Horror: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  Indie: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  Casual: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
};

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  item,
  onLaunch
}) => {
  const { game, score, reason, primaryGenre, estimatedLengthHours, isRetro } = item;

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLaunch(game);
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className="group relative bg-[#0d121f]/90 hover:bg-[#141b2c] border border-white/10 hover:border-cyan-500/40 rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 shadow-xl hover:shadow-cyan-500/10 cursor-pointer select-none"
    >
      {/* Top Section: Platform & Match Score */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 border border-white/10">
            {isRetro ? 'Retro ROM' : game.type?.toUpperCase() || 'PC'}
          </span>
          <span
            className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
              GENRE_COLORS[primaryGenre] || 'bg-white/10 text-white border-white/15'
            }`}
          >
            {primaryGenre}
          </span>
        </div>

        {/* Match Score Badge */}
        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
          <span className="font-mono font-bold text-[10px] text-emerald-300">{score}% Match</span>
        </div>
      </div>

      {/* Visual Match Score Bar */}
      <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden mb-2.5">
        <div
          className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-1 rounded-full transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Game Visual / Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/5 mb-2.5 group-hover:border-cyan-500/30 transition">
        {game.coverUrl ? (
          <img
            src={game.coverUrl}
            alt={game.title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <Tv className="w-8 h-8 text-neutral-600" />
          </div>
        )}

        {/* Overlay Play Icon on Hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200">
          <div className="w-10 h-10 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Game Title & Why Recommended */}
      <div className="flex-1 space-y-1 mb-2">
        <h4 className="text-xs font-bold text-white line-clamp-1 title-case" title={game.title}>
          {game.title}
        </h4>
        <p className="text-[10px] text-cyan-200/90 leading-snug line-clamp-2 italic">
          &ldquo;{reason}&rdquo;
        </p>
      </div>

      {/* Secondary Genres & Estimated Length */}
      <div className="border-t border-white/5 pt-2 space-y-1.5 text-[10px]">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-neutral-400" />
            <span>Story Length:</span>
          </span>
          <span className="font-mono text-neutral-300">~{estimatedLengthHours} hours</span>
        </div>

        {/* Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLaunch(game);
          }}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-xl transition text-[11px] font-semibold cursor-pointer"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Launch Now</span>
        </button>
      </div>
    </div>
  );
};
