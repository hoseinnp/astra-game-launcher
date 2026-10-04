import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  RotateCcw,
  Plus,
  FolderOpen,
  FileCode,
  HardDrive,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import type { Game, SaveSnapshot, SaveLocation } from '../../types/game';
import { audioEngine } from '../../services/audioEngine';

interface SaveVaultModalProps {
  isOpen: boolean;
  game: Game | null;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const SaveVaultModal: React.FC<SaveVaultModalProps> = ({
  isOpen,
  game,
  onClose,
  onShowToast
}) => {
  const [snapshots, setSnapshots] = useState<SaveSnapshot[]>([]);
  const [locations, setLocations] = useState<SaveLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState<SaveSnapshot | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const loadVaultData = useCallback(async () => {
    if (!game) return;
    setLoading(true);
    try {
      if (window.api?.scanSaveLocations) {
        const locs = await window.api.scanSaveLocations(game.id, game.title);
        setLocations(locs);
      }
      if (window.api?.listSaveSnapshots) {
        const snaps = await window.api.listSaveSnapshots(game.id);
        setSnapshots(snaps);
      }
    } catch (err) {
      console.error('Failed to load vault data:', err);
    } finally {
      setLoading(false);
    }
  }, [game]);

  useEffect(() => {
    if (!isOpen || !game) return;
    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) {
        loadVaultData();
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen, game, loadVaultData]);

  const handleCreateSnapshot = async () => {
    if (!game || !window.api?.createSaveSnapshot) return;
    setCreating(true);
    try {
      const res = await window.api.createSaveSnapshot(game.id, game.title, customNote.trim() || undefined);
      if (res.success && res.snapshot) {
        audioEngine.playLaunch();
        onShowToast(`🛡️ Save snapshot created for ${game.title}`);
        setCustomNote('');
        loadVaultData();
      } else {
        onShowToast(`⚠️ ${res.error || 'Failed to create save snapshot'}`);
      }
    } catch (err: any) {
      onShowToast(`⚠️ Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreSnapshot = async () => {
    if (!game || !selectedSnapshot || !window.api?.restoreSaveSnapshot) return;
    try {
      audioEngine.playSelect();
      const res = await window.api.restoreSaveSnapshot(game.id, selectedSnapshot.id);
      if (res.success) {
        audioEngine.playLaunch();
        onShowToast(`✅ Restored save from ${new Date(selectedSnapshot.timestamp).toLocaleDateString()}`);
        setShowRestoreConfirm(false);
        loadVaultData();
      } else {
        onShowToast(`⚠️ ${res.error || 'Restore failed'}`);
      }
    } catch (err: any) {
      onShowToast(`⚠️ Restore error: ${err.message}`);
    }
  };

  const handleOpenFolder = () => {
    if (!game || !window.api?.openSaveDirectory) return;
    audioEngine.playSelect();
    window.api.openSaveDirectory(game.id);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen || !game) return null;

  const activeSaveLocation = locations.find((l) => l.exists);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn select-none">
      <div className="w-full max-w-3xl max-h-[85vh] rounded-3xl bg-zinc-950/95 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-modalIn isolate relative">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 z-10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-wider uppercase">Save Game Vault</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  PROTECTED
                </span>
              </div>
              <p className="text-xs text-white/50">{game.title} • Point-in-Time Snapshots & Safety Rollbacks</p>
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

        {/* Save Location Detection Bar */}
        <div className="px-6 py-3 bg-white/[0.02] border-b border-white/10 flex items-center justify-between text-xs text-white/70">
          <div className="flex items-center gap-2 min-w-0">
            <HardDrive className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-white/40">Active Save Path:</span>
            <span className="font-mono text-[11px] text-white/90 truncate max-w-md">
              {activeSaveLocation ? activeSaveLocation.path : 'Auto-scan locating game save directory...'}
            </span>
          </div>
          {activeSaveLocation ? (
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              DETECTED
            </span>
          ) : (
            <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1 flex-shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
              NOT FOUND
            </span>
          )}
        </div>

        {/* Snapshot Creator Bar */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            placeholder="Add note (e.g., 'Before Final Boss', 'Chapter 5 start')..."
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateSnapshot()}
            className="flex-1 w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400 transition-all font-sans"
          />
          <button
            onClick={handleCreateSnapshot}
            disabled={creating}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg cursor-pointer flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{creating ? 'Archiving...' : 'Create Snapshot'}</span>
          </button>
        </div>

        {/* Historical Snapshot Timeline */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
          {loading ? (
            <div className="py-16 text-center text-white/40 text-sm">Scanning Vault archive...</div>
          ) : snapshots.length === 0 ? (
            <div className="py-16 text-center text-white/50 space-y-2">
              <ShieldCheck className="w-12 h-12 text-white/20 mx-auto" />
              <p className="font-semibold text-white/70">No save snapshots found yet</p>
              <p className="text-xs text-white/40">Create a snapshot above to safeguard your game progress against corruption.</p>
            </div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-4 group"
              >
                <div className="min-w-0 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white truncate">{snap.note || 'Save Snapshot'}</h4>
                      {snap.isAutoBackup && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          AUTO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-white/40 mt-1 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-white/30" />
                        {new Date(snap.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span>•</span>
                      <span>{snap.fileCount} files</span>
                      <span>•</span>
                      <span>{formatSize(snap.sizeBytes)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    audioEngine.playHover();
                    setSelectedSnapshot(snap);
                    setShowRestoreConfirm(true);
                  }}
                  className="px-4 py-2 rounded-xl glass-pill hover:bg-emerald-500 hover:text-black font-bold text-xs flex items-center gap-1.5 text-white/80 transition-all cursor-pointer flex-shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Restore Confirmation Dialog */}
        {showRestoreConfirm && selectedSnapshot && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 z-30 animate-fadeIn">
            <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-900 border border-rose-500/40 shadow-2xl text-center space-y-4 animate-modalIn">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Restore Save Point?</h3>
                <p className="text-xs text-white/60 mt-1">
                  This will rollback your active game save to the snapshot from{' '}
                  <strong className="text-white font-mono">{new Date(selectedSnapshot.timestamp).toLocaleString()}</strong>.
                </p>
                <p className="text-[11px] text-emerald-400/90 mt-2 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 font-mono">
                  ✓ Safety note: Astra will automatically archive your current save before restoring.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowRestoreConfirm(false)}
                  className="px-4 py-2.5 rounded-xl glass-pill text-xs font-semibold text-white/70 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestoreSnapshot}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-all cursor-pointer shadow-lg"
                >
                  Confirm & Restore
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
