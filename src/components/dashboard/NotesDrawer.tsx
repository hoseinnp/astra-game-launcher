import React, { useState, useEffect, useRef } from 'react';
import { X, CheckSquare, Square, Plus, Trash2, BookOpen, Key, Sparkles } from 'lucide-react';
import type { Game } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game | null;
  onUpdateGame: (updated: Game) => void;
}

export const NotesDrawer: React.FC<NotesDrawerProps> = ({
  isOpen,
  onClose,
  game,
  onUpdateGame
}) => {
  const [notes, setNotes] = useState(() => game?.notes || '');
  const [newChecklistText, setNewChecklistText] = useState('');
  const prevGameIdRef = useRef(game?.id);

  useEffect(() => {
    let isMounted = true;
    if (game && game.id !== prevGameIdRef.current && isMounted) {
      prevGameIdRef.current = game.id;
      setNotes(game.notes || '');
    }
    return () => {
      isMounted = false;
    };
  }, [game]);

  if (!isOpen || !game) return null;

  const handleNotesChange = (text: string) => {
    setNotes(text);
    onUpdateGame({ ...game, notes: text });
  };

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;

    audioEngine.playSelect();
    const newItem = {
      id: 'task-' + Date.now(),
      text: newChecklistText.trim(),
      done: false
    };

    const updated = [...(game.checklists || []), newItem];
    onUpdateGame({ ...game, checklists: updated });
    setNewChecklistText('');
  };

  const handleToggleChecklist = (id: string) => {
    audioEngine.playHover();
    const updated = (game.checklists || []).map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    onUpdateGame({ ...game, checklists: updated });
  };

  const handleDeleteChecklist = (id: string) => {
    audioEngine.playSelect();
    const updated = (game.checklists || []).filter((item) => item.id !== id);
    onUpdateGame({ ...game, checklists: updated });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-[#0a0d16] border-l border-white/10 shadow-2xl flex flex-col p-6 overflow-hidden animate-slideLeft transform-gpu will-change-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--game-accent)] text-black flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white truncate max-w-[240px]">{game.title}</h2>
              <p className="text-[10px] text-white/40">Field Notes & Checklist</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-white/50 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Notes area */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-white/70 uppercase tracking-wider">
              <Key className="w-3.5 h-3.5 text-[var(--game-accent)]" />
              <span>Keybindings & Build Notes</span>
            </label>
            <textarea
              rows={6}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Paste combos, quest reminders, cheat notes, mod configs..."
              className="w-full p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[var(--game-accent)] resize-none leading-relaxed font-mono"
            />
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-white/70 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[var(--game-accent)]" />
                <span>In-Game Goals & Checklist</span>
              </label>
              <span className="text-[10px] text-white/40">
                {(game.checklists || []).filter((i) => i.done).length} / {(game.checklists || []).length}
              </span>
            </div>

            {/* Add checklist item */}
            <form onSubmit={handleAddChecklist} className="flex gap-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder="Add goal (e.g. Beat Boss, Collect 50 coins)..."
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[var(--game-accent)]"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-[var(--game-accent)] text-black text-xs font-bold hover:brightness-110"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            {/* Checklist items */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {(game.checklists || []).length === 0 ? (
                <div className="text-center py-6 text-xs text-white/30">No goals added yet.</div>
              ) : (
                (game.checklists || []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 group hover:border-white/15 transition-colors"
                  >
                    <div
                      onClick={() => handleToggleChecklist(item.id)}
                      className="flex items-center gap-2.5 flex-1 cursor-pointer"
                    >
                      {item.done ? (
                        <CheckSquare className="w-4 h-4 text-[var(--game-accent)] flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-white/40 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${item.done ? 'line-through text-white/30' : 'text-white/80'}`}>
                        {item.text}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteChecklist(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-white/10 text-center text-[10px] text-white/40">
          Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-white">F1</kbd> or <kbd className="px-1 py-0.5 rounded bg-white/10 text-white">Gamepad X</kbd> to toggle drawer
        </div>
      </div>
    </div>
  );
};
