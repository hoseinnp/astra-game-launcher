# TASK_QUEUE

## Current task: Task C - Merge UI branches into main
Branch chain (each contains the previous): `feat/ui-review-fixes` -> `feat/responsive-shell` -> `feat/settings-glow-motion` (head: b50251f).

Steps:
1. `git fetch origin`. Start from an up-to-date local `main` (`git checkout main && git pull origin main`).
2. Merge `origin/feat/settings-glow-motion` into `main` with a merge commit (`git merge --no-ff origin/feat/settings-glow-motion -m "merge: UI polish, responsive shell, settings glow motion"`). main has extra queue-only commits, so fast-forward is not possible.
3. Conflicts: for `TASK_QUEUE.md` ALWAYS keep main's version (`git checkout --ours TASK_QUEUE.md`). For any other conflict, resolve preserving both sides' intent and list each one in the report.
4. Run `npx tsc -b`, `npx vite build`, `npx oxlint` (touched files). If any fail, fix minimally (build/type fixes only) and report what changed.
5. Push main: `git push origin main`. Do NOT edit TASK_QUEUE.md in this task. Do NOT delete any branches.
6. Report only: merge commit hash, conflicts (if any), verification results, and a plain list of other remote branches that are NOT yet merged into main (`git branch -r --no-merged origin/main`). Do not merge those.

## Skipped (do NOT execute)
- Task #7: Game Oracle. Skipped, pending owner decision.

## Completed (for reference)
- UI polish: cover fallback and layout clipping (feat/ui-review-fixes, f4d693a)
- Task A: Responsive shell + Reduced Effects switch (feat/responsive-shell)
- Task B: Settings redesign + accent glow + motion pass (feat/settings-glow-motion, b50251f)
