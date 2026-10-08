# TASK_QUEUE

## Current task: Task A - Responsive shell + Reduced Effects switch
Branch: create `feat/responsive-shell` from `feat/ui-review-fixes` (do not merge anything into main). Push to origin when done.

Goal: the app must look correct and nothing may clip at small window sizes (down to 640x480).

Requirements:
1. Sidebar: below ~900px width collapse to an icon-only rail with tooltips on hover/focus. Below ~640px the rail becomes a slide-in drawer opened by a hamburger button (close on outside click, Esc, or navigation). Every icon-only button must have an `aria-label` and a tooltip.
2. Game grid / shelf / ps5 views: use auto-fit/minmax columns so cards reflow with no horizontal scroll and no clipped titles or buttons at any width.
3. Modals, popups, Mini-HUD settings, Smart Resume popup, Activity dashboard tabs: constrain to `max-width: 100vw` / `max-height: 100vh` with internal scrolling; tab bars scroll horizontally instead of overflowing.
4. Settings page: single-column stacking below ~800px, no overflow.
5. Reduced Effects: add a single toggle in Settings ("Reduce animations and glow") persisted in localStorage. When on, or when the OS `prefers-reduced-motion` is set, disable animations/transitions and glow/blur effects via a root class (e.g. `html.reduce-effects`). Use CSS variables so Task B can reuse them.
6. Do not change app logic, IPC, or services. UI/CSS/layout only.

Verification (all must pass, report results): `npx tsc -b` 0 errors, `npx vite build` succeeds, `npx oxlint` 0 errors on touched files, headless browser check at 1280, 900, 640 and 480px widths for library (grid/shelf/ps5), Settings, one modal: report no horizontal scroll and no clipped elements.
Report format: branch, commit hash, verification results.

## Up next (do NOT execute yet)
- Task B - Settings redesign + accent glow system + motion pass (details will be added when Task A is done).

## Skipped (do NOT execute)
- Task #7: Game Oracle. Skipped, pending owner decision.

## Completed (for reference)
- UI polish: cover fallback and layout clipping (feat/ui-review-fixes, f4d693a)
