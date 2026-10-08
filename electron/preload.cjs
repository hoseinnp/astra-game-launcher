const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window control
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  setFullscreen: (flag) => ipcRenderer.invoke('window:set-fullscreen', flag),
  isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen'),
  getAutoLaunch: () => ipcRenderer.invoke('app:get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('app:set-auto-launch', enabled),

  // Native pickers
  pickExe: () => ipcRenderer.invoke('dialog:pick-exe'),
  pickImage: () => ipcRenderer.invoke('dialog:pick-image'),
  pickAudio: () => ipcRenderer.invoke('dialog:pick-audio'),
  pickVideo: () => ipcRenderer.invoke('dialog:pick-video'),
  pickFolder: (options) => ipcRenderer.invoke('dialog:pick-folder', options),
  getExeVersion: (exePath) => ipcRenderer.invoke('game:get-exe-version', exePath),
  checkGameVersion: (exePath) => ipcRenderer.invoke('game:check-version', exePath),

  // Game execution & Location
  launchGame: (game) => ipcRenderer.invoke('game:launch', game),
  openGameFolder: (game) => ipcRenderer.invoke('game:open-folder', game),
  createDesktopShortcut: (game) => ipcRenderer.invoke('game:create-shortcut', game),
  createAppDesktopShortcut: () => ipcRenderer.invoke('app:create-shortcut'),

  // Scanners
  scanFolder: (dirPath, options) => ipcRenderer.invoke('scanner:folder', dirPath, options),
  scanSteam: () => ipcRenderer.invoke('scanner:steam'),
  scanPlatformGames: (platform) => ipcRenderer.invoke('scanner:platforms', platform),

  // Persistence
  loadData: () => ipcRenderer.invoke('store:load'),
  saveData: (data) => ipcRenderer.invoke('store:save', data),

  // Media download & offline caching
  downloadLiveWallpaper: (options) => ipcRenderer.invoke('media:download-live-wallpaper', options),
  downloadVideo: (options) => ipcRenderer.invoke('media:download-video', options),
  getVideoStorage: () => ipcRenderer.invoke('media:get-video-storage'),
  deleteVideo: (gameId) => ipcRenderer.invoke('media:delete-video', gameId),
  clearVideoCache: () => ipcRenderer.invoke('media:clear-video-cache'),
  downloadSteamAssets: (appId) => ipcRenderer.invoke('media:download-steam-assets', appId),
  downloadFile: (url, filename) => ipcRenderer.invoke('media:download-file', { url, filename }),
  fetchHltb: (title) => ipcRenderer.invoke('hltb:fetch', title),

  // Screenshots & Capture
  captureScreenshot: (options) => ipcRenderer.invoke('screenshot:capture', options),
  openScreenshotsFolder: (gameTitle) => ipcRenderer.invoke('screenshot:open-folder', gameTitle),
  pickScreenshot: () => ipcRenderer.invoke('dialog:pick-screenshot'),
  onScreenshotCaptured: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on('screenshot:captured', handler);
    return () => ipcRenderer.removeListener('screenshot:captured', handler);
  },
  onScreenshotTriggered: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('screenshot:trigger-capture', handler);
    return () => ipcRenderer.removeListener('screenshot:trigger-capture', handler);
  },

  // Discord Rich Presence
  setDiscordActivity: (activity) => ipcRenderer.invoke('discord:set-activity', activity),
  clearDiscordActivity: () => ipcRenderer.invoke('discord:clear-activity'),

  // Events
  onGameSessionEnded: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on('game:session-ended', handler);
    return () => ipcRenderer.removeListener('game:session-ended', handler);
  },

  // Save Vault & Auto-Backup APIs
  scanSaveLocations: (gameId, gameTitle) => ipcRenderer.invoke('savevault:scan-locations', gameId, gameTitle),
  createSaveSnapshot: (gameId, gameTitle, note, isAuto) => ipcRenderer.invoke('savevault:create-snapshot', { gameId, gameTitle, note, isAuto }),
  listSaveSnapshots: (gameId) => ipcRenderer.invoke('savevault:list-snapshots', gameId),
  restoreSaveSnapshot: (gameId, snapshotId) => ipcRenderer.invoke('savevault:restore-snapshot', { gameId, snapshotId }),
  listBackups: (gameId, customStorage) => ipcRenderer.invoke('savevault:list-backups', gameId, customStorage),
  createBackup: (params) => ipcRenderer.invoke('savevault:create-backup', params),
  restoreBackup: (params) => ipcRenderer.invoke('savevault:restore-backup', params),
  deleteBackup: (params) => ipcRenderer.invoke('savevault:delete-backup', params),
  verifyZipIntegrity: (zipPath) => ipcRenderer.invoke('savevault:verify-zip', zipPath),
  pickSaveStorageFolder: () => ipcRenderer.invoke('savevault:pick-storage-folder'),
  openSaveDirectory: (gameId, customStorage) => ipcRenderer.invoke('savevault:open-folder', gameId, customStorage),
  onSaveVaultProgress: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on('savevault:progress', handler);
    return () => ipcRenderer.removeListener('savevault:progress', handler);
  },

  // Activity History APIs
  getActivityLog: () => ipcRenderer.invoke('activity:get-log'),
  recordActivitySession: (session) => ipcRenderer.invoke('activity:record-session', session),

  // Retro Emulation Hub APIs
  detectEmulators: () => ipcRenderer.invoke('retro:detect-emulators'),
  scanRoms: (folderPaths) => ipcRenderer.invoke('retro:scan-roms', folderPaths),
  launchRetroGame: (params) => ipcRenderer.invoke('retro:launch-game', params),
  listSaveStates: (romPath) => ipcRenderer.invoke('retro:list-save-states', romPath),
  backupSaveState: (params) => ipcRenderer.invoke('retro:backup-save-state', params),
  restoreSaveState: (params) => ipcRenderer.invoke('retro:restore-save-state', params),
  pickRetroFolder: () => ipcRenderer.invoke('retro:pick-folder'),
  pickEmulatorExe: () => ipcRenderer.invoke('retro:pick-emulator-exe'),
  onRetroScanProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on('retro:scan-progress', handler);
    return () => ipcRenderer.removeListener('retro:scan-progress', handler);
  },

  // System Performance APIs
  getSystemPerformance: () => ipcRenderer.invoke('system:get-performance'),

  // In-Game Mini-HUD APIs
  toggleHudWindow: (explicitVisible) => ipcRenderer.invoke('hud:toggle', explicitVisible),
  setHudPosition: (position) => ipcRenderer.invoke('hud:set-position', position),
  setHudOpacity: (opacity) => ipcRenderer.invoke('hud:set-opacity', opacity),
  setHudAlwaysOnTop: (alwaysOnTop) => ipcRenderer.invoke('hud:set-always-on-top', alwaysOnTop),
  updateHudStats: (payload) => ipcRenderer.invoke('hud:update-stats', payload),
  minimizeGameWindow: (gameId) => ipcRenderer.invoke('hud:minimize-game', gameId),
  closeGameProcess: (gameId) => ipcRenderer.invoke('hud:close-game', gameId),
  onHudVisibilityChange: (callback) => {
    const handler = (_event, visible) => callback(visible);
    ipcRenderer.on('hud:visibility-change', handler);
    return () => ipcRenderer.removeListener('hud:visibility-change', handler);
  },
  onHudStatsUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('hud:stats-update', handler);
    return () => ipcRenderer.removeListener('hud:stats-update', handler);
  }
});

