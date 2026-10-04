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
  pickFolder: () => ipcRenderer.invoke('dialog:pick-folder'),
  getExeVersion: (exePath) => ipcRenderer.invoke('game:get-exe-version', exePath),

  // Game execution & Location
  launchGame: (game) => ipcRenderer.invoke('game:launch', game),
  openGameFolder: (game) => ipcRenderer.invoke('game:open-folder', game),

  // Scanners
  scanFolder: (dirPath, options) => ipcRenderer.invoke('scanner:folder', dirPath, options),
  scanSteam: () => ipcRenderer.invoke('scanner:steam'),

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

  // Save Vault APIs
  scanSaveLocations: (gameId, gameTitle) => ipcRenderer.invoke('savevault:scan-locations', gameId, gameTitle),
  createSaveSnapshot: (gameId, gameTitle, note, isAuto) => ipcRenderer.invoke('savevault:create-snapshot', { gameId, gameTitle, note, isAuto }),
  listSaveSnapshots: (gameId) => ipcRenderer.invoke('savevault:list-snapshots', gameId),
  restoreSaveSnapshot: (gameId, snapshotId) => ipcRenderer.invoke('savevault:restore-snapshot', { gameId, snapshotId }),
  openSaveDirectory: (gameId) => ipcRenderer.invoke('savevault:open-folder', gameId),

  // Activity History APIs
  getActivityLog: () => ipcRenderer.invoke('activity:get-log'),
  recordActivitySession: (session) => ipcRenderer.invoke('activity:record-session', session),

  // Retro Emulation Hub APIs
  detectEmulators: () => ipcRenderer.invoke('emulator:detect-installed'),
  scanRoms: (folderPath) => ipcRenderer.invoke('emulator:scan-roms', folderPath),

  // System Performance APIs
  getSystemPerformance: () => ipcRenderer.invoke('system:get-performance')
});

