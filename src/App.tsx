import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react';
import { Trophy, Camera, Play } from 'lucide-react';
import type { Game, AppSettings } from './types/game';
import { StoreService, INITIAL_GAMES, DEFAULT_PROFILES } from './services/storeService';
import { audioEngine } from './services/audioEngine';
import { ThemeEngine, GLOBAL_THEMES } from './services/themeEngine';
import { gamepadEngine } from './services/gamepadEngine';
import { AchievementEngine } from './services/achievementEngine';
import { TopBar } from './components/layout/TopBar';
import { ToastStack } from './components/layout/ToastStack';
import { ImportProgressBar } from './components/layout/ImportProgressBar';
import { ConsoleView } from './components/dashboard/ConsoleView';
import { GridView } from './components/dashboard/GridView';
import { CommandPalette } from './components/palette/CommandPalette';
import { NotesDrawer } from './components/dashboard/NotesDrawer';
import { ConfirmRemoveModal } from './components/modals/ConfirmRemoveModal';
import { GameIntelDrawer } from './components/dashboard/GameIntelDrawer';
import { NavigationHud } from './components/layout/NavigationHud';
import type { GridDensity } from './components/dashboard/GridView';
import { normalizeMediaUrl } from './utils/mediaUrl';
import type { ControllerDetails } from './utils/deviceDetector';
import type { UserProfile } from './types/game';
import { InputModeToast, type InputModeToastData } from './components/layout/InputModeToast';
import { jukeboxEngine } from './services/jukeboxEngine';
import { GameLauncherService } from './services/GameLauncherService';
import { hapticsService } from './services/hapticsService';

import { ActivityTrackingService } from './services/ActivityTrackingService';
import { PatternDetectionService } from './services/PatternDetectionService';
import type { PlayPattern } from './types/Activity.types';

// Code-split heavy views and secondary modals with React.lazy
const PhysicalShelfView = lazy(() => import('./components/dashboard/PhysicalShelfView').then(m => ({ default: m.PhysicalShelfView })));
const ModManagerModal = lazy(() => import('./components/modals/ModManagerModal').then(m => ({ default: m.ModManagerModal })));
const JukeboxModal = lazy(() => import('./components/jukebox/JukeboxModal').then(m => ({ default: m.JukeboxModal })));
const SaveVaultModal = lazy(() => import('./components/modals/SaveVaultModal').then(m => ({ default: m.SaveVaultModal })));
const ActivityDashboardModal = lazy(() => import('./modals/ActivityDashboardModal').then(m => ({ default: m.ActivityDashboardModal })));
const SmartResumePopup = lazy(() => import('./components/SmartResumePopup').then(m => ({ default: m.SmartResumePopup })));
const RetroHubModal = lazy(() => import('./components/modals/RetroHubModal').then(m => ({ default: m.RetroHubModal })));
const InGameMiniHud = lazy(() => import('./components/hud/InGameMiniHud').then(m => ({ default: m.InGameMiniHud })));
const SetupWizardModal = lazy(() => import('./components/onboarding/SetupWizardModal').then(m => ({ default: m.SetupWizardModal })));
const AddGameModal = lazy(() => import('./components/modals/AddGameModal').then(m => ({ default: m.AddGameModal })));
const SettingsModal = lazy(() => import('./components/modals/SettingsModal').then(m => ({ default: m.SettingsModal })));
const EditThemeModal = lazy(() => import('./components/modals/EditThemeModal').then(m => ({ default: m.EditThemeModal })));
const GameOverviewModal = lazy(() => import('./components/dashboard/GameOverviewModal').then(m => ({ default: m.GameOverviewModal })));
const WhatToPlayModal = lazy(() => import('./components/modals/WhatToPlayModal').then(m => ({ default: m.WhatToPlayModal })));

function getRecentResumeGame(games: Game[]): Game | null {
  if (games.length === 0) return null;
  const sorted = [...games].sort((a, b) => {
    const aTime = a.stats?.lastPlayed ? new Date(a.stats.lastPlayed).getTime() : 0;
    const bTime = b.stats?.lastPlayed ? new Date(b.stats.lastPlayed).getTime() : 0;
    return bTime - aTime;
  });
  const last = sorted[0];
  if (last && last.stats?.lastPlayed) {
    const diff = Date.now() - new Date(last.stats.lastPlayed).getTime();
    if (diff > 0 && diff < 8 * 60 * 60 * 1000) return last;
  }
  return null;
}

const FOCUSABLE_MODAL_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])'
].join(', ');

function isModalElementVisible(el: HTMLElement): boolean {
  if (el.getAttribute('aria-hidden') === 'true') return false;
  if (el.classList.contains('pointer-events-none')) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getActiveModalContainer(): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      '.fixed.inset-0:not(.pointer-events-none), .fixed.top-6.right-6, [role="dialog"]'
    )
  ).filter((el) => {
    if (el.classList.contains('pointer-events-none') || el.classList.contains('animate-shutterFlash')) {
      return false;
    }
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });

  if (candidates.length === 0) return null;
  return candidates[candidates.length - 1];
}

function navigateModalFocus(action: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'): boolean {
  const container = getActiveModalContainer();
  if (!container) return false;

  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_MODAL_SELECTOR)
  ).filter(isModalElementVisible);

  if (focusables.length === 0) return false;

  const active = document.activeElement as HTMLElement | null;
  const currentIndex = active && container.contains(active) ? focusables.indexOf(active) : -1;

  if (currentIndex === -1) {
    const target = action === 'UP' ? focusables[focusables.length - 1] : focusables[0];
    target.focus();
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    audioEngine.playHover();
    hapticsService.trigger('light-tick');
    return true;
  }

  const currentRect = focusables[currentIndex].getBoundingClientRect();
  const currentCenter = {
    x: currentRect.left + currentRect.width / 2,
    y: currentRect.top + currentRect.height / 2
  };

  let bestIndex = -1;
  let bestScore = Infinity;

  for (let i = 0; i < focusables.length; i++) {
    if (i === currentIndex) continue;
    const rect = focusables[i].getBoundingClientRect();
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    const dx = center.x - currentCenter.x;
    const dy = center.y - currentCenter.y;

    let isCandidate = false;
    let score = Infinity;

    if (action === 'DOWN' && dy > 4) {
      isCandidate = true;
      score = dy + Math.abs(dx) * 1.5;
    } else if (action === 'UP' && dy < -4) {
      isCandidate = true;
      score = -dy + Math.abs(dx) * 1.5;
    } else if (action === 'RIGHT' && dx > 4) {
      isCandidate = true;
      score = dx + Math.abs(dy) * 2.0;
    } else if (action === 'LEFT' && dx < -4) {
      isCandidate = true;
      score = -dx + Math.abs(dy) * 2.0;
    }

    if (isCandidate && score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex === -1) {
    if (action === 'DOWN' || action === 'RIGHT') {
      bestIndex = (currentIndex + 1) % focusables.length;
    } else if (action === 'UP' || action === 'LEFT') {
      bestIndex = (currentIndex - 1 + focusables.length) % focusables.length;
    }
  }

  if (bestIndex >= 0 && bestIndex < focusables.length) {
    const target = focusables[bestIndex];
    target.focus();
    target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    audioEngine.playHover();
    hapticsService.trigger('light-tick');
    return true;
  }

  return false;
}

function confirmModalFocus(): boolean {
  const container = getActiveModalContainer();
  if (!container) return false;

  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_MODAL_SELECTOR)
  ).filter(isModalElementVisible);

  if (focusables.length === 0) return false;

  const active = document.activeElement as HTMLElement | null;
  const target = active && container.contains(active) ? active : focusables[0];

  hapticsService.trigger('confirm');
  audioEngine.playSelect();

  if (typeof target.click === 'function') {
    target.click();
    return true;
  }
  return false;
}

export const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [cachedData] = useState(() => StoreService.getCached());
  const [games, setGames] = useState<Game[]>(cachedData.games);
  const [settings, setSettings] = useState<AppSettings>(cachedData.settings);
  const [profiles, setProfiles] = useState<UserProfile[]>(cachedData.profiles || DEFAULT_PROFILES);
  const [selectedGameIndex, setSelectedGameIndex] = useState<number>(0);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);
  const [isIntelDrawerOpen, setIsIntelDrawerOpen] = useState<boolean>(false);
  const [isWhatToPlayOpen, setIsWhatToPlayOpen] = useState<boolean>(false);
  const [isJukeboxOpen, setIsJukeboxOpen] = useState<boolean>(false);
  const [saveVaultGame, setSaveVaultGame] = useState<Game | null>(null);
  const [isActivityOpen, setIsActivityOpen] = useState<boolean>(false);
  const [resumePattern, setResumePattern] = useState<PlayPattern | null>(null);
  const [isRetroHubOpen, setIsRetroHubOpen] = useState<boolean>(false);
  const [isMiniHudOpen, setIsMiniHudOpen] = useState<boolean>(false);
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState<boolean>(() => {
    return cachedData.settings?.hasCompletedOnboarding === false;
  });
  const [gridDensity, setGridDensity] = useState<GridDensity>('poster');
  const [themeEditingGame, setThemeEditingGame] = useState<Game | null>(null);
  const [overviewGame, setOverviewGame] = useState<Game | null>(null);
  const [modManagingGame, setModManagingGame] = useState<Game | null>(null);
  const [gamePendingRemoval, setGamePendingRemoval] = useState<Game | null>(null);
  const [activeInputMode, setActiveInputMode] = useState<'keyboard' | 'controller'>('keyboard');
  const [controllerDetails, setControllerDetails] = useState<ControllerDetails | null>(null);
  const [gamepadConnected, setGamepadConnected] = useState<boolean>(false);
  const [gamepadName, setGamepadName] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [trophyToast, setTrophyToast] = useState<{ title: string; desc: string; type: 'bronze' | 'silver' | 'gold' | 'platinum' } | null>(null);
  const [inputToast, setInputToast] = useState<InputModeToastData | null>(null);
  const [hasRecentlyChangedInput, setHasRecentlyChangedInput] = useState<boolean>(false);
  const [isShutterFlashing, setIsShutterFlashing] = useState<boolean>(false);
  const [screenshotToast, setScreenshotToast] = useState<{
    fileName: string;
    filePath?: string;
    dataUrl?: string;
  } | null>(null);

  const prevInputModeRef = useRef<'keyboard' | 'controller' | null>(null);
  const inputToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputExitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentPulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedIndexRef = useRef(selectedGameIndex);
  const gamesRef = useRef(games);
  const isAnyModalOpenRef = useRef(false);
  const isAnyModalOpen =
    isCommandPaletteOpen ||
    isAddModalOpen ||
    isSettingsModalOpen ||
    isThemeModalOpen ||
    isWhatToPlayOpen ||
    isJukeboxOpen ||
    saveVaultGame !== null ||
    isActivityOpen ||
    isRetroHubOpen ||
    isMiniHudOpen ||
    overviewGame !== null ||
    modManagingGame !== null ||
    gamePendingRemoval !== null ||
    isNotesOpen ||
    isIntelDrawerOpen ||
    isSetupWizardOpen;

  useEffect(() => {
    isAnyModalOpenRef.current = isAnyModalOpen;
  }, [isAnyModalOpen]);

  useEffect(() => {
    selectedIndexRef.current = selectedGameIndex;
  }, [selectedGameIndex]);

  useEffect(() => {
    gamesRef.current = games;
  }, [games]);

  const modalStateRef = useRef({
    gamePendingRemoval,
    isSetupWizardOpen,
    isWhatToPlayOpen,
    isJukeboxOpen,
    saveVaultGame,
    modManagingGame,
    isThemeModalOpen,
    isRetroHubOpen,
    isActivityOpen,
    isNotesOpen,
    isCommandPaletteOpen,
    isAddModalOpen,
    isSettingsModalOpen,
    overviewGame,
    isMiniHudOpen,
    isIntelDrawerOpen
  });

  useEffect(() => {
    modalStateRef.current = {
      gamePendingRemoval,
      isSetupWizardOpen,
      isWhatToPlayOpen,
      isJukeboxOpen,
      saveVaultGame,
      modManagingGame,
      isThemeModalOpen,
      isRetroHubOpen,
      isActivityOpen,
      isNotesOpen,
      isCommandPaletteOpen,
      isAddModalOpen,
      isSettingsModalOpen,
      overviewGame,
      isMiniHudOpen,
      isIntelDrawerOpen
    };
  });

  // Priority-ordered layered modal dismissal (closes only the topmost active modal)
  const dismissTopModal = useCallback((): boolean => {
    const s = modalStateRef.current;
    // Layer 1: Confirmation Prompt (stacked above EditThemeModal)
    if (s.gamePendingRemoval !== null) {
      setGamePendingRemoval(null);
      return true;
    }
    // Layer 2: Fullscreen Onboarding Wizard
    if (s.isSetupWizardOpen) {
      setIsSetupWizardOpen(false);
      return true;
    }
    // Layer 4: Interactive Overlays
    if (s.isWhatToPlayOpen) {
      setIsWhatToPlayOpen(false);
      return true;
    }
    if (s.isJukeboxOpen) {
      setIsJukeboxOpen(false);
      return true;
    }
    // Layer 5: Detail & Sub-Modals
    if (s.saveVaultGame !== null) {
      setSaveVaultGame(null);
      return true;
    }
    if (s.modManagingGame !== null) {
      setModManagingGame(null);
      return true;
    }
    if (s.isThemeModalOpen) {
      setIsThemeModalOpen(false);
      setThemeEditingGame(null);
      return true;
    }
    // Layer 6: Hubs & Utilities
    if (s.isRetroHubOpen) {
      setIsRetroHubOpen(false);
      return true;
    }
    if (s.isActivityOpen) {
      setIsActivityOpen(false);
      return true;
    }
    if (s.isNotesOpen) {
      setIsNotesOpen(false);
      return true;
    }
    if (s.isCommandPaletteOpen) {
      setIsCommandPaletteOpen(false);
      return true;
    }
    if (s.isAddModalOpen) {
      setIsAddModalOpen(false);
      return true;
    }
    if (s.isSettingsModalOpen) {
      setIsSettingsModalOpen(false);
      return true;
    }
    // Layer 7: Overlays & HUD
    if (s.overviewGame !== null) {
      setOverviewGame(null);
      return true;
    }
    if (s.isMiniHudOpen) {
      setIsMiniHudOpen(false);
      return true;
    }
    // Layer 8: Quick Deck Drawer
    if (s.isIntelDrawerOpen) {
      setIsIntelDrawerOpen(false);
      return true;
    }
    return false;
  }, []);

  const dismissTopModalRef = useRef(dismissTopModal);
  useEffect(() => {
    dismissTopModalRef.current = dismissTopModal;
  }, [dismissTopModal]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const showTrophyToast = useCallback((title: string, desc: string, type: 'bronze' | 'silver' | 'gold' | 'platinum') => {
    audioEngine.playTrophy();
    setTrophyToast({ title, desc, type });
    setTimeout(() => setTrophyToast(null), 5000);
  }, []);

  // Discord RPC initial idle status
  useEffect(() => {
    if (settings.discordRpcEnabled !== false && window.api?.setDiscordActivity) {
      window.api.setDiscordActivity({
        details: 'Browsing Library',
        state: `${games.length} games installed`,
        timestamps: { start: Math.floor(Date.now() / 1000) },
        assets: {
          large_image: 'astra_logo',
          large_text: 'Astra Console'
        }
      });
    } else if (settings.discordRpcEnabled === false && window.api?.clearDiscordActivity) {
      window.api.clearDiscordActivity();
    }
  }, [games.length, settings.discordRpcEnabled]);

  // Load persisted data asynchronously from Electron disk store
  useEffect(() => {
    StoreService.load().then(({ games: loadedGames, settings: loadedSettings, profiles: loadedProfiles }) => {
      setGames(loadedGames);
      setSettings(loadedSettings);
      if (loadedProfiles && loadedProfiles.length > 0) {
        setProfiles(loadedProfiles);
      }
      ThemeEngine.applyGlobalTheme(loadedSettings.globalTheme);
      ThemeEngine.applyArchetype(loadedSettings.experienceArchetype || 'digital');
      if (loadedGames.length > 0) {
        setSelectedGameIndex((prev) => (prev >= loadedGames.length ? 0 : prev));
      }
      if (window.api?.getAutoLaunch) {
        window.api.getAutoLaunch().then((autoLaunch) => {
          setSettings((prev) => ({ ...prev, startOnBoot: autoLaunch }));
        });
      }
      setIsLoaded(true);
      // Silently enrich game versions in background after startup has settled (3s idle timer)
      setTimeout(() => {
        StoreService.enrichVersions(loadedGames, (updated) => setGames(updated));
      }, 3000);
    });
  }, []);

  // Real playtime tracking via Electron process monitor
  useEffect(() => {
    if (!window.api?.onGameSessionEnded) return;
    const cleanup = window.api.onGameSessionEnded((info: { gameId: string; durationMinutes: number; endedAt: string }) => {
      setGames((prev) =>
        prev.map((g) => {
          if (g.id === info.gameId) {
            const currentMins = g.stats.playtimeMinutes || 0;
            const currentCount = g.stats.playCount || 0;
            return {
              ...g,
              stats: {
                ...g.stats,
                playtimeMinutes: currentMins + info.durationMinutes,
                playCount: currentCount + 1,
                lastPlayed: info.endedAt
              }
            };
          }
          return g;
        })
      );
      if (window.api?.recordActivitySession) {
        const target = gamesRef.current.find((g) => g.id === info.gameId);
        window.api.recordActivitySession({
          id: `session_${Date.now()}`,
          gameId: info.gameId,
          gameTitle: target?.title || 'Game',
          startTime: new Date(Date.now() - info.durationMinutes * 60000).toISOString(),
          endTime: info.endedAt,
          durationMinutes: info.durationMinutes,
          date: info.endedAt.split('T')[0]
        });
      }
    });
    return () => cleanup?.();
  }, []);

  // Save changes
  useEffect(() => {
    if (isLoaded) {
      StoreService.save(games, settings, profiles);
    }
  }, [games, settings, profiles, isLoaded]);

  // Sync audio engine config with settings
  useEffect(() => {
    audioEngine.updateConfig({
      sfxEnabled: settings.sfxEnabled,
      sfxVolume: settings.sfxVolume,
      bgmEnabled: settings.bgmEnabled,
      bgmVolume: settings.bgmVolume
    });
    hapticsService.setEnabled(settings.hapticsEnabled !== false);
  }, [settings]);

  // Apply Global Theme & Dynamic Game Theme
  useEffect(() => {
    ThemeEngine.applyGlobalTheme(settings.globalTheme);
  }, [settings.globalTheme]);

  // Auto-download and cache Steam CDN artwork to local disk for offline play
  useEffect(() => {
    if (!window.api?.downloadFile || games.length === 0) return;

    let hasUpdates = false;
    const cacheSteamCdnMedia = async () => {
      const updatedGames = await Promise.all(
        gamesRef.current.map(async (g) => {
          let updated = false;
          let newCover = g.coverUrl;
          let newBackdrop = g.backdropUrl;
          let newLogo = g.theme?.logoUrl;

          if (newCover && newCover.includes('steamstatic.com')) {
            const fileName = `${g.id}_cover.jpg`;
            const local = await window.api!.downloadFile(newCover, fileName);
            if (local && local !== newCover) {
              newCover = normalizeMediaUrl(local);
              updated = true;
            }
          }

          if (newBackdrop && newBackdrop.includes('steamstatic.com')) {
            const fileName = `${g.id}_backdrop.jpg`;
            const local = await window.api!.downloadFile(newBackdrop, fileName);
            if (local && local !== newBackdrop) {
              newBackdrop = normalizeMediaUrl(local);
              updated = true;
            }
          }

          if (newLogo && newLogo.includes('steamstatic.com')) {
            const fileName = `${g.id}_logo.png`;
            const local = await window.api!.downloadFile(newLogo, fileName);
            if (local && local !== newLogo) {
              newLogo = normalizeMediaUrl(local);
              updated = true;
            }
          }

          if (updated) {
            hasUpdates = true;
            return {
              ...g,
              coverUrl: newCover,
              backdropUrl: newBackdrop,
              theme: {
                ...g.theme,
                logoUrl: newLogo
              }
            };
          }
          return g;
        })
      );

      if (hasUpdates) {
        setGames(updatedGames);
      }
    };

    cacheSteamCdnMedia();
  }, [games.length]);

  // V3: Startup Smart Resume pattern detection & Milestone notifications
  useEffect(() => {
    // 1. Listen for milestone unlocks
    const unsubMilestone = ActivityTrackingService.onMilestoneUnlocked((milestone) => {
      showToast(`🏆 Milestone Unlocked: ${milestone.name}!`);
      audioEngine.playTrophy();
    });

    // 2. On app startup, analyze session history for play patterns
    const timer = setTimeout(async () => {
      await ActivityTrackingService.syncWithBackend();
      const detected = PatternDetectionService.findSuggestedResume();
      if (detected) {
        setResumePattern(detected);
      }
    }, 1500);

    return () => {
      unsubMilestone();
      clearTimeout(timer);
    };
  }, [showToast]);

  // Update Dynamic Theme and OST when active game changes or view mode changes
  useEffect(() => {
    const activeGame = games[selectedGameIndex];
    const globalT = GLOBAL_THEMES[settings.globalTheme] || GLOBAL_THEMES['8bitdo-mint'];

    // In Grid View, ALWAYS prioritize the global visual theme across the whole library
    if (settings.viewMode === 'grid') {
      ThemeEngine.applyGlobalTheme(settings.globalTheme);
      ThemeEngine.applyGameTheme(globalT.colors.accent, globalT.colors.glow);
      audioEngine.stopBgm();
      return;
    }

    // In Console View:
    ThemeEngine.applyGlobalTheme(settings.globalTheme);
    if (activeGame) {
      const accent = activeGame.theme?.accentColor || globalT.colors.accent;
      const glow = activeGame.theme?.glowColor || globalT.colors.glow;
      const vibe = activeGame.theme?.vibe && activeGame.theme.vibe !== 'auto'
        ? activeGame.theme.vibe
        : ThemeEngine.detectGameVibe(activeGame);
      ThemeEngine.applyGameTheme(accent, glow, vibe);

      if (settings.bgmEnabled) {
        audioEngine.playThemeAmbient(vibe, activeGame.audio?.bgmUrl);
      } else {
        audioEngine.stopThemeAmbient();
        audioEngine.stopBgm();
      }
    } else {
      ThemeEngine.applyGameTheme(globalT.colors.accent, globalT.colors.glow);
      audioEngine.stopThemeAmbient();
      audioEngine.stopBgm();
    }
  }, [selectedGameIndex, games, settings.bgmEnabled, settings.globalTheme, settings.viewMode]);

  // Listen to game session endings from Electron main process
  useEffect(() => {
    if (window.api?.onGameSessionEnded) {
      const unsubscribe = window.api.onGameSessionEnded(({ gameId, durationMinutes, endedAt }) => {
        // Restore Jukebox volume
        jukeboxEngine.restoreVolume();
        GameLauncherService.onGameClosed(gameId);

        // Record to Activity History
        if (window.api?.recordActivitySession) {
          const target = gamesRef.current.find((x) => x.id === gameId);
          window.api.recordActivitySession({
            id: `session_${Date.now()}`,
            gameId,
            gameTitle: target?.title || 'Game Session',
            startTime: new Date(Date.now() - durationMinutes * 60000).toISOString(),
            endTime: endedAt || new Date().toISOString(),
            durationMinutes,
            date: new Date().toISOString().split('T')[0]
          }).catch(() => {});
        }

        setGames((prev) =>
          prev.map((g) => {
            if (g.id === gameId) {
              const updatedStats = {
                ...g.stats,
                playtimeMinutes: g.stats.playtimeMinutes + durationMinutes,
                lastPlayed: new Date().toISOString()
              };
              const candidate = { ...g, stats: updatedStats };
              const { updatedGame, newlyUnlocked } = AchievementEngine.evaluateMilestones(candidate, true);
              if (newlyUnlocked.length > 0) {
                newlyUnlocked.forEach((t) => showTrophyToast(t.title, t.description, t.type));
              }
              setOverviewGame((cur) => (cur && cur.id === updatedGame.id ? updatedGame : cur));
              return updatedGame;
            }
            return g;
          })
        );
        showToast(`Played for ${durationMinutes} min. Playtime recorded!`);
      });
      return () => unsubscribe();
    }
  }, [showToast, showTrophyToast]);

  // Game Launch Handler
  const handleLaunchGame = useCallback(async (game: Game) => {
    audioEngine.stopThemeAmbient();
    audioEngine.stopBgm();
    audioEngine.playLaunch();
    showToast(`Launching ${game.title}...`);

    const updatedStats = {
      ...game.stats,
      playCount: game.stats.playCount + 1,
      lastPlayed: new Date().toISOString()
    };
    const candidate = { ...game, stats: updatedStats };
    const { updatedGame, newlyUnlocked } = AchievementEngine.evaluateMilestones(candidate, true);

    if (window.api?.launchGame) {
      // Launch game with pre-launch auto-backup and volume ducking via GameLauncherService
      const res = await GameLauncherService.launchGame(candidate, {
        autoBackup: settings.autoSaveBackupOnLaunch !== false,
        duckVolume: true
      });

      if (!res.success && res.error) {
        showToast(`Launch failed: ${res.error}`);
        return;
      }
    }

    // Launch succeeded (or running in browser mode)
    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach((t) => showTrophyToast(t.title, t.description, t.type));
    }
    
    setOverviewGame((cur) => (cur && cur.id === updatedGame.id ? updatedGame : cur));
    
    setGames((prev) =>
      prev.map((g) => (g.id === game.id ? updatedGame : g))
    );
  }, [showToast, showTrophyToast, settings.autoSaveBackupOnLaunch]);

  // Favorite Toggle
  const handleToggleFavorite = (gameId: string) => {
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, favorite: !g.favorite } : g))
    );
  };

  // Remove Game from Library
  const handleRemoveGame = (gameId: string) => {
    audioEngine.playSelect();
    setGames((prev) => prev.filter((g) => g.id !== gameId));
    setSelectedGameIndex((prev) => Math.max(0, Math.min(prev, gamesRef.current.length - 2)));
    showToast('Game removed from library');
  };

  // Open Game Folder in Explorer
  const handleOpenFolder = async (game: Game) => {
    audioEngine.playSelect();
    if (window.api?.openGameFolder) {
      const res = await window.api.openGameFolder(game);
      if (res.success) {
        showToast(`Opened folder for ${game.title}`);
      } else {
        showToast(res.error || `Folder not found on disk.`);
      }
    } else if (game.workingDirectory) {
      showToast(`Location: ${game.workingDirectory}`);
    } else {
      showToast(`No folder location configured for ${game.title}`);
    }
  };

  // Add Single Game
  const handleAddGame = (newGame: Game) => {
    if (gamesRef.current.some((g) => g.executablePath === newGame.executablePath)) {
      showToast(`${newGame.title} is already in your library`);
      return;
    }
    setGames((prev) => [newGame, ...prev]);
    setSelectedGameIndex(0);
    showToast(`Added ${newGame.title} to library`);
  };

  // Add Batch Games
  const handleAddBatchGames = (newGames: Game[]) => {
    const existingPaths = new Set(gamesRef.current.map((g) => g.executablePath));
    const filtered = newGames.filter((g) => !existingPaths.has(g.executablePath));
    
    if (filtered.length === 0) {
      showToast('No new games found (duplicates skipped)');
      return;
    }
    
    setGames((prev) => [...filtered, ...prev]);
    showToast(`Imported ${filtered.length} new games`);
  };

  // Reset to initial demo games
  const handleResetLibrary = () => {
    setGames(INITIAL_GAMES);
    setSelectedGameIndex(0);
    showToast('Library reset to default demo titles');
  };

  // Update Game (from theme editor or notes)
  const handleUpdateGame = useCallback((updated: Game) => {
    setGames((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    showToast(`Saved ${updated.title}`);
  }, [showToast]);

  // Native Screenshot Capture Handler
  const handleTakeScreenshot = useCallback(async (customGame?: Game) => {
    const curGames = gamesRef.current;
    const curIndex = selectedIndexRef.current;
    const targetGame = customGame || overviewGame || curGames[curIndex] || null;

    // 1. Mechanical camera shutter sound
    audioEngine.playShutter();

    // 2. High-speed visual shutter flash
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 220);

    // 3. Electron native window capture
    if (window.api?.captureScreenshot) {
      try {
        const result = await window.api.captureScreenshot({
          gameTitle: targetGame?.title || 'Astra',
          gameId: targetGame?.id,
          copyToClipboard: true
        });

        if (result.success && result.filePath) {
          setScreenshotToast({
            fileName: result.fileName || 'Screenshot.png',
            filePath: result.filePath,
            dataUrl: result.dataUrl
          });
          setTimeout(() => setScreenshotToast(null), 4500);

          // Append to active game's screenshot gallery
          if (targetGame) {
            const current = targetGame.metadata?.screenshots || (targetGame.backdropUrl ? [targetGame.backdropUrl] : []);
            if (!current.includes(result.filePath)) {
              const updatedGame: Game = {
                ...targetGame,
                metadata: {
                  ...targetGame.metadata,
                  screenshots: [result.filePath, ...current]
                }
              };
              handleUpdateGame(updatedGame);
              if (overviewGame && overviewGame.id === targetGame.id) {
                setOverviewGame(updatedGame);
              }
            }
          }
        } else if (result.error) {
          showToast(`Screenshot failed: ${result.error}`);
        }
      } catch (err: any) {
        showToast(`Screenshot error: ${err.message || 'Capture failed'}`);
      }
    } else {
      showToast('📸 Screenshot taken (Web preview)');
    }
  }, [overviewGame, handleUpdateGame, showToast]);

  // Global IPC shortcut trigger listener
  useEffect(() => {
    if (window.api?.onScreenshotTriggered) {
      const unsub = window.api.onScreenshotTriggered(() => {
        handleTakeScreenshot();
      });
      return () => unsub();
    }
  }, [handleTakeScreenshot]);

  // Batch update games (e.g. from live wallpaper batch downloader in settings)
  const handleBatchUpdateGames = (updatedGames: Game[]) => {
    setGames(updatedGames);
  };

  // Settings update with instant theme switch
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    ThemeEngine.applyGlobalTheme(newSettings.globalTheme);
    ThemeEngine.applyArchetype(newSettings.experienceArchetype || 'digital');
    const t = GLOBAL_THEMES[newSettings.globalTheme];
    if (t) {
      ThemeEngine.applyGameTheme(t.colors.accent, t.colors.glow);
    }
  };

  // 8BitDo & Gamepad API Hookup (Silent, registered once)
  useEffect(() => {
    gamepadEngine.setConnectionCallback((connected, name, details) => {
      setGamepadConnected(connected);
      setGamepadName(name);
      setControllerDetails(details);
      if (connected) {
        setActiveInputMode('controller');
      } else {
        setActiveInputMode('keyboard');
      }
    });

    gamepadEngine.setActivityListener(() => {
      setActiveInputMode('controller');
    });

    gamepadEngine.setListener((action) => {
      setActiveInputMode('controller');
      const curGames = gamesRef.current;
      const curIndex = selectedIndexRef.current;

      if (isAnyModalOpenRef.current) {
        if (action === 'BACK') {
          hapticsService.trigger('back');
          dismissTopModalRef.current();
          return;
        }
        if (action === 'UP' || action === 'DOWN' || action === 'LEFT' || action === 'RIGHT') {
          navigateModalFocus(action);
          return;
        }
        if (action === 'CONFIRM') {
          confirmModalFocus();
          return;
        }
        return;
      }

      if (action === 'RIGHT') {
        if (curIndex < curGames.length - 1) {
          audioEngine.playHover();
          hapticsService.trigger('light-tick');
          setSelectedGameIndex((prev) => Math.min(prev + 1, curGames.length - 1));
        }
      } else if (action === 'LEFT') {
        if (curIndex > 0) {
          audioEngine.playHover();
          hapticsService.trigger('light-tick');
          setSelectedGameIndex((prev) => Math.max(prev - 1, 0));
        }
      } else if (action === 'CONFIRM') {
        hapticsService.trigger('confirm');
        const target = curGames[curIndex];
        if (target) handleLaunchGame(target);
      } else if (action === 'DETAILS') {
        audioEngine.playSelect();
        hapticsService.trigger('light-tick');
        setIsIntelDrawerOpen((prev) => !prev);
      } else if (action === 'BACK') {
        hapticsService.trigger('back');
        setIsIntelDrawerOpen(false);
      } else if (action === 'NOTES') {
        audioEngine.playSelect();
        hapticsService.trigger('light-tick');
        setIsWhatToPlayOpen((prev) => !prev);
      } else if (action === 'FAVORITE') {
        hapticsService.trigger('confirm');
        const target = curGames[curIndex];
        if (target) handleToggleFavorite(target.id);
      } else if (action === 'BUMPER_LEFT' || action === 'BUMPER_RIGHT') {
        audioEngine.playSelect();
        hapticsService.trigger('light-tick');
        setSettings((prev) => ({
          ...prev,
          viewMode: prev.viewMode === 'ps5' ? 'grid' : prev.viewMode === 'grid' ? 'shelf' : 'ps5'
        }));
      } else if (action === 'START') {
        audioEngine.playSelect();
        hapticsService.trigger('confirm');
        setIsSettingsModalOpen((prev) => !prev);
      } else if (action === 'SELECT') {
        audioEngine.playSelect();
        hapticsService.trigger('confirm');
        setIsCommandPaletteOpen((prev) => !prev);
      }
    });
  }, [handleLaunchGame]);

  // Controller / Keyboard Input Transition HUD & Glow Effect
  useEffect(() => {
    // Skip initial mount so we don't flash toast upon app startup
    if (prevInputModeRef.current === null) {
      prevInputModeRef.current = activeInputMode;
      return;
    }

    if (prevInputModeRef.current !== activeInputMode) {
      prevInputModeRef.current = activeInputMode;

      // Soft tactical acoustic feedback
      audioEngine.playHover();

      // Trigger TopBar glow & pulse state
      queueMicrotask(() => {
        setHasRecentlyChangedInput(true);
        if (activeInputMode === 'controller') {
          const devName = controllerDetails?.modelName || gamepadName || 'Wireless Gamepad';
          const devShort = controllerDetails?.shortName || 'Controller';
          setInputToast({
            mode: 'controller',
            title: `${devShort} Active`,
            subtitle: `${devName} connected • Direct console navigation`,
            details: controllerDetails,
            exiting: false
          });
        } else {
          setInputToast({
            mode: 'keyboard',
            title: 'Keyboard & Mouse Active',
            subtitle: gamepadConnected
              ? `PC direct input • ${controllerDetails?.shortName || 'Controller'} in standby`
              : 'PC direct keyboard and mouse navigation',
            details: null,
            exiting: false
          });
        }
      });

      if (recentPulseTimeoutRef.current) clearTimeout(recentPulseTimeoutRef.current);
      recentPulseTimeoutRef.current = setTimeout(() => {
        setHasRecentlyChangedInput(false);
      }, 2600);

      // Trigger floating center HUD notification
      if (inputToastTimeoutRef.current) clearTimeout(inputToastTimeoutRef.current);
      if (inputExitTimeoutRef.current) clearTimeout(inputExitTimeoutRef.current);

      // Smooth exit sequence after 2.3 seconds
      inputToastTimeoutRef.current = setTimeout(() => {
        setInputToast((cur) => (cur ? { ...cur, exiting: true } : null));
        inputExitTimeoutRef.current = setTimeout(() => {
          setInputToast(null);
        }, 380);
      }, 2300);
    }
  }, [activeInputMode, controllerDetails, gamepadName, gamepadConnected]);
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      setActiveInputMode('keyboard');

      // Screenshot hotkey F12 (works globally everywhere)
      if (e.key === 'F12') {
        e.preventDefault();
        handleTakeScreenshot();
        return;
      }

      // Fullscreen hotkey F11 (works globally everywhere)
      if (e.key === 'F11') {
        e.preventDefault();
        window.api?.toggleFullscreen();
        return;
      }

      // Modal isolation gate & layered Escape dismissal
      if (isAnyModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          dismissTopModal();
        }
        // Block all background shortcuts when any modal is open
        return;
      }

      // Input field isolation: prevent hotkeys from hijacking typing outside modals
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as any).isContentEditable)) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Quick Suggest / What to Play (R key)
      if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        audioEngine.playSelect();
        setIsWhatToPlayOpen(true);
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        audioEngine.playSelect();
        setIsIntelDrawerOpen((prev) => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        audioEngine.playSelect();
        setIsCommandPaletteOpen(true);
        return;
      }


      if (e.key === 'F1') {
        e.preventDefault();
        audioEngine.playSelect();
        setIsNotesOpen((prev) => !prev);
        return;
      }

      if (e.key === 'F10' || (e.shiftKey && e.key === 'Tab')) {
        e.preventDefault();
        audioEngine.playSelect();
        setIsMiniHudOpen((prev) => !prev);
        return;
      }

      if ((e.key === 'j' || e.key === 'J') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        audioEngine.playSelect();
        setIsJukeboxOpen((prev) => !prev);
        return;
      }

      if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        audioEngine.playSelect();
        setIsActivityOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        audioEngine.playSelect();
        setSettings((prev) => ({
          ...prev,
          viewMode: prev.viewMode === 'ps5' ? 'grid' : prev.viewMode === 'grid' ? 'shelf' : 'ps5'
        }));
        return;
      }

      if (settings.viewMode === 'ps5' && games.length > 0) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (selectedGameIndex < games.length - 1) {
            audioEngine.playHover();
            setSelectedGameIndex((prev) => Math.min(prev + 1, games.length - 1));
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (selectedGameIndex > 0) {
            audioEngine.playHover();
            setSelectedGameIndex((prev) => Math.max(prev - 1, 0));
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const target = games[selectedGameIndex];
          if (target) {
            handleLaunchGame(target);
          }
        }
      }
    },
    [
      games,
      selectedGameIndex,
      settings.viewMode,
      isAnyModalOpen,
      dismissTopModal,
      handleTakeScreenshot,
      handleLaunchGame,
      showToast
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    const handlePointer = () => setActiveInputMode('keyboard');
    window.addEventListener('mousedown', handlePointer);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handlePointer);
    };
  }, [handleKeyDown]);

  const resumeGame = useMemo(() => getRecentResumeGame(games), [games]);

  if (!isLoaded) {
    return <div className="w-screen h-screen bg-[#07090e]" />;
  }

  return (
    <div
      className="w-screen h-screen flex flex-col text-white overflow-hidden relative font-sans transition-colors duration-700"
      style={{
        background: `linear-gradient(135deg, var(--global-bg-start) 0%, var(--global-bg-end) 100%)`
      }}
    >
      {/* Dynamic Ambient Background Glow */}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-1000 opacity-40 -z-20"
        style={{
          background: `radial-gradient(ellipse at 50% 20%, var(--game-glow) 0%, transparent 65%)`
        }}
      />

      {/* Top Navigation & Window Bar */}
      <TopBar
        viewMode={settings.viewMode}
        onToggleViewMode={() =>
          setSettings((prev) => ({
            ...prev,
            viewMode: prev.viewMode === 'ps5' ? 'grid' : prev.viewMode === 'grid' ? 'shelf' : 'ps5'
          }))
        }
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenWhatToPlay={() => setIsWhatToPlayOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenNotes={() => setIsNotesOpen(true)}
        onOpenJukebox={() => setIsJukeboxOpen(true)}
        onOpenActivity={() => setIsActivityOpen(true)}
        onOpenRetroHub={() => setIsRetroHubOpen(true)}
        onOpenMiniHud={() => setIsMiniHudOpen(true)}
        sfxEnabled={settings.sfxEnabled}
        onToggleMute={() =>
          setSettings((prev) => ({ ...prev, sfxEnabled: !prev.sfxEnabled }))
        }
        activeInputMode={activeInputMode}
        controllerDetails={controllerDetails}
        gamepadConnected={gamepadConnected}
        gamepadName={gamepadName}
        hasRecentlyChangedInput={hasRecentlyChangedInput}
      />

      {/* Resume Banner */}
      {resumeGame && settings.viewMode !== 'ps5' && (
        <div 
          className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-md border border-[var(--game-accent)] px-4 py-2 rounded-full flex items-center gap-3 animate-fadeInUp shadow-[0_5px_30px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-black/80 hover:scale-105 active:scale-95 transition-all"
          onClick={() => handleLaunchGame(resumeGame)}
        >
          <img src={resumeGame.coverUrl} alt="Cover" className="w-6 h-6 rounded-sm object-cover" />
          <span className="text-xs font-semibold text-white/90">Continue playing <span className="text-white font-bold">{resumeGame.title}</span>?</span>
          <div className="w-5 h-5 rounded-full bg-[var(--game-accent)] flex items-center justify-center">
            <Play className="w-3 h-3 fill-black text-black ml-0.5" />
          </div>
        </div>
      )}

      {/* Main View Area: Console Ribbon, Grid Library, or 3D Physical Shelf */}
      {settings.viewMode === 'ps5' ? (
        <ConsoleView
          games={games}
          selectedGameIndex={selectedGameIndex}
          onSelectGame={(idx) => setSelectedGameIndex(idx)}
          onLaunchGame={handleLaunchGame}
          onToggleFavorite={handleToggleFavorite}
          onOpenFolder={handleOpenFolder}
          onOpenNotes={() => setIsNotesOpen(true)}
          onOpenOverview={() => setIsIntelDrawerOpen(true)}
          onOpenThemeEditor={(g) => {
            setThemeEditingGame(g);
            setIsThemeModalOpen(true);
          }}
          onRequestRemoveGame={(g) => setGamePendingRemoval(g)}
          onRemoveGame={handleRemoveGame}
          backgroundBlur={settings.backgroundBlur}
        />
      ) : settings.viewMode === 'grid' ? (
        <GridView
          games={games}
          selectedGameIndex={selectedGameIndex}
          onSelectGame={(idx) => setSelectedGameIndex(idx)}
          onLaunchGame={handleLaunchGame}
          onToggleFavorite={handleToggleFavorite}
          onOpenOverview={(g) => {
            const idx = games.findIndex((x) => x.id === g.id);
            if (idx >= 0) setSelectedGameIndex(idx);
            setIsIntelDrawerOpen(true);
          }}
          onRequestRemoveGame={(g) => setGamePendingRemoval(g)}
          onRemoveGame={handleRemoveGame}
          initialDensity={gridDensity}
          onDensityChange={setGridDensity}
        />
      ) : (
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3 text-white/50 animate-pulse">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--game-accent)] border-t-transparent animate-spin" />
              <span className="text-xs font-mono uppercase tracking-widest">Loading 3D Shelf...</span>
            </div>
          </div>
        }>
          <PhysicalShelfView
            games={games}
            selectedGameIndex={selectedGameIndex}
            onSelectGame={(idx) => setSelectedGameIndex(idx)}
            onLaunchGame={handleLaunchGame}
            onOpenOverview={(g) => {
              const idx = games.findIndex((x) => x.id === g.id);
              if (idx >= 0) setSelectedGameIndex(idx);
              setOverviewGame(g);
            }}
            onOpenMods={(g) => setModManagingGame(g)}
          />
        </Suspense>
      )}

      {/* Navigation HUD: Console Action Bar with Dynamic Platform Glyphs (Optional / Configurable) */}
      {settings.showNavigationHud && (
        <NavigationHud
          activeInputMode={activeInputMode}
          controllerDetails={controllerDetails}
          viewMode={settings.viewMode}
          gridDensity={gridDensity}
          onLaunch={() => {
            const target = games[selectedGameIndex];
            if (target) handleLaunchGame(target);
          }}
          onOpenDetails={() => setIsIntelDrawerOpen((prev) => !prev)}
          onOpenNotes={() => setIsNotesOpen(true)}
          onOpenWhatToPlay={() => setIsWhatToPlayOpen(true)}
          onToggleViewMode={() =>
            setSettings((prev) => ({
              ...prev,
              viewMode: prev.viewMode === 'ps5' ? 'grid' : prev.viewMode === 'grid' ? 'shelf' : 'ps5'
            }))
          }
          onToggleDensity={() =>
            setGridDensity((prev) =>
              prev === 'poster' ? 'banner' : prev === 'banner' ? 'compact' : 'poster'
            )
          }
          onOpenSearch={() => setIsCommandPaletteOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />
      )}

      {/* Game Intel Quick-Deck Drawer */}
      <GameIntelDrawer
        isOpen={isIntelDrawerOpen}
        game={games[selectedGameIndex] || null}
        onClose={() => setIsIntelDrawerOpen(false)}
        onLaunchGame={handleLaunchGame}
        onOpenFolder={handleOpenFolder}
        onOpenNotes={() => {
          setIsNotesOpen(true);
          setIsIntelDrawerOpen(false);
        }}
        onOpenThemeEditor={(g) => {
          setThemeEditingGame(g);
          setIsThemeModalOpen(true);
          setIsIntelDrawerOpen(false);
        }}
        onToggleFavorite={handleToggleFavorite}
        onUpdateGame={handleUpdateGame}
        onTakeScreenshot={handleTakeScreenshot}
      />

      {/* Visual Camera Shutter Flash Animation */}
      {isShutterFlashing && (
        <div className="fixed inset-0 z-9999 bg-white pointer-events-none animate-shutterFlash" />
      )}

      {/* Screenshot Captured Toast Banner */}
      {screenshotToast && (
        <div
          onClick={() => {
            const active = overviewGame || games[selectedGameIndex];
            window.api?.openScreenshotsFolder?.(active?.title);
          }}
          className="fixed top-8 left-8 z-50 flex items-center gap-3.5 p-3 rounded-2xl bg-zinc-950/95 border border-sky-400/50 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(56,189,248,0.35)] backdrop-blur-xl text-white cursor-pointer hover:border-sky-300 hover:scale-105 transition-all select-none"
        >
          {screenshotToast.dataUrl ? (
            <img
              src={screenshotToast.dataUrl}
              alt="Screenshot Preview"
              className="w-16 h-10 rounded-lg object-cover border border-white/20 shadow-md"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Camera className="w-5 h-5" />
            </div>
          )}
          <div className="pr-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-sky-400 uppercase">Screenshot Captured</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-400/20 text-sky-300 font-mono">F12</span>
            </div>
            <h4 className="text-xs font-bold text-white tracking-wide truncate max-w-[200px] mt-0.5">
              {screenshotToast.fileName}
            </h4>
            <p className="text-[10px] text-white/50">Saved to Pictures • Click to open folder</p>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-8 z-50 px-4 py-2.5 rounded-2xl glass-panel border border-[var(--game-accent)] text-xs font-semibold text-white shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-[var(--game-accent)] animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Trophy Unlock Toast Banner */}
      {trophyToast && (
        <div className="fixed top-8 right-8 z-50 flex items-center gap-3.5 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-zinc-950 via-[#161c2b] to-zinc-950 border border-amber-400/50 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(245,158,11,0.35)] text-white animate-bounce">
          <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
            <Trophy className="w-6 h-6 text-amber-300" />
          </div>
          <div className="pr-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">Trophy Unlocked</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold uppercase border border-amber-400/30">
                {trophyToast.type}
              </span>
            </div>
            <h4 className="text-xs font-bold text-white tracking-wide mt-0.5">{trophyToast.title}</h4>
            <p className="text-[10px] text-white/60">{trophyToast.desc}</p>
          </div>
        </div>
      )}

      {/* Controller / Keyboard Input Transition HUD Pop-up */}
      <InputModeToast toast={inputToast} onDismiss={() => setInputToast(null)} />

      {/* Lazy Modals & Drawers */}
      <Suspense fallback={null}>
        <GameOverviewModal
          isOpen={overviewGame !== null}
          game={overviewGame}
          onClose={() => setOverviewGame(null)}
          onLaunchGame={handleLaunchGame}
          onUpdateGame={(updated) => {
            handleUpdateGame(updated);
            setOverviewGame(updated);
          }}
          onOpenThemeEditor={(g) => {
            setThemeEditingGame(g);
            setIsThemeModalOpen(true);
            setOverviewGame(null);
          }}
          onOpenNotes={() => {
            setIsNotesOpen(true);
            setOverviewGame(null);
          }}
          onOpenFolder={handleOpenFolder}
          onOpenMods={(g) => {
            setModManagingGame(g);
            setOverviewGame(null);
          }}
          onOpenSaveVault={(g) => {
            setSaveVaultGame(g);
            setOverviewGame(null);
          }}
          onTakeScreenshot={handleTakeScreenshot}
          apiKeys={settings.apiKeys}
        />

        {/* V3 Mod & Add-On Pack Manager Modal */}
        <ModManagerModal
          isOpen={modManagingGame !== null}
          game={modManagingGame}
          onClose={() => setModManagingGame(null)}
          onUpdateGame={handleUpdateGame}
          onLaunchGame={handleLaunchGame}
        />

        {/* Astra Game Concierge & Decision Engine (What to Play / Roulette) */}
        <WhatToPlayModal
          isOpen={isWhatToPlayOpen}
          onClose={() => setIsWhatToPlayOpen(false)}
          games={games}
          onLaunchGame={handleLaunchGame}
          onOpenOverview={(g) => {
            const idx = games.findIndex((x) => x.id === g.id);
            if (idx !== -1) setSelectedGameIndex(idx);
            setOverviewGame(g);
            setIsWhatToPlayOpen(false);
          }}
          onOpenIntel={(g) => {
            const idx = games.findIndex((x) => x.id === g.id);
            if (idx !== -1) setSelectedGameIndex(idx);
            setIsIntelDrawerOpen(true);
            setIsWhatToPlayOpen(false);
          }}
        />

        <AddGameModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddGame={handleAddGame}
          onAddBatchGames={handleAddBatchGames}
          apiKeys={settings.apiKeys}
          existingGames={games}
        />

        <EditThemeModal
          key={isThemeModalOpen && themeEditingGame ? themeEditingGame.id : 'theme-modal-closed'}
          isOpen={isThemeModalOpen}
          onClose={() => {
            setIsThemeModalOpen(false);
            setThemeEditingGame(null);
          }}
          game={themeEditingGame}
          onSaveGame={handleUpdateGame}
          onRequestRemoveGame={(g) => setGamePendingRemoval(g)}
          onRemoveGame={handleRemoveGame}
          apiKeys={settings.apiKeys}
        />

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResetLibrary={handleResetLibrary}
          onRestoreLibrary={(restored) => {
            setGames(restored);
            showToast(`📦 Restored ${restored.length} game(s) to library!`);
          }}
          games={games}
          onUpdateGame={handleUpdateGame}
          onBatchUpdateGames={handleBatchUpdateGames}
          onOpenSetupWizard={() => {
            setIsSettingsModalOpen(false);
            setIsSetupWizardOpen(true);
          }}
        />

        {/* Setup Wizard Onboarding Modal */}
        <SetupWizardModal
          isOpen={isSetupWizardOpen}
          currentSettings={settings}
          onComplete={(newSettings) => {
            handleUpdateSettings({ ...settings, ...newSettings });
            setIsSetupWizardOpen(false);
            showToast(`✨ Realm Calibrated: ${newSettings.experienceArchetype?.toUpperCase() || 'CONSOLE'}`);
          }}
          onClose={() => setIsSetupWizardOpen(false)}
        />

        {/* V3 Pillar 1: Astra Jukebox & Audio Visualizer */}
        <JukeboxModal
          isOpen={isJukeboxOpen}
          onClose={() => setIsJukeboxOpen(false)}
          accentColor={games[selectedGameIndex]?.theme?.accentColor || '#2ee5ba'}
          onShowToast={showToast}
        />

        {/* V3 Pillar 2: Save Game Vault & Auto-Backup */}
        <SaveVaultModal
          isOpen={saveVaultGame !== null}
          game={saveVaultGame}
          onClose={() => setSaveVaultGame(null)}
          onShowToast={showToast}
        />

        {/* V3 Pillar 3: Gaming Activity Tracking & Analytics Dashboard */}
        <ActivityDashboardModal
          isOpen={isActivityOpen}
          games={games}
          onClose={() => setIsActivityOpen(false)}
          accentColor={games[selectedGameIndex]?.theme?.accentColor || '#10b981'}
        />

        {/* Smart Resume Popup Notification */}
        {resumePattern && (
          <SmartResumePopup
            pattern={resumePattern}
            games={games}
            onOpenStats={() => setIsActivityOpen(true)}
            onDismiss={() => setResumePattern(null)}
          />
        )}

        {/* V3 Pillar 4: Retro & Emulation Hub */}
        <RetroHubModal
          isOpen={isRetroHubOpen}
          onClose={() => setIsRetroHubOpen(false)}
          onAddGame={handleAddGame}
          onShowToast={showToast}
        />

        {/* V3 Pillar 5: In-Game Companion Mini-HUD */}
        <InGameMiniHud
          isOpen={isMiniHudOpen}
          activeGame={games[selectedGameIndex] || null}
          onClose={() => setIsMiniHudOpen(false)}
          onTakeScreenshot={() => handleTakeScreenshot()}
          onOpenJukebox={() => setIsJukeboxOpen(true)}
          onShowToast={showToast}
        />
      </Suspense>

      {/* Synchronous Modals & Drawers */}

      <NotesDrawer
        key={isNotesOpen && games[selectedGameIndex] ? games[selectedGameIndex].id : 'notes-drawer-closed'}
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        game={games[selectedGameIndex] || null}
        onUpdateGame={handleUpdateGame}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        games={games}
        onLaunchGame={handleLaunchGame}
        onSelectGame={(idx) => setSelectedGameIndex(idx)}
        onOpenWhatToPlay={() => setIsWhatToPlayOpen(true)}
      />

      <ConfirmRemoveModal
        isOpen={gamePendingRemoval !== null}
        game={gamePendingRemoval}
        onClose={() => setGamePendingRemoval(null)}
        onConfirm={(gameId) => {
          handleRemoveGame(gameId);
          setGamePendingRemoval(null);
        }}
      />
      <ImportProgressBar />
      <ToastStack />
    </div>
  );
};

export default App;
