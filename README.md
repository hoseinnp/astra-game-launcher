# Astra Game Launcher

A modern, high-performance desktop game launcher and companion dashboard built with **Electron**, **React 19**, **TypeScript**, and **Tailwind CSS**.

---

## 🌟 Key Features

- **🎮 Dual Interface (Desktop & Console Big-Picture Modes)**  
  Switch seamlessly between a mouse-friendly desktop grid and a high-immersion controller-first Big-Picture console view with full gamepad navigation and haptic feedback.

- **🎨 Themeable UI with Accent Glow & Reduced Effects**  
  Customize the launcher with vibrant accent colors, dynamic background glow, and full support for reduced motion/effects (`prefers-reduced-motion`).

- **🕹️ Comprehensive Library & Multi-Platform Auto-Detection**  
  Scan, import, and launch games from Steam, Epic Games, GOG, Ubisoft Connect, EA, and standalone installations.

- **💾 Save Game Vault & Auto-Backup**  
  Automated detection of game save directories across `%APPDATA%`, `Documents`, and `Saved Games`, featuring rolling backups and 1-click restore points.

- **🎵 Astra Jukebox & Audio Visualizer**  
  Integrated OST and ambient sound player with real-time reactive audio visualizers matching game color palettes.

- **📊 Playtime Analytics, Activity Heatmap & Smart Resume**  
  Deep session tracking, peak gaming hours analysis, a GitHub-style annual contribution matrix, and predictive AI suggestions for picking up where you left off.

- **🤖 AI Recommendations Hub**  
  Discover new titles from your library or get intelligent suggestions on what to play next based on your playtime patterns.

- **⚔️ Astra Armory (Mod Manager)**  
  Integrated mod manager supporting script extenders, priority load ordering, conflict detection, and profile presets.

- **👾 Retro & Emulation Hub**  
  Integrated ROM scanner, BIOS checks, and 1-click execution for RetroArch, Dolphin, PCSX2, RPCS3, and DuckStation.

- **⚡ In-Game Companion Mini-HUD**  
  Lightweight transparent overlay providing instant access to game notes, checklists, screenshots, and volume controls without alt-tabbing. Toggle it globally with the `Ctrl + \`` hotkey (or `Cmd + \`` on macOS).

---

## 🛠️ Tech Stack

- **Framework:** Electron, Node.js IPC
- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Icons:** Lucide React

---

## 💾 Installation & Development

### Local Development
```bash
git clone https://github.com/[USERNAME]/astra-game-launcher.git
cd astra-game-launcher
npm install

# Start development server (Frontend + Electron)
npm run dev

# Production build of the frontend
npm run build

# Package an executable (Windows Portable)
npm run dist:portable
```

### Option 1: Installer
1. Go to [Releases](https://github.com/[USERNAME]/astra-game-launcher/releases)
2. Download the latest `Astra Game Launcher-X.X.X.exe`
3. Run the installer to add Astra to your Program Files.

### Option 2: Portable (No Installation)
1. Download `Astra Game Launcher-X.X.X-portable.exe`
2. Run directly from anywhere (USB stick, Downloads, etc.) without registry changes.

---

## ⚙️ System Requirements
- Windows 10 or later
- 200 MB disk space
- 512 MB RAM minimum
