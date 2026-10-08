# TASK_QUEUE

## Current task: Task E - Stabilization, error boundaries, packaging
Branch: create `feat/stabilization` from up-to-date `main`. NO new features. NEVER force-push (no `--force`, no `--force-with-lease`, no amending pushed commits).

Why: Mini-HUD, Retro Hub, Recommendations, Save Vault, Jukebox, Activity and the new Settings/glow/motion work were merged quickly and have not been exercised together.

Requirements:
1. Smoke test (headless browser against a `vite build` + preview of the renderer, temp script only; delete it before committing). Visit every library view mode (PS5/console, grid, shelf), the Recommendations hub, Activity dashboard, and open every modal/popup (Settings incl. every category + Advanced, Add Game, Save Vault, Jukebox, Retro Hub, Mod Manager, Theme editor, Activity heatmap, Smart Resume, Mini-HUD settings). Capture every `pageerror` and `console.error`/warning. Errors caused ONLY by the missing Electron bridge in plain-browser mode are expected: list them but do not "fix" them by changing app behavior; if a clean guard (`window.electron?.`) already matches the codebase pattern, add it. Fix every real runtime error found (null/undefined access, bad imports, state bugs). Fixes must be minimal and behavior-preserving.
2. Error boundaries: add one reusable `ErrorBoundary` component (fallback card styled with the accent/glass theme, short message, "Retry" button that resets the boundary, logs the error). Wrap each top-level view and each modal/panel so a crash in one never blanks the app. Fallback respects `html.reduce-effects`.
3. Packaging: check `package.json` for an existing Electron build/dist script. If electron-builder (or equivalent) is configured, use it; if not, add a minimal Windows config as a devDependency. Produce an unpacked/portable build (e.g. `--dir`) to confirm the app packages and launches its main window without crashing; report the output path. Make sure build output folders are in `.gitignore` and are NOT committed.
4. README: update `README.md` with current feature list (Save Vault, Jukebox, Activity + Smart Resume, Mini-HUD, Retro Hub, Recommendations, themeable UI with accent glow, reduced effects), dev commands (`npm run dev`, build, package), and the Mini-HUD hotkey. Keep it concise and accurate to what actually exists in the code.
5. Do not change feature logic, IPC contracts, services behavior, or the look beyond the error fallback UI.

Verification (all must pass): `npx tsc -b` 0 errors, `npx vite build` succeeds, `npx oxlint` 0 errors on touched files, smoke test shows 0 unexpected errors, packaged build launches.

Finish: if everything is green, merge `feat/stabilization` into `main` with `git merge --no-ff` (fast-forward is fine if possible), push main normally, do NOT edit TASK_QUEUE.md, do NOT delete branches.

Report only: commit/merge hash, list of real bugs fixed (file + one line each), list of expected Electron-bridge-only errors (names only), packaging result + output path, verification results.

## Skipped (do NOT execute)
- Task #7: Game Oracle. Skipped, pending owner decision.

## Completed (for reference)
- UI polish: cover fallback and layout clipping (feat/ui-review-fixes, f4d693a)
- Task A: Responsive shell + Reduced Effects switch (feat/responsive-shell)
- Task B: Settings redesign + accent glow + motion pass (feat/settings-glow-motion, b50251f)
- Task C: Merged UI branches into main (c6cc3e4)
- Task D: Merged mini-hud (e407481) and retro-hub (4e6a06f) into main; no unmerged remote branches remain
