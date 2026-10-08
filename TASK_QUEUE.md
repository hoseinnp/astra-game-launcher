# TASK_QUEUE

## Current task: Task F2 - Close-out audit of Task F (controller support)
Your last report was missing: verification results, merge status/hash, a file list, and a per-requirement status. Do NOT add new features beyond the gaps below. NEVER force-push (no `--force`, no `--force-with-lease`, no amending pushed commits).

Steps:
1. `git fetch origin`. Determine whether `feat/controller-support` is merged into `main` (`git branch -r --merged origin/main`). If NOT merged and everything is green after step 3, merge with `git merge --no-ff` and push main normally.
2. Audit the code against Task F requirements and mark each as DONE / PARTIAL / MISSING with the file(s) responsible:
   a. GamepadService polling only while a gamepad is connected AND window focused (zero polling otherwise)
   b. Mapping: D-pad/left stick move, A activate, B back/close top modal, X context action, Y open search, LB/RB switch view mode (and Settings category tabs inside Settings), Start opens Settings, Select opens Recommendations or Activity
   c. Spatial navigation across PS5 tiles, grid cards, shelf items, TopBar buttons, and inside every modal with focus trapped in the top modal; B restores previous focus
   d. Scroll-into-view (instant when `html.reduce-effects`)
   e. Focus ring uses `--accent`/`--accent-glow`, only in controller mode, exits on mouse move or key press, respects reduce-effects
   f. Hint bar with Xbox vs PlayStation glyphs by gamepad id; hides on mouse/keyboard
   g. Connect/disconnect toast
   h. Settings: Controller support toggle, deadzone slider, Vibration feedback toggle (default OFF, uses `vibrationActuator` when available)
   i. Safety: ignores nav while text input focused, while a game launch/running overlay is active; no conflict with Mini-HUD hotkey or global shortcuts
3. Implement every MISSING or PARTIAL item that is small and low-risk. For large gaps, do not implement; list them. Then run `npx tsc -b`, `npx vite build`, `npx oxlint` (touched files) and re-run your mocked-gamepad headless test for the behaviors you can test.
4. Make sure no temp test scripts (e.g. `test-controller.cjs`) or build output are committed to `main`; if any are, remove them in a normal commit.

Model suggestion: Gemini Flash medium (switch to Pro 3.1 only if many gaps are PARTIAL/MISSING).

## Report file (mandatory, every task)
After finishing, OVERWRITE `AGY_REPORT.md` in the repo root (max 40 lines). It MUST contain: (1) merge status of `feat/controller-support` and the main commit hash, (2) the a-i checklist with DONE/PARTIAL/MISSING, (3) verification results (`tsc`, `build`, `oxlint`, headless test pass/fail), (4) list of files added/changed, (5) behaviors NOT verifiable headlessly (for real-controller testing by the owner). Commit ONLY that file on `main` with message `docs: agy report` and `git push origin main` (normal push, no force). Do not touch TASK_QUEUE.md. If you failed or aborted, still write the report explaining why.

## Skipped (do NOT execute)
- Task #7: Game Oracle. Skipped, pending owner decision.

## Completed (for reference)
- UI polish: cover fallback and layout clipping (feat/ui-review-fixes, f4d693a)
- Task A: Responsive shell + Reduced Effects switch (feat/responsive-shell)
- Task B: Settings redesign + accent glow + motion pass (feat/settings-glow-motion, b50251f)
- Task C: Merged UI branches into main (c6cc3e4)
- Task D: Merged mini-hud (e407481) and retro-hub (4e6a06f) into main
- Task E: Stabilization, error boundaries, README, packaging (merged to main, 3ff6bb4)
- Task F: Controller support implemented on feat/controller-support (merge/verification pending Task F2)
