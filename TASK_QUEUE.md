# TASK_QUEUE

## Current task: Task H - Sync app version with release (single source of truth, v1.0.0)
Branch: create `fix/version-sync` from up-to-date `main`. NEVER force-push (no `--force`, no `--force-with-lease`, no amending pushed commits). No new features.

Problem (owner): the app UI still shows the old name "Astra v3", while the packaged release shows a different version. Owner decision: the version everywhere is now **1.0.0** (fresh start).

Requirements:
1. Single source of truth: `package.json` `"version": "1.0.0"` (also update `package-lock.json` root version fields to match). Nothing else may hardcode a version.
2. Renderer: inject the version at build time (e.g. Vite `define` -> `__APP_VERSION__` read from `package.json`, with a matching type declaration) or via Electron `app.getVersion()` through an existing IPC channel if one already exists (do not add new IPC contracts unless there is no clean alternative). Show it as `v1.0.0` wherever the app currently shows its version/name.
3. Find and replace EVERY hardcoded old-version string across the project: search for `v3`, `V3`, `3.0`, `Astra 3`, `Astra v3`, `astra-v3`, `AstraV3` (case-insensitive) in `src/`, `electron/`, `index.html`, `README.md`, `electron-builder.json`, `package.json` fields (name/productName/description/appId/artifactName), splash/startup screens, TopBar, Settings footer/About, Mini-HUD, window titles (`BrowserWindow` title and `<title>`), tray tooltip, notifications, and JSON/data defaults. Do not rename the product itself beyond removing the stale "v3" version label; keep the name "Astra Game Launcher". Do not change `appId` if it would break existing user data/install paths; report if you left any such id unchanged and why.
4. Packaging: `electron-builder` must pick up the version from `package.json` (no hardcoded `buildVersion`/`artifactName` versions). Artifact/installer names should include `${version}`.
5. Do not create git tags or GitHub releases in this task.

Verification (all must pass): `npx tsc -b` 0 errors, `npx vite build` succeeds, `npx oxlint` 0 errors on touched files. Headless browser check on the built renderer: rendered text shows `v1.0.0` where expected and contains no `v3`/`V3`/`Astra 3` anywhere (startup screen, TopBar, Settings, Mini-HUD, About). Run `npx electron-builder --dir` and report the version found in the packaged output (e.g. `resources/app/package.json` and/or the exe ProductVersion). Final grep over tracked files (excluding `node_modules`, lockfile hashes, and `dist*`) shows no remaining stale version strings; list any intentional leftovers.

Model suggestion: Gemini Flash medium.

Finish: if everything is green, merge `fix/version-sync` into `main` with `git merge --no-ff`, push main normally, push the branch, do NOT delete branches, do NOT edit TASK_QUEUE.md.

## Report file (mandatory, every task)
After finishing, OVERWRITE `AGY_REPORT.md` in the repo root (max 40 lines). It MUST contain: (1) where the old version strings were (file list), (2) how the version now flows (source -> app/UI -> packaging), (3) merge status and main commit hash, (4) verification results (`tsc`, `build`, `oxlint`, headless text check, packaged version found, final grep), (5) intentional leftovers or anything NOT verifiable headlessly. Commit ONLY that file on `main` with message `docs: agy report` and `git push origin main` (normal push, no force). Do not touch TASK_QUEUE.md. If you failed or aborted, still write the report explaining why.

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
- Task G: Jukebox single audio singleton + stop controls (merged to main, ea3432d)
