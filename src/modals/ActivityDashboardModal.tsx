import React, { useState } from 'react';
import {
  X,
  Activity,
  Flame,
  Clock,
  Trophy,
  Zap,
  Award,
  Sparkles,
  BarChart2,
  Calendar,
  Gamepad2,
  PieChart
} from 'lucide-react';
import type { Game } from '../types/game';
import { useActivityStats } from '../hooks/useActivityStats';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { StatsCharts } from '../components/StatsCharts';
import { audioEngine } from '../services/audioEngine';

interface ActivityDashboardModalProps {
  isOpen: boolean;
  games: Game[];
  onClose: () => void;
  accentColor?: string;
}

type TabType = 'overview' | 'games' | 'timeline' | 'insights';

export const ActivityDashboardModal: React.FC<ActivityDashboardModalProps> = ({
  isOpen,
  games: _games,
  onClose,
  accentColor = '#10b981'
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { sessions, stats } = useActivityStats();

  if (!isOpen) return null;

  const formatHoursMinutes = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const formatHourLabel = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const num = h % 12 === 0 ? 12 : h % 12;
    return `${num}:00 ${period}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn select-none">
      <div className="w-full max-w-5xl h-[700px] rounded-3xl bg-zinc-950/95 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-modalIn isolate relative">
        {/* Ambient background glow */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-15 filter blur-3xl pointer-events-none transition-colors duration-700"
          style={{ background: accentColor }}
        />

        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 z-10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-black font-black shadow-lg"
              style={{ background: accentColor }}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-wider uppercase">
                Activity Tracking & Analytics
              </h2>
              <p className="text-xs text-white/40 font-mono">
                {sessions.length} recorded session{sessions.length === 1 ? '' : 's'} ·{' '}
                {formatHoursMinutes(stats.totalPlaytimeMinutes)} total play
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => {
                audioEngine.playSelect();
                setActiveTab('overview');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Overview
            </button>
            <button
              onClick={() => {
                audioEngine.playSelect();
                setActiveTab('games');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'games'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <PieChart className="w-3.5 h-3.5 text-cyan-400" /> Games
            </button>
            <button
              onClick={() => {
                audioEngine.playSelect();
                setActiveTab('timeline');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Timeline
            </button>
            <button
              onClick={() => {
                audioEngine.playSelect();
                setActiveTab('insights');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'insights'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-violet-400" /> Insights
            </button>
          </div>

          <button
            onClick={() => {
              audioEngine.playSelect();
              onClose();
            }}
            className="p-2 rounded-2xl hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-white/40">
                    <span className="text-[11px] font-mono uppercase">All-Time Play</span>
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xl font-black text-white font-mono">
                    {formatHoursMinutes(stats.totalPlaytimeMinutes)}
                  </span>
                  <span className="text-[11px] text-white/30">Across entire library</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-white/40">
                    <span className="text-[11px] font-mono uppercase">This Year</span>
                    <Calendar className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-xl font-black text-white font-mono">
                    {formatHoursMinutes(stats.totalPlaytimeThisYearMinutes)}
                  </span>
                  <span className="text-[11px] text-white/30">{new Date().getFullYear()} Playtime</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-white/40">
                    <span className="text-[11px] font-mono uppercase">Current Streak</span>
                    <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                  </div>
                  <span className="text-xl font-black text-white font-mono">
                    {stats.currentStreakDays} <span className="text-sm font-normal text-white/60">Days</span>
                  </span>
                  <span className="text-[11px] text-white/30">Longest: {stats.longestStreakDays} days</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-white/40">
                    <span className="text-[11px] font-mono uppercase">Peak Hour</span>
                    <Zap className="w-4 h-4 text-violet-400" />
                  </div>
                  <span className="text-xl font-black text-white font-mono">
                    {formatHourLabel(stats.peakGamingHour)}
                  </span>
                  <span className="text-[11px] text-white/30">Most active gaming time</span>
                </div>
              </div>

              {/* Milestone Badges */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Milestone Badges (Gamification)
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-white/40">
                    {stats.milestones.filter((m) => m.unlocked).length} / {stats.milestones.length} Unlocked
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {stats.milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                        milestone.unlocked
                          ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                          : 'bg-white/[0.02] border-white/5 opacity-40'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          milestone.unlocked
                            ? 'bg-amber-400 text-black shadow-md'
                            : 'bg-white/5 text-white/30'
                        }`}
                      >
                        <Trophy className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-white truncate">{milestone.name}</h4>
                          {milestone.unlocked && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300">
                              ACHIEVED
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/50 leading-relaxed mt-1">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Heatmap preview */}
              <ActivityHeatmap sessions={sessions} accentColor={accentColor} />
            </div>
          )}

          {/* TAB 2: GAMES */}
          {activeTab === 'games' && (
            <div className="space-y-6 animate-fadeIn">
              <StatsCharts
                gamesRanking={stats.mostPlayedGames}
                hourlyDistribution={stats.hourlyDistribution}
                peakHour={stats.peakGamingHour}
              />

              {/* Top Games Ranking Table */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Game Ranking & Play Distribution
                    </h3>
                  </div>
                </div>

                <div className="space-y-2">
                  {stats.mostPlayedGames.length === 0 ? (
                    <div className="text-center py-12 text-xs text-white/40">
                      No game playtime logged yet
                    </div>
                  ) : (
                    stats.mostPlayedGames.map((g, idx) => (
                      <div
                        key={g.gameId}
                        className="px-4 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-center justify-between gap-4 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                              idx === 0
                                ? 'bg-amber-400 text-black'
                                : idx === 1
                                ? 'bg-zinc-300 text-black'
                                : idx === 2
                                ? 'bg-amber-700 text-white'
                                : 'bg-white/10 text-white/50'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-white truncate">{g.gameName}</span>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="w-36 hidden sm:block h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full bg-emerald-400 rounded-full"
                              style={{ width: `${g.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-white/60">
                            {formatHoursMinutes(g.durationMinutes)}
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-400 w-10 text-right">
                            {g.percentage}%
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-6 animate-fadeIn">
              <ActivityHeatmap sessions={sessions} accentColor={accentColor} />

              {/* Recent Sessions Stream */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Recent Activity Stream
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-white/40">
                    Latest {Math.min(15, sessions.length)} sessions
                  </span>
                </div>

                <div className="space-y-2">
                  {sessions.length === 0 ? (
                    <div className="text-center py-12 text-xs text-white/40">
                      No game sessions logged yet
                    </div>
                  ) : (
                    sessions.slice(0, 15).map((s) => (
                      <div
                        key={s.id}
                        className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="font-bold text-white truncate">{s.gameName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-white/40 font-mono text-[11px] flex-shrink-0">
                          <span>{new Date(s.startTime).toLocaleDateString()}</span>
                          <span className="text-emerald-400 font-bold">
                            {formatHoursMinutes(s.duration)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INSIGHTS */}
          {activeTab === 'insights' && (
            <div className="space-y-6 animate-fadeIn">
              <StatsCharts
                gamesRanking={stats.mostPlayedGames}
                hourlyDistribution={stats.hourlyDistribution}
                peakHour={stats.peakGamingHour}
              />

              {/* Behavior & Routine Insights */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Routine & Play Habit Insights
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1.5">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Gamer Chronotype</span>
                    <span className="text-base font-bold text-white">
                      {stats.peakGamingHour >= 21 || stats.peakGamingHour < 5
                        ? 'Night Owl'
                        : stats.peakGamingHour >= 17
                        ? 'Evening Enthusiast'
                        : 'Afternoon Gamer'}
                    </span>
                    <p className="text-[11px] text-white/50">
                      Most playtime is accumulated around {formatHourLabel(stats.peakGamingHour)}.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1.5">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Top Favorite</span>
                    <span className="text-base font-bold text-emerald-400 truncate">
                      {stats.mostPlayedGames[0]?.gameName || 'None yet'}
                    </span>
                    <p className="text-[11px] text-white/50">
                      Accounts for {stats.mostPlayedGames[0]?.percentage || 0}% of all your recorded playtime.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1.5">
                    <span className="text-[10px] font-mono text-white/40 uppercase">Endurance Score</span>
                    <span className="text-base font-bold text-cyan-400">
                      {stats.currentStreakDays >= 7
                        ? 'Legendary Consistency'
                        : stats.currentStreakDays >= 3
                        ? 'Solid Momentum'
                        : 'Casual Explorer'}
                    </span>
                    <p className="text-[11px] text-white/50">
                      {stats.currentStreakDays} day streak with {stats.longestStreakDays} days personal best.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
