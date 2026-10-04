import React, { useState } from 'react';
import { X, Sparkles, Trophy, Heart, Users, Gamepad2 } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

interface EasterEggModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EasterEggModal: React.FC<EasterEggModalProps> = ({ isOpen, onClose }) => {
  const [friend1, setFriend1] = useState(localStorage.getItem('astra_friend1') || localStorage.getItem('nexus_friend1') || 'Friend One (The Carry)');
  const [friend2, setFriend2] = useState(localStorage.getItem('astra_friend2') || localStorage.getItem('nexus_friend2') || 'Friend Two (Loot Goblin)');
  const [isEditing, setIsEditing] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    audioEngine.playSelect();
    localStorage.setItem('astra_friend1', friend1);
    localStorage.setItem('astra_friend2', friend2);
    setIsEditing(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#111927] to-[#080d17] border-2 border-[#2ee5ba]/50 shadow-[0_0_50px_rgba(46,229,186,0.3)] overflow-hidden flex flex-col animate-modalIn transform-gpu will-change-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#2ee5ba]/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#2ee5ba] animate-spin" />
            <h2 className="text-base font-black text-white tracking-wider uppercase">
              Secret Squad Protocol Unlocked
            </h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#2ee5ba]/20 border border-[#2ee5ba] flex items-center justify-center shadow-[0_0_20px_rgba(46,229,186,0.4)]">
            <Trophy className="w-8 h-8 text-[#2ee5ba]" />
          </div>

          <div>
            <h3 className="text-lg font-black text-white tracking-tight">VIP SQUAD EDITION</h3>
            <p className="text-xs text-white/60 mt-1 max-w-xs mx-auto">
              Custom game launcher tailored specifically by <span className="text-[#2ee5ba] font-bold">Aleron</span> for the best squad on PC!
            </p>
          </div>

          {/* Squad Member Badges */}
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2ee5ba]">
                <Users className="w-3.5 h-3.5" />
                <span>Player 1</span>
              </div>
              <div className="font-extrabold text-sm text-white mt-1 truncate">{friend1}</div>
              <div className="text-[10px] text-white/40 mt-0.5">Title: Chief Tactician</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Player 2</span>
              </div>
              <div className="font-extrabold text-sm text-white mt-1 truncate">{friend2}</div>
              <div className="text-[10px] text-white/40 mt-0.5">Title: Certified Boss Buster</div>
            </div>
          </div>

          {/* Edit Custom Names form */}
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-3 pt-2 text-left">
              <div>
                <label className="text-[11px] text-white/60 font-semibold">Friend 1 Name / Tag:</label>
                <input
                  type="text"
                  value={friend1}
                  onChange={(e) => setFriend1(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white focus:outline-none focus:border-[#2ee5ba]"
                />
              </div>
              <div>
                <label className="text-[11px] text-white/60 font-semibold">Friend 2 Name / Tag:</label>
                <input
                  type="text"
                  value={friend2}
                  onChange={(e) => setFriend2(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-xs text-white focus:outline-none focus:border-[#2ee5ba]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 rounded-xl text-xs glass-pill text-white/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 rounded-xl text-xs bg-[#2ee5ba] text-black font-bold shadow-md"
                >
                  Save Names
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-[11px] text-white/40 hover:text-[#2ee5ba] underline cursor-pointer"
            >
              Customize friend names & tags
            </button>
          )}

          <div className="flex items-center justify-center gap-1 text-[11px] text-white/40 pt-2 border-t border-white/10">
            <Heart className="w-3 h-3 text-red-400 fill-current" />
            <span>Built exclusively for the 3 of us. Press any button to return.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
