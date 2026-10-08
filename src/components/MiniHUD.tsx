import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Sliders,
  Activity,
  Settings,
  Save,
  Volume2,
  Minimize2,
  MessageSquare,
  EyeOff,
  Clock,
  Archive,
  Wifi,
  Cpu,
  Tv
} from 'lucide-react';
import { MiniHUDService, type MiniHudState } from '../services/MiniHUDService';

export const MiniHUD: React.FC = () => {
  const [hudState, setHudState] = useState<MiniHudState>(MiniHUDService.getState());
  const [activeTab, setActiveTab] = useState<'status' | 'controls' | 'stats' | 'settings'>('status');
  const [discordRpc, setDiscordRpc] = useState<boolean>(MiniHUDService.isDiscordRpcEnabled());
  const [volume, setVolume] = useState<number>(MiniHUDService.getAudioVolume());
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    return MiniHUDService.subscribe((newState) => {
      setHudState(newState);
    });
  }, []);

  // Listen to keyboard shortcut Ctrl+` (or Ctrl+Backquote) to toggle visibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.code === 'Backquote' || e.key === '`')) {
        e.preventDefault();
        MiniHUDService.toggleVisible();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!hudState.visible) {
    return null;
  }

  // Calculate position classes
  const getPositionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 99999,
      width: '320px',
      height: '180px',
      opacity: hudState.opacity / 100,
      transition: 'opacity 200ms ease, transform 200ms ease'
    };

    switch (hudState.position) {
      case 'TL':
        return { ...base, top: '16px', left: '16px' };
      case 'TR':
        return { ...base, top: '16px', right: '16px' };
      case 'BL':
        return { ...base, bottom: '16px', left: '16px' };
      case 'BR':
      default:
        return { ...base, bottom: '16px', right: '16px' };
    }
  };

  const handleSaveAndExit = async () => {
    if (isSaving || !hudState.gameStatus.isRunning) return;
    setIsSaving(true);
    setSaveMessage('Backing up save...');
    const result = await MiniHUDService.saveAndExit();
    if (result.success) {
      setSaveMessage('Saved! Exiting...');
      setTimeout(() => {
        setSaveMessage(null);
        setIsSaving(false);
      }, 1500);
    } else {
      setSaveMessage(result.error || 'Failed to save');
      setTimeout(() => {
        setSaveMessage(null);
        setIsSaving(false);
      }, 2000);
    }
  };

  const handleToggleDiscord = () => {
    const updated = MiniHUDService.toggleDiscordRpc();
    setDiscordRpc(updated);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    MiniHUDService.setAudioVolume(newVol);
  };

  const handleMinimize = async () => {
    await MiniHUDService.minimizeGame();
  };

  const handleHideHud = () => {
    MiniHUDService.setVisible(false);
  };

  const formatLaunchTime = (timestamp?: string | number | null) => {
    if (!timestamp) return '—';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  return (
    <div
      style={getPositionStyles()}
      className="bg-[#0b0f19]/90 backdrop-blur-md border border-white/15 rounded-2xl shadow-2xl p-2.5 flex flex-col justify-between text-white select-none font-sans overflow-hidden transition-all duration-200"
    >
      {/* Top Header & Tab Navigation */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">ASTRA HUD</span>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
          <button
            onClick={() => setActiveTab('status')}
            title="Game Status"
            className={`p-1 rounded-md transition-all ${
              activeTab === 'status'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            title="Quick Controls"
            className={`p-1 rounded-md transition-all ${
              activeTab === 'controls'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            title="System Stats"
            className={`p-1 rounded-md transition-all ${
              activeTab === 'stats'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            title="Quick Settings"
            className={`p-1 rounded-md transition-all ${
              activeTab === 'settings'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col justify-center text-xs">
        {/* TAB 1: GAME STATUS */}
        {activeTab === 'status' && (
          <div className="flex flex-col justify-between h-full space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white truncate max-w-[190px]">
                {hudState.gameStatus.isRunning ? hudState.gameStatus.gameTitle : 'No game running'}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                  hudState.gameStatus.isRunning
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {hudState.gameStatus.isRunning ? 'Active' : 'Idle'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="flex items-center gap-1.5 text-neutral-300 bg-white/5 px-1.5 py-1 rounded-lg">
                <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                <div className="truncate">
                  <span className="text-neutral-400 block text-[8px] leading-tight">Session Time</span>
                  <span className="font-mono text-cyan-200">
                    {hudState.gameStatus.sessionPlaytimeFormatted || '00:00:00'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-neutral-300 bg-white/5 px-1.5 py-1 rounded-lg">
                <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                <div className="truncate">
                  <span className="text-neutral-400 block text-[8px] leading-tight">Launched At</span>
                  <span className="font-mono text-indigo-200">
                    {formatLaunchTime(hudState.gameStatus.startTime)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[9px] text-neutral-400 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
              <Archive className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">
                {hudState.gameStatus.lastBackupText || 'No backups yet'}
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: QUICK CONTROLS */}
        {activeTab === 'controls' && (
          <div className="flex flex-col justify-between h-full space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              {/* Save & Exit */}
              <button
                onClick={handleSaveAndExit}
                disabled={!hudState.gameStatus.isRunning || isSaving}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition text-[10px] font-medium"
              >
                <Save className="w-3 h-3" />
                <span>{saveMessage ? saveMessage : 'Save & Exit'}</span>
              </button>

              {/* Minimize Game */}
              <button
                onClick={handleMinimize}
                disabled={!hudState.gameStatus.isRunning}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white/10 hover:bg-white/15 text-neutral-200 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition text-[10px] font-medium"
              >
                <Minimize2 className="w-3 h-3" />
                <span>Minimize</span>
              </button>
            </div>

            {/* Discord RPC & Volume Controls */}
            <div className="grid grid-cols-2 gap-1.5 items-center">
              <button
                onClick={handleToggleDiscord}
                className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg border text-[10px] transition ${
                  discordRpc
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : 'bg-white/5 text-neutral-400 border-white/5'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                <span>Discord RPC: {discordRpc ? 'ON' : 'OFF'}</span>
              </button>

              <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                <Volume2 className="w-3 h-3 text-cyan-400 shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="text-[9px] font-mono text-neutral-300 w-5 text-right">{volume}%</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM STATS */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-3 gap-1.5 h-full items-center text-center">
            {/* CPU */}
            <div className="bg-white/5 p-1.5 rounded-lg border border-white/5 flex flex-col items-center">
              <div className="flex items-center gap-1 text-[9px] text-neutral-400 mb-0.5">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span>CPU</span>
              </div>
              <span className="font-mono text-xs font-bold text-cyan-300">
                {hudState.systemStats.cpuUsage}%
              </span>
            </div>

            {/* RAM */}
            <div className="bg-white/5 p-1.5 rounded-lg border border-white/5 flex flex-col items-center">
              <div className="flex items-center gap-1 text-[9px] text-neutral-400 mb-0.5">
                <Activity className="w-3 h-3 text-indigo-400" />
                <span>RAM</span>
              </div>
              <span className="font-mono text-xs font-bold text-indigo-300">
                {hudState.systemStats.ramUsage}%
              </span>
            </div>

            {/* GPU / Ping */}
            <div className="bg-white/5 p-1.5 rounded-lg border border-white/5 flex flex-col items-center">
              <div className="flex items-center gap-1 text-[9px] text-neutral-400 mb-0.5">
                <Tv className="w-3 h-3 text-amber-400" />
                <span>GPU</span>
              </div>
              <span className="font-mono text-xs font-bold text-amber-300">
                {hudState.systemStats.gpuUsage !== undefined ? `${hudState.systemStats.gpuUsage}%` : 'N/A'}
              </span>
            </div>

            {/* FPS */}
            <div className="bg-white/5 p-1.5 rounded-lg border border-white/5 flex items-center justify-between col-span-2 px-2.5">
              <span className="text-[9px] text-neutral-400">FPS Counter</span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                {hudState.systemStats.fps} FPS
              </span>
            </div>

            {/* Ping */}
            <div className="bg-white/5 p-1.5 rounded-lg border border-white/5 flex items-center justify-between px-2">
              <div className="flex items-center gap-1 text-[9px] text-neutral-400">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>Ping</span>
              </div>
              <span className="font-mono text-[10px] text-neutral-200">
                {hudState.systemStats.ping || 24}ms
              </span>
            </div>
          </div>
        )}

        {/* TAB 4: QUICK SETTINGS */}
        {activeTab === 'settings' && (
          <div className="flex flex-col justify-between h-full space-y-1 text-[10px]">
            {/* Opacity Slider */}
            <div className="flex items-center justify-between gap-2 bg-white/5 px-2 py-1 rounded-lg">
              <span className="text-neutral-400 text-[9px]">Opacity</span>
              <input
                type="range"
                min="50"
                max="100"
                value={hudState.opacity}
                onChange={(e) => MiniHUDService.setOpacity(parseInt(e.target.value, 10))}
                className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="font-mono text-[9px] text-neutral-300 w-6 text-right">
                {hudState.opacity}%
              </span>
            </div>

            {/* Position Selector & Always-on-top */}
            <div className="flex items-center justify-between gap-1">
              {/* Corner position selector */}
              <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-md border border-white/5">
                {(['TL', 'TR', 'BL', 'BR'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => MiniHUDService.setPosition(pos)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      hudState.position === pos
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>

              {/* Always on top toggle */}
              <button
                onClick={() => MiniHUDService.setAlwaysOnTop(!hudState.alwaysOnTop)}
                className={`px-2 py-1 rounded-md text-[9px] font-medium border transition ${
                  hudState.alwaysOnTop
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-white/5 text-neutral-400 border-white/5'
                }`}
              >
                Top: {hudState.alwaysOnTop ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Hide HUD Button */}
            <button
              onClick={handleHideHud}
              className="w-full flex items-center justify-center gap-1.5 py-1 bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-300 rounded-lg border border-white/10 transition text-[9px]"
            >
              <EyeOff className="w-3 h-3" />
              <span>Hide HUD (Press Ctrl+` to show)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
