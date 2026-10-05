import React, { useMemo } from 'react';
import { PieChart, BarChart2 } from 'lucide-react';

interface StatsChartsProps {
  gamesRanking: { gameId: string; gameName: string; durationMinutes: number; percentage: number }[];
  hourlyDistribution: number[]; // 24 values
  peakHour: number;
}

const PALETTE = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ec4899', // pink
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#f43f5e'  // rose
];

export const StatsCharts: React.FC<StatsChartsProps> = ({
  gamesRanking,
  hourlyDistribution,
  peakHour
}) => {
  const maxHourlyMinutes = useMemo(() => {
    return Math.max(1, ...hourlyDistribution);
  }, [hourlyDistribution]);

  // Compute SVG Donut / Pie segments
  const pieSegments = useMemo(() => {
    const topGames = gamesRanking.slice(0, 6);
    const totalMinutes = topGames.reduce((acc, g) => acc + g.durationMinutes, 0);
    if (totalMinutes === 0) return [];

    let accumulatedAngle = 0;
    const radius = 64;
    const circumference = 2 * Math.PI * radius;

    return topGames.map((game, index) => {
      const fraction = game.durationMinutes / totalMinutes;
      const strokeDasharray = `${fraction * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle * circumference;
      accumulatedAngle += fraction;

      return {
        ...game,
        color: PALETTE[index % PALETTE.length],
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [gamesRanking]);

  const formatHoursMinutes = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const formatHourLabel = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const num = h % 12 === 0 ? 12 : h % 12;
    return `${num} ${period}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Playtime by Game (Pie / Donut Chart) */}
      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Playtime by Game</h3>
        </div>

        {gamesRanking.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-white/30 text-xs">
            No gaming sessions recorded yet
          </div>
        ) : (
          <div className="flex items-center gap-6">
            {/* SVG Donut */}
            <div className="relative w-40 h-40 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  fill="transparent"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="24"
                />
                {pieSegments.map((seg, i) => (
                  <circle
                    key={seg.gameId || i}
                    cx="80"
                    cy="80"
                    r="64"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="24"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="transition-all duration-500 hover:opacity-85"
                  />
                ))}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-white/40 uppercase font-mono">Top Game</span>
                <span className="text-sm font-black text-white px-2 truncate max-w-[110px] text-center">
                  {gamesRanking[0]?.gameName || '-'}
                </span>
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  {gamesRanking[0]?.percentage || 0}%
                </span>
              </div>
            </div>

            {/* Legend list */}
            <div className="flex-1 space-y-2 min-w-0">
              {gamesRanking.slice(0, 5).map((g, idx) => (
                <div key={g.gameId} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: PALETTE[idx % PALETTE.length] }}
                    />
                    <span className="text-white/80 truncate">{g.gameName}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[11px]">
                    <span className="text-white/40">{formatHoursMinutes(g.durationMinutes)}</span>
                    <span className="text-white font-bold">{g.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Peak Gaming Hours (24-Hour Bar Chart) */}
      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              24-Hour Play Distribution
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Peak: {formatHourLabel(peakHour)}
          </span>
        </div>

        {/* 24 Bar Columns */}
        <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 border-b border-white/10">
          {hourlyDistribution.map((minutes, hour) => {
            const heightPercent = maxHourlyMinutes > 0 ? (minutes / maxHourlyMinutes) * 100 : 0;
            const isPeak = hour === peakHour && minutes > 0;

            return (
              <div
                key={hour}
                className="flex-1 flex flex-col items-center h-full justify-end group relative"
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-zinc-900 border border-white/20 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-20">
                  {formatHourLabel(hour)}: {formatHoursMinutes(minutes)}
                </div>

                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    isPeak
                      ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]'
                      : minutes > 0
                      ? 'bg-white/30 group-hover:bg-white/60'
                      : 'bg-white/5'
                  }`}
                  style={{ height: `${Math.max(4, heightPercent)}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels (every 4 hours) */}
        <div className="flex justify-between text-[10px] font-mono text-white/40 px-1">
          <span>12 AM</span>
          <span>4 AM</span>
          <span>8 AM</span>
          <span>12 PM</span>
          <span>4 PM</span>
          <span>8 PM</span>
          <span>11 PM</span>
        </div>
      </div>
    </div>
  );
};
