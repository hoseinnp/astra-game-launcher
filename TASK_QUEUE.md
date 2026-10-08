# TASK_QUEUE

## Current task: Task B - Settings redesign + accent glow system + motion pass
Branch: create `feat/settings-glow-motion` from `feat/responsive-shell` (do not merge anything into main). Push to origin when done.

Goal: make the app feel more visual and flashy (animations, glow) while Settings becomes cleaner and easier to navigate. Everything must stay correct at 640px width and above (Task A's responsive rules must not regress).

Requirements:
1. Settings layout: left category rail (icon + label; collapses to icons or a top scroller on narrow widths), search box at the top that filters settings by name/description, and settings grouped into glass cards. Rarely used or duplicate options go inside a collapsible "Advanced" section per category (collapsed by default). Keep every existing setting reachable; do not delete settings or change what they do.
2. Controls: replace plain checkboxes with animated toggle switches; consistent slider, select and button styles; visible keyboard focus rings; every control labeled.
3. Accent glow system: define accent color and glow intensity as CSS variables on the root (e.g. `--accent`, `--accent-glow`, `--glow-intensity`). Add to Settings > Appearance: accent color picker with 6 preset swatches plus custom, and a glow intensity slider (0-100) with a live preview card. Persist in localStorage and apply on startup with no flash. Existing glows/borders/active states should use these variables.
4. Motion pass: staggered fade/slide-in for game cards on view load, hover lift + glow on cards and buttons, smooth cross-fade between views/pages, animated active-indicator on the sidebar, animated tab underline. Use CSS transitions or lightweight CSS animations only (no new heavy dependencies). Keep durations 150-300ms.
5. Task A integration (mandatory): all new animations, glow and blur MUST be disabled when `html.reduce-effects` is set or `prefers-reduced-motion` is active. Glow intensity 0 must remove glow entirely.
6. UI/CSS/layout only: do not change app logic, IPC or services. Preference storage uses the existing settings/localStorage pattern.

Verification (all must pass, report results): `npx tsc -b` 0 errors, `npx vite build` succeeds, `npx oxlint` 0 errors on touched files, headless browser check at 1280, 900, 640px: Settings (search filters correctly, Advanced collapses/expands, no horizontal scroll), library view (cards animate in, no clipping), accent change updates glow live, and with reduce-effects ON no animations or glow remain.
Report format: branch, commit hash, verification results.

## Skipped (do NOT execute)
- Task #7: Game Oracle. Skipped, pending owner decision.

## Completed (for reference)
- UI polish: cover fallback and layout clipping (feat/ui-review-fixes, f4d693a)
- Task A: Responsive shell + Reduced Effects switch (feat/responsive-shell)
- Task B: Settings redesign + accent glow system + motion pass (feat/settings-glow-motion)
