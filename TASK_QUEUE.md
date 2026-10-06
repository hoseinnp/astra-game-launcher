# TASK_QUEUE.md — Astra Game Launcher Feature Pipeline

**Last Updated:** 2026-10-06  
**Current Task:** Task #4 — In-Game Mini-HUD  
**Status:** Ready for agy execution

---

## 📋 CURRENT TASK: Task #4 — In-Game Mini-HUD

### Overview
Build a floating overlay HUD that appears inside running games, showing game info, quick controls, and system stats. Uses Electron window overlay with IPC communication.

### Requirements

#### 1. **Mini-HUD Window System**
- Create an Electron `BrowserWindow` that floats above the game window
- Window properties:
  - Frameless, transparent background
  - Always-on-top behavior
  - Size: 320px width × 180px height (fixed, non-resizable initially)
  - Position: bottom-right corner (configurable via settings)
  - Opacity: 85% (adjustable in settings, range 50-100%)

#### 2. **HUD Content Sections**
Build a React component with these tabs (switchable):

**Tab 1: Game Status**
- Game name (current running game)
- Playtime this session (HH:MM:SS)
- Launch time (when game started)
- Save vault status: "Last backup: X mins ago" or "No backups yet"

**Tab 2: Quick Controls**
- **Save & Exit** button → triggers SaveVault auto-backup, then closes game
- **Discord Rich Presence** toggle → show/hide if enabled
- **Audio Volume** mini slider (0-100%)
- **Minimize Game** button → minimize game window (don't close)

**Tab 3: System Stats** (Real-time updates every 500ms)
- CPU usage (%)
- RAM usage (%)
- GPU usage (%) — if available
- FPS counter (estimate from frame timing)
- Network latency (ping, if available)

**Tab 4: Quick Settings**
- HUD opacity slider
- Position selector (4 corners: TL, TR, BL, BR)
- Always-on-top toggle
- Hide HUD button (re-show with Ctrl+` hotkey)

#### 3. **IPC Communication**
- Main process → Renderer: Send game status, system stats (every 500ms)
- Renderer → Main: Save & Exit, Minimize, Toggle HUD visibility
- Use existing Electron IPC pattern from SaveVault/Activity features

#### 4. **Styling**
- Match existing Astra theme (glassmorphic, dark with accent colors)
- Use lucide-react icons (icon library already in project)
- Responsive text sizing (some text should be small but readable)
- Smooth fade-in/out animations (200ms)
- Dark background with border-white/15, rounded-2xl

#### 5. **State Management**
- HUD visibility state (localStorage key: `astra_hud_visible`)
- HUD position preference (localStorage key: `astra_hud_position`)
- HUD opacity preference (localStorage key: `astra_hud_opacity`)
- Current game info (from GameLauncherService)
- System stats (from OS via Node.js `os` module or native binding)

#### 6. **Integration Points**
- **GameLauncherService:** Detect when game is running, get game name
- **SaveVaultService:** Show last backup time in "Game Status" tab
- **ActivityTrackingService:** Update session playtime in real-time
- **Hotkey:** Ctrl+` toggles HUD visibility when game is active

#### 7. **Edge Cases to Handle**
- Game not running: Show "No game running" message, disable controls
- Window focus: Don't steal focus from game (set `focusable: false` or similar)
- Multi-monitor: Handle correctly on different DPI/resolution setups
- Performance: Keep IPC updates efficient, don't spam messages
- User closes HUD window: Auto-reopen on next game launch (or via hotkey)

#### 8. **Files to Create/Edit**
- `src/components/MiniHUD.tsx` — Main HUD React component (4-tab interface)
- `src/services/MiniHUDService.ts` — Service for HUD state, visibility, position
- `src/services/SystemStatsService.ts` — Get CPU/RAM/GPU/FPS data
- `electron/ipc/MiniHUDIpc.ts` — IPC handlers for HUD messages
- `electron/windows/HUDWindow.ts` — Electron window creation & management
- `src/types/MiniHUD.types.ts` — TypeScript interfaces
- Edit `src/services/GameLauncherService.ts` — Add game status publishing to HUD

### Tech Details
- **SystemStats:** Use Node.js `os` module for CPU/RAM. GPU/FPS will be estimate-based (or skip if too complex).
- **FPS:** Estimate from `requestAnimationFrame` timing, not precise but good enough for gaming insight.
- **Position math:** Calculate screen position based on window dimensions and game window bounds.
- **Always-on-top:** Set `alwaysOnTop: true` on BrowserWindow, but make sure game gets input focus.

### Acceptance Criteria
✅ HUD appears when game launches  
✅ HUD disappears when game closes  
✅ All 4 tabs functional and switchable  
✅ Real-time stats update every 500ms  
✅ System stats are reasonably accurate  
✅ "Save & Exit" button works (triggers backup + game close)  
✅ Hotkey Ctrl+` toggles visibility  
✅ Settings persist across sessions (localStorage)  
✅ No performance degradation (HUD doesn't slow down game)  
✅ Styling matches Astra theme  

### Branch
**Create:** `feat/mini-hud`  
**Base:** `master`

### Quality Notes
- Code should be well-typed (full TypeScript)
- Services should follow singleton pattern with event subscriptions
- IPC should be async/await with error handling
- UI should be beautiful and responsive (test on different window sizes)

---

## ✅ COMPLETED TASKS

### Task #1: Save Game Vault & Auto-Backup
**Status:** ✅ MERGED TO MASTER  
**Commit:** a077d8a  
**Grade:** A+

### Task #2: Astra Jukebox & Audio Visualizer
**Status:** ✅ MERGED TO MASTER  
**Commit:** 09115f9  
**Grade:** A

### Task #3: Gaming Activity Dashboard with Smart Resume
**Status:** ✅ READY TO MERGE  
**Commit:** 50a5fc1  
**Grade:** A

---

## 📅 UPCOMING TASKS (For Later)

### Task #5: Retro Hub & Emulation Integration
- ROM scanning and game detection
- Emulator integration (MAME, Dolphin, etc.)
- Play retro games from launcher
- Save state management

### Task #6: Mod Manager / Astra Armory
- Mod discovery and installation
- Load order management
- Mod conflict detection
- Enable/disable mods per game

---

## 🔗 Quick Links
- **Repo:** https://github.com/hoseinnp/astra-game-launcher
- **Branch:** master
- **Read PROJECT_INFO.md in repo root for architecture context**

---

**Instructions for agy:**
1. Read this file
2. Create feature branch: `git checkout -b feat/mini-hud`
3. Build the Mini-HUD system following the Requirements section above
4. Follow code patterns from existing features (SaveVault, Jukebox, Activity)
5. Commit with message: `feat: add in-game mini-hud with system stats and quick controls`
6. Push to origin: `git push origin feat/mini-hud`
7. Do NOT create a PR (Claude will review and merge)

