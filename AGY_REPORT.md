# Task G Report: Fix Jukebox Audio Overlap & Stop Control

**Root Cause**:
Two independent competing audio singletons existed (`AudioService` and `jukeboxEngine`). `JukeboxModal` played via `AudioService` while `TopBar` and `InGameMiniHud` queried `jukeboxEngine`, leaving background playback un-stoppable from the HUD and allowing a second audio stream to play on top. In addition, `selectTrack` in `JukeboxModal` called `selectTrackByIndex` (which auto-played) and then immediately called `play()` again, and audio elements/oscillators lacked full teardown on stop.

**Key Changes**:
- `src/services/AudioService.ts`: Hardened singleton managing exactly one playback instance. Robust `stop()` and `pause()` that disconnect/clear oscillators, pause `audioElement`, reset `currentTime = 0`, clear src, stop ambient layers, and clear timers. Added play session tracking to prevent race conditions and attached `beforeunload`/`unload` teardown.
- `src/services/jukeboxEngine.ts`: Converted into a facade mapping directly to `AudioService` so all consumers control the identical singleton state.
- `src/modals/JukeboxModal.tsx`: Fixed double-play on track selection (`playTrack`), added a dedicated Stop button, and resynced audio state on open.
- `src/components/layout/TopBar.tsx`: Added persistent inline stop button on the TopBar Jukebox pill and in the mobile drawer when audio is playing.
- `src/components/hud/InGameMiniHud.tsx`: Added dedicated stop button to the Jukebox tab.
- `src/App.tsx`: Registered `beforeunload`/`unload` handler stopping ambient and Jukebox audio.
- `src/types/Audio.types.ts`: Extended `Track` type for backward compatibility.

**Merge Status**:
- Merged `fix/jukebox-stop` into `main` (`--no-ff`). Main commit: `ea3432d3e6062ff69ed0aee28c280b17f6d9ac8a`. Both branches pushed.

**Verification Results**:
- `npx tsc -b`: PASS (0 errors)
- `npx vite build`: PASS (built cleanly in 1.14s)
- `npx oxlint` (touched files): PASS (0 warnings, 0 errors across 7 files)
- Headless browser test: PASS (Track switch tears down previous track; single active instance; pause and stop reset state; TopBar/HUD/modal controls synchronized; 0 leaked audio elements).

**Behaviors NOT Verifiable Headlessly**:
- OS-level audio device output fidelity and DAC switching during active Web Audio playback.
- Hardware controller button feel during live background audio playback.
