const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execFile, spawnSync } = require('child_process');
const net = require('net');
const { registerSaveVaultIpc } = require('./ipc/SaveVaultIpc.cjs');

let mainWindow = null;
const runningGames = new Map();

// Native zero-dependency Discord Rich Presence client over Windows named pipes
class DiscordIPC {
  constructor(clientId = '1211736183421509652') {
    this.clientId = clientId;
    this.socket = null;
    this.connected = false;
    this.currentActivity = null;
  }

  connect() {
    return new Promise((resolve) => {
      if (this.connected && this.socket) return resolve(true);

      for (let i = 0; i < 10; i++) {
        const pipeName = process.platform === 'win32'
          ? `\\\\?\\pipe\\discord-ipc-${i}`
          : `${process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || process.env.TMP || '/tmp'}/discord-ipc-${i}`;

        try {
          const sock = net.connect(pipeName);
          sock.once('connect', () => {
            this.socket = sock;
            this.connected = true;
            this.send(0, { v: 1, client_id: this.clientId });

            sock.on('data', () => {});
            sock.on('close', () => {
              this.connected = false;
              this.socket = null;
            });
            sock.on('error', () => {
              this.connected = false;
              this.socket = null;
            });

            if (this.currentActivity) {
              this.setActivity(this.currentActivity);
            }
            resolve(true);
          });
          sock.once('error', () => {});
        } catch {}
      }
      setTimeout(() => resolve(this.connected), 400);
    });
  }

  send(op, data) {
    if (!this.socket || !this.connected) return;
    try {
      const json = JSON.stringify(data);
      const len = Buffer.byteLength(json);
      const packet = Buffer.alloc(8 + len);
      packet.writeInt32LE(op, 0);
      packet.writeInt32LE(len, 4);
      packet.write(json, 8, len, 'utf-8');
      this.socket.write(packet);
    } catch {}
  }

  setActivity(activity) {
    this.currentActivity = activity;
    if (!this.connected) {
      this.connect().then((ok) => {
        if (ok) {
          this.send(1, {
            cmd: 'SET_ACTIVITY',
            args: { pid: process.pid, activity },
            nonce: String(Date.now())
          });
        }
      });
      return;
    }
    this.send(1, {
      cmd: 'SET_ACTIVITY',
      args: { pid: process.pid, activity },
      nonce: String(Date.now())
    });
  }

  clearActivity() {
    this.currentActivity = null;
    if (!this.connected) return;
    this.send(1, {
      cmd: 'SET_ACTIVITY',
      args: { pid: process.pid, activity: null },
      nonce: String(Date.now())
    });
  }
}

const discordRpc = new DiscordIPC();

process.on('uncaughtException', (err) => {
  console.error('[Astra Launcher] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Astra Launcher] Unhandled Rejection:', reason);
});

function getDataFilePath() {
  const userData = app.getPath('userData');
  const astraPath = path.join(userData, 'astra_library.json');
  const legacyNexusPath = path.join(userData, 'nexus_library.json');
  if (!fs.existsSync(astraPath) && fs.existsSync(legacyNexusPath)) {
    try {
      fs.copyFileSync(legacyNexusPath, astraPath);
    } catch {}
  }
  return astraPath;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1080,
    minHeight: 700,
    frame: false,
    fullscreen: true,
    backgroundColor: '#07090e',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  const distPath = path.join(__dirname, '../dist/index.html');

  if (app.isPackaged) {
    mainWindow.loadFile(distPath);
  } else if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    let hasLoaded = false;
    const safeLoad = (isDevServer) => {
      if (hasLoaded || !mainWindow || mainWindow.isDestroyed()) return;
      hasLoaded = true;
      if (isDevServer) {
        mainWindow.loadURL('http://127.0.0.1:5173');
      } else if (fs.existsSync(distPath)) {
        mainWindow.loadFile(distPath);
      } else {
        mainWindow.loadURL('http://127.0.0.1:5173');
      }
    };

    const http = require('http');
    const req = http.get('http://127.0.0.1:5173', () => {
      safeLoad(true);
    });

    req.setTimeout(400, () => {
      try { req.destroy(); } catch {}
      safeLoad(false);
    });

    req.on('error', () => {
      safeLoad(false);
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Register F12 global screenshot shortcut
  try {
    globalShortcut.register('F12', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('screenshot:trigger-capture');
      }
    });
  } catch (err) {
    console.warn('[Astra] Failed to register F12 global shortcut:', err.message);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch {}
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Window controls
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('window:toggle-fullscreen', () => {
  if (mainWindow) {
    const isFs = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFs);
    return !isFs;
  }
  return false;
});

ipcMain.handle('window:set-fullscreen', (_event, flag) => {
  if (mainWindow) {
    mainWindow.setFullScreen(!!flag);
    return mainWindow.isFullScreen();
  }
  return false;
});

ipcMain.handle('window:is-fullscreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

// Windows Startup / Auto-Launch on Boot
ipcMain.handle('app:get-auto-launch', () => {
  try {
    const s = app.getLoginItemSettings();
    return s.openAtLogin;
  } catch (err) {
    console.warn('Failed to get login item settings:', err);
    return false;
  }
});

ipcMain.handle('app:set-auto-launch', (_event, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: !!enabled,
      path: process.execPath,
      args: app.isPackaged ? [] : [path.resolve(__dirname, '..')]
    });
    const s = app.getLoginItemSettings();
    return { success: true, openAtLogin: s.openAtLogin };
  } catch (err) {
    console.error('Failed to set login item settings:', err);
    return { success: false, error: err.message };
  }
});

// Extract file / product version from Windows executables
function getExeVersion(filePath) {
  return new Promise((resolve) => {
    if (!filePath || !fs.existsSync(filePath)) return resolve(null);
    const escaped = filePath.replace(/'/g, "''");
    const script = `try { $v = (Get-Item -LiteralPath '${escaped}').VersionInfo; $r = if ($v.ProductVersion) { $v.ProductVersion } else { $v.FileVersion }; if ($r) { $r.Trim() } } catch {}`;
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 2500 }, (err, stdout) => {
      let v = stdout ? stdout.trim() : '';
      if (!err && v && v !== '0.0.0.0' && v !== '') {
        return resolve(v.replace(/,\s*/g, '.'));
      }
      resolve(null);
    });
  });
}

ipcMain.handle('game:get-exe-version', async (_event, exePath) => {
  return await getExeVersion(exePath);
});

ipcMain.handle('game:check-version', async (_event, exePath) => {
  if (!exePath || !fs.existsSync(exePath)) {
    return { exists: false, version: null, lastModified: null, fileSizeBytes: 0 };
  }
  try {
    const stats = fs.statSync(exePath);
    const version = await getExeVersion(exePath);
    return {
      exists: true,
      version: version || null,
      lastModified: stats.mtime.toISOString(),
      fileSizeBytes: stats.size
    };
  } catch (err) {
    return { exists: false, version: null, lastModified: null, fileSizeBytes: 0 };
  }
});

// Storage handlers
ipcMain.handle('store:load', async () => {
  try {
    const file = getDataFilePath();
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf-8');
      const data = JSON.parse(raw);
      // Background non-blocking enrichment of versions for saved library games
      if (data && Array.isArray(data.games)) {
        setImmediate(async () => {
          let changed = false;
          for (const g of data.games) {
            if (!g.version && g.executablePath && fs.existsSync(g.executablePath)) {
              const v = await getExeVersion(g.executablePath);
              if (v) {
                g.version = v;
                changed = true;
              }
            }
          }
          if (changed) {
            try {
              fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
            } catch {}
          }
        });
      }
      return data;
    }
  } catch (err) {
    console.error('Error loading library file:', err);
  }
  return null;
});

ipcMain.handle('store:save', async (_event, data) => {
  try {
    const file = getDataFilePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Error saving library file:', err);
    return { success: false, error: err.message };
  }
});

// Steam CDN & Local Media Auto-Downloader
function getMediaDir() {
  const dir = path.join(app.getPath('userData'), 'media');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

async function downloadUrlToFile(url, destPath) {
  try {
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      return destPath;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destPath, buffer);
    return destPath;
  } catch (err) {
    console.warn(`Download failed for ${url}:`, err.message);
    return null;
  }
}

function toFileUrl(filePath) {
  if (!filePath) return '';
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.startsWith('file:///')) return normalized;
  if (normalized.startsWith('file://')) return normalized.replace(/^file:\/\//, 'file:///');
  return `file:///${normalized.replace(/^\/+/, '')}`;
}

ipcMain.handle('media:download-file', async (_event, { url, filename }) => {
  if (!url) return null;
  const mediaDir = getMediaDir();
  const safeName = filename ? filename.replace(/[^a-zA-Z0-9._-]/g, '_') : `file_${Date.now()}`;
  const destPath = path.join(mediaDir, safeName);
  const downloaded = await downloadUrlToFile(url, destPath);
  return downloaded ? toFileUrl(destPath) : null;
});

ipcMain.handle('media:download-steam-assets', async (_event, appId) => {
  if (!appId) return {};
  const mediaDir = getMediaDir();

  const coverUrl = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`;
  const heroUrl = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`;
  const logoUrl = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/logo.png`;

  const coverDest = path.join(mediaDir, `${appId}_cover.jpg`);
  const heroDest = path.join(mediaDir, `${appId}_hero.jpg`);
  const logoDest = path.join(mediaDir, `${appId}_logo.png`);

  const [coverLocal, heroLocal, logoLocal] = await Promise.all([
    downloadUrlToFile(coverUrl, coverDest),
    downloadUrlToFile(heroUrl, heroDest),
    downloadUrlToFile(logoUrl, logoDest)
  ]);

  return {
    coverUrl: coverLocal ? toFileUrl(coverDest) : coverUrl,
    backdropUrl: heroLocal ? toFileUrl(heroDest) : heroUrl,
    logoUrl: logoLocal ? toFileUrl(logoDest) : logoUrl
  };
});

// File dialogs
ipcMain.handle('dialog:pick-exe', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Game Executable or Shortcut',
    properties: ['openFile'],
    filters: [
      { name: 'Executables & Shortcuts', extensions: ['exe', 'bat', 'cmd', 'lnk'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:pick-image', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Cover Art or Banner Image',
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:pick-audio', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Theme Music (OST) Audio File',
    properties: ['openFile'],
    filters: [
      { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:pick-video', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Looping Scene Video (MP4 / WebM)',
    properties: ['openFile'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'webm', 'mkv', 'mov'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:pick-folder', async (_event, options = {}) => {
  if (!mainWindow) return null;
  const properties = ['openDirectory'];
  if (options && options.multi) {
    properties.push('multiSelections');
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Games Directory to Scan',
    properties
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return options && options.multi ? result.filePaths : result.filePaths[0];
});

// Fallback process monitor for elevated, shell-launched, or Steam games
function monitorProcessByName(gameId, processName, startedAt) {
  let isTracking = true;
  let hasSeenProcess = false;
  const checkInterval = setInterval(() => {
    if (!isTracking) return;
    execFile('tasklist.exe', ['/FI', `IMAGENAME eq ${processName}`, '/NH'], { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout) return;
      const isRunning = stdout.toLowerCase().includes(processName.toLowerCase());
      if (isRunning) {
        hasSeenProcess = true;
      } else if (hasSeenProcess) {
        // Game process was active and has now terminated
        isTracking = false;
        clearInterval(checkInterval);
        runningGames.delete(gameId);
        discordRpc.setActivity({
          details: 'Browsing Library',
          state: 'Astra Console',
          assets: { large_image: 'astra_logo', large_text: 'Astra Launcher' }
        });
        const elapsedMs = Date.now() - startedAt;
        const minutes = Math.max(1, Math.round(elapsedMs / 60000));
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('game:session-ended', {
            gameId,
            durationMinutes: minutes,
            endedAt: new Date().toISOString()
          });
        }
      }
    });
  }, 5000);

  // Stop tracking after 24 hours
  setTimeout(() => {
    isTracking = false;
    clearInterval(checkInterval);
  }, 86400000);
}

function getSteamGameInstallDir(rawAppId) {
  const potentialSteamPaths = [
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Steam'),
    'C:\\Program Files\\Steam',
    'D:\\Steam',
    'D:\\Games\\Steam',
    'E:\\Steam',
    'C:\\Steam'
  ];

  let candidateLibs = [];
  for (const sp of potentialSteamPaths) {
    if (fs.existsSync(sp) && !candidateLibs.includes(sp)) candidateLibs.push(sp);
    const vdfPath = path.join(sp, 'steamapps', 'libraryfolders.vdf');
    if (fs.existsSync(vdfPath)) {
      try {
        const vdfContent = fs.readFileSync(vdfPath, 'utf-8');
        const matches = vdfContent.matchAll(/"path"\s+"([^"]+)"/g);
        for (const m of matches) {
          const p = m[1].replace(/\\\\/g, '\\');
          if (fs.existsSync(p) && !candidateLibs.includes(p)) candidateLibs.push(p);
        }
      } catch {}
    }
  }

  for (const lib of candidateLibs) {
    const manifestPath = path.join(lib, 'steamapps', `appmanifest_${rawAppId}.acf`);
    if (fs.existsSync(manifestPath)) {
      try {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        const dirMatch = content.match(/"installdir"\s+"([^"]+)"/i);
        if (dirMatch) {
          const gameDir = path.join(lib, 'steamapps', 'common', dirMatch[1]);
          if (fs.existsSync(gameDir)) {
            return { gameDir, installDirName: dirMatch[1] };
          }
        }
      } catch {}
    }
  }
  return null;
}

function getSteamGameExeName(rawAppId, gameTitle) {
  try {
    const info = getSteamGameInstallDir(rawAppId);
    if (info && fs.existsSync(info.gameDir)) {
      const files = fs.readdirSync(info.gameDir);
      const exes = files.filter((f) => f.toLowerCase().endsWith('.exe') && !f.toLowerCase().includes('crash') && !f.toLowerCase().includes('unitycrash'));
      if (exes.length > 0) {
        const exact = exes.find((e) => e.toLowerCase().includes(info.installDirName.toLowerCase()));
        if (exact) return exact;
        return exes[0];
      }
    }
  } catch {}
  return (gameTitle.replace(/[^a-zA-Z0-9]/g, '') + '.exe').toLowerCase();
}

// Game Launcher & Process Monitor
ipcMain.handle('game:launch', async (_event, game) => {
  try {
    const isProtocolUri = game.executablePath && /^(steam|com\.epicgames\.launcher|uplay|origin|ea):\/\//i.test(game.executablePath);
    const rawArgs = (game.launchArguments || game.args || '').trim();

    if (isProtocolUri) {
      let launchUri = game.executablePath;
      if (rawArgs && /^steam:\/\/run\/\d+/i.test(launchUri) && !launchUri.includes('//')) {
        launchUri = `${launchUri}//${rawArgs}`;
      }
      shell.openExternal(launchUri);
      const startTime = Date.now();
      const platformLabel = game.type === 'steam' ? 'Steam'
        : game.type === 'epic' ? 'Epic Games'
        : game.type === 'ubisoft' ? 'Ubisoft Connect'
        : game.type === 'ea' ? 'EA App'
        : game.type === 'gog' ? 'GOG'
        : 'Launcher';

      discordRpc.setActivity({
        details: game.title,
        state: game.genres && game.genres.length > 0 ? game.genres.slice(0, 2).join(', ') : `Playing on ${platformLabel}`,
        timestamps: { start: Math.floor(startTime / 1000) },
        assets: {
          large_image: 'astra_logo',
          large_text: `Astra Launcher • ${game.version || 'v1.0'}`
        }
      });
      runningGames.set(game.id, { startTime });

      // Track game session via process monitor if possible
      let trackedExe = (game.title.replace(/[^a-zA-Z0-9]/g, '') + '.exe').toLowerCase();
      if (game.executablePath.startsWith('steam://')) {
        const rawAppId = game.executablePath.replace(/^steam:\/\/(run|rungameid)\//i, '').replace(/[/?#].*$/, '');
        trackedExe = getSteamGameExeName(rawAppId, game.title);
      }
      monitorProcessByName(game.id, trackedExe, startTime);

      return { success: true, mode: game.type || 'protocol' };
    }

    if (!fs.existsSync(game.executablePath)) {
      return { success: false, error: 'Executable file not found on disk.' };
    }

    const workingDir = game.workingDirectory && fs.existsSync(game.workingDirectory)
      ? game.workingDirectory
      : path.dirname(game.executablePath);

    // Merge custom launch arguments with compatibility presets
    const rawLaunchArgs = (game.launchArguments || game.args || '').trim();
    let args = rawLaunchArgs ? rawLaunchArgs.split(/\s+/).filter(Boolean) : [];
    if (game.compatibility) {
      const { displayMode, directX, resolution } = game.compatibility;
      if (displayMode === 'fullscreen' && !args.includes('-fullscreen')) args.push('-fullscreen');
      if (displayMode === 'windowed' && !args.includes('-windowed')) args.push('-windowed');
      if (displayMode === 'borderless' && !args.includes('-borderless')) args.push('-borderless');
      if (directX === 'dx11' && !args.includes('-dx11')) args.push('-dx11');
      if (directX === 'dx12' && !args.includes('-dx12')) args.push('-dx12');
      if (directX === 'vulkan' && !args.includes('-vulkan')) args.push('-vulkan');
      if (resolution && !args.some((a) => a.startsWith('-w') || a.startsWith('-width'))) {
        const parts = resolution.split('x');
        if (parts.length === 2) {
          args.push('-w', parts[0].trim(), '-h', parts[1].trim());
        }
      }
    }

    const startTime = Date.now();
    const exeName = path.basename(game.executablePath);

    // Update Discord status
    discordRpc.setActivity({
      details: game.title,
      state: game.genres && game.genres.length > 0 ? game.genres.slice(0, 2).join(', ') : 'Playing on PC',
      timestamps: { start: Math.floor(startTime / 1000) },
      assets: {
        large_image: 'astra_logo',
        large_text: `Astra Launcher • ${game.version || 'v1.0'}`
      }
    });

    // Launch with Windows Shell / Elevation (for admin-protected or UAC games like NFS Heat)
    const launchElevated = () => {
      return new Promise((resolve) => {
        const escapedExe = game.executablePath.replace(/'/g, "''");
        const escapedDir = workingDir.replace(/'/g, "''");
        const escapedArgs = args.map((a) => `'${a.replace(/'/g, "''")}'`).join(',');
        const argsParam = args.length > 0 ? `-ArgumentList @(${escapedArgs})` : '';
        const verbParam = game.compatibility?.runAsAdmin ? '-Verb RunAs' : '';
        const psScript = `Start-Process -FilePath '${escapedExe}' -WorkingDirectory '${escapedDir}' ${argsParam} ${verbParam}`.trim();

        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], { timeout: 6000 }, async (err) => {
          if (err) {
            console.warn('PowerShell launch failed, trying shell.openPath fallback:', err.message);
            await shell.openPath(game.executablePath);
          }
          runningGames.set(game.id, { startTime });
          monitorProcessByName(game.id, exeName, startTime);
          resolve({ success: true, elevated: true });
        });
      });
    };

    // If explicit runAsAdmin flag is checked, launch elevated immediately
    if (game.compatibility?.runAsAdmin) {
      return await launchElevated();
    }

    let child = null;
    let spawnFailed = false;

    try {
      child = spawn(game.executablePath, args, {
        cwd: workingDir,
        detached: true,
        stdio: 'ignore'
      });

      child.on('error', async (err) => {
        console.warn(`Direct spawn failed for ${game.title} (${err.code || err.message}). Escalating to Windows Shell elevation...`);
        spawnFailed = true;
        runningGames.delete(game.id);
        await launchElevated();
      });

      child.unref();

      const pid = child.pid;
      if (pid) {
        runningGames.set(game.id, { pid, startTime });

        child.on('close', () => {
          if (spawnFailed) return;
          const sessionData = runningGames.get(game.id);
          runningGames.delete(game.id);
          discordRpc.setActivity({
            details: 'Browsing Library',
            state: 'Astra Console',
            assets: { large_image: 'astra_logo', large_text: 'Astra Launcher' }
          });
          const elapsedMs = Date.now() - (sessionData ? sessionData.startTime : startTime);
          const minutes = Math.max(1, Math.round(elapsedMs / 60000));
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('game:session-ended', {
              gameId: game.id,
              durationMinutes: minutes,
              endedAt: new Date().toISOString()
            });
          }
        });

        return { success: true, pid };
      } else {
        return await launchElevated();
      }
    } catch (spawnErr) {
      console.warn('Sync spawn error, falling back to elevated launch:', spawnErr.message);
      return await launchElevated();
    }
  } catch (err) {
    console.error('Launch failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('discord:set-activity', async (_event, activity) => {
  try {
    if (!activity) {
      discordRpc.clearActivity();
      return true;
    }
    const normalized = {
      details: activity.details,
      state: activity.state,
      timestamps: activity.timestamps || (activity.startTimestamp ? { start: activity.startTimestamp } : undefined),
      assets: activity.assets || ((activity.largeImageKey || activity.smallImageKey) ? {
        large_image: activity.largeImageKey,
        large_text: activity.largeImageText,
        small_image: activity.smallImageKey,
        small_text: activity.smallImageText
      } : undefined)
    };
    discordRpc.setActivity(normalized);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('discord:clear-activity', async () => {
  try {
    discordRpc.clearActivity();
    return true;
  } catch {
    return false;
  }
});

// Open Game Folder in File Explorer
ipcMain.handle('game:open-folder', async (_event, game) => {
  if (!game) return { success: false, error: 'No game details provided.' };

  // 1. Direct working directory
  if (game.workingDirectory && fs.existsSync(game.workingDirectory)) {
    await shell.openPath(game.workingDirectory);
    return { success: true };
  }

  // 2. Executable path check
  if (game.executablePath && !game.executablePath.startsWith('steam://')) {
    if (fs.existsSync(game.executablePath)) {
      shell.showItemInFolder(game.executablePath);
      return { success: true };
    }
    const parentDir = path.dirname(game.executablePath);
    if (fs.existsSync(parentDir)) {
      await shell.openPath(parentDir);
      return { success: true };
    }
  }

  // 3. Steam game discovery
  if (game.type === 'steam' || (game.executablePath && game.executablePath.startsWith('steam://'))) {
    const rawAppId = game.executablePath
      ? game.executablePath.replace(/^steam:\/\/(run|rungameid)\//i, '').replace(/[/?#].*$/, '')
      : game.id.replace('steam-', '');
    const info = getSteamGameInstallDir(rawAppId);
    if (info && info.gameDir && fs.existsSync(info.gameDir)) {
      await shell.openPath(info.gameDir);
      return { success: true };
    }
  }

  return { success: false, error: 'Game folder not found on disk.' };
});

// Helper to create a Windows .lnk shortcut using shell.writeShortcutLink or PowerShell fallback
function createWindowsShortcut(shortcutPath, details) {
  try {
    if (typeof shell.writeShortcutLink === 'function') {
      const ok = shell.writeShortcutLink(shortcutPath, 'create', {
        target: details.target,
        args: details.args || '',
        cwd: details.cwd || path.dirname(details.target),
        description: details.description || '',
        icon: details.icon || details.target,
        iconIndex: details.iconIndex || 0
      });
      if (ok && fs.existsSync(shortcutPath)) return true;
    }
  } catch (err) {
    console.warn('[Shortcut] shell.writeShortcutLink error, trying PowerShell fallback:', err.message);
  }

  // PowerShell WScript.Shell Fallback
  try {
    const esc = (s) => (s || '').replace(/'/g, "''");
    const target = esc(details.target);
    const args = esc(details.args || '');
    const cwd = esc(details.cwd || path.dirname(details.target));
    const icon = esc(details.icon || details.target);
    const desc = esc(details.description || '');
    const scPath = esc(shortcutPath);

    const psCommand = [
      `$Wsh = New-Object -ComObject WScript.Shell;`,
      `$Sc = $Wsh.CreateShortcut('${scPath}');`,
      `$Sc.TargetPath = '${target}';`,
      `$Sc.Arguments = '${args}';`,
      `$Sc.WorkingDirectory = '${cwd}';`,
      `$Sc.IconLocation = '${icon},0';`,
      `$Sc.Description = '${desc}';`,
      `$Sc.Save();`
    ].join(' ');

    spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCommand], {
      windowsHide: true,
      encoding: 'utf8',
      timeout: 5000
    });

    return fs.existsSync(shortcutPath);
  } catch (psErr) {
    console.error('[Shortcut] PowerShell fallback failed:', psErr.message);
    return false;
  }
}

// Create Desktop Shortcut for Game
ipcMain.handle('game:create-shortcut', async (_event, game) => {
  if (!game || !game.title) {
    return { success: false, error: 'No game details provided.' };
  }

  try {
    const desktopDir = app.getPath('desktop');
    if (!fs.existsSync(desktopDir)) {
      return { success: false, error: 'Desktop folder not found.' };
    }

    const cleanTitle = game.title.replace(/[\\/:*?"<>|]/g, '').trim() || 'Game';

    // 1. Steam Game (.url shortcut)
    if (game.type === 'steam' || (game.executablePath && game.executablePath.startsWith('steam://'))) {
      const rawAppId = game.executablePath
        ? game.executablePath.replace(/^steam:\/\/(run|rungameid)\//i, '').replace(/[/?#].*$/, '')
        : game.id.replace('steam-', '');

      const shortcutPath = path.join(desktopDir, `${cleanTitle}.url`);
      const steamUrl = `steam://run/${rawAppId}`;

      // Check if we can locate an icon for the Steam game
      let iconFile = '';
      try {
        const info = getSteamGameInstallDir(rawAppId);
        if (info && info.gameDir) {
          const files = fs.readdirSync(info.gameDir);
          const exe = files.find((f) => f.toLowerCase().endsWith('.exe'));
          if (exe) iconFile = path.join(info.gameDir, exe);
        }
      } catch {}

      let content = `[InternetShortcut]\r\nURL=${steamUrl}\r\n`;
      if (iconFile) {
        content += `IconIndex=0\r\nIconFile=${iconFile}\r\n`;
      }

      fs.writeFileSync(shortcutPath, content, 'utf8');
      return { success: true, path: shortcutPath };
    }

    // 2. Standalone Executable (.lnk shortcut)
    if (!game.executablePath || !fs.existsSync(game.executablePath)) {
      return { success: false, error: 'Game executable not found on disk.' };
    }

    const shortcutPath = path.join(desktopDir, `${cleanTitle}.lnk`);
    const created = createWindowsShortcut(shortcutPath, {
      target: game.executablePath,
      args: game.launchArguments || game.args || '',
      cwd: game.workingDirectory || path.dirname(game.executablePath),
      description: `Play ${game.title}`,
      icon: game.executablePath
    });

    if (created && fs.existsSync(shortcutPath)) {
      return { success: true, path: shortcutPath };
    } else {
      return { success: false, error: 'Failed to create shortcut file on Desktop.' };
    }
  } catch (err) {
    console.error('[Shortcut] Error creating desktop shortcut:', err);
    return { success: false, error: err.message };
  }
});

// Create Desktop Shortcut for Astra Launcher itself
ipcMain.handle('app:create-shortcut', async () => {
  try {
    const desktopDir = app.getPath('desktop');
    const shortcutPath = path.join(desktopDir, 'Astra Launcher.lnk');
    const target = process.execPath;
    const isPackaged = app.isPackaged;
    const appPath = app.getAppPath();
    const args = isPackaged ? '' : `"${appPath}"`;
    const cwd = isPackaged ? path.dirname(target) : appPath;

    const created = createWindowsShortcut(shortcutPath, {
      target,
      args,
      cwd,
      description: 'Astra Game Launcher',
      icon: target
    });

    if (created && fs.existsSync(shortcutPath)) {
      return { success: true, path: shortcutPath };
    } else {
      return { success: false, error: 'Failed to create Astra Launcher desktop shortcut.' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Standalone Directory Scanner with Smart Game Filtering
ipcMain.handle('scanner:folder', async (_event, rootDir, options = {}) => {
  const smartFilter = options.smartFilter !== false;
  const targetDirs = Array.isArray(rootDir) ? rootDir.filter(Boolean) : [rootDir].filter(Boolean);
  if (targetDirs.length === 0) return [];

  const JUNK_EXE_REGEX = /^(unins\d*|uninstall|installer|setup|update|updater|patch|patcher|crash|crashpad|crashreporter|unitycrashhandler\d*|errorreporter|feedback|telemetry|dxsetup|dxwebsetup|vcredist[^.]*|vc_redist[^.]*|dotnetfx[^.]*|easyanticheat[^.]*|battleye[^.]*|beservice|eac_launcher|activation|register|benchmark|diagnostics|support|repair|config|configuration|settings|option|tool|editor|server|dedicated|helper|cefsubprocess|nw|node|electron)$/i;

  const JUNK_SUBSTR_REGEX = /(unins\d+|uninstall|installer|crashpad|crashreporter|unitycrashhandler|dxwebsetup|vcredist|vc_redist|easyanticheat|battleye|eac_setup)/i;

  const JUNK_FOLDERS = new Set([
    '_commonredist', '__installer', 'support', 'directx', 'redist', 'prerequisites',
    'dotnet', 'installers', 'crashreports', 'docs', 'tools', 'logs', 'thirdparty',
    'node_modules', 'binaries/thirdparty', 'unrealengine'
  ]);

  function findExecutables(dir, depth = 0, maxDepth = 3) {
    if (depth > maxDepth) return [];
    const exes = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const lowerName = entry.name.toLowerCase();

        if (entry.isDirectory()) {
          if (!JUNK_FOLDERS.has(lowerName) && !lowerName.startsWith('.')) {
            exes.push(...findExecutables(fullPath, depth + 1, maxDepth));
          }
        } else if (entry.isFile() && lowerName.endsWith('.exe')) {
          const baseName = lowerName.replace(/\.exe$/, '');
          if (!JUNK_EXE_REGEX.test(baseName) && !JUNK_SUBSTR_REGEX.test(baseName)) {
            try {
              const stat = fs.statSync(fullPath);
              if (stat.size > 200 * 1024) {
                exes.push({
                  path: fullPath,
                  name: entry.name,
                  baseName: path.basename(entry.name, '.exe'),
                  directory: path.dirname(fullPath),
                  size: stat.size,
                  depth
                });
              }
            } catch {}
          }
        }
      }
    } catch {}
    return exes;
  }

  function scoreExecutable(exe, folderName) {
    let score = 0;
    const lowerName = exe.baseName.toLowerCase().replace(/[-_]/g, '');
    const cleanFolder = folderName.toLowerCase().replace(/[-_]/g, '');

    if (lowerName === cleanFolder) score += 150;
    else if (cleanFolder.includes(lowerName) || lowerName.includes(cleanFolder)) score += 100;

    const sizeMB = exe.size / (1024 * 1024);
    score += Math.min(80, Math.floor(sizeMB * 2));

    if (/shipping/i.test(exe.baseName)) score += 40;
    if (/win64|x64/i.test(exe.baseName)) score += 30;
    if (/game|play|client/i.test(exe.baseName)) score += 20;

    if (/launcher|prelauncher|starter|boot/i.test(exe.baseName)) score -= 15;
    score -= exe.depth * 10;

    return score;
  }

  const allResults = [];
  const seenPaths = new Set();

  for (const currentRoot of targetDirs) {
    if (!currentRoot || !fs.existsSync(currentRoot)) continue;

    if (!smartFilter) {
      const all = findExecutables(currentRoot, 0, 3);
      for (const e of all) {
        if (!seenPaths.has(e.path)) {
          seenPaths.add(e.path);
          allResults.push({
            title: e.baseName.replace(/[-_]/g, ' '),
            executablePath: e.path,
            directory: e.directory,
            sizeMB: (e.size / (1024 * 1024)).toFixed(1)
          });
        }
      }
      continue;
    }

    let topEntries = [];
    try {
      topEntries = fs.readdirSync(currentRoot, { withFileTypes: true });
    } catch {
      continue;
    }

    const subDirs = topEntries.filter((e) => e.isDirectory() && !e.name.startsWith('.') && !JUNK_FOLDERS.has(e.name.toLowerCase()));
    let foundInDir = false;

    if (subDirs.length > 0) {
      for (const sub of subDirs) {
        const gameDirPath = path.join(currentRoot, sub.name);
        const candidates = findExecutables(gameDirPath, 0, 3);
        if (candidates.length > 0) {
          candidates.sort((a, b) => scoreExecutable(b, sub.name) - scoreExecutable(a, sub.name));
          const best = candidates[0];
          if (!seenPaths.has(best.path)) {
            seenPaths.add(best.path);
            const version = await getExeVersion(best.path);
            allResults.push({
              title: sub.name.replace(/[-_]/g, ' '),
              executablePath: best.path,
              directory: best.directory,
              sizeMB: (best.size / (1024 * 1024)).toFixed(1),
              version: version || undefined
            });
            foundInDir = true;
          }
        }
      }
    }

    const rootCandidates = findExecutables(currentRoot, 0, 1);
    if (!foundInDir && rootCandidates.length > 0) {
      const folderName = path.basename(currentRoot);
      rootCandidates.sort((a, b) => scoreExecutable(b, folderName) - scoreExecutable(a, folderName));
      const best = rootCandidates[0];
      if (!seenPaths.has(best.path)) {
        seenPaths.add(best.path);
        const version = await getExeVersion(best.path);
        allResults.push({
          title: folderName.replace(/[-_]/g, ' '),
          executablePath: best.path,
          directory: best.directory,
          sizeMB: (best.size / (1024 * 1024)).toFixed(1),
          version: version || undefined
        });
      }
    }
  }

  return allResults;
});

// Steam Auto-Discovery
ipcMain.handle('scanner:steam', async () => {
  const steamGames = [];
  const potentialSteamPaths = [
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Steam'),
    'C:\\Program Files\\Steam',
    'D:\\Steam',
    'D:\\Games\\Steam',
    'E:\\Steam',
    'C:\\Steam'
  ];

  let steamRoot = null;
  for (const p of potentialSteamPaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'steamapps'))) {
      steamRoot = p;
      break;
    }
  }

  if (!steamRoot) return [];

  const libraryFolders = [steamRoot];
  const vdfPath = path.join(steamRoot, 'steamapps', 'libraryfolders.vdf');

  if (fs.existsSync(vdfPath)) {
    try {
      const vdfContent = fs.readFileSync(vdfPath, 'utf-8');
      const pathMatches = vdfContent.matchAll(/"path"\s+"([^"]+)"/g);
      for (const match of pathMatches) {
        let libPath = match[1].replace(/\\\\/g, '\\');
        if (fs.existsSync(libPath) && !libraryFolders.includes(libPath)) {
          libraryFolders.push(libPath);
        }
      }
    } catch (err) {
      console.warn('Could not parse libraryfolders.vdf:', err);
    }
  }

  const seenAppIds = new Set();
  const IGNORED_APPS = new Set(['228980', '228988', '228990', '1070560', '1391110']); // Common redistributables

  for (const lib of libraryFolders) {
    const appsDir = path.join(lib, 'steamapps');
    if (!fs.existsSync(appsDir)) continue;

    try {
      const files = fs.readdirSync(appsDir);
      for (const f of files) {
        if (f.startsWith('appmanifest_') && f.endsWith('.acf')) {
          const manifestContent = fs.readFileSync(path.join(appsDir, f), 'utf-8');
          const appIdMatch = manifestContent.match(/"appid"\s+"(\d+)"/i);
          const nameMatch = manifestContent.match(/"name"\s+"([^"]+)"/i);
          const dirMatch = manifestContent.match(/"installdir"\s+"([^"]+)"/i);

          if (appIdMatch && nameMatch) {
            const appId = appIdMatch[1];
            const title = nameMatch[1];
            const installDir = dirMatch ? path.join(appsDir, 'common', dirMatch[1]) : '';

            if (!seenAppIds.has(appId) && !IGNORED_APPS.has(appId)) {
              seenAppIds.add(appId);
              steamGames.push({
                appId,
                title,
                installDir,
                headerUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`,
                backdropUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`,
                logoUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/logo.png`
              });
            }
          }
        }
      }
    } catch {
      // Continue next folder
    }
  }

  return steamGames;
});

// Windows Registry Query Helper for Native Launcher Detection
function queryWindowsRegistry(regPath) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve('');
    execFile('reg', ['query', regPath, '/s'], { timeout: 6000 }, (err, stdout) => {
      resolve(err ? '' : stdout || '');
    });
  });
}

// Drive letter enumeration (C:\ through Z:\)
function getSystemDrives() {
  const drives = [];
  for (let c = 67; c <= 90; c++) {
    const d = String.fromCharCode(c) + ':\\';
    try {
      if (fs.existsSync(d)) drives.push(d);
    } catch {}
  }
  return drives.length > 0 ? drives : ['C:\\'];
}

// Helper to find prime game executable inside an install directory
function findBestExecutableInDir(dirPath, title = '') {
  if (!dirPath || !fs.existsSync(dirPath)) return null;

  const JUNK_EXE = /^(unins\d*|uninstall|installer|setup|update|updater|patch|patcher|crash|crashpad|crashreporter|unitycrashhandler\d*|errorreporter|feedback|telemetry|dxsetup|vcredist[^.]*|vc_redist[^.]*|easyanticheat[^.]*|battleye[^.]*|beservice|eac_launcher|activation|register|benchmark|support|repair|helper|cefsubprocess|node|electron)$/i;

  const candidates = [];
  function scan(current, depth = 0) {
    if (depth > 2) return;
    try {
      const items = fs.readdirSync(current, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(current, item.name);
        if (item.isDirectory() && !item.name.startsWith('.') && !/(_commonredist|support|directx|redist|prerequisites)/i.test(item.name)) {
          scan(full, depth + 1);
        } else if (item.isFile() && item.name.toLowerCase().endsWith('.exe')) {
          const base = path.basename(item.name, '.exe').toLowerCase();
          if (!JUNK_EXE.test(base)) {
            try {
              const stat = fs.statSync(full);
              if (stat.size > 300 * 1024) {
                candidates.push({ path: full, size: stat.size, base, depth });
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  scan(dirPath, 0);
  if (candidates.length === 0) return null;

  const cleanTitle = (title || path.basename(dirPath)).toLowerCase().replace(/[^a-z0-9]/g, '');
  candidates.sort((a, b) => {
    let scoreA = Math.min(80, Math.floor(a.size / (1024 * 1024)));
    let scoreB = Math.min(80, Math.floor(b.size / (1024 * 1024)));
    if (cleanTitle && a.base.includes(cleanTitle)) scoreA += 100;
    if (cleanTitle && b.base.includes(cleanTitle)) scoreB += 100;
    if (/shipping|win64|game/i.test(a.base)) scoreA += 30;
    if (/shipping|win64|game/i.test(b.base)) scoreB += 30;
    scoreA -= a.depth * 10;
    scoreB -= b.depth * 10;
    return scoreB - scoreA;
  });

  return candidates[0].path;
}

// -----------------------------------------------------------------------------
// EPIC GAMES SCANNER
// -----------------------------------------------------------------------------
async function scanEpicGames() {
  const games = [];
  const progData = process.env.ProgramData || 'C:\\ProgramData';
  const manifestDirs = [
    path.join(progData, 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests'),
    path.join(progData, 'Epic', 'Manifests')
  ];

  for (const mDir of manifestDirs) {
    if (!fs.existsSync(mDir)) continue;
    try {
      const files = fs.readdirSync(mDir);
      for (const file of files) {
        if (!file.endsWith('.item')) continue;
        try {
          const content = JSON.parse(fs.readFileSync(path.join(mDir, file), 'utf-8'));
          if (content.DisplayName && (content.InstallLocation || content.MainGameAppName)) {
            const title = content.DisplayName;
            const installDir = content.InstallLocation || '';
            const appName = content.AppName || content.MainGameAppName || content.CatalogItemId || path.basename(file, '.item');
            let exePath = '';

            if (content.LaunchExecutable && installDir) {
              const fullExe = path.join(installDir, content.LaunchExecutable);
              if (fs.existsSync(fullExe)) {
                exePath = fullExe;
              }
            }

            if (!exePath && installDir && fs.existsSync(installDir)) {
              exePath = findBestExecutableInDir(installDir, title) || '';
            }

            // Epic launcher direct URI fallback
            const launchUri = `com.epicgames.launcher://apps/${encodeURIComponent(appName)}?action=launch&silent=true`;

            games.push({
              platformId: 'epic',
              platformName: 'Epic Games',
              gameId: `epic-${appName}`,
              title,
              executablePath: exePath || launchUri,
              installDir,
              version: content.AppVersionString || undefined
            });
          }
        } catch {}
      }
    } catch {}
  }
  return games;
}

// -----------------------------------------------------------------------------
// GOG GALAXY & STANDALONE GOG SCANNER
// -----------------------------------------------------------------------------
async function scanGogGames() {
  const games = [];
  const regKeys = [
    'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games',
    'HKLM\\SOFTWARE\\GOG.com\\Games'
  ];

  const seenIds = new Set();
  for (const rk of regKeys) {
    const raw = await queryWindowsRegistry(rk);
    if (!raw) continue;

    // Split registry output by subkeys
    const blocks = raw.split(/(?=HKEY_LOCAL_MACHINE\\SOFTWARE\\(?:WOW6432Node\\)?GOG\.com\\Games\\[^\r\n]+)/i);
    for (const block of blocks) {
      const nameMatch = block.match(/gameName\s+REG_SZ\s+([^\r\n]+)/i);
      const pathMatch = block.match(/path\s+REG_SZ\s+([^\r\n]+)/i);
      const exeMatch = block.match(/exe\s+REG_SZ\s+([^\r\n]+)/i);
      const idMatch = block.match(/gameID\s+REG_SZ\s+([^\r\n]+)/i) || block.match(/productID\s+REG_SZ\s+([^\r\n]+)/i);
      const verMatch = block.match(/ver\s+REG_SZ\s+([^\r\n]+)/i);

      if (nameMatch && (pathMatch || exeMatch)) {
        const title = nameMatch[1].trim();
        const installDir = pathMatch ? pathMatch[1].trim() : '';
        const gameId = idMatch ? idMatch[1].trim() : title.replace(/[^a-zA-Z0-9]/g, '');
        if (seenIds.has(gameId)) continue;
        seenIds.add(gameId);

        let exePath = exeMatch ? exeMatch[1].trim() : '';
        if (exePath && !fs.existsSync(exePath) && installDir) {
          exePath = path.join(installDir, path.basename(exePath));
        }
        if (!exePath || !fs.existsSync(exePath)) {
          if (installDir && fs.existsSync(installDir)) {
            exePath = findBestExecutableInDir(installDir, title) || '';
          }
        }

        if (exePath || installDir) {
          games.push({
            platformId: 'gog',
            platformName: 'GOG Galaxy',
            gameId: `gog-${gameId}`,
            title,
            executablePath: exePath || (installDir ? path.join(installDir, title + '.exe') : ''),
            installDir,
            version: verMatch ? verMatch[1].trim() : undefined
          });
        }
      }
    }
  }

  // Registry covers 100% of installed GOG games on Windows natively without native SQLite binary bindings
  return games;
}

// -----------------------------------------------------------------------------
// UBISOFT CONNECT / UPLAY SCANNER
// -----------------------------------------------------------------------------
async function scanUbisoftGames() {
  const games = [];
  const regKeys = [
    'HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs',
    'HKLM\\SOFTWARE\\Ubisoft\\Launcher\\Installs'
  ];

  const seenIds = new Set();
  for (const rk of regKeys) {
    const raw = await queryWindowsRegistry(rk);
    if (!raw) continue;

    const blocks = raw.split(/(?=HKEY_LOCAL_MACHINE\\SOFTWARE\\(?:WOW6432Node\\)?Ubisoft\\Launcher\\Installs\\[^\r\n]+)/i);
    for (const block of blocks) {
      const keyHeaderMatch = block.match(/Installs\\(\d+)/i);
      const installDirMatch = block.match(/InstallDir\s+REG_SZ\s+([^\r\n]+)/i);

      if (keyHeaderMatch && installDirMatch) {
        const ubiAppId = keyHeaderMatch[1].trim();
        let installDir = installDirMatch[1].trim().replace(/\//g, '\\');
        if (installDir.endsWith('\\')) installDir = installDir.slice(0, -1);

        if (seenIds.has(ubiAppId)) continue;
        seenIds.add(ubiAppId);

        let folderTitle = path.basename(installDir).replace(/[-_]/g, ' ');
        if (!folderTitle) folderTitle = `Ubisoft Game ${ubiAppId}`;

        let exePath = '';
        if (fs.existsSync(installDir)) {
          exePath = findBestExecutableInDir(installDir, folderTitle) || '';
        }

        const launchUri = `uplay://launch/${ubiAppId}/0`;

        games.push({
          platformId: 'ubisoft',
          platformName: 'Ubisoft Connect',
          gameId: `ubisoft-${ubiAppId}`,
          title: folderTitle,
          executablePath: exePath || launchUri,
          installDir
        });
      }
    }
  }
  return games;
}

// -----------------------------------------------------------------------------
// EA DESKTOP / ORIGIN SCANNER
// -----------------------------------------------------------------------------
async function scanEaGames() {
  const games = [];
  const regKeys = [
    'HKLM\\SOFTWARE\\WOW6432Node\\EA Games',
    'HKLM\\SOFTWARE\\EA Games',
    'HKLM\\SOFTWARE\\WOW6432Node\\Electronic Arts',
    'HKLM\\SOFTWARE\\Electronic Arts'
  ];

  const seenDirs = new Set();
  for (const rk of regKeys) {
    const raw = await queryWindowsRegistry(rk);
    if (!raw) continue;

    const blocks = raw.split(/(?=HKEY_LOCAL_MACHINE\\SOFTWARE\\(?:WOW6432Node\\)?(?:Electronic Arts|EA Games)\\[^\r\n]+)/i);
    for (const block of blocks) {
      const dirMatch = block.match(/(?:Install Dir|InstallDir|Path)\s+REG_SZ\s+([^\r\n]+)/i);
      const nameMatch = block.match(/(?:DisplayName|Title)\s+REG_SZ\s+([^\r\n]+)/i);
      const headerMatch = block.match(/(?:Electronic Arts|EA Games)\\([^\r\n\\]+)/i);

      if (dirMatch) {
        let installDir = dirMatch[1].trim().replace(/\//g, '\\');
        if (installDir.endsWith('\\')) installDir = installDir.slice(0, -1);

        if (seenDirs.has(installDir.toLowerCase())) continue;
        seenDirs.add(installDir.toLowerCase());

        const title = nameMatch ? nameMatch[1].trim() : (headerMatch ? headerMatch[1].trim() : path.basename(installDir));

        let exePath = '';
        if (fs.existsSync(installDir)) {
          exePath = findBestExecutableInDir(installDir, title) || '';
        }

        games.push({
          platformId: 'ea',
          platformName: 'EA App',
          gameId: `ea-${title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
          title,
          executablePath: exePath || (installDir ? path.join(installDir, title + '.exe') : ''),
          installDir
        });
      }
    }
  }

  // Also check standard EA Desktop / Origin common install paths across all drives
  const systemDrives = getSystemDrives();
  for (const drive of systemDrives) {
    const commonEaPaths = [
      path.join(drive, 'Program Files', 'EA Games'),
      path.join(drive, 'Program Files (x86)', 'Origin Games'),
      path.join(drive, 'EA Games'),
      path.join(drive, 'Origin Games'),
      path.join(drive, 'Games', 'EA Games')
    ];

    for (const eaPath of commonEaPaths) {
      if (!fs.existsSync(eaPath)) continue;
      try {
        const subs = fs.readdirSync(eaPath, { withFileTypes: true });
        for (const sub of subs) {
          if (!sub.isDirectory() || sub.name.startsWith('.')) continue;
          const gameDir = path.join(eaPath, sub.name);
          if (seenDirs.has(gameDir.toLowerCase())) continue;
          seenDirs.add(gameDir.toLowerCase());

          const exe = findBestExecutableInDir(gameDir, sub.name);
          if (exe) {
            games.push({
              platformId: 'ea',
              platformName: 'EA App',
              gameId: `ea-${sub.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
              title: sub.name.replace(/[-_]/g, ' '),
              executablePath: exe,
              installDir: gameDir
            });
          }
        }
      } catch {}
    }
  }

  return games;
}

// -----------------------------------------------------------------------------
// UNIFIED ALL-PLATFORMS SCANNER HANDLER
// -----------------------------------------------------------------------------
ipcMain.handle('scanner:platforms', async (_event, targetPlatform) => {
  const results = [];

  // Helper to run individual platform scanners with safety
  const runSafe = async (fn, name) => {
    try {
      return await fn();
    } catch (err) {
      console.warn(`[PlatformScanner] ${name} scan failed:`, err.message);
      return [];
    }
  };

  if (!targetPlatform || targetPlatform === 'steam') {
    try {
      const potentialSteamPaths = [
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Steam'),
        'C:\\Program Files\\Steam',
        ...getSystemDrives().flatMap((d) => [path.join(d, 'Steam'), path.join(d, 'Games', 'Steam'), path.join(d, 'SteamLibrary')])
      ];

        let steamRoot = null;
        for (const p of potentialSteamPaths) {
          if (fs.existsSync(p) && fs.existsSync(path.join(p, 'steamapps'))) {
            steamRoot = p;
            break;
          }
        }

        if (steamRoot) {
          const libraryFolders = [steamRoot];
          const vdfPath = path.join(steamRoot, 'steamapps', 'libraryfolders.vdf');
          if (fs.existsSync(vdfPath)) {
            try {
              const vdfContent = fs.readFileSync(vdfPath, 'utf-8');
              const pathMatches = vdfContent.matchAll(/"path"\s+"([^"]+)"/g);
              for (const match of pathMatches) {
                let libPath = match[1].replace(/\\\\/g, '\\');
                if (fs.existsSync(libPath) && !libraryFolders.includes(libPath)) {
                  libraryFolders.push(libPath);
                }
              }
            } catch {}
          }

          const seenAppIds = new Set();
          const IGNORED_APPS = new Set(['228980', '228988', '228990', '1070560', '1391110']);
          for (const lib of libraryFolders) {
            const appsDir = path.join(lib, 'steamapps');
            if (!fs.existsSync(appsDir)) continue;
            try {
              const files = fs.readdirSync(appsDir);
              for (const f of files) {
                if (f.startsWith('appmanifest_') && f.endsWith('.acf')) {
                  const manifestContent = fs.readFileSync(path.join(appsDir, f), 'utf-8');
                  const appIdMatch = manifestContent.match(/"appid"\s+"(\d+)"/i);
                  const nameMatch = manifestContent.match(/"name"\s+"([^"]+)"/i);
                  const dirMatch = manifestContent.match(/"installdir"\s+"([^"]+)"/i);

                  if (appIdMatch && nameMatch) {
                    const appId = appIdMatch[1];
                    const title = nameMatch[1];
                    const installDir = dirMatch ? path.join(appsDir, 'common', dirMatch[1]) : '';
                    if (!seenAppIds.has(appId) && !IGNORED_APPS.has(appId)) {
                      seenAppIds.add(appId);
                      results.push({
                        platformId: 'steam',
                        platformName: 'Steam',
                        gameId: `steam-${appId}`,
                        title,
                        executablePath: `steam://run/${appId}`,
                        installDir,
                        headerUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`,
                        backdropUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`,
                        logoUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/logo.png`
                      });
                    }
                  }
                }
              }
            } catch {}
          }
        }
    } catch {}
  }

  if (!targetPlatform || targetPlatform === 'epic') {
    const epic = await runSafe(scanEpicGames, 'Epic');
    results.push(...epic);
  }

  if (!targetPlatform || targetPlatform === 'gog') {
    const gog = await runSafe(scanGogGames, 'GOG');
    results.push(...gog);
  }

  if (!targetPlatform || targetPlatform === 'ubisoft') {
    const ubi = await runSafe(scanUbisoftGames, 'Ubisoft');
    results.push(...ubi);
  }

  if (!targetPlatform || targetPlatform === 'ea') {
    const ea = await runSafe(scanEaGames, 'EA');
    results.push(...ea);
  }

  return results;
});

// =============================================================================
// Offline Live Wallpaper & Media Video Downloader
// =============================================================================
const { Readable } = require('stream');

function getVideoDirectory() {
  const dir = path.join(app.getPath('userData'), 'media', 'videos');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function findYtDlpBinary() {
  const commonPaths = [
    'yt-dlp',
    path.join(process.env.LOCALAPPDATA || '', 'Python', 'pythoncore-3.14-64', 'Scripts', 'yt-dlp.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'Scripts', 'yt-dlp.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'Scripts', 'yt-dlp.exe'),
    path.join(process.env.PROGRAMFILES || '', 'yt-dlp', 'yt-dlp.exe'),
  ];
  for (const p of commonPaths) {
    if (p === 'yt-dlp') continue;
    if (fs.existsSync(p)) return p;
  }
  return 'yt-dlp';
}

function cleanTitleForSearch(title) {
  if (!title) return '';
  return title
    .replace(/\.exe$/i, '')
    .replace(/\b(v\d+(\.\d+)*|repack|edition|definitive|deluxe|remastered|goty|game of the year|standard edition)\b/gi, '')
    .replace(/[[({].*?[\])}]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

ipcMain.handle('media:download-live-wallpaper', async (_event, { title, gameId, quality = '1080p', sceneQuery = '', forceAmbient = false }) => {
  if (!title || !gameId) {
    return { success: false, error: 'Missing title or gameId for live wallpaper download.' };
  }

  const cleanTitle = cleanTitleForSearch(title);
  const videoDir = getVideoDirectory();
  const safeId = gameId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const localPath = path.join(videoDir, `${safeId}.mp4`);
  const ytDlpBin = findYtDlpBinary();

  console.log(`[MultiSourceWallpaper] Starting multi-source live loop resolution for "${cleanTitle}"...`);

  // =========================================================================
  // SOURCE 1: Official Steam Store CDN High-Definition Loops (Fastest & 100% Native)
  // =========================================================================
  if (!forceAmbient) {
    try {
      console.log(`[MultiSourceWallpaper] Source 1: Querying Steam Store Video CDN for "${cleanTitle}"...`);
      const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanTitle)}&l=english&cc=US`;
      const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.items && searchData.items.length > 0) {
          const topItem = searchData.items[0];
          const appId = topItem.id;
          console.log(`[MultiSourceWallpaper] Steam match found: AppID ${appId} ("${topItem.name}")`);

          const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
          const detailsRes = await fetch(detailsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
          if (detailsRes.ok) {
            const detailsData = await detailsRes.json();
            const gameData = detailsData[appId]?.data;
            const movies = gameData?.movies;

            if (movies && movies.length > 0) {
              const targetMovie = movies[0];
              const videoStreamUrl = targetMovie.hls_h264 || targetMovie.dash_h264 || targetMovie.mp4?.max || targetMovie.mp4?.['480'];

              if (videoStreamUrl) {
                console.log(`[MultiSourceWallpaper] Downloading official Steam stream: ${videoStreamUrl}`);
                const args = [
                  videoStreamUrl,
                  '--no-playlist',
                  '--download-sections', '*00:00-00:22',
                  '-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best',
                  '--force-overwrites',
                  '-o', localPath
                ];

                await new Promise((resolve, reject) => {
                  execFile(ytDlpBin, args, { timeout: 35000 }, (err, stdout) => {
                    if (err) return reject(err);
                    resolve(stdout);
                  });
                });

                if (fs.existsSync(localPath) && fs.statSync(localPath).size > 100000) {
                  const stats = fs.statSync(localPath);
                  console.log(`[MultiSourceWallpaper] ✓ Successfully fetched Steam Store live video (${(stats.size / 1024 / 1024).toFixed(1)} MB)!`);
                  return {
                    success: true,
                    localPath,
                    sizeBytes: stats.size,
                    source: 'Steam Store CDN (Official 60fps Loop)'
                  };
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[MultiSourceWallpaper] Source 1 (Steam CDN) failed or skipped:`, err.message);
    }
  }

  // =========================================================================
  // SOURCE 2: GOG Galaxy Official Catalog Video Media
  // =========================================================================
  try {
    console.log(`[MultiSourceWallpaper] Source 2: Querying GOG Galaxy catalog for "${cleanTitle}"...`);
    const gogUrl = `https://embed.gog.com/games/ajax/filtered?mediaType=game&search=${encodeURIComponent(cleanTitle)}`;
    const gogRes = await fetch(gogUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
    if (gogRes.ok) {
      const gogData = await gogRes.json();
      if (gogData.products && gogData.products.length > 0) {
        const product = gogData.products[0];
        if (product.video && product.video.provider === 'youtube' && product.video.id) {
          const ytUrl = `https://www.youtube.com/watch?v=${product.video.id}`;
          console.log(`[MultiSourceWallpaper] Found GOG official showcase video: ${ytUrl}`);
          const args = [
            ytUrl,
            '--no-playlist',
            '--download-sections', '*00:05-00:25',
            '-f', 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/best',
            '--force-overwrites',
            '-o', localPath
          ];

          await new Promise((resolve, reject) => {
            execFile(ytDlpBin, args, { timeout: 35000 }, (err, stdout) => {
              if (err) return reject(err);
              resolve(stdout);
            });
          });

          if (fs.existsSync(localPath) && fs.statSync(localPath).size > 100000) {
            const stats = fs.statSync(localPath);
            return {
              success: true,
              localPath,
              sizeBytes: stats.size,
              source: 'GOG Galaxy Official Media'
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[MultiSourceWallpaper] Source 2 (GOG) failed or skipped:`, err.message);
  }

  // =========================================================================
  // SOURCE 3: Wallpaper Engine & Ambient Scenery Community Vault (yt-dlp)
  // =========================================================================
  console.log(`[MultiSourceWallpaper] Source 3: Querying Wallpaper Engine & Ambient Scene Vault for "${cleanTitle}"...`);
  const candidateQueries = [];

  if (sceneQuery && sceneQuery.trim()) {
    const cleanScene = sceneQuery.trim().replace(/[-_]/g, ' ');
    candidateQueries.push(`${cleanTitle} ${cleanScene} ambient loop wallpaper -trailer -teaser`);
    candidateQueries.push(`${cleanTitle} ${cleanScene} wallpaper engine 60fps loop`);
  }

  // Tier 1: Wallpaper Engine Community 60fps loop
  candidateQueries.push(`${cleanTitle} wallpaper engine 60fps loop -trailer -teaser`);
  // Tier 2: Ambient in-game scenery / idle character loop
  candidateQueries.push(`${cleanTitle} ambient scene loop wallpaper -trailer -teaser -review -ign`);
  // Tier 3: Resting campfire / idle animation / rain landscape loop
  candidateQueries.push(`${cleanTitle} character idle sitting ambient live wallpaper loop`);
  // Tier 4: Title screen looping background
  candidateQueries.push(`${cleanTitle} title screen looping background 60fps`);
  // Tier 5: Scenery landscape loop
  candidateQueries.push(`${cleanTitle} scenery landscape live wallpaper 60fps loop -cutscene`);

  const qualityFilter = quality === '480p'
    ? 'b[height<=480][ext=mp4]/best[height<=480]'
    : 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/best';

  for (const query of candidateQueries) {
    console.log(`[MultiSourceWallpaper] Trying query: "${query}"`);
    const args = [
      `ytsearch1:${query}`,
      '--no-playlist',
      '-f', qualityFilter,
      '--download-sections', '*00:00-00:22',
      '--force-overwrites',
      '-o', localPath
    ];

    try {
      await new Promise((resolve, reject) => {
        execFile(ytDlpBin, args, { timeout: 35000 }, (error, stdout) => {
          if (error) return reject(error);
          resolve(stdout);
        });
      });

      if (fs.existsSync(localPath)) {
        const stats = fs.statSync(localPath);
        if (stats.size > 100000) {
          console.log(`[MultiSourceWallpaper] ✓ Successfully downloaded ambient loop (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
          return {
            success: true,
            localPath,
            sizeBytes: stats.size,
            source: 'Wallpaper Engine / Ambient Scene Vault'
          };
        }
      }
    } catch {
      console.warn(`[MultiSourceWallpaper] Query "${query}" did not yield valid file, trying next candidate...`);
    }
  }

  return {
    success: false,
    error: `Could not find an ambient scene loop for "${title}" across Steam, GOG, or Wallpaper Engine sources. You can also paste any direct video URL or local MP4 path.`
  };
});

ipcMain.handle('media:download-video', async (_event, { url, gameId, title }) => {
  if (!url || !gameId) {
    return { success: false, error: 'Missing required parameters (url or gameId).' };
  }

  try {
    const videoDir = getVideoDirectory();
    const safeId = gameId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const localPath = path.join(videoDir, `${safeId}.mp4`);
    const tempPath = path.join(videoDir, `${safeId}.downloading`);

    console.log(`[MediaDownloader] Downloading live wallpaper for "${title || gameId}" from ${url}...`);
    const res = await fetch(url);
    if (!res.ok) {
      return { success: false, error: `Failed to fetch video (HTTP ${res.status}: ${res.statusText})` };
    }

    const fileStream = fs.createWriteStream(tempPath);
    await new Promise((resolve, reject) => {
      Readable.fromWeb(res.body).pipe(fileStream);
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });

    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
      } catch {}
    }
    fs.renameSync(tempPath, localPath);

    const stats = fs.statSync(localPath);
    console.log(`[MediaDownloader] Successfully saved live wallpaper to ${localPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);

    return {
      success: true,
      localPath,
      sizeBytes: stats.size
    };
  } catch (err) {
    console.error('[MediaDownloader] Download error:', err);
    return { success: false, error: err.message || 'Error downloading video.' };
  }
});

ipcMain.handle('media:get-video-storage', async () => {
  try {
    const videoDir = getVideoDirectory();
    const files = fs.readdirSync(videoDir);
    let totalSizeBytes = 0;
    let count = 0;

    for (const f of files) {
      if (f.endsWith('.mp4') || f.endsWith('.webm')) {
        const filePath = path.join(videoDir, f);
        try {
          const st = fs.statSync(filePath);
          totalSizeBytes += st.size;
          count++;
        } catch {}
      }
    }

    return { totalSizeBytes, count };
  } catch {
    return { totalSizeBytes: 0, count: 0 };
  }
});

ipcMain.handle('media:delete-video', async (_event, gameId) => {
  if (!gameId) return { success: false, error: 'No gameId specified' };
  try {
    const videoDir = getVideoDirectory();
    const safeId = gameId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const localPath = path.join(videoDir, `${safeId}.mp4`);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      return { success: true };
    }
    return { success: false, error: 'File not found on disk' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('media:clear-video-cache', async () => {
  try {
    const videoDir = getVideoDirectory();
    const files = fs.readdirSync(videoDir);
    let freedBytes = 0;

    for (const f of files) {
      const filePath = path.join(videoDir, f);
      try {
        const st = fs.statSync(filePath);
        freedBytes += st.size;
        fs.unlinkSync(filePath);
      } catch {}
    }

    return { success: true, freedBytes };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// HowLongToBeat Integration with Dynamic Session Token Handshake & In-Memory Cache
const hltbCache = new Map();
let hltbSessionToken = null;
let hltbTokenExpiry = 0;

async function getHltbSessionToken() {
  const now = Date.now();
  if (hltbSessionToken && now < hltbTokenExpiry) {
    return hltbSessionToken;
  }
  try {
    const res = await fetch(`https://howlongtobeat.com/api/search/site/init?t=${now}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Referer': 'https://howlongtobeat.com/',
        'Origin': 'https://howlongtobeat.com'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.token) {
        hltbSessionToken = data.token;
        hltbTokenExpiry = now + (30 * 60 * 1000); // 30 minutes cache
        return hltbSessionToken;
      }
    }
  } catch (err) {
    console.warn('[Astra HLTB] Token handshake error:', err.message);
  }
  return null;
}

ipcMain.handle('hltb:fetch', async (_event, title) => {
  if (!title || typeof title !== 'string') return null;
  const cleanTitle = title
    .replace(/\.exe$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b(game of the year edition|goty|deluxe edition|definitive edition|remastered|enhanced edition|anniversary edition|complete edition)\b/gi, '')
    .replace(/[^\w\s:']/gi, '')
    .trim();

  const cacheKey = cleanTitle.toLowerCase();
  if (hltbCache.has(cacheKey)) {
    return hltbCache.get(cacheKey);
  }

  try {
    const token = await getHltbSessionToken();
    if (!token) return null;

    const payload = {
      searchType: 'games',
      searchTerms: cleanTitle.split(/\s+/).filter(Boolean),
      searchPage: 1,
      size: 5,
      searchOptions: {
        games: {
          userId: 0,
          platform: '',
          sortCategory: 'popular',
          rangeCategory: 'main',
          rangeTime: { min: null, max: null },
          gameplay: { perspective: '', flow: '', genre: '' },
          year: '',
          modifier: ''
        },
        users: { sortCategory: 'postcount' },
        lists: { sortCategory: 'follows' },
        filter: '',
        sort: 0,
        randomizer: 0
      },
      useCache: true
    };

    const res = await fetch('https://howlongtobeat.com/api/search/site', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Referer': 'https://howlongtobeat.com/',
        'Origin': 'https://howlongtobeat.com'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      if (res.status === 403 || res.status === 401) {
        hltbSessionToken = null;
        hltbTokenExpiry = 0;
      }
      return null;
    }

    const data = await res.json();
    if (data && Array.isArray(data.data) && data.data.length > 0) {
      const top = data.data[0];
      const stats = {
        gameId: top.game_id,
        gameName: top.game_name,
        mainStoryHours: Math.round(((top.comp_main || 0) / 3600) * 10) / 10,
        mainExtraHours: Math.round(((top.comp_plus || 0) / 3600) * 10) / 10,
        completionistHours: Math.round(((top.comp_100 || 0) / 3600) * 10) / 10,
        allStylesHours: Math.round(((top.comp_all || 0) / 3600) * 10) / 10
      };
      hltbCache.set(cacheKey, stats);
      return stats;
    }
  } catch (err) {
    console.warn(`[Astra HLTB] Error fetching stats for "${title}":`, err.message);
  }
  return null;
});

// Native Screenshot Engine with Storage & Clipboard Integration
function getScreenshotsDir(gameTitle) {
  let baseDir = '';
  try {
    baseDir = path.join(app.getPath('pictures'), 'Astra Screenshots');
  } catch {
    baseDir = path.join(app.getPath('userData'), 'screenshots');
  }
  const cleanTitle = gameTitle
    ? gameTitle.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim()
    : '';
  const targetDir = cleanTitle ? path.join(baseDir, cleanTitle) : baseDir;

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return { baseDir, targetDir };
}

ipcMain.handle('screenshot:capture', async (_event, options = {}) => {
  try {
    const gameTitle = options.gameTitle || '';
    const { targetDir } = getScreenshotsDir(gameTitle);

    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: 'Astra window is not available.' };
    }

    const nativeImg = await mainWindow.webContents.capturePage();
    if (!nativeImg || nativeImg.isEmpty()) {
      return { success: false, error: 'Failed to capture screenshot.' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safePrefix = gameTitle ? gameTitle.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Astra';
    const fileName = `${safePrefix}_${timestamp}.png`;
    const filePath = path.join(targetDir, fileName);

    const buffer = nativeImg.toPNG();
    fs.writeFileSync(filePath, buffer);

    if (options.copyToClipboard !== false) {
      try {
        clipboard.writeImage(nativeImg);
      } catch (clipErr) {
        console.warn('[Astra Screenshot] Clipboard error:', clipErr.message);
      }
    }

    console.log(`[Astra Screenshot] Captured: ${filePath} (${(buffer.length / 1024).toFixed(0)} KB)`);

    return {
      success: true,
      filePath,
      fileName,
      dataUrl: nativeImg.toDataURL(),
      sizeBytes: buffer.length
    };
  } catch (err) {
    console.error('[Astra Screenshot] Error:', err);
    return { success: false, error: err.message || 'Capture failed' };
  }
});

ipcMain.handle('screenshot:open-folder', async (_event, gameTitle) => {
  try {
    const { targetDir } = getScreenshotsDir(gameTitle);
    await shell.openPath(targetDir);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('dialog:pick-screenshot', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Screenshot to Game Gallery',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths;
});

// =========================================================================
// ASTRA V3: SAVE GAME VAULT & AUTO-BACKUP ENGINE
// =========================================================================
function copyDirRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
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

function getDirSizeBytes(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const p = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += getDirSizeBytes(p);
      } else {
        total += fs.statSync(p).size;
      }
    }
  } catch {}
  return total;
}

function getSaveLocationsForGame(gameTitle) {
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

  // Scan common publisher / developer subfolders if direct matches are not found
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
                // Check 1 level deeper (e.g. FromSoftware\ELDEN RING or CD Projekt Red\Cyberpunk 2077)
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
    if (exists) {
      try {
        lastModified = fs.statSync(loc.path).mtime.toISOString();
      } catch {}
    }
    results.push({
      path: loc.path,
      source: loc.source,
      exists,
      lastModified
    });
  }

  return results;
}

function getVaultDir(gameId) {
  const base = path.join(app.getPath('userData'), 'save_vault', String(gameId).replace(/[^a-zA-Z0-9_-]/g, '_'));
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  return base;
}

// Save Vault & Auto-Backup Handlers (delegated to SaveVaultIpc module)
registerSaveVaultIpc(ipcMain, app);

// =========================================================================
// ASTRA V3: GAMING ACTIVITY HISTORY & PLAYTIME LOG
// =========================================================================
function getSessionsFilePath() {
  return path.join(app.getPath('userData'), 'sessions.json');
}

function getLegacyActivityLogPath() {
  return path.join(app.getPath('userData'), 'activity_history.json');
}

function readActivitySessions() {
  const sessionsFile = getSessionsFilePath();
  const legacyFile = getLegacyActivityLogPath();

  if (fs.existsSync(sessionsFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'));
      if (data && Array.isArray(data.sessions)) return data.sessions;
      if (Array.isArray(data)) return data;
    } catch {}
  }

  // Fallback to legacy file if exists
  if (fs.existsSync(legacyFile)) {
    try {
      const list = JSON.parse(fs.readFileSync(legacyFile, 'utf-8'));
      if (Array.isArray(list)) {
        // Normalize
        return list.map((s) => ({
          id: s.id,
          gameId: s.gameId,
          gameName: s.gameTitle || s.gameName || 'Game Session',
          startTime: s.startTime,
          endTime: s.endTime,
          duration: s.durationMinutes ?? s.duration ?? 0,
          launchCount: 1
        }));
      }
    } catch {}
  }

  return [];
}

function writeActivitySessions(sessions) {
  try {
    const filePath = getSessionsFilePath();
    fs.writeFileSync(filePath, JSON.stringify({ sessions }, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Astra Activity] Error writing sessions.json:', err);
  }
}

ipcMain.handle('activity:get-log', async () => {
  return readActivitySessions();
});

ipcMain.handle('activity:record-session', async (_event, session) => {
  try {
    const list = readActivitySessions();
    const normalized = {
      id: session.id || `sess_${Date.now()}`,
      gameId: session.gameId,
      gameName: session.gameName || session.gameTitle || 'Game Session',
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration ?? session.durationMinutes ?? 0,
      launchCount: session.launchCount ?? 1
    };
    list.unshift(normalized);
    // Keep last 1000 session records
    if (list.length > 1000) list.length = 1000;
    writeActivitySessions(list);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// =========================================================================
// ASTRA V3: RETRO EMULATION & ROM SCANNER
// =========================================================================
ipcMain.handle('emulator:detect-installed', async () => {
  const home = os.homedir();
  const progFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const localApp = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');

  const emulatorDefs = [
    {
      id: 'retroarch',
      name: 'RetroArch (Multi-System)',
      platforms: ['nes', 'snes', 'gba', 'gbc', 'genesis', 'ps1', 'n64', 'arcade'],
      defaultArgs: '-f',
      paths: [
        path.join(progFiles, 'RetroArch-Win64', 'retroarch.exe'),
        path.join(progFilesX86, 'Steam', 'steamapps', 'common', 'RetroArch', 'retroarch.exe'),
        path.join(appData, 'RetroArch', 'retroarch.exe')
      ]
    },
    {
      id: 'pcsx2',
      name: 'PCSX2 (PlayStation 2)',
      platforms: ['ps2'],
      defaultArgs: '--fullscreen --nogui',
      paths: [
        path.join(progFiles, 'PCSX2', 'pcsx2-qt.exe'),
        path.join(progFiles, 'PCSX2', 'pcsx2.exe'),
        path.join(localApp, 'Programs', 'PCSX2', 'pcsx2-qt.exe')
      ]
    },
    {
      id: 'dolphin',
      name: 'Dolphin (GameCube & Wii)',
      platforms: ['gamecube'],
      defaultArgs: '-b -e',
      paths: [
        path.join(progFiles, 'Dolphin', 'Dolphin.exe'),
        path.join(localApp, 'Dolphin-x64', 'Dolphin.exe')
      ]
    },
    {
      id: 'duckstation',
      name: 'DuckStation (PlayStation 1)',
      platforms: ['ps1'],
      defaultArgs: '-fullscreen',
      paths: [
        path.join(progFiles, 'DuckStation', 'duckstation-qt-x64-ReleaseLTCG.exe'),
        path.join(localApp, 'DuckStation', 'duckstation-qt-x64-ReleaseLTCG.exe')
      ]
    },
    {
      id: 'mgba',
      name: 'mGBA (Game Boy Advance)',
      platforms: ['gba', 'gbc'],
      defaultArgs: '-f',
      paths: [
        path.join(progFiles, 'mGBA', 'mGBA.exe'),
        path.join(progFilesX86, 'mGBA', 'mGBA.exe')
      ]
    },
    {
      id: 'rpcs3',
      name: 'RPCS3 (PlayStation 3)',
      platforms: ['ps3'],
      defaultArgs: '--no-gui',
      paths: [
        path.join(progFiles, 'RPCS3', 'rpcs3.exe'),
        path.join(localApp, 'RPCS3', 'rpcs3.exe')
      ]
    }
  ];

  return emulatorDefs.map((emu) => {
    let installedPath = '';
    for (const p of emu.paths) {
      if (fs.existsSync(p)) {
        installedPath = p;
        break;
      }
    }
    return {
      id: emu.id,
      name: emu.name,
      executablePath: installedPath,
      platforms: emu.platforms,
      defaultArgs: emu.defaultArgs,
      installed: Boolean(installedPath)
    };
  });
});

ipcMain.handle('emulator:scan-roms', async (_event, folderPath) => {
  if (!folderPath || !fs.existsSync(folderPath)) return [];

  const extToPlatform = {
    '.nes': 'nes',
    '.sfc': 'snes',
    '.smc': 'snes',
    '.gba': 'gba',
    '.gbc': 'gbc',
    '.gb': 'gbc',
    '.md': 'genesis',
    '.gen': 'genesis',
    '.bin': 'ps1',
    '.cue': 'ps1',
    '.chd': 'ps2',
    '.iso': 'ps2',
    '.pkg': 'ps3',
    '.rap': 'ps3',
    '.z64': 'n64',
    '.n64': 'n64',
    '.gcm': 'gamecube',
    '.nds': 'nds'
  };

  const results = [];
  function walk(currentDir, depth) {
    if (depth > 4) return;
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(full, depth + 1);
        } else {
          const lowerName = entry.name.toLowerCase();
          const ext = path.extname(entry.name).toLowerCase();
          const isEboot = lowerName === 'eboot.bin' || lowerName.endsWith('.eboot.bin');
          const platform = isEboot ? 'ps3' : extToPlatform[ext];
          if (platform) {
            const rawTitle = isEboot
              ? path.basename(currentDir).replace(/_/g, ' ').trim()
              : path.basename(entry.name, path.extname(entry.name))
                  .replace(/\(.*?\)/g, '')
                  .replace(/\[.*?\]/g, '')
                  .replace(/_/g, ' ')
                  .trim();
            const stat = fs.statSync(full);
            results.push({
              id: `rom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              title: rawTitle || entry.name,
              romPath: full,
              platform,
              fileSizeBytes: stat.size,
              extension: isEboot ? '.eboot.bin' : ext
            });
          }
        }
      }
    } catch {}
  }

  walk(folderPath, 0);
  return results;
});

// =========================================================================
// ASTRA V3: SYSTEM PERFORMANCE MONITORING
// =========================================================================
let lastCpuSnapshot = { idle: 0, total: 0 };

ipcMain.handle('system:get-performance', async () => {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const cpus = os.cpus();
  
  // Real-time CPU tick delta estimate across sampling intervals
  let currentIdle = 0;
  let currentTotal = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      currentTotal += cpu.times[type];
    }
    currentIdle += cpu.times.idle;
  }

  let cpuPercent = 12;
  if (lastCpuSnapshot.total > 0) {
    const idleDelta = currentIdle - lastCpuSnapshot.idle;
    const totalDelta = currentTotal - lastCpuSnapshot.total;
    if (totalDelta > 0) {
      cpuPercent = Math.max(1, Math.min(100, Math.round(((totalDelta - idleDelta) / totalDelta) * 100)));
    }
  }
  lastCpuSnapshot = { idle: currentIdle, total: currentTotal };

  return {
    cpuUsage: cpuPercent,
    ramUsedGB: Math.round((used / (1024 ** 3)) * 10) / 10,
    ramTotalGB: Math.round((total / (1024 ** 3)) * 10) / 10,
    ramPercent: Math.round((used / total) * 100),
    uptimeHours: Math.round((os.uptime() / 3600) * 10) / 10
  };
});


