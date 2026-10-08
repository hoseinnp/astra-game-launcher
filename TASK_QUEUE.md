# TASK_QUEUE

## Current task: Task D - Reconcile unmerged branches (mini-hud, retro-hub)
Context: `origin/feat/mini-hud` and `origin/feat/retro-hub` are not ancestors of main, but main already contains files like InGameMiniHud and RetroHubModal, so the work may already be in main by another route (cherry-pick, copy, squash).

Steps (do each branch separately, mini-hud first):
1. `git fetch origin`; start from up-to-date `main`.
2. For each branch run `git diff --stat main...origin/<branch>` and `git log --oneline main..origin/<branch>`. Decide: (a) content already in main -> do NOT merge, report "already in main" with evidence (files compared); (b) real missing changes -> merge with `git merge --no-ff origin/<branch>`.
3. On any conflict: keep main's `TASK_QUEUE.md` (`git checkout --ours`). For other conflicts, keep main's current UI/Settings/theme behavior (Task A/B work must not regress) and port only the missing feature logic from the branch. List every conflicted file in the report.
4. After each merge: `npx tsc -b`, `npx vite build`, `npx oxlint` (touched files). If anything fails, minimal fix only and report it. If a merge cannot be made green in a reasonable attempt, abort that merge (`git merge --abort`) and report why instead of pushing.
5. `git push origin main` after each successful, green merge. Do NOT edit TASK_QUEUE.md. Do NOT delete branches.
6. Report only: per branch -> decision (already in main / merged / aborted), merge commit hash if any, conflicts, verification results.

## Skipped (do NOT execute)
- Task #7: Game Oracle. Skipped, pending owner decision.

## Completed (for reference)
- UI polish: cover fallback and layout clipping (feat/ui-review-fixes, f4d693a)
- Task A: Responsive shell + Reduced Effects switch (feat/responsive-shell)
- Task B: Settings redesign + accent glow + motion pass (feat/settings-glow-motion, b50251f)
- Task C: Merged UI branches into main (c6cc3e4)
