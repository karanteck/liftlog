# LiftLog UI/UX Overhaul Plan

## Context

LiftLog is feature-complete but visually utilitarian — a functional gray button stack that gets the job done but doesn't feel like a consumer fitness app. The screenshots from eufy (data-rich home, color-coded health cards), Strong (circular rest timer, warm-up calculator, exercise illustrations), and Hevy (polished logging with previous-performance columns, exercise notes, routine "Start" buttons) show the gap between "works" and "feels good to use in a gym."

**Goal:** Take LiftLog from developer-tool-gray to polished fitness app — without adding features, just improving how existing features look and feel.

**Decisions made:**
- **Accent color:** Teal/cyan (inspired by eufy's primary color)
- **4th nav tab:** "Profile" (like Strong/Hevy)
- **Scope:** All 3 tiers, one tier per chat session

---

## Progress

- [x] Step 1: Brand Accent Color + Bug Fixes (teal primary, safe-area, hsl/oklch fix)
- [x] Step 2: Toast Notifications
- [x] Step 3: Lucide Icons Throughout
- [x] Step 4: Bottom Navigation Bar
- [x] Step 5: Home Page Redesign
- [x] Step 6: Workout Completion Summary
- [x] Step 7: Animated Transitions (Drawer)
- [x] Step 8: Unified Exercise Search
- [x] Step 9: Finish Confirmation + Touch Targets
- [x] Step 10: Skeleton Loading + Set Undo
- [x] Step 11: Theme-Aware Charts
- [x] Step 12: Circular Rest Timer
- [x] Step 13: History Cards + Theme Color

---

## Tier 1 — High-Impact Foundational Changes

### Step 1: Brand Accent Color + Bug Fixes ✅

**Task 1a — Introduce teal accent color**

Added teal/cyan accent to `--primary` in `globals.css`: `oklch(0.75 0.15 190)` for dark mode, `oklch(0.45 0.15 190)` for light. Updated `--ring` and all five `--chart-*` variables to a teal sequential scale.

Files: `src/app/globals.css`

**Task 1b — Fix safe-area bug**

Added `.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }` to `globals.css`.

Files: `src/app/globals.css`

**Task 1c — Fix hsl/oklch color bug in charts**

Changed `hsl(var(--primary))` → `var(--primary)` and `hsl(var(--muted-foreground))` → `var(--muted-foreground)` in all chart files.

Files: `src/components/frequency-chart.tsx`, `src/components/e1rm-chart.tsx`, `src/components/bodyweight-tracker.tsx`

---

### Step 2: Toast Notifications

**Task 2a — Install Sonner and add Toaster to layout**

Install the shadcn Sonner component. Add `<Toaster />` to the root layout inside `<ThemeProvider>`.

Files: `src/app/layout.tsx`
New package: `sonner`

**Task 2b — Replace all `alert()` calls with toast**

Replace each of the 15 `alert()` calls across 7 files with `toast.error()`.

Files: `workout-session.tsx`, `routine-picker.tsx`, `routine-editor.tsx`, `bodyweight-tracker.tsx`, `routine-list.tsx`, `delete-workout-button.tsx`, `custom-exercise-form.tsx`

---

### Step 3: Lucide Icons Throughout

**Task 3a — Replace Unicode symbols with Lucide icons**

Replace all Unicode character usage (`←`, `×`, `↑`/`↓`, `✓`, `›`, `▲`/`▼`) with proper Lucide React components (`ChevronLeft`, `X`, `ChevronUp`/`ChevronDown`, `Check`, `ChevronRight`). Lucide is already installed.

Files: `workout-session.tsx`, `routine-editor.tsx`, `history/page.tsx`, `history/[id]/page.tsx`, `exercises/[id]/page.tsx`, `analytics/page.tsx`, `routines/page.tsx`, `bodyweight-tracker.tsx`, `bodyweight/page.tsx`, `plates/page.tsx`, `admin/admin-panel.tsx`, `delete-workout-button.tsx`

---

### Step 4: Bottom Navigation Bar

**Task 4a — Create the bottom nav component**

Create `src/components/bottom-nav.tsx` — a fixed-bottom client component with 4 tabs: Home (`Home` icon), Workout (`Dumbbell` or `Plus` icon), History (`Clock` icon), Profile (`User` icon). Uses `usePathname()` to highlight the active tab. Active tab uses the new teal accent. Includes safe-area bottom padding.

Files to create: `src/components/bottom-nav.tsx`

**Task 4b — Create the authenticated layout with route group**

Create a `(main)` route group. Add `src/app/(main)/layout.tsx` that renders `<BottomNav />` below `{children}`. Move all authenticated page directories into `(main)/`. Login and signup stay outside.

Files to create: `src/app/(main)/layout.tsx`
Files to move: all authenticated pages under `src/app/(main)/`

**Task 4c — Clean up redundant back buttons and add bottom padding**

Remove "Back" buttons from top-level tab destinations (History, Analytics, Routines, Bodyweight). Keep back buttons on drill-down sub-pages (workout detail, exercise detail, routine editor). Add `pb-20` to pages to clear the nav bar height.

Files: headers in `history/page.tsx`, `analytics/page.tsx`, `routines/page.tsx`, `bodyweight/page.tsx`, etc.

---

### Step 5: Home Page Redesign

**Task 5a — Redesign the home page with data-rich dashboard**

Replace the 6-button stack with:
- Greeting + "X workouts this week" subtitle
- Quick-start card: prominent "Start Workout" button, with last routine as a one-tap option
- Stats row: 2-3 compact cards (current bodyweight, weekly workout count, training streak)
- Last workout card: most recent completed workout summary (routine name, date, duration, volume, set count), tappable to history detail
- Plateau alerts below stats (existing component, repositioned)

Add server-side queries for: latest bodyweight, workout count this week, most recent completed workout with volume.

Files: `src/app/(main)/page.tsx`

---

### Step 6: Workout Completion Summary

**Task 6a — Add workout summary overlay**

When "Finish" is tapped, instead of immediately redirecting home, show a summary screen:
- Heading with checkmark icon ("Workout Complete")
- Duration, total working sets, total volume (computed from exercise states)
- Any PRs hit during the session (accumulate in a `sessionPRs` array instead of the current 4-second flash-and-forget)
- Per-exercise summary (name, sets done, top weight)
- "Done" button → home

Files: `src/app/workout/[id]/workout-session.tsx`

---

## Tier 2 — Experience Polish

### Step 7: Animated Transitions

**Task 7a — Install Drawer component**

Install shadcn Drawer (uses `vaul` library). This gives a slide-up bottom sheet with drag-to-dismiss.

New package: `vaul`

**Task 7b — Wrap exercise search in Drawer**

Replace the `fixed inset-0` overlay in workout-session.tsx with a `<Drawer>` that slides up from the bottom (~85% height, draggable to dismiss).

Files: `src/app/workout/[id]/workout-session.tsx`

**Task 7c — Wrap exercise picker in Drawer**

Same treatment for the exercise picker in the routine editor.

Files: `src/components/routine-editor.tsx`

---

### Step 8: Unified Exercise Search

**Task 8a — Create unified exercise search component**

Merge `exercise-picker.tsx` and `exercise-search.tsx` into one component with:
- Recently-used section at top (from exercise-search)
- Muscle group + equipment filter chips (from exercise-picker)
- Grouped exercise listing (from exercise-search)
- Custom exercise creation (from exercise-picker)
- Flexible `onSelect` callback that includes all fields

Files to create: `src/components/exercise-search-unified.tsx`

**Task 8b — Wire up the unified component and delete old ones**

Update `workout-session.tsx` and `routine-editor.tsx` to use the new component. Delete the old `exercise-picker.tsx` and `exercise-search.tsx`.

Files to modify: `workout-session.tsx`, `routine-editor.tsx`
Files to delete: `exercise-picker.tsx`, `exercise-search.tsx`

---

### Step 9: Finish Confirmation + Touch Targets

**Task 9a — Add workout finish confirmation dialog**

Install shadcn AlertDialog. Wrap the "Finish" button in a confirmation: "Finish this workout? You logged X sets across Y exercises."

Files: `src/app/workout/[id]/workout-session.tsx`
New component: AlertDialog

**Task 9b — Increase touch targets across the app**

Bump routine editor reorder/remove buttons from `w-7 h-7` (28px) to `w-11 h-11` (44px). Bump set checkmarks from `h-9 w-9` (36px) to `h-11 w-11`. Make back buttons proper icon buttons. Increase filter chip padding.

Files: `routine-editor.tsx`, `workout-session.tsx`, `bodyweight-tracker.tsx`

---

### Step 10: Skeleton Loading + Set Undo

**Task 10a — Add skeleton loading screens**

Install shadcn Skeleton. Create `loading.tsx` files for History, Analytics, and Bodyweight pages with shimmer placeholder layouts. Replace "Loading..." text in exercise search with skeleton rows.

New component: Skeleton
Files to create: `history/loading.tsx`, `analytics/loading.tsx`, `bodyweight/loading.tsx`

**Task 10b — Add set undo/uncomplete capability**

Make the green checkmark tappable on completed sets. Tapping it deletes the set from Supabase and resets the set to editable. Recompute PRs from remaining completed sets.

Files: `src/app/workout/[id]/workout-session.tsx`

---

## Tier 3 — Visual Refinement

### Step 11: Theme-Aware Charts

**Task 11a — Create theme-aware chart color system**

Define two `MUSCLE_COLORS` maps (light and dark) in `src/lib/chart-colors.ts`, selected via `useTheme()`. Update all chart components to use them instead of hardcoded Flat UI hex values.

Files to create: `src/lib/chart-colors.ts`
Files to modify: `hard-sets-chart.tsx`, `volume-trend-chart.tsx`, `imbalance-chart.tsx`

---

### Step 12: Circular Rest Timer

**Task 12a — Redesign rest timer with circular countdown**

Rewrite `rest-timer.tsx` to use an SVG circle with `stroke-dashoffset` animation. Time displays inside the circle. Taller fixed-bottom container (~100px). "Skip" button below the circle. Same behavior (auto-start, vibrate on zero, count up after, save rest duration), new visuals. Include `safe-bottom` padding.

Files: `src/components/rest-timer.tsx`

---

### Step 13: History Cards + Theme Color

**Task 13a — Enrich workout history cards**

Add total volume, mini exercise summary (first 2-3 exercise names), and a subtle accent-colored left border. Expand the server query to join through sets → exercises for names and volume.

Files: `src/app/(main)/history/page.tsx`

**Task 13b — Dynamic viewport themeColor**

In `ThemeProvider`, update `<meta name="theme-color">` content when the theme toggles so browser chrome matches the active theme.

Files: `src/components/theme-provider.tsx`

---

## Summary

| Tier | Steps | Tasks | New packages | Chat session |
|------|-------|-------|-------------|-------------|
| Tier 1 (Foundation) | Steps 1–6 | 10 tasks | sonner | Chat 1 |
| Tier 2 (Polish) | Steps 7–10 | 8 tasks | vaul, AlertDialog, Skeleton | Chat 2 |
| Tier 3 (Refinement) | Steps 11–13 | 4 tasks | — | Chat 3 |
| **Total** | **13 steps** | **22 tasks** | **sonner, vaul** | |

---

## Verification

After each step:
- `npm run build` to catch type errors
- Test on mobile viewport (375px) in both dark and light mode
- Test the workout logging flow end-to-end after any workout-session changes
- Visually verify in the browser before reporting complete

---

## Intentionally Not Included

- **Social features / feed** — LiftLog is a 2-person household app
- **Exercise images/videos** — requires asset hosting, conflicts with free tier
- **Drag-to-reorder** — intentionally skipped per CLAUDE.md
- **Offline-first** — removed from spec per CLAUDE.md
- **Onboarding flow** — approval-gated for a known household
