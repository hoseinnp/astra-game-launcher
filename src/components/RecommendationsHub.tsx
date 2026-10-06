import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  RefreshCw,
  X,
  Compass,
  SlidersHorizontal,
  Filter
} from 'lucide-react';
import type { Game } from '../types/game';
import type {
  StandardGenre,
  SortOption,
  RecommendedGameItem,
  PlaystyleProfileData
} from '../types/Recommendations.types';
import { RecommendationEngine } from '../services/RecommendationEngine';
import { RecommendationCard } from './RecommendationCard';
import { PlaystyleProfile } from './PlaystyleProfile';
import { audioEngine } from '../services/audioEngine';

interface RecommendationsHubProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  onLaunchGame: (game: Game) => void;
  onShowToast: (msg: string) => void;
}

const ALL_GENRES: StandardGenre[] = [
  'Action',
  'RPG',
  'Strategy',
  'Puzzle',
  'Sports',
  'Adventure',
  'Simulation',
  'Horror',
  'Indie',
  'Casual'
];

export const RecommendationsHub: React.FC<RecommendationsHubProps> = ({
  isOpen,
  onClose,
  games,
  onLaunchGame,
  onShowToast
}) => {
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Derive recommendations and playstyle profile
  const { recommendations, profile } = useMemo(() => {
    if (!isOpen || games.length === 0) {
      return { recommendations: [] as RecommendedGameItem[], profile: null as PlaystyleProfileData | null };
    }
    return RecommendationEngine.generateRecommendations(games);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, games, refreshKey]);

  const handleRefresh = () => {
    audioEngine.playSelect();
    setIsRefreshing(true);
    RecommendationEngine.clearCache();
    setRefreshKey((k) => k + 1);
    audioEngine.playLaunch();
    onShowToast('✨ Recommendations refreshed based on latest play activity');
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filter & Sort
  const filteredItems = useMemo(() => {
    return recommendations
      .filter((item) => {
        const matchesGenre = selectedGenre === 'all' || item.allGenres.includes(selectedGenre as StandardGenre);
        return matchesGenre;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'genre':
            return a.primaryGenre.localeCompare(b.primaryGenre);
          case 'length_short':
            return (a.estimatedLengthHours || 0) - (b.estimatedLengthHours || 0);
          case 'length_long':
            return (b.estimatedLengthHours || 0) - (a.estimatedLengthHours || 0);
          case 'library_playtime':
            return (b.breakdown.libraryPopularity || 0) - (a.breakdown.libraryPopularity || 0);
          case 'score':
          default:
            return b.score - a.score;
        }
      });
  }, [recommendations, selectedGenre, sortBy]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-6xl h-[92vh] bg-[#070b13]/95 border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Compass className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Games You Might Like
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  AI Discovery
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Personalized suggestions from your unplayed library ranked by genre match and relevance
              </p>
            </div>
          </div>

          {/* Action Buttons & Close */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              title="Recalculate playstyle and recommendations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Recommendations</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
          {/* 1. Playstyle Profile Analysis Section */}
          {profile && <PlaystyleProfile profile={profile} />}

          {/* 2. Filter & Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl p-3">
            {/* Genre Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-300">Genre:</span>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-neutral-200 outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="all">All Genres</option>
                {ALL_GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-black/50 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-neutral-200 outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="score">Recommendation Score (Highest)</option>
                <option value="genre">Genre Match (A-Z)</option>
                <option value="length_short">Story Length (Shortest First)</option>
                <option value="length_long">Story Length (Longest First)</option>
                <option value="library_playtime">Similar to Most Played</option>
              </select>
            </div>
          </div>

          {/* 3. Recommended Cards Grid */}
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-xs text-neutral-400 bg-black/30 rounded-2xl border border-white/5 p-6">
              <Sparkles className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-white mb-1">No Matching Recommendations</h4>
              <p>No unplayed games in your collection match the current genre filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredItems.map((item) => (
                <RecommendationCard
                  key={item.game.id}
                  item={item}
                  onLaunch={(g) => {
                    onLaunchGame(g);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
