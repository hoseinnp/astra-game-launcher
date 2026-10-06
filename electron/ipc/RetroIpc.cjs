/**
 * RetroIpc.cjs
 *
 * Electron IPC Handlers for Retro Gaming Hub & Emulation Center (CommonJS).
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { dialog } = require('electron');

const ROM_EXTENSIONS = {
  '.nes': 'nes',
  '.snes': 'snes',
  '.sfc': 'snes',
  '.smc': 'snes',
  '.gb': 'gb',
  '.gbc': 'gb',
  '.gba': 'gba',
  '.z64': 'n64',
  '.n64': 'n64',
  '.v64': 'n64',
  '.cue': 'ps1',
  '.iso': 'ps1',
  '.bin': 'ps1',
  '.chd': 'ps1',
  '.gen': 'genesis',
  '.md': 'genesis',
  '.smd': 'genesis',
  '.zip': 'arcade',
  '.7z': 'arcade'
};

const EMULATOR_DEFINITIONS = [
  // NES / SNES
  {
    id: 'mesen',
    name: 'Mesen',
    systems: ['nes', 'snes', 'gb', 'gba'],
    defaultArgs: '--fullscreen',
    exeNames: ['Mesen.exe', 'Mesen-X.exe'],
    relPaths: [
      'Mesen\\Mesen.exe',
      'Mesen-X\\Mesen-X.exe',
      'Emulators\\Mesen\\Mesen.exe'
    ]
  },
  {
    id: 'fceux',
    name: 'FCEUX',
    systems: ['nes'],
    defaultArgs: '',
    exeNames: ['fceux.exe', 'fceux64.exe'],
    relPaths: [
      'fceux\\fceux.exe',
      'fceux\\fceux64.exe',
      'FCEUX\\fceux.exe'
    ]
  },
  {
    id: 'bsnes',
    name: 'bsnes',
    systems: ['snes', 'gb', 'gba'],
    defaultArgs: '--fullscreen',
    exeNames: ['bsnes.exe', 'bsnes-hd.exe'],
    relPaths: [
      'bsnes\\bsnes.exe',
      'bsnes-hd\\bsnes-hd.exe',
      'Emulators\\bsnes\\bsnes.exe'
    ]
  },
  // GameBoy / GBA
  {
    id: 'gambatte',
    name: 'Gambatte',
    systems: ['gb'],
    defaultArgs: '',
    exeNames: ['gambatte_speedlink.exe', 'gambatte_qt.exe'],
    relPaths: [
      'gambatte\\gambatte_qt.exe',
      'gambatte\\gambatte_speedlink.exe'
    ]
  },
  {
    id: 'vba',
    name: 'VisualBoyAdvance',
    systems: ['gb', 'gba'],
    defaultArgs: '-f',
    exeNames: ['VisualBoyAdvance.exe', 'visualboyadvance-m.exe', 'vbam.exe'],
    relPaths: [
      'VisualBoyAdvance\\VisualBoyAdvance.exe',
      'vbam\\visualboyadvance-m.exe',
      'visualboyadvance-m\\visualboyadvance-m.exe'
    ]
  },
  // N64
  {
    id: 'project64',
    name: 'Project64',
    systems: ['n64'],
    defaultArgs: '',
    exeNames: ['Project64.exe'],
    relPaths: [
      'Project64\\Project64.exe',
      'Project64 3.0\\Project64.exe',
      'Project64 2.3\\Project64.exe'
    ]
  },
  {
    id: 'mupen64plus',
    name: 'Mupen64Plus',
    systems: ['n64'],
    defaultArgs: '--fullscreen',
    exeNames: ['mupen64plus-ui-python.exe', 'mupen64plus.exe'],
    relPaths: [
      'mupen64plus\\mupen64plus-ui-python.exe',
      'mupen64plus\\mupen64plus.exe'
    ]
  },
  // PlayStation 1
  {
    id: 'duckstation',
    name: 'DuckStation',
    systems: ['ps1'],
    defaultArgs: '-fullscreen',
    exeNames: ['duckstation-qt-x64-ReleaseLTCG.exe', 'duckstation-nogui-x64-ReleaseLTCG.exe', 'duckstation.exe'],
    relPaths: [
      'DuckStation\\duckstation-qt-x64-ReleaseLTCG.exe',
      'DuckStation\\duckstation.exe'
    ]
  },
  {
    id: 'pcsx2',
    name: 'PCSX2',
    systems: ['ps1'],
    defaultArgs: '--fullscreen --nogui',
    exeNames: ['pcsx2-qt.exe', 'pcsx2.exe'],
    relPaths: [
      'PCSX2\\pcsx2-qt.exe',
      'PCSX2\\pcsx2.exe'
    ]
  },
  // Arcade
  {
    id: 'mame',
    name: 'MAME',
    systems: ['arcade'],
    defaultArgs: '',
    exeNames: ['mame.exe', 'mame64.exe'],
    relPaths: [
      'mame\\mame.exe',
      'mame\\mame64.exe',
      'MAME\\mame64.exe'
    ]
  },
  {
    id: 'fbneo',
    name: 'FinalBurn Neo',
    systems: ['arcade'],
    defaultArgs: '',
    exeNames: ['fbneo.exe', 'fbneo64.exe'],
    relPaths: [
      'FinalBurn Neo\\fbneo.exe',
      'fbneo\\fbneo64.exe',
      'fbneo\\fbneo.exe'
    ]
  },
  // Genesis
  {
    id: 'gens',
    name: 'Gens',
    systems: ['genesis'],
    defaultArgs: '',
    exeNames: ['gens.exe', 'Gens.exe'],
    relPaths: [
      'Gens\\gens.exe',
      'gens\\gens.exe'
    ]
  },
  {
    id: 'blastem',
    name: 'BlastEm',
    systems: ['genesis'],
    defaultArgs: '-f',
    exeNames: ['blastem.exe'],
    relPaths: [
      'blastem\\blastem.exe',
      'BlastEm\\blastem.exe'
    ]
  },
  // Multi-System Fallback
  {
    id: 'retroarch',
    name: 'RetroArch',
    systems: ['nes', 'snes', 'gb', 'gba', 'n64', 'ps1', 'genesis', 'arcade'],
    defaultArgs: '-f',
    exeNames: ['retroarch.exe'],
    relPaths: [
      'RetroArch-Win64\\retroarch.exe',
      'RetroArch\\retroarch.exe'
    ]
  }
];

function extractYearFromFilename(filename) {
  const match = filename.match(/\((19\d\d|20\d\d)\)/);
  if (match) {
    const yr = parseInt(match[1], 10);
    if (yr >= 1970 && yr <= 2030) return yr;
  }
  return undefined;
}

function extractYearFromHeader(filePath, ext) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(512);
    fs.readSync(fd, buffer, 0, 512, 0);
    fs.closeSync(fd);

    if (ext === '.gb' || ext === '.gbc') {
      const s = buffer.toString('ascii', 0x134, 0x143);
      if (s) {
        const yrMatch = s.match(/(19\d\d|20\d\d)/);
        if (yrMatch) return parseInt(yrMatch[1], 10);
      }
    }
  } catch {}
  return undefined;
}

function cleanRomTitle(rawBasename) {
  return rawBasename
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findEmulatorPaths() {
  const home = os.homedir();
  const searchRoots = [
    process.env['ProgramFiles'] || 'C:\\Program Files',
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
    process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'),
    process.env.APPDATA || path.join(home, 'AppData', 'Roaming'),
    path.join(home, 'Emulators'),
    'C:\\Emulators',
    'D:\\Emulators'
  ];

  const results = [];

  for (const def of EMULATOR_DEFINITIONS) {
    let installedPath = '';

    for (const root of searchRoots) {
      if (!fs.existsSync(root)) continue;

      for (const rel of def.relPaths) {
        const full = path.join(root, rel);
        if (fs.existsSync(full)) {
          installedPath = full;
          break;
        }
      }
      if (installedPath) break;

      for (const exe of def.exeNames) {
        const candidate = path.join(root, def.name, exe);
        if (fs.existsSync(candidate)) {
          installedPath = candidate;
          break;
        }
        const candidateDirect = path.join(root, exe);
        if (fs.existsSync(candidateDirect)) {
          installedPath = candidateDirect;
          break;
        }
      }
      if (installedPath) break;
    }

    results.push({
      id: def.id,
      name: def.name,
      executablePath: installedPath,
      systems: def.systems,
      defaultArgs: def.defaultArgs,
      installed: Boolean(installedPath)
    });
  }

  return results;
}

function registerRetroIpc(ipcMain, app, mainWindow, runningGames) {
  ipcMain.handle('retro:detect-emulators', async () => {
    return findEmulatorPaths();
  });

  ipcMain.handle('retro:scan-roms', async (event, folderPaths) => {
    const folders = Array.isArray(folderPaths) ? folderPaths : [folderPaths];
    const roms = [];
    let scannedFilesCount = 0;
    const MAX_FILES = 10000;

    for (const dir of folders) {
      if (!dir || !fs.existsSync(dir)) continue;

      function walk(currentDir, depth) {
        if (depth > 6 || scannedFilesCount >= MAX_FILES) return;
        try {
          const entries = fs.readdirSync(currentDir, { withFileTypes: true });
          for (const entry of entries) {
            scannedFilesCount++;
            const full = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
              walk(full, depth + 1);
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name).toLowerCase();
              const system = ROM_EXTENSIONS[ext];
              if (system) {
                const stat = fs.statSync(full);
                const rawBase = path.basename(entry.name, ext);
                const title = cleanRomTitle(rawBase) || entry.name;
                const yearFromFn = extractYearFromFilename(entry.name);
                const year = yearFromFn || extractYearFromHeader(full, ext);

                roms.push({
                  id: `rom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  title,
                  romPath: full,
                  system,
                  releaseYear: year,
                  fileSizeBytes: stat.size,
                  extension: ext,
                  folderPath: dir
                });
              }
            }

            if (scannedFilesCount % 50 === 0 && mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('retro:scan-progress', {
                scannedFiles: scannedFilesCount,
                foundRoms: roms.length,
                currentFolder: currentDir
              });
            }
          }
        } catch {}
      }

      walk(dir, 0);
    }

    return roms;
  });

  ipcMain.handle('retro:launch-game', async (_event, { emulatorPath, romPath, args = '' }) => {
    if (!emulatorPath || !fs.existsSync(emulatorPath)) {
      return { success: false, error: 'Emulator executable not found on disk.' };
    }
    if (!romPath || !fs.existsSync(romPath)) {
      return { success: false, error: 'ROM file not found on disk.' };
    }

    try {
      const workingDir = path.dirname(emulatorPath);
      const splitArgs = args ? args.trim().split(/\s+/) : [];
      const launchArgs = [...splitArgs, romPath];

      const child = spawn(emulatorPath, launchArgs, {
        cwd: workingDir,
        detached: true,
        stdio: 'ignore'
      });

      const startTime = Date.now();
      const retroGameId = `retro_${path.basename(romPath, path.extname(romPath))}`;

      if (child.pid) {
        if (runningGames) {
          runningGames.set(retroGameId, { pid: child.pid, startTime });
        }

        child.on('close', () => {
          if (runningGames) runningGames.delete(retroGameId);
          const elapsedMs = Date.now() - startTime;
          const minutes = Math.max(1, Math.round(elapsedMs / 60000));
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('game:session-ended', {
              gameId: retroGameId,
              durationMinutes: minutes,
              endedAt: new Date().toISOString()
            });
          }
        });

        child.unref();
        return { success: true, pid: child.pid, gameId: retroGameId };
      }

      return { success: true };
    } catch (err) {
      console.error('[RetroIpc] Launch error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('retro:list-save-states', async (_event, romPath) => {
    if (!romPath) return [];
    try {
      const dir = path.dirname(romPath);
      const base = path.basename(romPath, path.extname(romPath));
      const entries = await fsp.readdir(dir);

      const states = [];
      const statePatterns = [
        new RegExp(`^${escapeRegex(base)}\\.(state|st[0-9]|sav|srm|ss[0-9]|fs)$`, 'i'),
        new RegExp(`^${escapeRegex(base)}_slot_?([0-9]+)`, 'i')
      ];

      for (const entry of entries) {
        const isMatch = statePatterns.some((pattern) => pattern.test(entry));
        if (isMatch) {
          const fullPath = path.join(dir, entry);
          const stat = await fsp.stat(fullPath);
          states.push({
            id: `state_${entry}`,
            romId: base,
            romPath,
            statePath: fullPath,
            timestamp: stat.mtime.toISOString(),
            fileSizeBytes: stat.size
          });
        }
      }

      return states;
    } catch (err) {
      console.warn('[RetroIpc] Error listing save states:', err);
      return [];
    }
  });

  ipcMain.handle('retro:backup-save-state', async (_event, { statePath, backupFolder }) => {
    if (!statePath || !fs.existsSync(statePath)) {
      return { success: false, error: 'Save state file does not exist.' };
    }

    try {
      const targetDir = backupFolder || path.join(app.getPath('userData'), 'retro_save_states');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filename = path.basename(statePath);
      const dest = path.join(targetDir, `${Date.now()}_${filename}`);
      await fsp.copyFile(statePath, dest);
      return { success: true, backupPath: dest };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('retro:restore-save-state', async (_event, { backupPath, targetStatePath }) => {
    if (!backupPath || !fs.existsSync(backupPath)) {
      return { success: false, error: 'Backup save state file not found.' };
    }
    try {
      await fsp.copyFile(backupPath, targetStatePath);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('retro:pick-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select ROM Directory'
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('retro:pick-emulator-exe', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Select Emulator Executable',
      filters: [{ name: 'Executables', extensions: ['exe'] }]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  registerRetroIpc,
  findEmulatorPaths,
  ROM_EXTENSIONS,
  EMULATOR_DEFINITIONS
};
