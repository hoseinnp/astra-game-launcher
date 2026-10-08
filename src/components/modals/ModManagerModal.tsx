import React, { useState, useMemo } from 'react';
import {
  X, Layers, Plus, Trash2, ArrowUp, ArrowDown, FolderOpen, Play,
  Sparkles, SlidersHorizontal, FileArchive, Check
} from 'lucide-react';
import type { Game, GameMod, ModCategory, ModPackPreset } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';

interface ModManagerModalProps {
  isOpen: boolean;
  game: Game | null;
  onClose: () => void;
  onUpdateGame: (updatedGame: Game) => void;
  onLaunchGame?: (game: Game) => void;
}

const CATEGORY_COLORS: Record<ModCategory, { bg: string; text: string; border: string }> = {
  graphics: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  gameplay: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  audio: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  ui: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  qol: { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30' },
  overhaul: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  other: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30' }
};

export const ModManagerModal: React.FC<ModManagerModalProps> = ({
  isOpen,
  game,
  onClose,
  onUpdateGame,
  onLaunchGame
}) => {
  const [activeTab, setActiveTab] = useState<'mods' | 'presets' | 'add'>('mods');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Mod Form state
  const [newModName, setNewModName] = useState('');
  const [newModAuthor, setNewModAuthor] = useState('');
  const [newModVersion, setNewModVersion] = useState('v1.0.0');
  const [newModCategory, setNewModCategory] = useState<ModCategory>('gameplay');
  const [newModDescription, setNewModDescription] = useState('');
  const [newModPath, setNewModPath] = useState('');

  // Preset Creator state
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');

  const mods = useMemo(() => game?.mods || [], [game?.mods]);
  const presets = useMemo(() => game?.modPresets || [], [game?.modPresets]);
  const modsEnabled = game?.modsEnabledOnLaunch ?? true;

  const activeModsCount = useMemo(() => mods.filter((m) => m.enabled).length, [mods]);

  // Filtered mods
  const filteredMods = useMemo(() => {
    return [...mods]
      .sort((a, b) => a.priority - b.priority)
      .filter((m) => {
        if (filterCategory !== 'all' && m.category !== filterCategory) return false;
        if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase()) && !m.author?.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        return true;
      });
  }, [mods, filterCategory, searchQuery]);

  // Toggle single mod enabled state
  const handleToggleMod = (modId: string) => {
    if (!game) return;
    audioEngine.playSelect();
    const updatedMods = mods.map((m) => (m.id === modId ? { ...m, enabled: !m.enabled } : m));
    onUpdateGame({
      ...game,
      mods: updatedMods
    });
  };

  // Reorder mod load priority
  const handleMoveMod = (modId: string, direction: 'up' | 'down') => {
    if (!game) return;
    audioEngine.playSelect();
    const sorted = [...mods].sort((a, b) => a.priority - b.priority);
    const index = sorted.findIndex((m) => m.id === modId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const prev = sorted[index - 1];
      const cur = sorted[index];
      const tempP = prev.priority;
      prev.priority = cur.priority;
      cur.priority = tempP;
    } else if (direction === 'down' && index < sorted.length - 1) {
      const next = sorted[index + 1];
      const cur = sorted[index];
      const tempP = next.priority;
      next.priority = cur.priority;
      cur.priority = tempP;
    }

    onUpdateGame({
      ...game,
      mods: sorted
    });
  };

  // Remove a mod
  const handleDeleteMod = (modId: string) => {
    if (!game) return;
    audioEngine.playSelect();
    const updated = mods.filter((m) => m.id !== modId);
    onUpdateGame({
      ...game,
      mods: updated
    });
  };

  // Master switch for mods on launch
  const handleToggleMasterMods = () => {
    if (!game) return;
    audioEngine.playSelect();
    onUpdateGame({
      ...game,
      modsEnabledOnLaunch: !modsEnabled
    });
  };

  // Add new mod
  const handleCreateMod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!game || !newModName.trim()) return;

    audioEngine.playLaunch();
    const newMod: GameMod = {
      id: `mod-${Date.now()}`,
      name: newModName.trim(),
      author: newModAuthor.trim() || undefined,
      version: newModVersion.trim() || 'v1.0.0',
      category: newModCategory,
      description: newModDescription.trim() || undefined,
      fileOrFolder: newModPath.trim() || undefined,
      enabled: true,
      priority: mods.length + 1,
      installDate: new Date().toISOString()
    };

    onUpdateGame({
      ...game,
      mods: [...mods, newMod]
    });

    setNewModName('');
    setNewModAuthor('');
    setNewModVersion('v1.0.0');
    setNewModDescription('');
    setNewModPath('');
    setActiveTab('mods');
  };

  // Create mod preset pack
  const handleCreatePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!game || !newPresetName.trim()) return;

    audioEngine.playLaunch();
    const activeIds = mods.filter((m) => m.enabled).map((m) => m.id);
    const newPreset: ModPackPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      description: newPresetDesc.trim() || undefined,
      activeModIds: activeIds,
      createdAt: new Date().toISOString()
    };

    onUpdateGame({
      ...game,
      modPresets: [...presets, newPreset]
    });

    setNewPresetName('');
    setNewPresetDesc('');
  };

  // Apply mod preset pack
  const handleApplyPreset = (preset: ModPackPreset) => {
    if (!game) return;
    audioEngine.playLaunch();
    const targetSet = new Set(preset.activeModIds);
    const updated = mods.map((m) => ({
      ...m,
      enabled: targetSet.has(m.id)
    }));

    onUpdateGame({
      ...game,
      mods: updated
    });
  };

  // Delete preset
  const handleDeletePreset = (presetId: string) => {
    if (!game) return;
    audioEngine.playSelect();
    onUpdateGame({
      ...game,
      modPresets: presets.filter((p) => p.id !== presetId)
    });
  };

  // Pick file or folder for mod
  const handleBrowseModFile = async () => {
    audioEngine.playSelect();
    if (window.api?.pickFolder) {
      const folder = await window.api.pickFolder();
      if (folder) {
        setNewModPath(folder);
        if (!newModName) {
          const parts = folder.split(/[/\\]/);
          setNewModName(parts[parts.length - 1] || 'New Mod');
        }
      }
    }
  };

  if (!isOpen || !game) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-fadeIn select-none">
      <div className="relative w-full max-w-4xl max-w-[calc(100vw-1.5rem)] max-h-[92vh] max-h-[calc(100vh-1.5rem)] flex flex-col rounded-2xl sm:rounded-3xl bg-[#0c101c] border border-white/15 shadow-2xl overflow-hidden animate-modalIn min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 bg-white/5 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--game-accent,#2ee5ba)]/15 border border-[var(--game-accent,#2ee5ba)]/40 flex items-center justify-center text-[var(--game-accent,#2ee5ba)] shadow-[0_0_15px_var(--game-glow)] flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-wide text-white uppercase truncate">
                  Mod & Add-On Pack Manager
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--game-accent,#2ee5ba)]/20 text-[var(--game-accent,#2ee5ba)] font-mono font-bold">
                  V3 MODULE
                </span>
              </div>
              <p className="text-xs text-white/50 truncate max-w-md">
                {game.title} • {activeModsCount} of {mods.length} mods enabled
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Master Mods Enable / Disable Switch */}
            <button
              onClick={handleToggleMasterMods}
              title={modsEnabled ? 'Mods active on game launch' : 'Vanilla mode active (mods bypassed)'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                modsEnabled
                  ? 'bg-[var(--game-accent,#2ee5ba)]/20 border-[var(--game-accent,#2ee5ba)] text-[var(--game-accent,#2ee5ba)] shadow-[0_0_12px_var(--game-glow)]'
                  : 'bg-white/5 border-white/15 text-white/50 hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${modsEnabled ? 'bg-[var(--game-accent,#2ee5ba)] animate-pulse' : 'bg-white/40'}`} />
              <span>{modsEnabled ? 'MODS ENABLED' : 'VANILLA MODE'}</span>
            </button>

            <button
              onClick={() => {
                audioEngine.playSelect();
                onClose();
              }}
              className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation & Toolbar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-black/30 border-b border-white/10 flex-wrap gap-2">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full flex-nowrap py-0.5">
            <button
              onClick={() => {
                audioEngine.playSelect();
                setActiveTab('mods');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'mods'
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Installed Mods ({mods.length})</span>
            </button>

            <button
              onClick={() => {
                audioEngine.playSelect();
                setActiveTab('presets');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pack Presets ({presets.length})</span>
            </button>

            <button
              onClick={() => {
                audioEngine.playSelect();
                setActiveTab('add');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'add'
                  ? 'bg-[var(--game-accent,#2ee5ba)] text-black font-extrabold shadow-md'
                  : 'text-[var(--game-accent,#2ee5ba)] hover:bg-[var(--game-accent,#2ee5ba)]/10'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Install New Mod</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Open game directory */}
            <button
              onClick={() => {
                audioEngine.playSelect();
                window.api?.openGameFolder?.(game);
              }}
              title="Open game directory in Windows Explorer"
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Game Folder</span>
            </button>

            {onLaunchGame && (
              <button
                onClick={() => {
                  onLaunchGame(game);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[var(--game-accent,#2ee5ba)] text-black hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_var(--game-glow)]"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>Launch {modsEnabled ? 'with Mods' : 'Vanilla'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[360px]">
          {/* TAB 1: MODS LIST */}
          {activeTab === 'mods' && (
            <div className="space-y-4">
              {/* Category Filter Chips & Search Bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['all', 'graphics', 'gameplay', 'audio', 'ui', 'qol', 'overhaul', 'other'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        filterCategory === cat
                          ? 'bg-white/20 text-white border border-white/30'
                          : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Filter mods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[var(--game-accent,#2ee5ba)] min-w-[180px]"
                />
              </div>

              {filteredMods.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
                    <FileArchive className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white/80">No Mods Configured</h3>
                    <p className="text-xs text-white/40 mt-1 max-w-sm">
                      Enhance {game.title} with HD textures, gameplay overhauls, custom soundtracks, or community patches.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[var(--game-accent,#2ee5ba)] text-black hover:brightness-110 cursor-pointer shadow-lg mt-2"
                  >
                    + Install Your First Mod
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-white/40 px-3 pb-1 border-b border-white/5">
                    <span className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3 h-3" /> Load Order & Mod Name
                    </span>
                    <span>Category • Author • Actions</span>
                  </div>

                  {filteredMods.map((mod, index) => {
                    const catStyle = CATEGORY_COLORS[mod.category] || CATEGORY_COLORS.other;
                    return (
                      <div
                        key={mod.id}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                          mod.enabled
                            ? 'bg-white/5 border-white/15 hover:border-white/30'
                            : 'bg-black/20 border-white/5 opacity-60 hover:opacity-80'
                        }`}
                      >
                        {/* Left: Load Order, Checkbox, Title */}
                        <div className="flex items-center gap-3">
                          {/* Priority index badge */}
                          <span className="w-6 text-center text-xs font-mono font-bold text-white/40">
                            #{index + 1}
                          </span>

                          {/* Toggle switch checkbox */}
                          <button
                            onClick={() => handleToggleMod(mod.id)}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                              mod.enabled
                                ? 'bg-[var(--game-accent,#2ee5ba)] border-[var(--game-accent,#2ee5ba)] text-black'
                                : 'border-white/30 hover:border-white text-transparent'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-white tracking-wide">
                                {mod.name}
                              </h4>
                              {mod.version && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-white/60">
                                  {mod.version}
                                </span>
                              )}
                            </div>
                            {mod.description && (
                              <p className="text-[11px] text-white/50 line-clamp-1 mt-0.5">
                                {mod.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Category badge, Author, Load Order controls, Delete */}
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                          >
                            {mod.category}
                          </span>

                          {mod.author && (
                            <span className="text-[11px] text-white/40 max-w-[100px] truncate hidden sm:inline">
                              by {mod.author}
                            </span>
                          )}

                          {/* Load order arrows */}
                          <div className="flex items-center gap-1 pl-2 border-l border-white/10">
                            <button
                              onClick={() => handleMoveMod(mod.id, 'up')}
                              disabled={index === 0}
                              title="Increase load priority"
                              className="p-1 rounded-md text-white/40 hover:text-white disabled:opacity-20 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveMod(mod.id, 'down')}
                              disabled={index === filteredMods.length - 1}
                              title="Decrease load priority"
                              className="p-1 rounded-md text-white/40 hover:text-white disabled:opacity-20 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteMod(mod.id)}
                            title="Remove mod"
                            className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MOD PACK PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-6">
              {/* Preset Creator Card */}
              <form
                onSubmit={handleCreatePreset}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-[var(--game-accent,#2ee5ba)]" />
                  <span>Snapshot Active Mods into a Preset Pack</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Preset Name (e.g. 4K Visuals & Raytracing)"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-[var(--game-accent,#2ee5ba)]"
                  />
                  <input
                    type="text"
                    placeholder="Brief description (optional)"
                    value={newPresetDesc}
                    onChange={(e) => setNewPresetDesc(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-[var(--game-accent,#2ee5ba)]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[var(--game-accent,#2ee5ba)] text-black hover:brightness-110 cursor-pointer shadow-md"
                  >
                    Save Current Config ({activeModsCount} active)
                  </button>
                </div>
              </form>

              {/* Presets List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider">
                  Saved Mod Packs ({presets.length})
                </h4>

                {presets.length === 0 ? (
                  <div className="text-center py-10 text-white/40 text-xs">
                    No mod pack presets saved yet. Save your favorite mod loadouts to switch between them instantly.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {presets.map((preset) => {
                      const enabledCount = preset.activeModIds.length;
                      return (
                        <div
                          key={preset.id}
                          className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/25 transition-all flex flex-col justify-between space-y-3"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-white tracking-wide">
                                {preset.name}
                              </h5>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                                {enabledCount} Mods
                              </span>
                            </div>
                            {preset.description && (
                              <p className="text-[11px] text-white/50 mt-1 line-clamp-2">
                                {preset.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <span className="text-[10px] text-white/40 font-mono">
                              {new Date(preset.createdAt).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDeletePreset(preset.id)}
                                title="Delete preset"
                                className="p-1 rounded-md text-red-400/50 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleApplyPreset(preset)}
                                className="px-3 py-1 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                              >
                                Apply Pack
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ADD NEW MOD FORM */}
          {activeTab === 'add' && (
            <form onSubmit={handleCreateMod} className="max-w-xl mx-auto space-y-4 py-2">
              <div className="text-center space-y-1 mb-4">
                <h3 className="text-sm font-bold text-white">Register a New Mod or Add-On</h3>
                <p className="text-xs text-white/50">
                  Add mods extracted to your game directory or imported from ZIP files.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Mod Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ultra HD 4K Texture Pack"
                  value={newModName}
                  onChange={(e) => setNewModName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white focus:outline-none focus:border-[var(--game-accent,#2ee5ba)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Author / Creator</label>
                  <input
                    type="text"
                    placeholder="e.g. NexusModder"
                    value={newModAuthor}
                    onChange={(e) => setNewModAuthor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white focus:outline-none focus:border-[var(--game-accent,#2ee5ba)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Version</label>
                  <input
                    type="text"
                    placeholder="e.g. v2.1.0"
                    value={newModVersion}
                    onChange={(e) => setNewModVersion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white focus:outline-none focus:border-[var(--game-accent,#2ee5ba)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['graphics', 'gameplay', 'audio', 'ui', 'qol', 'overhaul', 'other'] as ModCategory[]).map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setNewModCategory(cat)}
                      className={`p-2 rounded-xl border text-xs font-bold uppercase tracking-wider cursor-pointer ${
                        newModCategory === cat
                          ? 'border-[var(--game-accent,#2ee5ba)] bg-[var(--game-accent,#2ee5ba)]/15 text-[var(--game-accent,#2ee5ba)]'
                          : 'border-white/10 text-white/50 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Target File / Folder Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="C:\Games\Mods\TexturePack or .pak file"
                    value={newModPath}
                    onChange={(e) => setNewModPath(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white focus:outline-none focus:border-[var(--game-accent,#2ee5ba)] font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseModFile}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Browse</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Installation instructions or key features..."
                  value={newModDescription}
                  onChange={(e) => setNewModDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white focus:outline-none focus:border-[var(--game-accent,#2ee5ba)] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('mods')}
                  className="px-4 py-2 rounded-xl text-xs glass-pill text-white/70 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-[var(--game-accent,#2ee5ba)] text-black hover:brightness-110 cursor-pointer shadow-lg"
                >
                  Save Mod Entry
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
