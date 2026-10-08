# TASK_QUEUE

## Current task: Task F - Controller (gamepad) support
Branch: create `feat/controller-support` from up-to-date `main`. NEVER force-push (no `--force`, no `--force-with-lease`, no amending pushed commits). No new dependencies: use the browser Gamepad API (`navigator.getGamepads()`) in the renderer.

Goal: the whole launcher, especially the PS5/console view, is fully usable with an Xbox/PlayStation-style controller. Mouse and keyboard behavior must not change.

Requirements:
1. Input service: one small `GamepadService` (singleton, requestAnimationFrame polling, only while a gamepad is connected and the window is focused). Standard mapping: D-pad and left stick (deadzone ~0.4, repeat delay ~350ms then ~120ms) = move focus; A/Cross = activate focused item; B/Circle = back / close top modal; X/Square = context action if one exists (e.g. favorite/launch), otherwise nothing; Y/Triangle = open search; LB/RB = switch view mode (PS5/grid/shelf) or category tab when inside Settings; Start = open Settings; Select/Back = open Recommendations or Activity (pick what exists). Emit connect/disconnect events.
2. Spatial focus navigation: a lightweight spatial-navigation helper that moves focus to the nearest focusable element in the pressed direction (use bounding boxes, no library). Mark focusable items with an attribute (e.g. `data-gp-focusable`) or reuse tabindex/buttons. Works across PS5 tiles, grid cards, shelf items, TopBar buttons, and inside every modal (focus is trapped in the top modal while it is open; B closes it and restores previous focus). Scroll focused item into view smoothly (instant when `html.reduce-effects`).
3. Visual focus: a clear focus ring/glow on the focused element using the existing `--accent` and `--accent-glow` variables; shown only while controller mode is active (switches to controller mode on gamepad input, back to normal on mouse move or key press). Respect `html.reduce-effects` and `prefers-reduced-motion`.
4. Controller hint bar: small bottom-corner legend (A Select, B Back, LB/RB Switch view, Start Settings) that appears only in controller mode, adapts glyphs to Xbox vs PlayStation by gamepad id, hides when mouse/keyboard is used. A toast on connect/disconnect.
5. Settings > (Input or System): "Controller support" toggle (default ON), deadzone slider, "Vibration feedback" toggle (light pulse on activate via `vibrationActuator` when available, default OFF). Persist using the existing settings/localStorage pattern.
6. Safety: ignore gamepad navigation while a text input/textarea is focused, while a game is launching/running overlay is active, and when no window focus. Must not conflict with Mini-HUD hotkey or other global shortcuts. Must not steal focus or break anything when no gamepad is connected (zero overhead: no polling).
7. Do not change IPC contracts, game launching logic, or unrelated services. Wrap new UI in the existing `ErrorBoundary` pattern where relevant.

Verification (all must pass): `npx tsc -b` 0 errors, `npx vite build` succeeds, `npx oxlint` 0 errors on touched files. Headless browser test with a mocked `navigator.getGamepads` (temp script, delete before committing): connect event shows toast + hint bar; D-pad moves focus across PS5 tiles and grid cards; A opens game overview; B closes it; LB/RB switch view; Start opens Settings and focus stays trapped inside; typing in search input is not hijacked; mouse move exits controller mode; no polling when no gamepad. Report any part that could not be tested headlessly.

Finish: if everything is green, merge `feat/controller-support` into `main` with `git merge --no-ff`, push main normally, push the branch, do NOT edit TASK_QUEUE.md, do NOT delete branches.

Report only: merge hash, files added/changed (names), behaviors verified, behaviors NOT verified headlessly (so the owner can test with a real controller), verification results.

## Report file (mandatory, every task)
After finishing, write your final report to `AGY_REPORT.md` in the repo root (overwrite it each task; max 40 lines; same content as the Report format above, plus the model you ran on if you know it). Commit ONLY that file on `main` with message `docs: agy report` and `git push origin main` (normal push, no force). Do not touch TASK_QUEUE.md. If the task failed or you aborted, still write the report explaining why.

## Skipped (do NOT execute)
- Task #7: Game Oracle. Skipped, pending owner decision.

## Completed (for reference)
- UI polish: cover fallback and layout clipping (feat/ui-review-fixes, f4d693a)
- Task A: Responsive shell + Reduced Effects switch (feat/responsive-shell)
- Task B: Settings redesign + accent glow + motion pass (feat/settings-glow-motion, b50251f)
- Task C: Merged UI branches into main (c6cc3e4)
- Task D: Merged mini-hud (e407481) and retro-hub (4e6a06f) into main
- Task E: Stabilization, error boundaries, README, packaging (merged to main, 3ff6bb4)
