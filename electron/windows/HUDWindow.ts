/**
 * HUDWindow.ts / HUDWindow.cjs
 *
 * Electron BrowserWindow overlay management for In-Game Mini-HUD.
 * Creates a frameless, transparent, always-on-top window positioned in screen corners.
 */

const { BrowserWindow, screen, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let hudWindow = null;
let currentSettings = {
  opacity: 85,
  position: 'BR', // 'TL', 'TR', 'BL', 'BR'
  alwaysOnTop: true,
  visible: false
};

const HUD_WIDTH = 320;
const HUD_HEIGHT = 180;
const MARGIN = 20;

function calculatePosition(posCode, bounds) {
  const display = bounds || screen.getPrimaryDisplay().workArea;
  let x = display.x + display.width - HUD_WIDTH - MARGIN;
  let y = display.y + display.height - HUD_HEIGHT - MARGIN;

  switch (posCode) {
    case 'TL':
      x = display.x + MARGIN;
      y = display.y + MARGIN;
      break;
    case 'TR':
      x = display.x + display.width - HUD_WIDTH - MARGIN;
      y = display.y + MARGIN;
      break;
    case 'BL':
      x = display.x + MARGIN;
      y = display.y + display.height - HUD_HEIGHT - MARGIN;
      break;
    case 'BR':
    default:
      x = display.x + display.width - HUD_WIDTH - MARGIN;
      y = display.y + display.height - HUD_HEIGHT - MARGIN;
      break;
  }

  return { x: Math.round(x), y: Math.round(y) };
}

function createHUDWindow(app, mainWindow) {
  if (hudWindow && !hudWindow.isDestroyed()) {
    return hudWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const initialPos = calculatePosition(currentSettings.position, primaryDisplay.workArea);

  hudWindow = new BrowserWindow({
    width: HUD_WIDTH,
    height: HUD_HEIGHT,
    x: initialPos.x,
    y: initialPos.y,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: currentSettings.alwaysOnTop,
    focusable: false, // Don't steal keyboard focus from the active game
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  hudWindow.setOpacity(currentSettings.opacity / 100);

  // Set always on top with high level so it floats over fullscreen games/borderless games
  try {
    hudWindow.setAlwaysOnTop(currentSettings.alwaysOnTop, 'screen-saver');
  } catch {}

  const distPath = path.join(__dirname, '../../dist/index.html');
  if (app.isPackaged) {
    hudWindow.loadFile(distPath, { query: { mode: 'hud' } });
  } else if (process.env.VITE_DEV_SERVER_URL) {
    hudWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?mode=hud`);
  } else {
    hudWindow.loadURL(`http://127.0.0.1:5173?mode=hud`);
  }

  hudWindow.on('closed', () => {
    hudWindow = null;
  });

  return hudWindow;
}

function showHUDWindow(app, mainWindow) {
  if (!hudWindow || hudWindow.isDestroyed()) {
    createHUDWindow(app, mainWindow);
  }

  if (hudWindow && !hudWindow.isDestroyed()) {
    currentSettings.visible = true;
    hudWindow.showInactive(); // Show without taking focus from game
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('hud:visibility-change', true);
    }
  }
}

function hideHUDWindow(mainWindow) {
  if (hudWindow && !hudWindow.isDestroyed()) {
    currentSettings.visible = false;
    hudWindow.hide();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('hud:visibility-change', false);
    }
  }
}

function toggleHUDWindow(app, mainWindow, explicitVisible) {
  const target = explicitVisible !== undefined ? explicitVisible : !currentSettings.visible;
  if (target) {
    showHUDWindow(app, mainWindow);
  } else {
    hideHUDWindow(mainWindow);
  }
  return currentSettings.visible;
}

function setHUDPosition(positionCode) {
  currentSettings.position = positionCode;
  if (hudWindow && !hudWindow.isDestroyed()) {
    const coords = calculatePosition(positionCode);
    hudWindow.setPosition(coords.x, coords.y);
  }
}

function setHUDOpacity(opacity) {
  const clamped = Math.max(50, Math.min(100, opacity));
  currentSettings.opacity = clamped;
  if (hudWindow && !hudWindow.isDestroyed()) {
    hudWindow.setOpacity(clamped / 100);
  }
}

function setHUDAlwaysOnTop(alwaysOnTop) {
  currentSettings.alwaysOnTop = alwaysOnTop;
  if (hudWindow && !hudWindow.isDestroyed()) {
    try {
      hudWindow.setAlwaysOnTop(alwaysOnTop, alwaysOnTop ? 'screen-saver' : 'normal');
    } catch {
      hudWindow.setAlwaysOnTop(alwaysOnTop);
    }
  }
}

function sendHUDStats(data) {
  if (hudWindow && !hudWindow.isDestroyed()) {
    hudWindow.webContents.send('hud:stats-update', data);
  }
}

function registerHUDGlobalShortcuts(app, mainWindow) {
  try {
    // Ctrl+` hotkey to toggle Mini-HUD
    globalShortcut.register('CommandOrControl+`', () => {
      toggleHUDWindow(app, mainWindow);
    });
  } catch (err) {
    console.warn('[HUDWindow] Failed to register global shortcut Ctrl+`:', err);
  }
}

function getHUDWindow() {
  return hudWindow;
}

module.exports = {
  createHUDWindow,
  showHUDWindow,
  hideHUDWindow,
  toggleHUDWindow,
  setHUDPosition,
  setHUDOpacity,
  setHUDAlwaysOnTop,
  sendHUDStats,
  registerHUDGlobalShortcuts,
  getHUDWindow
};
