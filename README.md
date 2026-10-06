# Astra Game Launcher

A modern, high-performance desktop game launcher and companion dashboard built with **Electron**, **React 19**, **TypeScript**, and **Tailwind CSS**.

---

## 🌟 Key Features

- **🎮 Dual Interface (Desktop & Console Big-Picture Modes)**  
  Switch seamlessly between a mouse-friendly desktop grid and a high-immersion controller-first Big-Picture console view with full gamepad navigation and haptic feedback.

- **🕹️ Comprehensive Library & Multi-Platform Auto-Detection**  
  Scan, import, and launch games from Steam, Epic Games, GOG, Ubisoft Connect, EA, and standalone installations.

- **💾 Save Game Vault & Auto-Backup**  
  Automated detection of game save directories across `%APPDATA%`, `Documents`, and `Saved Games`, featuring rolling backups and 1-click restore points.

- **🎵 Astra Jukebox & Audio Visualizer**  
  Integrated OST and ambient sound player with real-time reactive audio visualizers matching game color palettes.

- **📊 Playtime Analytics & Activity Heatmap**  
  Deep session tracking, peak gaming hours analysis, and a GitHub-style annual contribution matrix.

- **⚔️ Astra Armory (Mod Manager)**  
  Integrated mod manager supporting script extenders, priority load ordering, conflict detection, and profile presets.

- **👾 Retro & Emulation Hub**  
  Integrated ROM scanner, BIOS checks, and 1-click execution for RetroArch, Dolphin, PCSX2, RPCS3, and DuckStation.

- **⚡ In-Game Companion Mini-HUD**  
  Lightweight transparent overlay (`Shift + Tab`) providing instant access to game notes, checklists, screenshots, and volume controls without alt-tabbing.

- **🤖 Astra Game Oracle**  
  Tactical in-launcher AI lore and strategy co-pilot for spoiler-free quest guidance, boss tips, and build suggestions.

---

## 🛠️ Tech Stack

- **Framework:** Electron, Node.js IPC
- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Icons:** Lucide React

---

## 💾 Installation

### Option 1: Installer (Recommended)
1. Go to [Releases](https://github.com/[USERNAME]/astra-game-launcher/releases)
2. Download the latest `Astra Game Launcher-X.X.X.exe` (full installer)
3. Run the installer and follow the prompts
4. Astra will be installed to your Program Files
5. A desktop shortcut will be created automatically

### Option 2: Portable (No Installation)
1. Go to [Releases](https://github.com/[USERNAME]/astra-game-launcher/releases)
2. Download the latest `Astra Game Launcher-X.X.X-portable.exe`
3. Run directly from anywhere (USB stick, Downloads, etc.)
4. No installation required, no registry changes

### Option 3: Build from Source
```bash
git clone https://github.com/[USERNAME]/astra-game-launcher.git
cd astra-game-launcher
npm install
npm run dev          # Development
npm run build        # Production build
npm run dist:win     # Create installers
```

## ⚙️ System Requirements
- Windows 10 or later
- 200 MB disk space
- 512 MB RAM minimum
