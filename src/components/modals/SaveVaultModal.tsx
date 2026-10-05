import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  RotateCcw,
  Plus,
  FolderOpen,
  FileCode,
  HardDrive,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings,
  Trash2,
  Loader2,
  Archive,
  Lock
} from 'lucide-react';
import type { Game } from '../../types/game';
import type { BackupMetadata, SaveVaultSettings, SaveDirectoryScanResult } from '../../types/SaveVault.types';
import { SaveVaultService } from '../../services/SaveVaultService';
import { audioEngine } from '../../services/audioEngine';

interface SaveVaultModalProps {
  isOpen: boolean;
  game: Game | null;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

type TabType = 'backups' | 'settings' | 'restore';

export const SaveVaultModal: React.FC<SaveVaultModalProps> = ({
  isOpen,
  game,
  onClose,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('backups');
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [locations, setLocations] = useState<SaveDirectoryScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [selectedBackup, setSelectedBackup] = useState<BackupMetadata | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [backupProgress, setBackupProgress] = useState<number>(0);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);

  // Settings state
  const [settings, setSettings] = useState<SaveVaultSettings>(SaveVaultService.getSettings());

  const loadVaultData = useCallback(async () => {
    if (!game) return;
    setLoading(true);
    try {
      const [locs, bks] = await Promise.all([
        SaveVaultService.scanSaveDirectories(game.id, game.title),
        SaveVaultService.listBackups(game.id)
      ]);
      setLocations(locs);
      setBackups(bks);
    } catch (err) {
      console.error('[SaveVaultModal] Failed to load vault data:', err);
    } finally {
      setLoading(false);
    }
  }, [game]);

  useEffect(() => {
    if (!isOpen || !game) return;
    loadVaultData();
    setSettings(SaveVaultService.getSettings());

    // Listen for real-time backup progress events
    const unsubProgress = SaveVaultService.onProgress((info) => {
      if (info.gameId === String(game.id)) {
        setBackupProgress(info.progress);
        if (info.progress >= 100) {
          setTimeout(() => {
            setIsBackingUp(false);
            setBackupProgress(0);
          }, 600);
        }
      }
    });

    return () => {
      unsubProgress();
    };
  }, [isOpen, game, loadVaultData]);

  const handleCreateBackup = async () => {
    if (!game || isBackingUp) return;
    setIsBackingUp(true);
    setBackupProgress(5);
    setCreating(true);

    try {
      const activeLoc = locations.find((l) => l.exists);
      const res = await SaveVaultService.createBackup(game.id, {
        gameTitle: game.title,
        savePath: activeLoc?.path,
        notes: customNote.trim() || undefined,
        gameVersion: (game as any).version || '1.0.0',
        isAuto: false
      });

      if (res.success && res.backup) {
        audioEngine.playLaunch();
        onShowToast(`🛡️ Save zipped & backed up for ${game.title}`);
        setCustomNote('');
        await loadVaultData();
      } else {
        onShowToast(`⚠️ ${res.error || 'Failed to create backup'}`);
      }
    } catch (err: any) {
      onShowToast(`⚠️ Error: ${err.message}`);
    } finally {
      setCreating(false);
      setIsBackingUp(false);
      setBackupProgress(0);
    }
  };

  const handleRestoreBackup = async () => {
    if (!game || !selectedBackup) return;
    setRestoring(true);
    try {
      audioEngine.playSelect();
      const res = await SaveVaultService.restoreBackup(game.id, selectedBackup.id);
      if (res.success) {
        audioEngine.playLaunch();
        onShowToast(`✅ Restored save from ${new Date(selectedBackup.timestamp).toLocaleDateString()}`);
        setShowRestoreConfirm(false);
        await loadVaultData();
        setActiveTab('backups');
      } else {
        onShowToast(`⚠️ ${res.error || 'Restore failed'}`);
      }
    } catch (err: any) {
      onShowToast(`⚠️ Restore error: ${err.message}`);
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!game) return;
    try {
      audioEngine.playSelect();
      const res = await SaveVaultService.deleteBackup(game.id, backupId);
      if (res.success) {
        onShowToast('🗑️ Backup deleted');
        setBackups((prev) => prev.filter((b) => b.id !== backupId));
        if (selectedBackup?.id === backupId) {
          setSelectedBackup(null);
        }
      } else {
        onShowToast(`⚠️ Delete failed: ${res.error}`);
      }
    } catch (err: any) {
      onShowToast(`⚠️ Error: ${err.message}`);
    }
  };

  const handleOpenFolder = () => {
    if (!game) return;
    audioEngine.playSelect();
    SaveVaultService.openVaultFolder(game.id);
  };

  const handlePickStorageFolder = async () => {
    const folder = await SaveVaultService.pickStorageLocation();
    if (folder) {
      const updated = { ...settings, customStorageLocation: folder };
      setSettings(updated);
      SaveVaultService.saveSettings(updated);
      onShowToast(`Storage path set to: ${folder}`);
      loadVaultData();
    }
  };

  const handleSettingChange = <K extends keyof SaveVaultSettings>(
    key: K,
    val: SaveVaultSettings[K]
  ) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    SaveVaultService.saveSettings(updated);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen || !game) return null;

  const activeSaveLocation = locations.find((l) => l.exists);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn select-none">
      <div className="w-full max-w-3xl max-h-[88vh] rounded-3xl bg-zinc-950/95 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-modalIn isolate relative">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 z-10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wider uppercase">Save Game Vault</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> PROTECTED
                </span>
              </div>
              <p className="text-xs text-white/50">{game.title} • Zipped Snapshots & Safety Rollbacks</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenFolder}
              title="Open Vault Storage Directory"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-pill hover:bg-white/15 text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
              <span>Explore Vault</span>
            </button>
            <button
              onClick={() => {
                audioEngine.playSelect();
                onClose();
              }}
              className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-white/10 bg-white/[0.02]">
          <button
            onClick={() => {
              audioEngine.playHover();
              setActiveTab('backups');
            }}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'backups'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Backups ({backups.length})</span>
          </button>

          <button
            onClick={() => {
              audioEngine.playHover();
              setActiveTab('settings');
            }}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Vault Settings</span>
          </button>

          <button
            onClick={() => {
              audioEngine.playHover();
              setActiveTab('restore');
            }}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'restore'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>1-Click Restore</span>
          </button>
        </div>

        {/* Save Location Detection Bar */}
        <div className="px-6 py-2.5 bg-white/[0.015] border-b border-white/10 flex items-center justify-between text-xs text-white/70">
          <div className="flex items-center gap-2 min-w-0">
            <HardDrive className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-white/40">Auto-detected Save Folder:</span>
            <span className="font-mono text-[11px] text-white/90 truncate max-w-md">
              {activeSaveLocation ? activeSaveLocation.path : 'Scanning %APPDATA%, Documents/My Games, Saved Games...'}
            </span>
          </div>
          {activeSaveLocation ? (
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 flex-shrink-0 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              DETECTED
            </span>
          ) : (
            <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1 flex-shrink-0 font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              NOT DETECTED
            </span>
          )}
        </div>

        {/* Real-time Backup Progress Bar */}
        {isBackingUp && (
          <div className="px-6 py-2 bg-emerald-500/10 border-b border-emerald-500/20 animate-fadeIn">
            <div className="flex items-center justify-between text-[11px] font-mono text-emerald-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Compressing & locking save archive...
              </span>
              <span>{backupProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-200"
                style={{ width: `${backupProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* TAB 1: LIST ALL BACKUPS */}
        {activeTab === 'backups' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Backup Creator Bar */}
            <div className="p-5 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="Backup note (e.g. 'Before Final Boss', 'Pre-mod install')..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateBackup()}
                className="flex-1 w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400 transition-all font-sans"
              />
              <button
                onClick={handleCreateBackup}
                disabled={creating || isBackingUp}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer flex-shrink-0 disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>{creating ? 'Zipping...' : 'Create Backup'}</span>
              </button>
            </div>

            {/* Backups List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
              {loading ? (
                <div className="py-16 text-center text-white/40 text-sm flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span>Scanning save vault archive...</span>
                </div>
              ) : backups.length === 0 ? (
                <div className="py-16 text-center text-white/50 space-y-2">
                  <Shield className="w-12 h-12 text-white/20 mx-auto" />
                  <p className="font-semibold text-white/70">No save backups found yet</p>
                  <p className="text-xs text-white/40 max-w-sm mx-auto">
                    Create a zipped backup above or launch the game to automatically trigger pre-launch backups.
                  </p>
                </div>
              ) : (
                backups.map((bk) => (
                  <div
                    key={bk.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-4 group"
                  >
                    <div className="min-w-0 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <FileCode className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white truncate">{bk.notes || 'Save Backup'}</h4>
                          {bk.isAuto && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              AUTO
                            </span>
                          )}
                          {bk.gameVersion && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                              v{bk.gameVersion}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-white/40 mt-1 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-white/30" />
                            {new Date(bk.timestamp).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span>•</span>
                          <span>{formatSize(bk.size)}</span>
                          {bk.fileCount && (
                            <>
                              <span>•</span>
                              <span>{bk.fileCount} files</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          audioEngine.playHover();
                          setSelectedBackup(bk);
                          setShowRestoreConfirm(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl glass-pill hover:bg-emerald-500 hover:text-black font-bold text-xs flex items-center gap-1.5 text-white/80 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(bk.id)}
                        className="p-2 rounded-xl hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-all cursor-pointer"
                        title="Delete Backup"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SETTINGS (RETENTION, AUTO-BACKUP, STORAGE LOCATION) */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                <span>Backup Automation & Storage Preferences</span>
              </h3>

              {/* Auto-Backup Toggle */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h4 className="text-xs font-semibold text-white">Pre-Launch Auto-Backup</h4>
                  <p className="text-[11px] text-white/50">
                    Automatically create a zipped snapshot right before the game executable launches.
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('autoBackupOnLaunch', !settings.autoBackupOnLaunch)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    settings.autoBackupOnLaunch ? 'bg-emerald-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoBackupOnLaunch ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Retention Count */}
              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <div>
                  <h4 className="text-xs font-semibold text-white">Backup Retention Limit</h4>
                  <p className="text-[11px] text-white/50">
                    Keep the latest N backups per game. Older backups will be automatically pruned.
                  </p>
                </div>
                <select
                  value={settings.retentionCount}
                  onChange={(e) => handleSettingChange('retentionCount', parseInt(e.target.value, 10))}
                  className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value={3} className="bg-zinc-900">Keep 3 Backups</option>
                  <option value={5} className="bg-zinc-900">Keep 5 Backups (Default)</option>
                  <option value={10} className="bg-zinc-900">Keep 10 Backups</option>
                  <option value={20} className="bg-zinc-900">Keep 20 Backups</option>
                </select>
              </div>

              {/* Storage Location */}
              <div className="border-t border-white/10 pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-white">Custom Vault Storage Location</h4>
                    <p className="text-[11px] text-white/50">
                      Destination folder where zipped archives and `backups.json` are stored.
                    </p>
                  </div>
                  <button
                    onClick={handlePickStorageFolder}
                    className="px-3 py-1.5 rounded-xl glass-pill hover:bg-white/15 text-xs font-semibold text-white/90 cursor-pointer"
                  >
                    Change Folder
                  </button>
                </div>
                <div className="font-mono text-[11px] text-white/60 p-2.5 rounded-xl bg-black/40 border border-white/10 truncate">
                  {settings.customStorageLocation || 'Default (%APPDATA%/astra-launcher/save_vault)'}
                </div>
              </div>
            </div>

            {/* Anti-corruption lock explanation */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-white/80 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <Shield className="w-4 h-4" />
                <span>Corruption Guard & Lock Engine</span>
              </div>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Save Vault locks active write operations during archive creation and decompression, preventing incomplete
                writes and protecting against game crash corruption.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: RESTORE FROM BACKUP WITH 1-CLICK BUTTON */}
        {activeTab === 'restore' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-emerald-400" />
                <span>Select Snapshot to Restore</span>
              </h3>
              <p className="text-xs text-white/50">
                Choose a point-in-time backup to restore to your active game save folder with 1-click.
              </p>
            </div>

            {backups.length === 0 ? (
              <div className="py-16 text-center text-white/50 space-y-2">
                <p className="font-semibold text-white/70">No backups available to restore</p>
                <button
                  onClick={() => setActiveTab('backups')}
                  className="px-4 py-2 rounded-xl bg-emerald-400 text-black font-bold text-xs cursor-pointer"
                >
                  Create Your First Backup
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map((bk) => {
                  const isSelected = selectedBackup?.id === bk.id;
                  return (
                    <div
                      key={bk.id}
                      onClick={() => setSelectedBackup(bk)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white truncate">{bk.notes || 'Save Backup'}</h4>
                          {bk.isAuto && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                              AUTO
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-white/40 mt-1">
                          {new Date(bk.timestamp).toLocaleString()} • {formatSize(bk.size)}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBackup(bk);
                          setShowRestoreConfirm(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer flex-shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>1-Click Restore</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Restore Confirmation Dialog */}
        {showRestoreConfirm && selectedBackup && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 z-30 animate-fadeIn">
            <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-900 border border-rose-500/40 shadow-2xl text-center space-y-4 animate-modalIn">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Save Restore?</h3>
                <p className="text-xs text-white/60 mt-1">
                  This will unpack the zipped archive from{' '}
                  <strong className="text-white font-mono">{new Date(selectedBackup.timestamp).toLocaleString()}</strong> into
                  your game save folder.
                </p>
                <p className="text-[11px] text-emerald-400/90 mt-2 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 font-mono">
                  ✓ Safety note: Astra will auto-archive your active save before overwriting.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowRestoreConfirm(false)}
                  disabled={restoring}
                  className="px-4 py-2.5 rounded-xl glass-pill text-xs font-semibold text-white/70 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestoreBackup}
                  disabled={restoring}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-all cursor-pointer shadow-lg flex items-center gap-2"
                >
                  {restoring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{restoring ? 'Restoring...' : 'Confirm & Restore'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
