import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Sparkles, Star, Check } from 'lucide-react';
import type { UserProfile, GlobalTheme } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { ThemeEngine, GLOBAL_THEMES } from '../../services/themeEngine';
import { DeviceIcon, type ControllerDetails } from '../../utils/deviceDetector';
import { AstraCoreIcon } from '../layout/AstraCoreIcon';

interface LoginScreenProps {
  profiles: UserProfile[];
  onSelectProfile: (profile: UserProfile) => void;
  onAddProfile: (profile: UserProfile) => void;
  activeInputMode?: 'keyboard' | 'controller';
  controllerDetails?: ControllerDetails | null;
  gamepadConnected?: boolean;
  gamepadName?: string;
  initialStage?: 'press_to_start' | 'select_profile';
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  profiles,
  onSelectProfile,
  onAddProfile,
  activeInputMode = 'keyboard',
  controllerDetails,
  gamepadConnected = false,
  gamepadName = '',
  initialStage = 'press_to_start'
}) => {
  const [stage, setStage] = useState<'press_to_start' | 'select_profile'>(initialStage);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('Player');
  const [newTheme, setNewTheme] = useState<GlobalTheme>('ps5-dark');
  const [timeStr, setTimeStr] = useState('');

  // Live time ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedProfile = profiles[selectedIndex];

  // Dynamically update theme glow based on selected profile
  useEffect(() => {
    if (selectedProfile && stage === 'select_profile') {
      const t = GLOBAL_THEMES[selectedProfile.theme] || GLOBAL_THEMES['8bitdo-mint'];
      ThemeEngine.applyGameTheme(t.colors.accent, t.colors.glow);
    }
  }, [selectedProfile, stage]);

  const handleStartBoot = useCallback(() => {
    audioEngine.playBoot();
    setStage('select_profile');
  }, []);

  // Keyboard & Gamepad navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isAddingUser) {
        if (e.key === 'Escape') setIsAddingUser(false);
        return;
      }

      // Stage 1: PRESS F OR (A) TO START
      if (stage === 'press_to_start') {
        if (e.key.toLowerCase() === 'f' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartBoot();
        }
        return;
      }

      // Stage 2: PROFILE SELECTION
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        audioEngine.playHover();
        setSelectedIndex((prev) => (prev + 1) % (profiles.length + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        audioEngine.playHover();
        setSelectedIndex((prev) => (prev - 1 + (profiles.length + 1)) % (profiles.length + 1));
      } else if (e.key === 'Enter' || e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (selectedIndex === profiles.length) {
          audioEngine.playSelect();
          setIsAddingUser(true);
        } else if (profiles[selectedIndex]) {
          audioEngine.playLaunch();
          onSelectProfile(profiles[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        audioEngine.playSelect();
        setStage('press_to_start');
      }
    },
    [isAddingUser, stage, selectedIndex, profiles, onSelectProfile, handleStartBoot]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Controller Gamepad loop for Start screen (Listen to button 0 / A to start or select)
  useEffect(() => {
    let animId: number;
    let lastButtonPress = 0;

    const checkGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = Array.from(gamepads).find((g) => g !== null);
      if (gp) {
        const now = performance.now();
        // Button 0 (A / South Button)
        if (gp.buttons[0]?.pressed && now - lastButtonPress > 350) {
          lastButtonPress = now;
          if (stage === 'press_to_start') {
            handleStartBoot();
          } else if (stage === 'select_profile') {
            if (selectedIndex === profiles.length) {
              audioEngine.playSelect();
              setIsAddingUser(true);
            } else if (profiles[selectedIndex]) {
              audioEngine.playLaunch();
              onSelectProfile(profiles[selectedIndex]);
            }
          }
        }

        // Button 1 (B / East Button) - Back
        if (gp.buttons[1]?.pressed && now - lastButtonPress > 350) {
          lastButtonPress = now;
          if (stage === 'select_profile') {
            audioEngine.playSelect();
            setStage('press_to_start');
          }
        }
      }
      animId = requestAnimationFrame(checkGamepad);
    };

    animId = requestAnimationFrame(checkGamepad);
    return () => cancelAnimationFrame(animId);
  }, [stage, selectedIndex, profiles, onSelectProfile, handleStartBoot]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    audioEngine.playSelect();
    const created: UserProfile = {
      id: 'user-' + Date.now(),
      name: newName.trim(),
      tag: newTag.trim() || 'Player',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(newName)}`,
      theme: newTheme,
      isHost: false
    };

    onAddProfile(created);
    setNewName('');
    setIsAddingUser(false);
    setSelectedIndex(profiles.length);
  };

  return (
    <div
      className="w-screen h-screen flex flex-col justify-between p-8 bg-[#04060b] text-white relative overflow-hidden select-none font-sans isolate transition-colors duration-700"
      style={{
        background: `radial-gradient(ellipse at 50% 45%, var(--game-glow, rgba(46, 229, 186, 0.25)) 0%, #04060b 72%)`
      }}
    >
      {/* Background Animated Atmosphere */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Deep ambient circular aura */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-3xl opacity-35 animate-pulse duration-1000"
          style={{ background: 'radial-gradient(circle, var(--game-accent, #2ee5ba) 0%, transparent 70%)' }}
        />
        {/* Soft vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/80" />
      </div>

      {/* TOP BAR: Console Branding & Device Status */}
      <header className="w-full flex items-center justify-between text-xs tracking-widest uppercase z-20">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <AstraCoreIcon size="sm" isEnergetic={stage === 'press_to_start'} />
          <div className="flex flex-col select-none">
            <span className="font-extrabold tracking-widest text-sm text-white/90 leading-tight">
              ASTRA
            </span>
            <span className="text-[9px] font-mono tracking-widest text-[var(--game-accent,#2ee5ba)] opacity-85 uppercase leading-none">
              CONSTELLATION GATEWAY
            </span>
          </div>
        </div>

        {/* Device Status & Clock */}
        <div className="flex items-center gap-3">
          {/* Active Device Indicator */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
              activeInputMode === 'controller'
                ? 'bg-[var(--game-accent,#2ee5ba)]/15 text-white border border-[var(--game-accent,#2ee5ba)]/40 shadow-[0_0_12px_var(--game-glow)]'
                : 'glass-pill text-white/80 border-white/15'
            }`}
          >
            {activeInputMode === 'controller' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--game-accent,#2ee5ba)] animate-pulse" />
                <DeviceIcon
                  type={controllerDetails?.brand || 'generic'}
                  className="w-3.5 h-3.5 text-[var(--game-accent,#2ee5ba)]"
                />
                <span>{controllerDetails?.shortName || gamepadName || 'Controller'}</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                <DeviceIcon type="keyboard" className="w-3.5 h-3.5 text-white/90" />
                <span>Keyboard</span>
                {gamepadConnected && (
                  <span className="pl-1 ml-0.5 border-l border-white/20 opacity-60">
                    <DeviceIcon
                      type={controllerDetails?.brand || 'generic'}
                      className="w-3 h-3 text-[var(--game-accent,#2ee5ba)]"
                    />
                  </span>
                )}
              </>
            )}
          </div>

          {/* Clock */}
          <div className="glass-pill px-3 py-1 text-xs text-white/70 font-mono font-medium">
            {timeStr}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* STAGE 1: PRESS F OR (A) TO START                                         */}
      {/* ========================================================================= */}
      {stage === 'press_to_start' && (
        <div
          onClick={handleStartBoot}
          className="flex-1 flex flex-col items-center justify-center cursor-pointer select-none space-y-12 my-auto animate-fadeInUp transform-gpu z-20"
        >
          {/* Glowing Animated Astra Core Emblem */}
          <div className="relative flex items-center justify-center group mb-2">
            {/* Outer atmospheric aura */}
            <div className="absolute w-72 h-72 rounded-full border border-[var(--game-accent,#2ee5ba)]/20 animate-ping opacity-20 pointer-events-none" />
            <div className="absolute w-56 h-56 rounded-full border border-[var(--game-accent,#2ee5ba)]/30 shadow-[0_0_60px_var(--game-glow)] pointer-events-none" />

            {/* Astra Core Animated Polyhedron */}
            <div className="transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 astra-chromatic-glow">
              <AstraCoreIcon size="xl" isEnergetic={true} />
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="text-center space-y-2.5">
            <h1 className="text-5xl md:text-6xl font-black tracking-widest text-white uppercase drop-shadow-[0_0_35px_var(--game-glow)]">
              ASTRA
            </h1>
            <p className="text-xs tracking-widest uppercase text-white/60 font-mono font-medium">
              ASTRA OS 3.0 // CONSTELLATION NODE
            </p>
          </div>

          {/* Core Interactive Prompt: PRESS F OR (A) TO START */}
          <div className="flex items-center gap-3.5 px-8 py-3.5 rounded-2xl bg-white/5 border border-white/20 backdrop-blur-xl shadow-[0_0_35px_var(--game-glow)] hover:scale-105 hover:bg-white/10 active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] animate-pulse">
            <div className="flex items-center gap-2">
              <kbd className="px-2.5 py-1 rounded-lg bg-white/20 text-white font-mono font-black text-sm border border-white/30 shadow-inner">
                F
              </kbd>
              <span className="text-[11px] text-white/50 font-extrabold">OR</span>
              <span className="w-7 h-7 rounded-full bg-emerald-500/25 border border-emerald-400/50 flex items-center justify-center font-black text-xs text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                A
              </span>
            </div>
            <span className="text-sm font-black tracking-widest uppercase text-white drop-shadow-md">
              PRESS F OR (A) TO START
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: WHO IS PLAYING TODAY? (PROFILE SELECTION)                        */}
      {/* ========================================================================= */}
      {stage === 'select_profile' && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-12 my-auto z-20">
          {/* Header */}
          <div className="text-center space-y-2 animate-fadeInUp transform-gpu">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase drop-shadow-lg">
              WHO IS PLAYING TODAY?
            </h1>
            <p className="text-xs text-white/50 tracking-wider font-medium">
              Select your profile to load personalized library, theme, and trophies
            </p>
          </div>

          {/* Profiles Row matching concept artwork */}
          <div className="flex items-center gap-9 flex-wrap justify-center py-4">
            {profiles.map((profile, idx) => {
              const isSelected = idx === selectedIndex;
              const themeColor = GLOBAL_THEMES[profile.theme]?.colors.accent || '#2ee5ba';
              const isHost = profile.isHost || idx === 0;

              return (
                <div
                  key={profile.id}
                  onClick={() => {
                    if (isSelected) {
                      audioEngine.playLaunch();
                      onSelectProfile(profile);
                    } else {
                      audioEngine.playHover();
                      setSelectedIndex(idx);
                    }
                  }}
                  onMouseEnter={() => {
                    if (!isSelected) {
                      audioEngine.playHover();
                      setSelectedIndex(idx);
                    }
                  }}
                  style={{
                    animationDelay: `${idx * 80}ms`
                  }}
                  className={`group flex flex-col items-center cursor-pointer animate-fadeInUp transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu will-change-transform ${
                    isSelected ? 'scale-110 -translate-y-2' : 'opacity-60 hover:opacity-90 hover:scale-105'
                  }`}
                >
                  {/* Avatar Circle with Theme Halo */}
                  <div
                    className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isSelected
                        ? 'ring-4 shadow-[0_0_40px_var(--game-glow)]'
                        : 'border-2 border-white/15'
                    }`}
                    style={{
                      borderColor: isSelected ? themeColor : undefined,
                      boxShadow: isSelected ? `0 0 35px ${themeColor}, 0 0 60px ${themeColor}40` : undefined
                    }}
                  >
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="w-full h-full rounded-full object-cover bg-white/5"
                    />

                    {/* Host Star / Player Badge */}
                    {isHost ? (
                      <div
                        className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg border-2 border-black"
                        title="Primary Host Profile"
                      >
                        <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                      </div>
                    ) : (
                      <div className="absolute bottom-1 right-1 px-2 py-0.5 rounded-full bg-black/80 text-white font-mono font-bold text-[10px] border border-white/30 shadow-md">
                        P{idx + 1}
                      </div>
                    )}
                  </div>

                  {/* Profile Name & Title */}
                  <div className="text-center mt-4 space-y-0.5">
                    <h3 className="font-black text-base text-white tracking-wide truncate max-w-[150px]">
                      {profile.name}
                    </h3>
                    <p className="text-[11px] text-white/45 uppercase tracking-wider font-semibold">
                      {profile.tag || 'Player'}
                    </p>
                  </div>

                  {/* Highlighted Log In Pill on Selection */}
                  {isSelected && (
                    <div
                      className="mt-3 px-3.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase text-black animate-pulse flex items-center gap-1 shadow-md"
                      style={{ backgroundColor: themeColor }}
                    >
                      <Check className="w-3 h-3" />
                      <span>LOG IN</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Friend Card */}
            <div
              onClick={() => {
                audioEngine.playSelect();
                setIsAddingUser(true);
              }}
              onMouseEnter={() => {
                if (selectedIndex !== profiles.length) {
                  audioEngine.playHover();
                  setSelectedIndex(profiles.length);
                }
              }}
              style={{
                animationDelay: `${profiles.length * 80}ms`
              }}
              className={`flex flex-col items-center cursor-pointer animate-fadeInUp transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu will-change-transform ${
                selectedIndex === profiles.length
                  ? 'scale-110 -translate-y-2'
                  : 'opacity-40 hover:opacity-85 hover:scale-105'
              }`}
            >
              <div
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  selectedIndex === profiles.length
                    ? 'border-[var(--game-accent,#2ee5ba)] bg-white/5 shadow-[0_0_25px_var(--game-glow)] text-[var(--game-accent,#2ee5ba)]'
                    : 'border-white/20 text-white/40'
                }`}
              >
                <Plus className="w-9 h-9" />
              </div>

              <div className="text-center mt-4 space-y-0.5">
                <h3 className="font-bold text-sm text-white/80">Add Friend</h3>
                <span className="text-[10px] text-white/40 uppercase">New Profile</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER: Interactive Controls Prompt */}
      <footer className="w-full flex items-center justify-center gap-8 text-xs text-white/50 tracking-wider font-semibold z-20">
        {stage === 'press_to_start' ? (
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 rounded bg-white/10 text-white font-mono text-[10px]">F</kbd>
            <span>or</span>
            <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold">A</span>
            <span>to Continue</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded bg-white/10 text-white font-mono text-[10px]">F / ENTER</kbd>
              <span>or</span>
              <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold">A</span>
              <span>Log In</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded bg-white/10 text-white font-mono text-[10px]">← →</kbd>
              <span>Switch User</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 rounded bg-white/10 text-white font-mono text-[10px]">ESC</kbd>
              <span>or</span>
              <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold">B</span>
              <span>Back</span>
            </div>
          </>
        )}
      </footer>

      {/* Modal: Add Friend / New Profile */}
      {isAddingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsAddingUser(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[#0c101b] border border-white/20 p-6 shadow-2xl space-y-5 animate-modalIn transform-gpu will-change-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--game-accent,#2ee5ba)]" />
                <h3 className="font-bold text-sm text-white">Create Friend Profile</h3>
              </div>
              <button
                onClick={() => setIsAddingUser(false)}
                className="text-white/40 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Friend's Name / Gamertag*</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Shadow"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--game-accent,#2ee5ba)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Role / Subtitle</label>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="e.g. Player 2 · Co-Op Partner"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--game-accent,#2ee5ba)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-2">Preferred Theme Color</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(GLOBAL_THEMES) as GlobalTheme[]).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setNewTheme(t)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer ${
                        newTheme === t
                          ? 'border-[var(--game-accent,#2ee5ba)] bg-[var(--game-accent,#2ee5ba)]/10 text-white'
                          : 'border-white/10 text-white/50 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{GLOBAL_THEMES[t].name}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: GLOBAL_THEMES[t].colors.accent }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="px-4 py-2 rounded-xl text-xs glass-pill text-white/60 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs bg-[var(--game-accent,#2ee5ba)] text-black font-extrabold shadow-lg hover:brightness-110 cursor-pointer"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;
