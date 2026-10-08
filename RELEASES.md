# Release Management

## Creating a Release

### 1. Update Version
Edit `package.json` and increment the version:
```json
"version": "1.0.1"
```

### 2. Commit Version Bump
```bash
git add package.json
git commit -m "chore: bump version to 1.0.1"
```

### 3. Create Git Tag
```bash
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

### 4. GitHub Actions Takes Over
- Workflow automatically triggers on tag push
- Builds Windows installer & portable exe
- Creates GitHub Release with files attached
- Release becomes available in "Releases" tab

## Changelog Format

Tag descriptions should include:
```markdown
## v1.0.0 - 2026-10-09

### Features
- Added in-game mini-HUD overlay
- Added Save Game Vault & Auto-Backup
- Added Retro Hub & Emulation Center
- Added Astra Jukebox & Audio Visualizer
- Added Astra Armory Mod Manager

### Fixes
- Fixed audio ducking on game close
- Fixed save vault timeout on large backups

### Changes
- Updated dependencies to latest versions

### Downloads
- Astra Game Launcher-1.0.0.exe (Installer)
- Astra Game Launcher-1.0.0-portable.exe (Portable)
```

## Versioning

Uses semantic versioning:
- **1.0.0** = MAJOR.MINOR.PATCH
- MAJOR: Breaking changes
- MINOR: New features (backwards compatible)
- PATCH: Bug fixes

Next releases:
- v1.1.0 (In-Game Mini-HUD Enhancements)
- v1.2.0 (Retro Hub & Emulation Advancements)
- v1.3.0 (Mod Manager Presets & Cloud Sync)
