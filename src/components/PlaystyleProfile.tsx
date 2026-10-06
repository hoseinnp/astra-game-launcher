import {
  Sparkles,
  PieChart,
  Clock,
  Layers
} from 'lucide-react';
import type { PlaystyleProfileData } from '../types/Recommendations.types';

interface PlaystyleProfileProps {
  profile: PlaystyleProfileData;
}

export const PlaystyleProfile: React.FC<PlaystyleProfileProps> = ({ profile }) => {
  return (
    <div className="bg-[#0b0f19]/90 border border-white/10 rounded-2xl p-4 shadow-xl text-white select-none space-y-3">
      {/* Top Banner */}
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <span>Your Gaming DNA</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                AI Analyzed
              </span>
            </h3>
            <p className="text-xs text-neutral-300 leading-snug mt-0.5 max-w-2xl">
              {profile.summaryText}
            </p>
          </div>
        </div>

        {/* Quick Stats Pill */}
        <div className="hidden sm:flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl shrink-0 text-xs">
          <div className="text-center">
            <span className="text-[10px] text-neutral-400 block">Total Playtime</span>
            <span className="font-mono font-bold text-cyan-300">{profile.totalHoursPlayed}h</span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="text-center">
            <span className="text-[10px] text-neutral-400 block">Unplayed</span>
            <span className="font-mono font-bold text-amber-300">{profile.unplayedCount}</span>
          </div>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* Genre Distribution Bars */}
        <div className="col-span-2 bg-black/30 border border-white/5 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-300">
            <span className="flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-cyan-400" />
              <span>Genre Playtime Distribution</span>
            </span>
            <span className="text-[10px] text-neutral-400">Weighted by activity</span>
          </div>

          <div className="space-y-1.5">
            {profile.topGenres.slice(0, 4).map((g) => (
              <div key={g.genre} className="space-y-0.5">
                <div className="flex justify-between text-[10px]">
                  <span className="font-medium text-neutral-300">{g.genre}</span>
                  <span className="font-mono text-neutral-400">
                    {g.hours}h ({g.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(8, g.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Preference & Peak Times */}
        <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-300 mb-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Platform Balance</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
              <span>PC: {profile.platformSplit.pcPercent}%</span>
              <span>Retro: {profile.platformSplit.retroPercent}%</span>
              <span>Other: {profile.platformSplit.consolePercent}%</span>
            </div>
            {/* Visual stacked bar */}
            <div className="w-full flex h-1.5 rounded-full overflow-hidden bg-white/10">
              <div
                style={{ width: `${profile.platformSplit.pcPercent}%` }}
                className="bg-cyan-400 h-full"
                title="PC Games"
              />
              <div
                style={{ width: `${profile.platformSplit.retroPercent}%` }}
                className="bg-amber-400 h-full"
                title="Retro ROMs"
              />
              <div
                style={{ width: `${profile.platformSplit.consolePercent}%` }}
                className="bg-purple-400 h-full"
                title="Console / Other"
              />
            </div>
          </div>

          <div className="border-t border-white/5 pt-2">
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Optimal Play Window:</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-300 block mt-0.5">
              {profile.peakGamingHours || 'Evenings & Weekends'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
