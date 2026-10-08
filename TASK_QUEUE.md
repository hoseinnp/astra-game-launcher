# TASK_QUEUE

## Current task: Task G - Fix Jukebox: audio cannot be stopped, and a second track can start on top of it
Branch: create `fix/jukebox-stop` from up-to-date `main`. NEVER force-push (no `--force`, no `--force-with-lease`, no amending pushed commits). Bug fix only, no new features.

Bug report (owner): the Jukebox starts playing and cannot be stopped. Another audio can also be started while the first keeps playing, so tracks overlap.

Likely causes to check first (verify, don't assume): (1) more than one `Audio`/`HTMLAudioElement`/`AudioContext` instance created (per render, per modal open, per track, or React StrictMode double-mount) and the old reference is lost, (2) audio object stored in component state/ref that is discarded when the modal unmounts or when the new `ErrorBoundary` resets/remounts it, so Stop/Pause act on a different or dead instance, (3) Stop/Pause/Play handlers bound to stale closures, (4) event listeners or intervals (progress, ended, autoplay-next) restarting playback after pause/stop, (5) other audio sources in the app (game launch sounds, UI sounds, retro hub, mini-HUD) that are not tracked.

Requirements:
1. Reproduce first (headless or by code reading) and state the root cause in the report in 1-3 sentences.
2. Exactly ONE playback instance owned by a singleton service (outside React component lifecycle). Starting a track must first fully stop and release the previous one (pause, reset `currentTime`, remove listeners, clear src/disconnect nodes, clear timers). Never allow two Jukebox tracks to play at once.
3. Stop, Pause, Play/Resume, Next/Previous and volume must act on that single instance and always work, including after the modal was closed and reopened, after an `ErrorBoundary` retry, and after navigating views. The modal must read true current state from the service on open (no stale "playing" or "stopped" UI).
4. Keep existing behavior for closing the modal (if music currently keeps playing in the background, keep that) but guarantee there is always a way to stop it: reopening the Jukebox, and also a small persistent "now playing" stop control or a global "Stop all audio" action reachable from the UI (reuse existing TopBar/HUD patterns; keep it minimal and theme-consistent, respect `html.reduce-effects`).
5. Stop playback and release resources on app quit/window unload and when the Electron window is closed or destroyed.
6. Do not change IPC contracts, game launching, or unrelated services. Controller support must keep working (A/B/X mapping unchanged).

Verification (all must pass): `npx tsc -b` 0 errors, `npx vite build` succeeds, `npx oxlint` 0 errors on touched files. Headless browser test (temp script, delete before committing): start track A, start track B, assert only one active playing instance and that A is stopped; Stop truly pauses (`paused === true`); close and reopen modal, controls still work; trigger ErrorBoundary retry, controls still work; count live audio elements/instances before and after, no leaks. Report anything not testable headlessly.

Model suggestion: Gemini Flash medium (switch to Pro 3.1 if the root cause is not found after a first attempt).

Finish: if everything is green, merge `fix/jukebox-stop` into `main` with `git merge --no-ff`, push main normally, push the branch, do NOT delete branches, do NOT edit TASK_QUEUE.md.

## Report file (mandatory, every task)
After finishing, OVERWRITE `AGY_REPORT.md` in the repo root (max 40 lines). It MUST contain: (1) root cause, (2) what you changed and the files, (3) merge status and main commit hash, (4) verification results (`tsc`, `build`, `oxlint`, headless test pass/fail), (5) behaviors NOT verifiable headlessly (for the owner to test with real audio). Commit ONLY that file on `main` with message `docs: agy report` and `git push origin main` (normal push, no force). Do not touch TASK_QUEUE.md. If you failed or aborted, still write the report explaining why.

## Skipped (do NOT execute)
- Task #7: Game Oracle. Skipped, pending owner decision.

## Completed (for reference)
- UI polish: cover fallback and layout clipping (feat/ui-review-fixes, f4d693a)
- Task A: Responsive shell + Reduced Effects switch (feat/responsive-shell)
- Task B: Settings redesign + accent glow + motion pass (feat/settings-glow-motion, b50251f)
- Task C: Merged UI branches into main (c6cc3e4)
- Task D: Merged mini-hud (e407481) and retro-hub (4e6a06f) into main
- Task E: Stabilization, error boundaries, README, packaging (merged to main, 3ff6bb4)
- Task F + F2: Controller support, audited and merged into main (report commit 603374b)
