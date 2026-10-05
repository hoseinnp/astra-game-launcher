import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Clock,
  Trophy,
  Award,
  Zap,
  TrendingUp,
  X,
  Sparkles,
  BarChart2
} from 'lucide-react';
import type { Game, GamingSession, ActivityMatrixDay } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';

interface ActivityHeatmapModalProps {
  isOpen: boolean;
  games: Game[];
  onClose: () => void;
}

export const ActivityHeatmapModal: React.FC<ActivityHeatmapModalProps> = ({
  isOpen,
  games: _games,
  onClose
}) => {
  const [sessions, setSessions] = useState<GamingSession[]>([]);
  const [hoveredDay, setHoveredDay] = useState<ActivityMatrixDay | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const loadSessions = async () => {
      let list: GamingSession[] = [];
      if (window.api?.getActivityLog) {
        try {
          list = await window.api.getActivityLog();
        } catch (err) {
          console.warn('Failed to load activity log:', err);
        }
      }
      if (isMounted) {
        setSessions(list || []);
      }
    };

    loadSessions();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Generate 52 weeks (364 days) matrix
  const matrixDays = useMemo(() => {
    const map = new Map<string, GamingSession[]>();
    sessions.forEach((s) => {
      const arr = map.get(s.date) || [];
      arr.push(s);
      map.set(s.date, arr);
    });

    const days: ActivityMatrixDay[] = [];
    const today = new Date();
    // 52 weeks ago
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);

    for (let i = 0; i <= 364; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const daySessions = map.get(dateStr) || [];
      const duration = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);

      let intensity: 0 | 1 | 2 | 3 | 4 = 0;
      if (duration > 0) {
        if (duration < 45) intensity = 1;
        else if (duration < 120) intensity = 2;
        else if (duration < 240) intensity = 3;
        else intensity = 4;
      }

      days.push({
        date: dateStr,
        count: daySessions.length,
        durationMinutes: duration,
        intensity,
        sessions: daySessions
      });
    }
    return days;
  }, [sessions]);

  // Aggregate Stats
  const totalMinutes = useMemo(() => {
    return sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  }, [sessions]);

  const streakDays = useMemo(() => {
    let currentStreak = 0;
    const sortedDates = [...new Set(sessions.map((s) => s.date))].sort().reverse();
    if (sortedDates.length === 0) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    let checkDate = new Date();

    // Check if played today or yesterday
    const lastPlayed = sortedDates[0];
    const diffDays = Math.floor((new Date(todayStr).getTime() - new Date(lastPlayed).getTime()) / (24 * 3600 * 1000));
    if (diffDays > 1) return 0;

    checkDate = new Date(lastPlayed);
    for (const dStr of sortedDates) {
      const expected = checkDate.toISOString().split('T')[0];
      if (dStr === expected) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return currentStreak;
  }, [sessions]);

  const milestones = [
    {
      id: 'centurion',
      title: 'Centurion',
      desc: '100+ Total Lifetime Hours',
      icon: Trophy,
      unlocked: totalMinutes >= 6000,
      progress: Math.min(100, Math.round((totalMinutes / 6000) * 100))
    },
    {
      id: 'streak',
      title: 'Flow-State Streak',
      desc: '7 Consecutive Gaming Days',
      icon: Flame,
      unlocked: streakDays >= 7,
      progress: Math.min(100, Math.round((streakDays / 7) * 100))
    },
    {
      id: 'night-owl',
      title: 'Night Owl Protocol',
      desc: 'Late Night Sessions (11 PM - 4 AM)',
      icon: Zap,
      unlocked: sessions.some((s) => {
        const hour = new Date(s.startTime).getHours();
        return hour >= 23 || hour <= 4;
      }),
      progress: 100
    },
    {
      id: 'renaissance',
      title: 'Renaissance Gamer',
      desc: 'Played Across 5+ Different Titles',
      icon: Award,
      unlocked: new Set(sessions.map((s) => s.gameId)).size >= 5,
      progress: Math.min(100, Math.round((new Set(sessions.map((s) => s.gameId)).size / 5) * 100))
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn select-none">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-zinc-950/95 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-modalIn isolate relative">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 z-10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wider uppercase">Gaming Activity Heatmap</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  ANNUAL RADAR
                </span>
              </div>
              <p className="text-xs text-white/50">365-Day Session Matrix, Focus Streaks & Milestones</p>
            </div>
          </div>

          <button
            onClick={() => {
              audioEngine.playSelect();
              onClose();
            }}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lifetime Telemetry KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
              <Clock className="w-3.5 h-3.5 text-[var(--game-accent,#2ee5ba)]" />
              <span>Total Playtime</span>
            </div>
            <div className="text-xl font-black text-white font-mono">
              {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Current Streak</span>
            </div>
            <div className="text-xl font-black text-rose-400 font-mono flex items-center gap-1">
              <span>{streakDays}</span>
              <span className="text-xs font-sans text-white/50 font-normal">days in a row</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Total Sessions</span>
            </div>
            <div className="text-xl font-black text-white font-mono">{sessions.length}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Peak Gaming Window</span>
            </div>
            <div className="text-sm font-bold text-amber-300 font-mono mt-1">9:00 PM – 1:00 AM</div>
          </div>
        </div>

        {/* 365-Day Matrix View */}
        <div className="p-6 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/60">
              Annual Session Activity (52 Weeks)
            </span>
            {/* Color Legend */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40">
              <span>Less</span>
              <div className="w-2.5 h-2.5 rounded-xs bg-white/5" />
              <div className="w-2.5 h-2.5 rounded-xs bg-emerald-950 border border-emerald-800" />
              <div className="w-2.5 h-2.5 rounded-xs bg-emerald-700" />
              <div className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
              <div className="w-2.5 h-2.5 rounded-xs bg-emerald-300 shadow-[0_0_6px_#34d399]" />
              <span>More</span>
            </div>
          </div>

          {/* Matrix Grid Canvas */}
          <div className="overflow-x-auto pb-2 no-scrollbar">
            <div className="grid grid-flow-col grid-rows-7 gap-1.5 min-w-[700px] w-full py-1">
              {matrixDays.map((day) => {
                let bgClass = 'bg-white/5 border border-white/5';
                if (day.intensity === 1) bgClass = 'bg-emerald-950 border border-emerald-800/80';
                else if (day.intensity === 2) bgClass = 'bg-emerald-700 border border-emerald-600';
                else if (day.intensity === 3) bgClass = 'bg-emerald-500 border border-emerald-400';
                else if (day.intensity === 4) bgClass = 'bg-emerald-300 shadow-[0_0_6px_#34d399] border border-white';

                return (
                  <div
                    key={day.date}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`w-3.5 h-3.5 rounded-xs cursor-pointer transition-all hover:scale-125 hover:z-20 ${bgClass}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Dynamic Day Tooltip Bar */}
          <div className="h-8 flex items-center justify-between text-xs text-white/70 px-2 font-mono bg-white/5 rounded-xl border border-white/10">
            {hoveredDay ? (
              <>
                <span className="font-bold text-white">
                  📅 {new Date(hoveredDay.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="text-[var(--game-accent,#2ee5ba)]">
                  {hoveredDay.durationMinutes > 0
                    ? `${Math.floor(hoveredDay.durationMinutes / 60)}h ${hoveredDay.durationMinutes % 60}m across ${hoveredDay.count} session(s)`
                    : 'No sessions recorded'}
                </span>
              </>
            ) : (
              <span className="text-white/40 italic">Hover over any square on the matrix to inspect daily play metrics</span>
            )}
          </div>
        </div>

        {/* Milestones & Badges Shelf */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white/60 mb-2">
            Automated Milestones & Badges
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {milestones.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center gap-3.5 ${
                    m.unlocked
                      ? 'bg-white/10 border-white/20 shadow-md text-white'
                      : 'bg-white/[0.02] border-white/5 opacity-60 text-white/50'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                      m.unlocked
                        ? 'bg-[var(--game-accent,#2ee5ba)] text-black'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-white truncate">{m.title}</h4>
                      <span className="text-[10px] font-mono font-bold uppercase text-[var(--game-accent,#2ee5ba)]">
                        {m.unlocked ? 'UNLOCKED' : `${m.progress}%`}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
