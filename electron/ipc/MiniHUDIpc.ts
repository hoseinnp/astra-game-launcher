/**
 * MiniHUDIpc.ts / MiniHUDIpc.cjs
 *
 * Electron IPC handlers for In-Game Mini-HUD
 */

const { ipcMain, BrowserWindow } = require('electron');
const {
  showHUDWindow,
  hideHUDWindow,
  toggleHUDWindow,
  setHUDPosition,
  setHUDOpacity,
  setHUDAlwaysOnTop,
  sendHUDStats
} = require('../windows/HUDWindow.cjs');
const { executeCreateBackup } = require('./SaveVaultIpc.cjs');
const { exec } = require('child_process');

function registerMiniHUDIpc(app, mainWindow, runningGames) {
  // 1. Toggle or set HUD visibility
  ipcMain.handle('hud:toggle', (_event, explicitVisible) => {
    return toggleHUDWindow(app, mainWindow, explicitVisible);
  });

  // 2. Set HUD position
  ipcMain.handle('hud:set-position', (_event, position) => {
    setHUDPosition(position);
    return true;
  });

  // 3. Set HUD opacity
  ipcMain.handle('hud:set-opacity', (_event, opacity) => {
    setHUDOpacity(opacity);
    return true;
  });

  // 4. Set Always on top
  ipcMain.handle('hud:set-always-on-top', (_event, alwaysOnTop) => {
    setHUDAlwaysOnTop(alwaysOnTop);
    return true;
  });

  // 5. Update stats from renderer to HUD window
  ipcMain.handle('hud:update-stats', (_event, payload) => {
    sendHUDStats(payload);
    return true;
  });

  // 6. Minimize running game window
  ipcMain.handle('hud:minimize-game', async (_event, gameId) => {
    // If running in Windows, use PowerShell or nircmd or user32 to minimize or minimize mainWindow if simulating
    try {
      if (gameId && runningGames && runningGames.has(gameId)) {
        const gameInfo = runningGames.get(gameId);
        if (gameInfo && gameInfo.pid) {
          // On Windows, minimize window by PID via PowerShell
          if (process.platform === 'win32') {
            const psScript = `
              $w = Get-Process -Id ${gameInfo.pid} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty MainWindowHandle
              if ($w -and $w -ne 0) {
                Add-Type -TypeDefinition @"
                using System;
                using System.Runtime.InteropServices;
                public class Win32 {
                  [DllImport("user32.dll")]
                  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
                }
"@
                [Win32]::ShowWindow($w, 6) # 6 = SW_MINIMIZE
              }
            `;
            exec(`powershell -NoProfile -Command "${psScript.replace(/\r?\n/g, ' ')}"`);
            return true;
          }
        }
      }
      return true;
    } catch (err) {
      console.warn('[MiniHUDIpc] Error minimizing game window:', err);
      return false;
    }
  });

  // 7. Save and exit (Close game process)
  ipcMain.handle('hud:close-game', async (_event, gameId) => {
    try {
      if (gameId && runningGames && runningGames.has(gameId)) {
        const gameInfo = runningGames.get(gameId);
        if (gameInfo && gameInfo.pid) {
          try {
            process.kill(gameInfo.pid);
          } catch {
            if (process.platform === 'win32') {
              exec(`taskkill /pid ${gameInfo.pid} /f /t`);
            }
          }
        }
        runningGames.delete(gameId);
      }
      return { success: true };
    } catch (err) {
      console.warn('[MiniHUDIpc] Error closing game process:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = {
  registerMiniHUDIpc
};
