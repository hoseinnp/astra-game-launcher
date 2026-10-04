import React, { useState } from 'react';
import {
  Sparkles, Compass, Cpu, Disc, Gamepad2, ArrowRight, Check, RefreshCw
} from 'lucide-react';
import type { ExperienceArchetype, AppSettings, ViewMode, GlobalTheme } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';
import { hapticsService } from '../../services/hapticsService';
import { SetupWizardBackground } from './SetupWizardBackground';

interface SetupWizardModalProps {
  isOpen: boolean;
  currentSettings: AppSettings;
  onComplete: (updatedSettings: Partial<AppSettings>) => void;
  onClose?: () => void;
}

interface ArchetypeCardDef {
  id: ExperienceArchetype;
  title: string;
  subtitle: string;
  tagline: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  defaultView: ViewMode;
  defaultTheme: GlobalTheme;
  features: string[];
}

const ARCHETYPES: ArchetypeCardDef[] = [
  {
    id: 'analog',
    title: 'The Analog Archive',
    subtitle: 'Physical Collector & Vintage Game Room',
    tagline: 'Warm mahogany woods, physical keeps, retro cartridges & vinyl crackle ambience.',
    badge: 'COLLECTOR ARCHIVE',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    icon: <Disc className="w-6 h-6 text-amber-400" />,
    defaultView: 'shelf',
    defaultTheme: 'analog-collector',
    features: [
      '3D Physical Shelves with natural wood textures',
      'Era-accurate cartridges & optical disc inspection',
      'Warm vinyl crackle & acoustic tape soundscapes',
      'Tactile mechanical rumble & physical clicks'
    ]
  },
  {
    id: 'digital',
    title: 'The Digital Matrix',
    subtitle: 'Cyberpunk & Modern Console HUD',
    tagline: 'High-tech neon telemetry, PS5-style horizontal ribbon, and synthwave pulses.',
    badge: 'CYBER HUD',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
    icon: <Cpu className="w-6 h-6 text-cyan-400" />,
    defaultView: 'ps5',
    defaultTheme: 'cyberpunk',
    features: [
      'Sleek PS5 horizontal carousel with dynamic hero art',
      'High-contrast carbon mesh & neon laser telemetry',
      'Procedural synthwave arpeggios & high-tech hum',
      'Rapid electric frequency haptic feedback'
    ]
  },
  {
    id: 'cosmic',
    title: 'Starfield Observatory',
    subtitle: 'Deep Space Orbital Command Deck',
    tagline: 'Ethereal drifting stardust, celestial ambient drones, and titanium glass minimalism.',
    badge: 'ORBITAL DECK',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
    icon: <Compass className="w-6 h-6 text-purple-400" />,
    defaultView: 'ps5',
    defaultTheme: 'starfield-cosmic',
    features: [
      'Interactive 3D starfield & parallax nebula drift',
      'Deep celestial sub-bass drones & solar wind bells',
      'Titanium obsidian glass panels with starlight sheen',
      'Swelling gravitational wave controller haptics'
    ]
  }
];

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  isOpen,
  currentSettings,
  onComplete,
  onClose
}) => {
  const [selectedArchetype, setSelectedArchetype] = useState<ExperienceArchetype>(
    currentSettings.experienceArchetype || 'digital'
  );
  const [hoveredArchetype, setHoveredArchetype] = useState<ExperienceArchetype | null>(null);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(
    currentSettings.hapticsEnabled !== false
  );
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);

  if (!isOpen) return null;

  // Active preview archetype prioritizes hover, falls back to selection
  const activePreview = hoveredArchetype || selectedArchetype;

  // Real-time hover triggers: audio crossfade, haptics, and background shift
  const handleHoverArchetype = (archetype: ExperienceArchetype) => {
    setHoveredArchetype(archetype);
    audioEngine.previewArchetypeAmbience(archetype);

    if (hapticsEnabled) {
      if (archetype === 'analog') hapticsService.trigger('analog-thud');
      else if (archetype === 'digital') hapticsService.trigger('digital-buzz');
      else if (archetype === 'cosmic') hapticsService.trigger('cosmic-wave');
    }
  };

  const handleLeaveArchetype = () => {
    setHoveredArchetype(null);
    audioEngine.previewArchetypeAmbience(selectedArchetype);
  };

  const handleSelectArchetype = (archetype: ExperienceArchetype) => {
    audioEngine.playSelect();
    setSelectedArchetype(archetype);
    if (hapticsEnabled) {
      hapticsService.trigger('confirm');
    }
  };

  const handleTestHaptics = () => {
    audioEngine.playHover();
    if (activePreview === 'analog') hapticsService.trigger('cartridge-clunk');
    else if (activePreview === 'digital') hapticsService.trigger('digital-buzz');
    else hapticsService.trigger('cosmic-wave');
  };

  const handleFinalize = () => {
    setIsFinalizing(true);
    audioEngine.playOracleChime();
    if (hapticsEnabled) {
      hapticsService.trigger('confirm');
    }

    const chosenDef = ARCHETYPES.find((a) => a.id === selectedArchetype) || ARCHETYPES[1];

    setTimeout(() => {
      audioEngine.stopArchetypePreview();
      onComplete({
        experienceArchetype: selectedArchetype,
        viewMode: chosenDef.defaultView,
        globalTheme: chosenDef.defaultTheme,
        hapticsEnabled,
        hasCompletedOnboarding: true
      });
      setIsFinalizing(false);
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/90 backdrop-blur-2xl select-none animate-fadeIn overflow-hidden">
      {/* Dynamic Interactive Background Shader (Reacts live to cursor hover) */}
      <SetupWizardBackground activeArchetype={activePreview} />

      {/* Main Setup Card Container */}
      <div className="relative z-10 w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-[#090d18]/85 border border-white/20 shadow-[0_0_90px_rgba(0,0,0,0.95)] backdrop-blur-2xl overflow-hidden animate-modalIn">
        {/* Header Bar */}
        <div className="px-8 py-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-[var(--game-accent,#2ee5ba)] to-purple-600 flex items-center justify-center text-black font-black shadow-lg">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white uppercase tracking-widest">
                  ASTRA OS CALIBRATION
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-[var(--game-accent,#2ee5ba)]/20 text-[var(--game-accent,#2ee5ba)] border border-[var(--game-accent,#2ee5ba)]/30">
                  INITIAL SETUP
                </span>
              </div>
              <p className="text-xs text-white/50 font-mono">
                Hover over realms to preview ambient acoustics, lighting, and controller haptics in real time.
              </p>
            </div>
          </div>

          {onClose && currentSettings.hasCompletedOnboarding && (
            <button
              onClick={() => {
                audioEngine.stopArchetypePreview();
                onClose();
              }}
              className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content Body: Realm Selection Portals */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-1">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[var(--game-accent,#2ee5ba)] uppercase">
              CHOOSE YOUR CORE REALM
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              How do you want your gaming library to feel?
            </h2>
            <p className="text-xs text-white/60">
              Each archetype configures a unique interface philosophy, physical materials, and audio atmosphere.
            </p>
          </div>

          {/* 3 Portal Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            {ARCHETYPES.map((arch) => {
              const isSelected = selectedArchetype === arch.id;
              const isHovered = hoveredArchetype === arch.id;

              return (
                <div
                  key={arch.id}
                  onMouseEnter={() => handleHoverArchetype(arch.id)}
                  onMouseLeave={handleLeaveArchetype}
                  onClick={() => handleSelectArchetype(arch.id)}
                  className={`group relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer overflow-hidden border ${
                    isSelected
                      ? 'bg-white/15 border-[var(--game-accent,#2ee5ba)] shadow-[0_0_35px_rgba(46,229,186,0.35)] scale-[1.02]'
                      : isHovered
                        ? 'bg-white/10 border-white/40 shadow-2xl scale-[1.01]'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Top Badge & Icon */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-3 rounded-2xl bg-white/10 border border-white/15 shadow-md">
                        {arch.icon}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wider border ${arch.badgeColor}`}>
                        {arch.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-white tracking-wide flex items-center justify-between">
                        <span>{arch.title}</span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[var(--game-accent,#2ee5ba)] text-black flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </h3>
                      <p className="text-xs text-white/50 font-medium mt-0.5">{arch.subtitle}</p>
                    </div>

                    <p className="text-xs text-white/70 leading-relaxed font-sans">{arch.tagline}</p>

                    {/* Feature Bullets */}
                    <div className="space-y-2 pt-3 border-t border-white/10">
                      {arch.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-[11px] text-white/60">
                          <span className="text-[var(--game-accent,#2ee5ba)] mt-0.5">•</span>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Selection Indicator */}
                  <div className="pt-6">
                    <div
                      className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        isSelected
                          ? 'bg-[var(--game-accent,#2ee5ba)] text-black shadow-md'
                          : 'bg-white/10 text-white/70 group-hover:text-white group-hover:bg-white/20'
                      }`}
                    >
                      <span>{isSelected ? 'Active Realm Selected' : 'Click to Select'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Controller Haptics Calibration Banner */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 text-sky-400">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Controller Haptics & Vibration</h4>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    DUAL-RUMBLE READY
                  </span>
                </div>
                <p className="text-[11px] text-white/50">
                  Feel mechanical cartridge clunks, wind flutter, and cosmic gravity pulses in your hands.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTestHaptics}
                title="Send test pulse to gamepad"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span>Test Vibration</span>
              </button>

              <button
                onClick={() => setHapticsEnabled(!hapticsEnabled)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  hapticsEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}
              >
                {hapticsEnabled ? 'Haptics: ON' : 'Haptics: OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Confirmation Bar */}
        <div className="px-8 py-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
          <div className="text-xs text-white/40 font-mono hidden sm:block">
            <span>READY TO INITIALIZE: </span>
            <span className="text-white font-bold uppercase">{selectedArchetype} REALM</span>
          </div>

          <button
            onClick={handleFinalize}
            disabled={isFinalizing}
            className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-[var(--game-accent,#2ee5ba)] text-black font-extrabold text-sm flex items-center justify-center gap-2.5 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_25px_var(--game-glow)] cursor-pointer"
          >
            <span>{isFinalizing ? 'CALIBRATING ASTRA OS...' : 'INITIALIZE CONSOLE'}</span>
            <ArrowRight className="w-4 h-4 fill-black" />
          </button>
        </div>
      </div>
    </div>
  );
};
