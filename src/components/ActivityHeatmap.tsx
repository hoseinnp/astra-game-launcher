import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import type { GameSession } from '../types/Activity.types';

interface ActivityHeatmapProps {
  sessions: GameSession[];
  accentColor?: string;
}

interface DayData {
  date: string;
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  formattedDate: string;
  totalMinutes: number;
  sessionCount: number;
  games: string[];
  intensity: 0 | 1 | 2 | 3;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  sessions,
  accentColor: _accentColor = '#10b981'
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);

  // Group sessions by date
  const sessionMap = useMemo(() => {
    const map = new Map<string, { totalMinutes: number; games: Set<string>; count: number }>();
    sessions.forEach((s) => {
      const dateKey = s.startTime.split('T')[0];
      const existing = map.get(dateKey) || { totalMinutes: 0, games: new Set(), count: 0 };
      existing.totalMinutes += s.duration || 0;
      if (s.gameName) existing.games.add(s.gameName);
      existing.count++;
      map.set(dateKey, existing);
    });
    return map;
  }, [sessions]);

  // Build 52 weeks (364-366 days)
  const weeksData = useMemo(() => {
    const startOfYear = new Date(selectedYear, 0, 1);
    const dayOfWeek = startOfYear.getDay(); // 0 is Sun
    // Align start to the preceding Monday (or Sunday)
    // Mon-Sun format: Monday = 1, Sunday = 0 -> shift
    const offsetToMonday = (dayOfWeek + 6) % 7; 
    const calendarStart = new Date(startOfYear);
    calendarStart.setDate(startOfYear.getDate() - offsetToMonday);

    const weeks: DayData[][] = [];
    let currentWeek: DayData[] = [];

    for (let i = 0; i < 53 * 7; i++) {
      const d = new Date(calendarStart);
      d.setDate(calendarStart.getDate() + i);

      // Stop if reached next year's second week
      if (d.getFullYear() > selectedYear && d.getMonth() > 0) break;

      const dateStr = d.toISOString().split('T')[0];
      const stat = sessionMap.get(dateStr);
      const totalMinutes = stat?.totalMinutes || 0;
      const count = stat?.count || 0;
      const games = stat ? Array.from(stat.games) : [];

      let intensity: 0 | 1 | 2 | 3 = 0;
      if (totalMinutes > 0) {
        if (totalMinutes <= 60) intensity = 1;      // 1-60 min = light green
        else if (totalMinutes <= 180) intensity = 2; // 61-180 min = medium green
        else intensity = 3;                         // 180+ min = dark green
      }

      const dayItem: DayData = {
        date: dateStr,
        dayOfWeek: d.getDay(),
        formattedDate: d.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        totalMinutes,
        sessionCount: count,
        games,
        intensity
      };

      currentWeek.push(dayItem);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [selectedYear, sessionMap]);

  const monthLabels = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months;
  }, []);

  const formatHoursMinutes = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const getCellColor = (intensity: number) => {
    switch (intensity) {
      case 1:
        return 'bg-emerald-500/35 border-emerald-500/50';
      case 2:
        return 'bg-emerald-500/70 border-emerald-400/80';
      case 3:
        return 'bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.5)]';
      case 0:
      default:
        return 'bg-white/[0.05] border-white/[0.04] hover:border-white/20';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header with year switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            365-Day Activity Matrix
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
          <button
            onClick={() => setSelectedYear((prev) => prev - 1)}
            className="p-1 text-white/50 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/10"
            title="Previous Year"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono font-bold text-white px-1.5">{selectedYear}</span>
          <button
            onClick={() => setSelectedYear((prev) => prev + 1)}
            disabled={selectedYear >= new Date().getFullYear()}
            className="p-1 text-white/50 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next Year"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Heatmap Grid Container */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col gap-2 relative">
        {/* Months labels */}
        <div className="flex justify-between text-[10px] font-mono text-white/40 pl-6 pr-2">
          {monthLabels.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>

        <div className="flex gap-2 items-start overflow-x-auto no-scrollbar pb-1">
          {/* Day of week labels */}
          <div className="flex flex-col gap-1 text-[9px] font-mono text-white/30 pt-0.5 select-none">
            <span className="h-3 flex items-center">Mon</span>
            <span className="h-3 flex items-center opacity-0">Tue</span>
            <span className="h-3 flex items-center">Wed</span>
            <span className="h-3 flex items-center opacity-0">Thu</span>
            <span className="h-3 flex items-center">Fri</span>
            <span className="h-3 flex items-center opacity-0">Sat</span>
            <span className="h-3 flex items-center">Sun</span>
          </div>

          {/* 52 Columns (Weeks) */}
          <div className="flex gap-1 flex-1">
            {weeksData.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1 flex-1 min-w-[10px]">
                {week.map((day) => (
                  <div
                    key={day.date}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`h-3 rounded-[3px] border transition-all cursor-pointer ${getCellColor(
                      day.intensity
                    )}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-white/40">
          <div className="h-4 flex items-center">
            {hoveredDay ? (
              <span className="text-white font-mono text-[11px] animate-fadeIn">
                <span className="text-emerald-400 font-bold">{hoveredDay.formattedDate}</span>
                {' · '}
                {hoveredDay.totalMinutes > 0
                  ? `${formatHoursMinutes(hoveredDay.totalMinutes)} (${hoveredDay.games.length} game${
                      hoveredDay.games.length === 1 ? '' : 's'
                    })`
                  : 'No gaming logged'}
              </span>
            ) : (
              <span className="text-white/30 italic">Hover over any day to inspect details</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 select-none">
            <span>Less</span>
            <div className="w-2.5 h-2.5 rounded-[2px] bg-white/[0.05] border border-white/[0.04]" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/35 border border-emerald-500/50" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/70 border border-emerald-400/80" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 border border-emerald-300" />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
};
