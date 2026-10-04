import React from 'react';
import { Trophy, CheckCircle, AlertTriangle, Info, Camera, Wind } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

export const ToastStack: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-6 right-8 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-2xl glass-panel border shadow-2xl flex items-center gap-3 animate-slideLeft max-w-sm pointer-events-auto cursor-pointer
            ${toast.type === 'trophy' ? 'border-yellow-500/50 bg-yellow-900/20' : 
              toast.type === 'screenshot' ? 'border-blue-500/50 bg-blue-900/20' : 
              toast.type === 'dust' ? 'border-amber-500/50 bg-amber-900/20' : 
              'border-[var(--game-accent)]'}`}
          onClick={() => removeToast(toast.id)}
        >
          {/* Icon Mapping */}
          {toast.type === 'trophy' && <Trophy className="w-5 h-5 text-yellow-400" />}
          {toast.type === 'screenshot' && <Camera className="w-5 h-5 text-blue-400" />}
          {toast.type === 'dust' && <Wind className="w-5 h-5 text-amber-400 animate-spin-slow" />}
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-[var(--game-accent)]" />}

          {toast.image && (
            <img src={toast.image} className="w-12 h-8 object-cover rounded shadow border border-white/20" alt="Toast media" />
          )}

          <div className="flex flex-col">
            <span className={`text-sm font-bold ${toast.type === 'trophy' ? 'text-yellow-400' : 'text-white'}`}>
              {toast.message}
            </span>
            {toast.description && (
              <span className="text-[10px] text-white/60 leading-tight mt-0.5">{toast.description}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
