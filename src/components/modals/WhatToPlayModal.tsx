import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X, Dices, Sparkles, Play, RotateCcw, Trophy, Check,
  Zap, Coffee, Swords, BookOpen, Quote, ChevronRight, Target, Timer
} from 'lucide-react';
import type { Game } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { SuggesterService, type MoodType, type TimeSlotType, type RouletteFilter } from '../../services/suggesterService';
import { normalizeMediaUrl } from '../../utils/mediaUrl';

interface WhatToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  onLaunchGame: (game: Game) => void;
  onOpenOverview?: (game: Game) => void;
  onOpenIntel?: (game: Game) => void;
}

export const WhatToPlayModal: React.FC<WhatToPlayModalProps> = ({
  isOpen,
  onClose,
  games,
  onLaunchGame,
  onOpenOverview,
  onOpenIntel
}) => {
  const [activeTab, setActiveTab] = useState<'oracle' | 'mood' | 'roulette' | 'backlog'>('oracle');
  const [oracleSeed, setOracleSeed] = useState<number>(0);
  const [isOracleConsulting, setIsOracleConsulting] = useState<boolean>(false);

  // Mood Matcher state
  const [selectedMood, setSelectedMood] = useState<MoodType>('adrenaline');
  const [selectedTime, setSelectedTime] = useState<TimeSlotType>('moderate');
  const [recommendationIndex, setRecommendationIndex] = useState(0);

  // Roulette state
  const [rouletteFilter, setRouletteFilter] = useState<RouletteFilter>('all');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rouletteWinner, setRouletteWinner] = useState<Game | null>(null);
  const [reelOffset, setReelOffset] = useState(0);

  const reelRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);


  // Oracle's Celestial Prophecy
  const oracleProphecy = useMemo(() => {
    if (games.length === 0) return null;
    const todayStr = new Date().toDateString();
    let hash = oracleSeed;
    for (let i = 0; i < todayStr.length; i++) {
      hash = (hash * 33 + todayStr.charCodeAt(i)) >>> 0;
    }
    const chosenIndex = hash % games.length;
    const game = games[chosenIndex];

    const alignmentScore = (94.2 + (hash % 57) / 10).toFixed(1);
    const houses = ['Nebula Horizon', 'Orion Expanse', 'Solar Apex', 'Constellation Vega', 'Deep Matrix', 'Astral Nexus'];
    const house = houses[hash % houses.length];

    const decrees = [
      `Your neural telemetry indicates harmonic alignment with ${game.genres.slice(0, 2).join(' & ')}. The prophecy calls for action.`,
      `You possess untapped focus energy. ${game.title} matches your current circadian gaming frequency.`,
      `The celestial archive identifies tonight as the prime convergence window for ${game.title}. Unfinished milestones beckon.`,
      `Optimal flow-state synchronization detected. Step into ${game.title} and conquer the unknown.`
    ];
    const decree = decrees[hash % decrees.length];

    return {
      game,
      alignmentScore,
      house,
      decree
    };
  }, [games, oracleSeed]);

  const handleConsultOracle = () => {
    audioEngine.playOracleChime();
    setIsOracleConsulting(true);
    setTimeout(() => {
      setOracleSeed((prev) => prev + 1);
      setIsOracleConsulting(false);
    }, 450);
  };

  // Compute mood recommendations
  const moodRecommendations = useMemo(() => {
    return SuggesterService.getMoodRecommendations(games, selectedMood, selectedTime);
  }, [games, selectedMood, selectedTime]);

  const currentMatch = moodRecommendations[recommendationIndex] || moodRecommendations[0];

  // Compute backlog finishers
  const backlogFinishers = useMemo(() => {
    return SuggesterService.getBacklogFinishers(games);
  }, [games]);

  // Candidates for roulette
  const rouletteCandidates = useMemo(() => {
    return SuggesterService.getRouletteCandidates(games, rouletteFilter);
  }, [games, rouletteFilter]);

  // Generate extended items for continuous carousel visual
  const reelItems = useMemo(() => {
    if (rouletteCandidates.length === 0) return [];
    const list: Game[] = [];
    const repeatCount = Math.max(12, Math.ceil(60 / rouletteCandidates.length));
    for (let i = 0; i < repeatCount; i++) {
      list.push(...rouletteCandidates);
    }
    return list;
  }, [rouletteCandidates]);

  // Handle Roulette Spin with deceleration physics and ratchet audio ticks
  const handleStartSpin = useCallback(() => {
    if (isSpinning || rouletteCandidates.length === 0) return;

    audioEngine.playLaunch();
    setIsSpinning(true);
    setRouletteWinner(null);

    const cardWidth = 144; // 128px width + 16px gap
    const totalItems = reelItems.length;
    const minSpins = 25;
    const randomAdditional = Math.floor(Math.random() * (rouletteCandidates.length * 3));
    const targetItemIndex = Math.min(totalItems - 5, minSpins + randomAdditional);
    const chosenGame = reelItems[targetItemIndex] || rouletteCandidates[0];

    const targetOffset = targetItemIndex * cardWidth;
    const startOffset = reelOffset % (rouletteCandidates.length * cardWidth);
    const distance = targetOffset - startOffset;

    const duration = 4600; // 4.6 seconds total spin
    const startTime = performance.now();
    let lastTickIndex = Math.floor(startOffset / cardWidth);

    const animateSpin = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Quartic ease out for dramatic deceleration
      const ease = 1 - Math.pow(1 - progress, 4);
      const currentPos = startOffset + distance * ease;
      setReelOffset(currentPos);

      // Trigger ratchet tick sound as card crosses center
      const currentItemIdx = Math.floor(currentPos / cardWidth);
      if (currentItemIdx > lastTickIndex) {
        lastTickIndex = currentItemIdx;
        const pitch = Math.max(0.5, 1.4 - ease * 0.9);
        audioEngine.playRouletteTick(pitch);
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateSpin);
      } else {
        setIsSpinning(false);
        setRouletteWinner(chosenGame);
        audioEngine.playJackpotWin();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animateSpin);
  }, [isSpinning, rouletteCandidates, reelItems, reelOffset]);

  // Keyboard shortcut listener (Space to spin/roll, Enter to launch, Esc to close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        audioEngine.playSelect();
        onClose();
      } else if (e.key === ' ' && activeTab === 'roulette' && !isSpinning) {
        e.preventDefault();
        handleStartSpin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, isSpinning, onClose, handleStartSpin]);

  // Clean animation frame on unmount and reset roulette state when modal closes
  useEffect(() => {
    if (!isOpen) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      queueMicrotask(() => {
        setIsSpinning(false);
        setRouletteWinner(null);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0b0e17] border border-white/15 shadow-2xl overflow-hidden animate-modalIn transform-gpu will-change-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-black/60 via-transparent to-black/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-[var(--game-accent,#2ee5ba)] to-purple-600 flex items-center justify-center text-black shadow-lg shadow-[0_0_20px_var(--game-glow)]">
              <Sparkles className="w-5 h-5 font-bold animate-pulse text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide uppercase">
                  Astra Game Oracle
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[var(--game-accent,#2ee5ba)]/20 text-[var(--game-accent,#2ee5ba)] border border-[var(--game-accent,#2ee5ba)]/30">
                  V3 Neural Concierge
                </span>
              </div>
              <p className="text-xs text-white/50">
                Can't decide what to play? Let the Astra Oracle divinate your ideal gaming destiny.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              audioEngine.playSelect();
              onClose();
            }}
            className="p-2 rounded-xl glass-pill text-white/50 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS SWITCHER */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-white/5 bg-black/20 flex-wrap">
          <button
            onClick={() => {
              audioEngine.playHover();
              setActiveTab('oracle');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'oracle'
                ? 'bg-[var(--game-accent,#2ee5ba)] text-black shadow-md'
                : 'glass-pill text-white/60 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Oracle's Prophecy</span>
          </button>

          <button
            onClick={() => {
              audioEngine.playHover();
              setActiveTab('mood');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'mood'
                ? 'bg-[var(--game-accent,#2ee5ba)] text-black shadow-md'
                : 'glass-pill text-white/60 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Mood & Time Matcher</span>
          </button>

          <button
            onClick={() => {
              audioEngine.playHover();
              setActiveTab('roulette');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'roulette'
                ? 'bg-[var(--game-accent,#2ee5ba)] text-black shadow-md'
                : 'glass-pill text-white/60 hover:text-white'
            }`}
          >
            <Dices className="w-4 h-4" />
            <span>Cyber Roulette Reel</span>
          </button>

          <button
            onClick={() => {
              audioEngine.playHover();
              setActiveTab('backlog');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'backlog'
                ? 'bg-[var(--game-accent,#2ee5ba)] text-black shadow-md'
                : 'glass-pill text-white/60 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Backlog Finisher ({backlogFinishers.length})</span>
          </button>
        </div>

        {/* TAB 0: ORACLE'S CELESTIAL PROPHECY */}
        {activeTab === 'oracle' && oracleProphecy && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="relative rounded-3xl overflow-hidden border border-white/20 bg-gradient-to-br from-zinc-950 via-[#0e1322] to-zinc-950 p-6 shadow-2xl">
              {/* Mystical background glow */}
              <div
                className="absolute inset-0 opacity-25 pointer-events-none filter blur-2xl"
                style={{
                  background: `radial-gradient(circle at 70% 30%, var(--game-accent,#2ee5ba) 0%, transparent 60%)`
                }}
              />

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                {/* Tarot-styled Relic Game Card */}
                <div
                  className={`relative w-48 h-72 rounded-2xl overflow-hidden border-2 border-[var(--game-accent,#2ee5ba)]/80 shadow-[0_0_30px_var(--game-glow)] flex-shrink-0 transition-transform duration-500 ${
                    isOracleConsulting ? 'scale-95 blur-xs rotate-2' : 'scale-100 hover:scale-105'
                  }`}
                >
                  <img
                    src={oracleProphecy.game.coverUrl}
                    alt={oracleProphecy.game.title}
                    className="w-full h-full object-cover select-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />

                  {/* Top Rune Inscription */}
                  <div className="absolute top-2 inset-x-2 flex items-center justify-between text-[8px] font-mono text-white/80 font-black tracking-widest uppercase">
                    <span>ORACLE RUNE</span>
                    <span>{oracleProphecy.alignmentScore}% ALIGN</span>
                  </div>

                  {/* Title Overlay */}
                  <div className="absolute bottom-3 inset-x-3 text-center">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider drop-shadow-md truncate">
                      {oracleProphecy.game.title}
                    </h4>
                  </div>
                </div>

                {/* Oracle Insights & Decree */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[var(--game-accent,#2ee5ba)] uppercase px-2 py-0.5 rounded-full bg-[var(--game-accent,#2ee5ba)]/15 border border-[var(--game-accent,#2ee5ba)]/30">
                      ★ TODAY'S DESTINY
                    </span>
                    <span className="text-[10px] font-mono text-white/50 tracking-wider">
                      SECTOR: {oracleProphecy.house}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-white tracking-wide">
                      {oracleProphecy.game.title}
                    </h3>
                    <p className="text-xs text-white/50 mt-1">
                      {oracleProphecy.game.genres.join(' • ')} • {oracleProphecy.game.stats.playCount || 0} previous sessions
                    </p>
                  </div>

                  {/* Decree Box */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--game-accent,#2ee5ba)] mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>The Oracle's Decree</span>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed italic">
                      "{oracleProphecy.decree}"
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        onLaunchGame(oracleProphecy.game);
                        onClose();
                      }}
                      className="px-6 py-3 rounded-2xl bg-[var(--game-accent,#2ee5ba)] text-black font-extrabold text-xs flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_var(--game-glow)] cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-black" />
                      <span>Fulfill Destiny (Launch)</span>
                    </button>

                    <button
                      onClick={handleConsultOracle}
                      disabled={isOracleConsulting}
                      className="px-4 py-3 rounded-2xl glass-pill hover:bg-white/15 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isOracleConsulting ? 'animate-spin' : ''}`} />
                      <span>Consult Oracle Again</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: MOOD & TIME MATCHER */}
        {activeTab === 'mood' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Step 1: Mood Selection */}
            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-white/50 block mb-2.5">
                1. What is your desired mood?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    id: 'adrenaline' as MoodType,
                    label: 'Adrenaline',
                    sub: 'Fast combat, high-FPS, pure reflex',
                    icon: Zap,
                    color: 'text-amber-400',
                    border: 'hover:border-amber-400/50'
                  },
                  {
                    id: 'cozy' as MoodType,
                    label: 'Cozy & Chill',
                    sub: 'Low stress, relaxing comfort',
                    icon: Coffee,
                    color: 'text-sky-400',
                    border: 'hover:border-sky-400/50'
                  },
                  {
                    id: 'challenge' as MoodType,
                    label: 'Epic Challenge',
                    sub: 'Souls-like mastery, demanding bosses',
                    icon: Swords,
                    color: 'text-rose-400',
                    border: 'hover:border-rose-400/50'
                  },
                  {
                    id: 'story' as MoodType,
                    label: 'Story & Cinema',
                    sub: 'Rich lore, world-building, dialogue',
                    icon: BookOpen,
                    color: 'text-purple-400',
                    border: 'hover:border-purple-400/50'
                  }
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedMood === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        audioEngine.playHover();
                        setSelectedMood(item.id);
                        setRecommendationIndex(0);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-white/15 border-[var(--game-accent,#2ee5ba)] ring-2 ring-[var(--game-accent,#2ee5ba)] shadow-lg'
                          : `bg-black/40 border-white/10 ${item.border} hover:bg-white/5`
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-5 h-5 ${item.color}`} />
                        {isSelected && <Check className="w-4 h-4 text-[var(--game-accent,#2ee5ba)]" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">{item.label}</div>
                        <div className="text-[10px] text-white/50 leading-tight mt-0.5">{item.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Time Slot */}
            <div>
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-white/50 block mb-2.5">
                2. How much time do you have tonight?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'quick' as TimeSlotType,
                    label: 'Quick Bite',
                    detail: 'Under 45 Minutes',
                    desc: 'Short missions, roguelites, immediate action'
                  },
                  {
                    id: 'moderate' as TimeSlotType,
                    label: 'Standard Session',
                    detail: '1 to 2 Hours',
                    desc: 'A solid narrative quest or campaign chapter'
                  },
                  {
                    id: 'marathon' as TimeSlotType,
                    label: 'Marathon Run',
                    detail: '3+ Hours Deep Dive',
                    desc: 'Immersion in sprawling open worlds & RPGs'
                  }
                ].map((slot) => {
                  const isSelected = selectedTime === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => {
                        audioEngine.playHover();
                        setSelectedTime(slot.id);
                        setRecommendationIndex(0);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-white/15 border-[var(--game-accent,#2ee5ba)] ring-2 ring-[var(--game-accent,#2ee5ba)] shadow-lg'
                          : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{slot.label}</span>
                        <span className="text-[10px] font-mono text-[var(--game-accent,#2ee5ba)] font-semibold">
                          {slot.detail}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 mt-1">{slot.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Spotlight Match Result Card */}
            {currentMatch ? (
              <div className="relative rounded-3xl bg-black/60 border border-white/15 overflow-hidden shadow-2xl p-6 isolate">
                {/* Ambient Backdrop Image */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-25">
                  <img
                    src={normalizeMediaUrl(currentMatch.game.backdropUrl || currentMatch.game.coverUrl)}
                    alt="Backdrop"
                    className="w-full h-full object-cover filter blur-md scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e17] via-[#0b0e17]/80 to-transparent" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
                  {/* Game Cover */}
                  <img
                    src={normalizeMediaUrl(currentMatch.game.coverUrl)}
                    alt={currentMatch.game.title}
                    className="w-36 h-48 sm:w-44 sm:h-60 rounded-2xl object-cover shadow-2xl border border-white/20 flex-shrink-0"
                  />

                  {/* Game Info & Rationale */}
                  <div className="flex-1 min-w-0 space-y-3 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--game-accent,#2ee5ba)] text-black">
                        {currentMatch.badge}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider glass-pill text-white/80">
                        {currentMatch.game.type}
                      </span>
                      {currentMatch.game.collection && currentMatch.game.collection !== 'none' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider glass-pill text-amber-300">
                          {currentMatch.game.collection}
                        </span>
                      )}
                      {currentMatch.completionPercent !== undefined && currentMatch.completionPercent > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          {currentMatch.completionPercent}% Complete
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                      {currentMatch.game.title}
                    </h3>

                    {/* Famous dialogue / quote */}
                    {currentMatch.game.quote?.text && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs italic text-white/90">
                        <Quote className="w-3.5 h-3.5 text-[var(--game-accent,#2ee5ba)] flex-shrink-0" />
                        <span className="truncate max-w-lg">“{currentMatch.game.quote.text}”</span>
                        {currentMatch.game.quote.speaker && (
                          <span className="not-italic text-[var(--game-accent,#2ee5ba)] font-medium text-[11px] whitespace-nowrap">
                            — {currentMatch.game.quote.speaker}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Astra Rationale Box */}
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/80">
                      <div className="flex items-center gap-1.5 text-[var(--game-accent,#2ee5ba)] font-bold text-[11px] uppercase tracking-wider mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Why Astra picked this for tonight:</span>
                      </div>
                      <p className="leading-relaxed">{currentMatch.reason}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-center md:justify-start gap-3 pt-2 flex-wrap">
                      <button
                        onClick={() => {
                          audioEngine.playLaunch();
                          onLaunchGame(currentMatch.game);
                          onClose();
                        }}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--game-accent,#2ee5ba)] text-black font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_var(--game-glow)] cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Launch This Game</span>
                      </button>

                      {moodRecommendations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            audioEngine.playSelect();
                            setRecommendationIndex((prev) => (prev + 1) % moodRecommendations.length);
                          }}
                          className="flex items-center gap-1.5 px-4 py-3 rounded-xl glass-pill text-xs font-semibold text-white/80 hover:text-white cursor-pointer transition-all hover:bg-white/10"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Show Alternate Pick ({recommendationIndex + 1}/{moodRecommendations.length})</span>
                        </button>
                      )}

                      {onOpenOverview && (
                        <button
                          type="button"
                          onClick={() => {
                            audioEngine.playSelect();
                            onOpenOverview(currentMatch.game);
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-4 py-3 rounded-xl glass-pill text-xs font-semibold text-white/70 hover:text-white cursor-pointer"
                        >
                          <Trophy className="w-3.5 h-3.5 text-amber-300" />
                          <span>Game Hub</span>
                        </button>
                      )}

                      {onOpenIntel && (
                        <button
                          type="button"
                          onClick={() => {
                            audioEngine.playSelect();
                            onOpenIntel(currentMatch.game);
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-4 py-3 rounded-xl glass-pill text-xs font-semibold text-white/70 hover:text-white cursor-pointer"
                        >
                          <span>Intel Deck</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-white/40 text-xs">
                No matching games found in library.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CYBER ROULETTE REEL */}
        {activeTab === 'roulette' && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-between space-y-6">
            {/* Filter pills */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="text-[11px] font-mono text-white/40 uppercase mr-1">Spin Pool:</span>
              {[
                { id: 'all' as RouletteFilter, label: `All Games (${games.length})` },
                { id: 'favorites' as RouletteFilter, label: '⭐ Favorites' },
                { id: 'backlog' as RouletteFilter, label: '📌 Backlog / Unplayed' },
                { id: 'short' as RouletteFilter, label: '⏱️ Short (<15h)' }
              ].map((f) => (
                <button
                  key={f.id}
                  disabled={isSpinning}
                  onClick={() => {
                    audioEngine.playHover();
                    setRouletteFilter(f.id);
                    setRouletteWinner(null);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all disabled:opacity-50 ${
                    rouletteFilter === f.id
                      ? 'bg-[var(--game-accent,#2ee5ba)] text-black shadow-md'
                      : 'glass-pill text-white/60 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* MECHANICAL ROULETTE REEL CAROUSEL */}
            <div className="relative w-full py-4 overflow-hidden rounded-2xl bg-black/50 border border-white/10 select-none">
              {/* Center Lock Reticle Pointer */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-36 pointer-events-none z-20 border-x-2 border-[var(--game-accent,#2ee5ba)] bg-[var(--game-accent,#2ee5ba)]/10 shadow-[0_0_30px_var(--game-glow)]">
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[var(--game-accent,#2ee5ba)]" />
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-[var(--game-accent,#2ee5ba)]" />
              </div>

              {/* Side Vignette Gradients */}
              <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0b0e17] to-transparent pointer-events-none z-10" />
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0b0e17] to-transparent pointer-events-none z-10" />

              {/* Scrolling Strip */}
              <div
                ref={reelRef}
                style={{
                  transform: `translateX(calc(50% - 64px - ${reelOffset}px))`
                }}
                className="flex items-center gap-4 px-4 will-change-transform py-3"
              >
                {reelItems.map((game, idx) => (
                  <div
                    key={`${game.id}-${idx}`}
                    className="w-32 h-44 rounded-xl overflow-hidden bg-slate-900 border border-white/15 flex-shrink-0 relative group shadow-md"
                  >
                    <img
                      src={normalizeMediaUrl(game.coverUrl)}
                      alt={game.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                      <p className="text-[10px] font-bold text-white truncate text-center">{game.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* WINNER ANNOUNCEMENT / CALLOUT */}
            {rouletteWinner ? (
              <div className="w-full max-w-lg p-5 rounded-2xl bg-white/10 border-2 border-[var(--game-accent,#2ee5ba)] shadow-[0_0_35px_var(--game-glow)] flex items-center justify-between gap-4 animate-modalIn">
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={normalizeMediaUrl(rouletteWinner.coverUrl)}
                    alt={rouletteWinner.title}
                    className="w-16 h-20 rounded-xl object-cover shadow-md border border-white/20 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--game-accent,#2ee5ba)]">
                      🎯 FATE HAS CHOSEN
                    </span>
                    <h4 className="text-lg font-black text-white truncate">{rouletteWinner.title}</h4>
                    {rouletteWinner.quote?.text && (
                      <p className="text-[11px] text-white/70 italic truncate mt-0.5">
                        “{rouletteWinner.quote.text}”
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    audioEngine.playLaunch();
                    onLaunchGame(rouletteWinner);
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[var(--game-accent,#2ee5ba)] text-black font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer flex-shrink-0 flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-white/40 text-center font-mono">
                {isSpinning ? '🎲 Deciding your destiny...' : 'Press [SPACEBAR] or click Spin to roll the reel'}
              </p>
            )}

            {/* BIG SPIN BUTTON */}
            <button
              disabled={isSpinning || rouletteCandidates.length === 0}
              onClick={handleStartSpin}
              className={`flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-black text-sm tracking-wider uppercase transition-all duration-300 transform cursor-pointer ${
                isSpinning
                  ? 'bg-white/10 text-white/40 border border-white/10'
                  : 'bg-gradient-to-r from-amber-400 via-[var(--game-accent,#2ee5ba)] to-cyan-400 text-black shadow-[0_0_35px_var(--game-glow)] hover:scale-105 active:scale-95'
              }`}
            >
              <Dices className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'Spinning...' : 'Spin The Wheel'}</span>
            </button>
          </div>
        )}

        {/* TAB 3: BACKLOG FINISHER (HLTB GUIDED) */}
        {activeTab === 'backlog' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>HowLongToBeat Backlog Tracker</span>
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Games you've started or short campaign gems ready to be conquered in a few sittings.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[var(--game-accent,#2ee5ba)]">
                {backlogFinishers.length} Titles Ready
              </span>
            </div>

            {backlogFinishers.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-xs">
                No games with HowLongToBeat stats found in your backlog.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {backlogFinishers.map((item) => {
                  const hltb = item.game.hltb || item.game.metadata?.hltb;
                  const percent = item.completionPercent || 0;

                  return (
                    <div
                      key={item.game.id}
                      className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-white/30 transition-all flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={normalizeMediaUrl(item.game.coverUrl)}
                          alt={item.game.title}
                          className="w-12 h-16 rounded-xl object-cover flex-shrink-0 border border-white/10"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white truncate">{item.game.title}</h4>
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[var(--game-accent,#2ee5ba)]/20 text-[var(--game-accent,#2ee5ba)]">
                              {item.badge}
                            </span>
                          </div>

                          <div className="text-[11px] text-white/60 mt-1 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3 text-sky-400" />
                              <span>{item.estimatedRemainingHours}h remaining</span>
                            </span>
                            <span>•</span>
                            <span className="text-white/40">{hltb?.mainStoryHours}h total</span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-40 h-1.5 bg-white/10 rounded-full overflow-hidden mt-1.5">
                            <div
                              style={{ width: `${percent}%` }}
                              className="h-full bg-gradient-to-r from-emerald-400 to-[var(--game-accent,#2ee5ba)] rounded-full"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          audioEngine.playLaunch();
                          onLaunchGame(item.game);
                          onClose();
                        }}
                        className="px-3 py-2 rounded-xl bg-[var(--game-accent,#2ee5ba)] text-black font-bold text-xs flex items-center gap-1 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md flex-shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-white/50">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">R</span>
              <span>or</span>
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">Y</span>
              <span>Quick Suggester</span>
            </span>
          </div>

          <span className="text-[11px] text-white/40">
            ASTRA Decision Engine v1.0
          </span>
        </div>
      </div>
    </div>
  );
};
