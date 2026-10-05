import React from 'react';
import { Loader2, X, HardDrive } from 'lucide-react';
import { useImportStore } from '../../store/useImportStore';

export const ImportProgressBar: React.FC = () => {
  const { isImporting, total, completed, currentTitle, cancelImport } = useImportStore();

  if (!isImporting && completed === 0) return null;
  if (!isImporting) return null;

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="fixed bottom-6 left-8 z-[9990] max-w-sm w-full animate-slideUp pointer-events-auto">
      <div className="p-4 rounded-2xl glass-panel border border-[var(--game-accent,#2ee5ba)]/40 shadow-2xl bg-[#0c101b]/95 backdrop-blur-xl relative overflow-hidden">
        {/* Glow Accent Header */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--game-accent,#2ee5ba)] to-transparent" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-[var(--game-accent,#2ee5ba)] animate-spin" />
            <span className="text-xs font-bold text-white tracking-wide">Importing Games in Background</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[var(--game-accent,#2ee5ba)]">
              {completed}/{total} ({percent}%)
            </span>
            <button
              onClick={cancelImport}
              title="Cancel background import"
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-2 relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--game-accent,#2ee5ba)] via-cyan-400 to-emerald-400 transition-all duration-300 shadow-[0_0_12px_var(--game-glow,#2ee5ba)]"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Current Game Details */}
        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span className="truncate max-w-[240px] flex items-center gap-1.5 font-medium text-white/90">
            <HardDrive className="w-3 h-3 text-[var(--game-accent,#2ee5ba)] flex-shrink-0" />
            <span className="truncate">{currentTitle || 'Processing...'}</span>
          </span>
          <span className="text-[10px] text-white/40 flex-shrink-0 ml-2">Fetching assets</span>
        </div>
      </div>
    </div>
  );
};
