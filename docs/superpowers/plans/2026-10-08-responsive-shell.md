# Task A - Responsive Shell & Reduced Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the app looks correct and nothing clips at small window sizes down to 640x480 (and 480px width), with collapsible navigation rail/drawer, reflowed library cards, constrained modals and popups with horizontal-scrolling tabs, stacked settings, and a persistent Reduced Effects toggle.

**Architecture:** 
1. Introduce CSS custom properties in `src/index.css` for motion and glow transitions, applied globally and overridden by `html.reduce-effects` or `@media (prefers-reduced-motion: reduce)`.
2. Store `reduceEffects` in AppSettings / localStorage and bind it to the document root class.
3. Add a responsive navigation bar/rail/drawer in `TopBar.tsx`: full header at wide screens, icon rail with tooltips on medium screens (~640px-900px), and mobile slide-in drawer with hamburger button below 640px.
4. Update library views (`GridView.tsx`, `ConsoleView.tsx`, `PhysicalShelfView.tsx`) to reflow gracefully with `auto-fit`/`minmax` grids, wrap badges, and prevent clipping.
5. Constrain all modals and overlays to `max-w-full max-h-[96vh] sm:max-h-[90vh]` with internal scrolling and `overflow-x-auto` tab bars.
6. Make SettingsModal single-column stacked below 800px and add the "Reduce animations and glow" toggle.

**Tech Stack:** React 19, TypeScript 6.0, Tailwind CSS v4, Lucide React, Puppeteer for verification.

**Spec:** `TASK_QUEUE.md` (Task A)

---

### Task 1: Reduced Effects Root Tokens & Settings Toggle
- Add CSS variables `--anim-duration`, `--glow-spread`, etc. and `.reduce-effects` class in `src/index.css`.
- Update `AppSettings` type and `StoreService` defaults for `reduceEffects`.
- Add toggle in `SettingsModal.tsx` ("Reduce animations and glow").
- Bind effect in `src/App.tsx` on `<html>` / documentElement.

### Task 2: Responsive Header, Navigation Rail & Slide-In Drawer
- In `src/components/layout/TopBar.tsx`, adapt layout across breakpoints:
  - Default (>900px): standard full header.
  - ~640px-900px: icon-only compact rail with tooltips and accessible `aria-label` attributes.
  - <640px: hamburger button opens slide-in drawer with backdrop, closing on outside click, Escape, or item click.

### Task 3: Library Views Reflow & Auto-Fit
- In `GridView.tsx`: reflow cards using responsive auto-fit/minmax grid, flex wrap for filter/search bars, wrap badges so no titles or buttons clip.
- In `ConsoleView.tsx`: responsive ribbon controls and details section, stacking metadata badges and button rows below 800px/640px.
- In `PhysicalShelfView.tsx`: make shelf tier items wrap or scroll cleanly without viewport overflow.

### Task 4: Modals, Popups, Mini-HUD & Tab Bars Constraining
- Ensure modals (`SettingsModal`, `AddGameModal`, `GameOverviewModal`, `EditThemeModal`, `ModManagerModal`, `RetroHubModal`, `SaveVaultModal`, `RecommendationsHub`, `ActivityDashboardModal`, `JukeboxModal`, `SmartResumePopup`, `InGameMiniHud`) have `max-w-[calc(100vw-1rem)]`, `max-h-[calc(100vh-1rem)]`, internal scrolling, and `overflow-x-auto no-scrollbar` tab bars.
- Settings page single-column below 800px.

### Task 5: Verification & Puppeteer Visual Layout Checks
- Run `npx tsc -b`, `npx vite build`, `npx oxlint`.
- Run automated headless browser script at 1280px, 900px, 640px, and 480px checking for `scrollWidth <= clientWidth` and no clipped elements.
- Push `feat/responsive-shell` to origin.
