/**
 * SaveVaultIpc.ts / SaveVaultIpc.cjs
 *
 * Electron IPC Handlers for Save Game Vault & Auto-Backup
 * Supports scanning %APPDATA%, Documents/My Games, and Saved Games,
 * zipped archive creation via archiver with compression and active lock detection,
 * 5-minute timeout protection for huge save directories (Promise.race),
 * zip integrity verification before restoration,
 * safe snapshot rollbacks, retention enforcement (auto-deleting beyond keep count),
 * and progress event dispatching.
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const archiver = require('archiver');
const { shell, dialog } = require('electron');

// Track active locks to avoid corruption during backups or restores
const activeLocks = new Set();

function isLocked(gameId) {
  return activeLocks.has(String(gameId));
}

function lockVault(gameId) {
  activeLocks.add(String(gameId));
}

function unlockVault(gameId) {
  activeLocks.delete(String(gameId));
}

function getSafeGameId(gameId) {
  return String(gameId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getDefaultVaultRoot(app) {
  return path.join(app.getPath('userData'), 'save_vault');
}

function getVaultDir(app, gameId, customStorageLocation) {
  const root = customStorageLocation && fs.existsSync(customStorageLocation)
    ? customStorageLocation
    : getDefaultVaultRoot(app);
  const dir = path.join(root, getSafeGameId(gameId));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getMetadataFilePath(vaultDir) {
  return path.join(vaultDir, 'backups.json');
}

async function loadMetadata(vaultDir) {
  const metaPath = getMetadataFilePath(vaultDir);
  try {
    if (fs.existsSync(metaPath)) {
      const data = await fsp.readFile(metaPath, 'utf-8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.error('[SaveVaultIpc] Error reading backups.json:', err);
  }
  return [];
}

async function saveMetadata(vaultDir, backups) {
  const metaPath = getMetadataFilePath(vaultDir);
  await fsp.writeFile(metaPath, JSON.stringify(backups, null, 2), 'utf-8');
}

/**
 * Auto-detect save folders in %APPDATA%, Documents/My Games, Saved Games, etc.
 */
function scanSaveDirectories(gameTitle) {
  const home = os.homedir();
  const cleanTitle = (gameTitle || '').trim();
  const lowerTitle = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
  const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');

  const candidates = [
    { source: 'saved_games', path: path.join(home, 'Saved Games', cleanTitle) },
    { source: 'documents', path: path.join(home, 'Documents', 'My Games', cleanTitle) },
    { source: 'documents', path: path.join(home, 'Documents', cleanTitle) },
    { source: 'appdata', path: path.join(localAppData, cleanTitle, 'Saved') },
    { source: 'appdata', path: path.join(localAppData, cleanTitle) },
    { source: 'appdata', path: path.join(appData, cleanTitle) },
    { source: 'appdata', path: path.join(home, 'AppData', 'LocalLow', cleanTitle) }
  ];

  const scanRoots = [
    { source: 'documents', dir: path.join(home, 'Documents', 'My Games') },
    { source: 'documents', dir: path.join(home, 'Documents') },
    { source: 'saved_games', dir: path.join(home, 'Saved Games') },
    { source: 'appdata', dir: localAppData },
    { source: 'appdata', dir: appData },
    { source: 'appdata', dir: path.join(home, 'AppData', 'LocalLow') }
  ];

  if (lowerTitle.length >= 3) {
    for (const root of scanRoots) {
      if (fs.existsSync(root.dir)) {
        try {
          const subdirs = fs.readdirSync(root.dir, { withFileTypes: true });
          for (const sub of subdirs) {
            if (sub.isDirectory() && !sub.name.startsWith('.')) {
              const fullSub = path.join(root.dir, sub.name);
              const cleanSubName = sub.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (cleanSubName.includes(lowerTitle) || lowerTitle.includes(cleanSubName)) {
                candidates.push({ source: root.source, path: fullSub });
              } else {
                try {
                  const nested = fs.readdirSync(fullSub, { withFileTypes: true });
                  for (const n of nested) {
                    if (n.isDirectory() && !n.name.startsWith('.')) {
                      const cleanNest = n.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                      if (cleanNest.includes(lowerTitle) || lowerTitle.includes(cleanNest)) {
                        candidates.push({ source: root.source, path: path.join(fullSub, n.name) });
                      }
                    }
                  }
                } catch {}
              }
            }
          }
        } catch {}
      }
    }
  }

  const seenPaths = new Set();
  const results = [];
  for (const loc of candidates) {
    const norm = loc.path.toLowerCase();
    if (seenPaths.has(norm)) continue;
    seenPaths.add(norm);

    const exists = fs.existsSync(loc.path);
    let lastModified = undefined;
    let fileCount = 0;
    let sizeBytes = 0;

    if (exists) {
      try {
        const stat = fs.statSync(loc.path);
        lastModified = stat.mtime.toISOString();
        if (stat.isDirectory()) {
          const countAndSize = calculateDirStats(loc.path);
          fileCount = countAndSize.fileCount;
          sizeBytes = countAndSize.sizeBytes;
        } else {
          fileCount = 1;
          sizeBytes = stat.size;
        }
      } catch {}
    }

    results.push({
      path: loc.path,
      source: loc.source,
      exists,
      lastModified,
      fileCount,
      sizeBytes
    });
  }

  return results;
}

function calculateDirStats(dirPath) {
  let fileCount = 0;
  let sizeBytes = 0;
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        const sub = calculateDirStats(full);
        fileCount += sub.fileCount;
        sizeBytes += sub.sizeBytes;
      } else {
        fileCount++;
        try {
          sizeBytes += fs.statSync(full).size;
        } catch {}
      }
    }
  } catch {}
  return { fileCount, sizeBytes };
}

function createZipArchive(options) {
  if (typeof archiver === 'function') {
    return archiver('zip', options);
  }
  if (archiver && archiver.ZipArchive) {
    return new archiver.ZipArchive(options);
  }
  throw new Error('Archiver library could not be initialized');
}

/**
 * Create a compressed .zip file from save directory using archiver library
 */
function zipDirectory(sourceDir, outZipPath, onProgress) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outZipPath);
    const archive = createZipArchive({
      zlib: { level: 9 } // Maximum compression
    });

    let finished = false;

    output.on('close', () => {
      if (!finished) {
        finished = true;
        resolve({
          size: archive.pointer(),
          filePath: outZipPath
        });
      }
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('[SaveVaultIpc] Archiver warning:', err);
      } else {
        if (!finished) {
          finished = true;
          reject(err);
        }
      }
    });

    archive.on('error', (err) => {
      if (!finished) {
        finished = true;
        reject(err);
      }
    });

    output.on('error', (err) => {
      if (!finished) {
        finished = true;
        reject(err);
      }
    });

    if (typeof onProgress === 'function') {
      archive.on('progress', (data) => {
        const percent = data.entries.total > 0
          ? Math.min(100, Math.round((data.entries.processed / data.entries.total) * 100))
          : 50;
        onProgress(percent);
      });
    }

    archive.pipe(output);

    const stat = fs.statSync(sourceDir);
    if (stat.isDirectory()) {
      archive.directory(sourceDir, false);
    } else {
      archive.file(sourceDir, { name: path.basename(sourceDir) });
    }

    archive.finalize();
  });
}

/**
 * Verify zip file integrity before attempting restore
 * - Check that file exists on disk
 * - Check that file size > 0
 * - Check that the zip archive isn't corrupted and contains at least 1 file
 */
function verifyZipIntegrity(zipPath) {
  return new Promise((resolve, reject) => {
    if (!zipPath || !fs.existsSync(zipPath)) {
      return reject(new Error('Zip file not found on disk.'));
    }

    try {
      const stat = fs.statSync(zipPath);
      if (stat.size === 0) {
        return reject(new Error('Zip file is empty (0 bytes).'));
      }
    } catch (statErr) {
      return reject(new Error(`Unable to read zip file stats: ${statErr.message}`));
    }

    const { execFile } = require('child_process');
    // Execute tar -tf to list entries and verify headers
    execFile('tar', ['-tf', zipPath], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        // Fallback to powershell ZipFile check if tar returned non-zero
        const escaped = zipPath.replace(/'/g, "''");
        const psCmd = `Add-Type -AssemblyName System.IO.Compression.FileSystem; $z = [System.IO.Compression.ZipFile]::OpenRead('${escaped}'); $count = $z.Entries.Count; $z.Dispose(); $count`;
        execFile('powershell', ['-NoProfile', '-Command', psCmd], (psErr, psOut) => {
          if (psErr) {
            return reject(new Error(`Zip archive is corrupted or unreadable: ${stderr || err.message}`));
          }
          const count = parseInt(psOut.trim(), 10);
          if (isNaN(count) || count <= 0) {
            return reject(new Error('Zip archive is valid but contains no files.'));
          }
          resolve(true);
        });
        return;
      }

      const files = stdout.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
      if (files.length === 0) {
        return reject(new Error('Zip archive contains no files.'));
      }

      resolve(true);
    });
  });
}

/**
 * Extract .zip archive into target directory
 */
async function unzipArchive(zipPath, targetDir) {
  if (!fs.existsSync(targetDir)) {
    await fsp.mkdir(targetDir, { recursive: true });
  }

  const { execFile } = require('child_process');
  return new Promise((resolve, reject) => {
    // Windows 10+ includes tar.exe natively, which handles zip archives with -xf
    execFile('tar', ['-xf', zipPath, '-C', targetDir], (err) => {
      if (!err) return resolve(true);

      // Fallback to powershell Expand-Archive if tar is unavailable
      const escapedZip = zipPath.replace(/'/g, "''");
      const escapedTarget = targetDir.replace(/'/g, "''");
      const psCmd = `Expand-Archive -LiteralPath '${escapedZip}' -DestinationPath '${escapedTarget}' -Force`;
      execFile('powershell', ['-NoProfile', '-Command', psCmd], (psErr) => {
        if (psErr) {
          reject(new Error(`Failed to extract archive: ${psErr.message}`));
        } else {
          resolve(true);
        }
      });
    });
  });
}

function copyDirRecursiveSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      count += copyDirRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }
  return count;
}

/**
 * Core Backup Implementation with 5-minute timeout protection
 */
async function executeCreateBackup(app, { gameId, gameTitle, savePath, notes, gameVersion, isAuto, retentionCount = 5, customStorage, onProgress, timeoutMs = 300000 }) {
  const strGameId = String(gameId);
  if (isLocked(strGameId)) {
    return { success: false, error: 'A backup or restore operation is already in progress for this game.' };
  }

  lockVault(strGameId);
  try {
    let targetSavePath = savePath;
    if (!targetSavePath) {
      const locations = scanSaveDirectories(gameTitle);
      const active = locations.find(l => l.exists);
      if (active) targetSavePath = active.path;
    }

    if (!targetSavePath || !fs.existsSync(targetSavePath)) {
      return { success: false, error: `No active save files found for "${gameTitle}".` };
    }

    const vaultDir = getVaultDir(app, gameId, customStorage);
    const timestamp = new Date().toISOString();
    const safeTime = timestamp.replace(/[:.]/g, '-');
    const backupId = `backup_${safeTime}`;
    const zipFileName = `${backupId}.zip`;
    const zipFilePath = path.join(vaultDir, zipFileName);

    if (onProgress) onProgress(10);

    // Archiver timeout protection: 5 minutes (300,000ms) wrapped in Promise.race
    const zipPromise = zipDirectory(targetSavePath, zipFilePath, (p) => {
      if (onProgress) onProgress(10 + Math.round(p * 0.8));
    });

    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error("Backup took too long — save folder may be too large"));
      }, timeoutMs);
    });

    let zipResult;
    try {
      zipResult = await Promise.race([zipPromise, timeoutPromise]);
    } catch (err) {
      // Clean up partially written zip file if it timed out or failed
      if (fs.existsSync(zipFilePath)) {
        try {
          fs.unlinkSync(zipFilePath);
        } catch {}
      }
      throw err;
    } finally {
      clearTimeout(timeoutHandle);
    }

    const stats = calculateDirStats(targetSavePath);

    const metadata = {
      id: backupId,
      timestamp,
      size: zipResult.size,
      filePath: zipFilePath,
      gameVersion: gameVersion || '1.0.0',
      notes: notes || (isAuto ? 'Pre-launch auto-backup' : 'Manual save backup'),
      isAuto: Boolean(isAuto),
      gameTitle,
      fileCount: stats.fileCount
    };

    // Load existing backups, prepend new one, enforce retention (keep last N, default 5)
    const maxKeep = Math.max(1, parseInt(retentionCount, 10) || 5);
    const existing = await loadMetadata(vaultDir);
    existing.unshift(metadata);

    if (existing.length > maxKeep) {
      const toDelete = existing.slice(maxKeep);
      for (const item of toDelete) {
        if (item && item.filePath && fs.existsSync(item.filePath)) {
          try {
            await fsp.unlink(item.filePath);
          } catch (delErr) {
            console.warn('[SaveVaultIpc] Failed to delete pruned backup:', delErr);
          }
        }
      }
      existing.splice(maxKeep);
    }

    await saveMetadata(vaultDir, existing);
    if (onProgress) onProgress(100);

    console.log(`[SaveVaultIpc] Successfully created backup ${backupId} (${(zipResult.size / 1024).toFixed(1)} KB)`);
    return { success: true, backup: metadata };
  } catch (err) {
    console.error('[SaveVaultIpc] create-backup failed:', err);
    return { success: false, error: err.message };
  } finally {
    unlockVault(strGameId);
  }
}

/**
 * Core Restore Implementation with Zip Integrity Verification
 */
async function executeRestoreBackup(app, { gameId, backupId, customStorage }) {
  const strGameId = String(gameId);
  if (isLocked(strGameId)) {
    return { success: false, error: 'A backup or restore operation is already in progress for this game.' };
  }

  lockVault(strGameId);
  try {
    const vaultDir = getVaultDir(app, gameId, customStorage);
    const backups = await loadMetadata(vaultDir);
    const target = backups.find(b => b.id === backupId);

    if (!target) {
      return { success: false, error: 'Backup metadata not found.' };
    }

    if (!fs.existsSync(target.filePath)) {
      return { success: false, error: 'Backup zip file not found on disk.' };
    }

    // 1. Verify zip integrity before attempting restore
    try {
      await verifyZipIntegrity(target.filePath);
    } catch (verifyErr) {
      console.error(`[SaveVaultIpc] Zip integrity verification failed for ${target.filePath}:`, verifyErr.message);
      return {
        success: false,
        error: `Integrity check failed: ${verifyErr.message}. Restoration aborted to protect save files.`
      };
    }

    // Determine restore location
    const locations = scanSaveDirectories(target.gameTitle || '');
    const activeLoc = locations.find(l => l.exists) || locations[0];
    if (!activeLoc) {
      return { success: false, error: 'No destination save directory could be resolved.' };
    }

    // Safety snapshot of current save state before overwriting
    const safetyBackupDir = path.join(vaultDir, `safety_pre_restore_${Date.now()}`);
    if (fs.existsSync(activeLoc.path)) {
      copyDirRecursiveSync(activeLoc.path, safetyBackupDir);
    }

    // Extract verified zip directly to active save folder
    await unzipArchive(target.filePath, activeLoc.path);
    console.log(`[SaveVaultIpc] Restored backup ${backupId} to ${activeLoc.path}`);
    return { success: true, restoredPath: activeLoc.path };
  } catch (err) {
    console.error('[SaveVaultIpc] Restore error:', err);
    return { success: false, error: err.message };
  } finally {
    unlockVault(strGameId);
  }
}

/**
 * Register SaveVault IPC Handlers
 */
function registerSaveVaultIpc(ipcMain, app) {
  // 1. Scan save directories
  ipcMain.handle('savevault:scan-locations', async (_event, gameId, gameTitle) => {
    return scanSaveDirectories(gameTitle);
  });

  // 2. List backups with metadata from backups.json
  ipcMain.handle('savevault:list-backups', async (_event, gameId, customStorage) => {
    try {
      const vaultDir = getVaultDir(app, gameId, customStorage);
      return await loadMetadata(vaultDir);
    } catch (err) {
      console.error('[SaveVaultIpc] List backups error:', err);
      return [];
    }
  });

  // Legacy snapshot list handler
  ipcMain.handle('savevault:list-snapshots', async (_event, gameId) => {
    try {
      const vaultDir = getVaultDir(app, gameId);
      const backups = await loadMetadata(vaultDir);
      return backups.map(b => ({
        id: b.id,
        gameId,
        gameTitle: b.gameTitle || '',
        timestamp: b.timestamp,
        note: b.notes || (b.isAuto ? 'Pre-launch auto snapshot' : 'Save backup'),
        sizeBytes: b.size,
        fileCount: b.fileCount || 1,
        archivePath: b.filePath,
        isAutoBackup: Boolean(b.isAuto)
      }));
    } catch (err) {
      console.error('[SaveVaultIpc] List snapshots error:', err);
      return [];
    }
  });

  // 3. Create zipped backup (with timeout protection)
  ipcMain.handle('savevault:create-backup', async (event, params) => {
    const sendProgress = (p) => {
      try {
        event.sender.send('savevault:progress', { gameId: String(params.gameId), progress: p });
      } catch {}
    };
    return executeCreateBackup(app, { ...params, onProgress: sendProgress });
  });

  // Legacy snapshot create handler
  ipcMain.handle('savevault:create-snapshot', async (event, { gameId, gameTitle, note, isAuto }) => {
    const res = await executeCreateBackup(app, {
      gameId,
      gameTitle,
      notes: note,
      isAuto,
      retentionCount: 5
    });
    if (res.success && res.backup) {
      return {
        success: true,
        snapshot: {
          id: res.backup.id,
          gameId,
          gameTitle,
          timestamp: res.backup.timestamp,
          note: res.backup.notes,
          sizeBytes: res.backup.size,
          fileCount: res.backup.fileCount || 1,
          archivePath: res.backup.filePath,
          isAutoBackup: Boolean(res.backup.isAuto)
        }
      };
    }
    return res;
  });

  // 4. Restore backup from zip (with integrity check)
  ipcMain.handle('savevault:restore-backup', async (_event, params) => {
    return executeRestoreBackup(app, params);
  });

  // Legacy snapshot restore handler
  ipcMain.handle('savevault:restore-snapshot', async (_event, { gameId, snapshotId }) => {
    return executeRestoreBackup(app, { gameId, backupId: snapshotId });
  });

  // 5. Verify zip integrity standalone endpoint
  ipcMain.handle('savevault:verify-zip', async (_event, zipPath) => {
    try {
      await verifyZipIntegrity(zipPath);
      return { success: true, valid: true };
    } catch (err) {
      return { success: false, valid: false, error: err.message };
    }
  });

  // 6. Open vault storage folder
  ipcMain.handle('savevault:open-folder', async (_event, gameId, customStorage) => {
    try {
      const vaultDir = getVaultDir(app, gameId, customStorage);
      await shell.openPath(vaultDir);
      return { success: true, path: vaultDir };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 7. Delete specific backup
  ipcMain.handle('savevault:delete-backup', async (_event, { gameId, backupId, customStorage }) => {
    try {
      const vaultDir = getVaultDir(app, gameId, customStorage);
      const backups = await loadMetadata(vaultDir);
      const item = backups.find(b => b.id === backupId);
      if (item && item.filePath && fs.existsSync(item.filePath)) {
        await fsp.unlink(item.filePath);
      }
      const filtered = backups.filter(b => b.id !== backupId);
      await saveMetadata(vaultDir, filtered);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 8. Pick custom storage folder
  ipcMain.handle('savevault:pick-storage-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Save Vault Storage Location'
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });
}

module.exports = {
  registerSaveVaultIpc,
  scanSaveDirectories,
  executeCreateBackup,
  executeRestoreBackup,
  verifyZipIntegrity,
  zipDirectory,
  unzipArchive
};
