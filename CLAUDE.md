# Project: Workout Tracker

Read SPEC.md in full before making any changes. It is the source of truth for
scope, data model, routines and build order.

## About the person you are working with

- I am not a developer. I work in venture capital. I can read logic and reason
  about tradeoffs, but I do not know framework conventions, package ecosystems,
  or shell commands.
- Explain what you are about to do in plain language before you do it.
- Do not assume I know acronyms. Expand them the first time.
- When there is a decision to make, give me two or three options with the
  tradeoffs and your recommendation. Do not ask an open question with no
  context.
- Tell me the risk up front rather than letting me discover it later.
- Be direct. I would rather hear that something was a bad idea than have it
  quietly worked around.

## Stack (do not substitute anything)

- Next.js, App Router, TypeScript
- Supabase for Postgres, Auth, and Row Level Security
- Tailwind CSS with shadcn/ui components
- Recharts for charts
- Deployed to Vercel
- Progressive Web App, installable to a phone home screen

If you think a different tool is genuinely better, say so and explain why, but
do not switch without my agreement.

## Supabase specifics

- This project uses the new Supabase API key format: `sb_publishable_...` and
  `sb_secret_...`. It does NOT use the legacy `anon` and `service_role` JWT
  keys. Name environment variables accordingly.
- The publishable key is safe in the browser. The secret key must never reach
  client-side code.

## Hard rules

- **Mobile first.** Every screen must be usable one handed, on a phone, in a
  gym, quickly. Desktop is an afterthought.
- **Set level logging only.** Never aggregate at write time. All analytics
  derive from the sets table at read time.
- **All database access goes through Supabase with Row Level Security
  enabled.** Never bypass RLS. Never use the secret key from the client.
- **Database changes go in `/supabase/migrations` as numbered SQL files.**
  Never tell me to click around in the Supabase dashboard to change schema.
  Every schema change must be reproducible from the repo.
- **Ask before adding any npm package.** Tell me what it does, whether there
  is a built-in alternative, and confirm it is free.
- **Secrets live in `.env.local` only.** Never hardcode them. Never commit
  them. Confirm `.env.local` is in `.gitignore` before the first commit.
- **Everything stays on free tiers.** Flag anything that would create a
  recurring cost.
- **Do not invent exercise definitions.** SPEC.md section 3 flags two exercise
  names that need confirming with me before seeding. Ask rather than guess.

## Working style

- Do one task at a time. Stop after each and show me what changed.
- Never make sweeping changes across many files without first telling me what
  you plan to touch.
- After each feature works end to end, stop, tell me to commit, and give me
  the commit message.
- If something you tried did not work, say so plainly. Do not paper over it
  and move on.
- If I ask for something that contradicts SPEC.md, point out the conflict
  before doing it.

## Build order (do not skip ahead)

1. Scaffold Next.js, TypeScript, Tailwind, shadcn/ui
2. Push to GitHub, connect Vercel, deploy the empty app and confirm it loads
3. Supabase schema plus RLS policies, as a migration file
4. Auth. Both accounts able to log in
5. Exercise library seed data, generated as one JSON file
6. Seed the seven routines from SPEC.md section 3
7. Workout logging screen
8. Workout history and previous-performance display

Step 2 comes before any real feature work. Proving the deploy pipeline on an
empty app is far cheaper than debugging it later on a half-built one.

## Current phase

**All 5 phases complete.** App is feature-complete per SPEC.md.

Phase 1 (logging) is complete — all 12 build steps done.

Phase 2 (history, PRs, routine editing) is complete — all 10 steps done.

Phase 3 (analytics) is complete — all 6 tasks done:
1. Analytics page scaffold (`/analytics` with nav link from home)
2. e1RM trend chart per exercise (Recharts line chart on exercise history)
3. Weekly hard sets per muscle group (stacked bar chart)
4. Volume load trend per muscle group (multi-line chart)
5. Training frequency & adherence (workouts per week bar chart with average)
6. Imbalance ratios (push:pull and quad:hamstring grouped bar charts)

Phase 4 (plateau engine) is complete — all 5 tasks done:
1. Database migration (`plateau_alerts` table with RLS)
2. Detection engine (`src/lib/plateau.ts`) — 6 signals, 4 guardrails
3. Server runner (`src/lib/plateau-runner.ts`) — data fetching, variation
   map from exercises table, deduplication, alert storage
4. Home page insight cards with dismiss and 14-day cooldown

Phase 5 (notifications) is complete — 2 of 3 tiers done:
1. In-app insight cards — done (plateau cards from Phase 4)
2. Weekly email digest — done (`/api/weekly-digest` route, Resend,
   pg_cron fires every Sunday 8am UTC). Digest builder at
   `src/lib/weekly-digest.ts`.
3. Web push — skipped per spec (low priority, iOS restrictions)

Pre-Phase 3 fixes (all done):
- Household toggle, bodyweight & notes inputs, 250 exercises, equipment filter

Post-audit bug fixes (all done):
- Custom exercise form: equipment and movement pattern values now use
  underscored format matching the database (was breaking imbalance chart
  and plateau engine for custom exercises)
- Exercise picker: equipment filter for smith machine, EZ bar, and
  resistance band now matches seeded exercise values (was returning zero
  results)
- RPE input: optional 1-10 select dropdown added to each working set row
  for weight_reps, bodyweight_reps, and reps_only tracking types (the
  sets table already had the rpe column but no UI was writing to it)

Kriti feedback items (all done):
- Delete workout, back buttons, retroactive logging, sports/cardio tracking
- Core routine — Kriti builds herself using routine builder

Post-spec audit fixes (all done):
- Previous performance query now filters by current user only (was
  showing household member's data as "Last time" during workout logging)
- Minimal service worker added (`public/sw.js`) + registration in
  `layout.tsx` — app is now installable as a PWA
- Rest timer now saves actual rest duration to `sets.rest_seconds` on
  dismiss (column existed but was never written to)
- Exercises added mid-workout via "+ Add Exercise" now fetch previous
  performance, pre-fill sets, and show the "Add weight?" progression
  prompt (previously only routine-template exercises got this)

Spec gaps acknowledged and intentionally skipped:
- Favourites in exercise search — "recently used" covers the need
- Drag-to-reorder in routine editor — up/down buttons work better
  on mobile touch screens

Offline-first was removed from the spec (not pursuing).

11 database migrations exist (00001–00011). All applied to Supabase.

Vercel environment variables set: `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`,
`CRON_SECRET` (all marked sensitive, production + preview).

pg_cron job `weekly-digest` is scheduled in Supabase (Sunday 8am UTC).

Resend is on free tier — currently can only send to Karan's email. To
send to Kriti, verify a domain in Resend dashboard.

UI/UX overhaul (complete — see `UI_UX_OVERHAUL.md` for full plan):
- Steps 1–6 done (Tier 1: Foundation):
  1. Teal accent color, safe-area fix, chart hsl/oklch bug fix
  2. Toast notifications (Sonner replaces all alert() calls)
  3. Lucide icons throughout (replaces Unicode symbols)
  4. Bottom navigation bar (4 tabs: Home, Workout, History, Profile),
     `(main)` route group, Profile page, redundant back buttons removed
  5. Home page redesign (data-rich dashboard with stats, last workout,
     quick-start card, plateau alerts)
  6. Workout completion summary (duration, sets, volume, PRs,
     per-exercise breakdown)
- Steps 7–10 done (Tier 2: Experience Polish):
  7. Animated transitions — exercise search/picker now uses bottom-sheet
     Drawer (`@base-ui/react`) with drag-to-dismiss
  8. Unified exercise search — merged `exercise-picker.tsx` and
     `exercise-search.tsx` into one component with recently-used,
     filter chips, grouped listing, and custom exercise creation
  9. Finish confirmation — AlertDialog before ending workout, bigger
     touch targets (44px) on set checkmarks and routine editor buttons
  10. Skeleton loading screens for all routes (History, Analytics,
      Bodyweight had them from v1; Home, More, Workout/new, Workout/[id],
      Routines, Routines/[id], Exercises/[id] added later);
      set undo (tap green checkmark to uncomplete and delete from DB)
- Steps 11–13 done (Tier 3: Refinement):
  11. Theme-aware charts — `src/lib/chart-colors.ts` with light/dark
      muscle color palettes, all chart components use `useMuscleColors()`
  12. Circular rest timer — SVG circle countdown with stroke-dashoffset
      animation, time inside circle, skip/dismiss button
  13. History cards enriched (volume, exercise names, teal left border),
      dynamic `<meta name="theme-color">` in ThemeProvider
- New packages: `sonner`, `@base-ui/react` (Drawer, AlertDialog, Skeleton)
- Route structure: authenticated pages now live under `src/app/(main)/`,
  login/signup stay at `src/app/`. URLs unchanged.

StrongBoi rebrand & UI polish (all done):
- App renamed from LiftLog to StrongBoi (metadata, manifest, login,
  email digest, PWA icons)
- Barbell mark logo from design handoff (teal plates on dark tile,
  `icon-1b.svg`). PNGs generated at 192px and 512px.
- Font changed from Geist to Inter via `next/font/google`; fixed CSS
  variable wiring (`--font-sans` instead of `--font-geist`)
- Icon sizes bumped two tiers: stat cards and inline icons to `h-6 w-6`,
  bottom nav icons to `h-7 w-7`, primary action icons to `h-6 w-6`
- Bottom nav raised with `pb-3`, container `h-16`, tab width `w-20`
- Button touch targets increased: default 32→40px, sm 28→36px,
  lg 36→44px, icon 32→40px, icon-sm 28→36px, icon-lg 36→44px
- Workout inputs bumped from `h-9` to `h-11` (44px), set checkmark
  `h-12 w-12`, "+ Add set" button padding increased
- All pages updated to `pb-24` for taller bottom nav

UI/UX overhaul v2 (complete — plan at `~/.claude/plans/should-i-use-claude-serene-naur.md`):
4 tiers, 16 steps. Two approved spec overrides: RPE tap-to-reveal (Step 10),
previous performance as ghost placeholders (Step 11).

- Tier 1 done (Steps 1–5: Visual Foundation):
  1. Card elevation — dark card oklch 0.205→0.22, shadow-sm/shadow-md on Card
  2. Micro-label cleanup — all text-[10px]/text-[11px] → text-xs (23 instances, 9 files)
  3. Login branding — barbell logo (64px) + tagline on login and signup pages
  4. Color tokens — --success (green) and --warning (amber) in globals.css
  5. Keyframe animations — set-complete, pr-celebrate, rest-done-pulse defined
- Tier 2 done (Steps 6–9: Information Architecture):
  6. Bottom nav 4→5 tabs (Home, Workout, History, Analytics, More), w-20→w-16
  7. More page at /more replaces Profile; Analytics link removed (has own tab)
  8. Exercise names in workout session are tappable links to /exercises/[id];
     BackButton component uses router.back() for context-aware navigation
  9. History page List/Calendar toggle; calendar-heatmap.tsx month grid with
     teal dots on workout days, prev/next month nav, tap-to-navigate
- Tier 3 done (Steps 10–14: Workout Logging Experience):
  10. RPE tap-to-reveal — removed RPE `<select>` and 3rem column from
      all set grids; completed working sets show tappable "RPE" label
      with circular buttons 6–10; saves via DB update; `updateRpe`
      callback and `rpeOpenFor` state added
  11. Ghost placeholders — "Last: 80kg × 10, 10, 8" text removed;
      previous performance now shows as placeholder values in weight/reps
      inputs (visible when field is cleared); pre-fill kept for one-tap
      logging; dead `formatPrevious` function removed
  12. Set completion micro-interaction — checkmark gets `set-complete`
      keyframe animation (300ms scale bounce); `navigator.vibrate(50)`
      haptic on successful set save
  13. PR celebration upgrade — `animate-bounce` → `pr-celebrate` keyframe
      (600ms slide-down + gold glow); timeout 4s→5s; double-buzz haptic
      `navigator.vibrate([100, 50, 100])` distinguishes from set buzz
  14. Rest timer enlarged — CIRCLE_SIZE 80→120, STROKE_WIDTH 5→6, time
      text-lg→text-2xl, dismiss button h-8→h-11 text-sm, padding py-3→py-5,
      `rest-done-pulse` animation on timer expiry
- Tier 4 done (Steps 15–16: Stretch Polish):
  15. Home page quick links — pill-shaped Routines and Bodyweight shortcut
      buttons between stat cards and last workout card; teal icons,
      rounded-full styling distinct from surrounding cards
  16. Exercise history links in workout detail — already done as part of
      Step 8 (exercise names in history/[id] were already Link components
      to /exercises/[id])

Performance (all done):
- Skeleton loading screens added to all main routes — navigation shows
  instant skeleton feedback instead of frozen screen while server
  components fetch data from Supabase

Code audit fixes (all done — 4 major, 3 moderate, 6 marginal):

Major:
- Error boundaries: route-level `src/app/(main)/error.tsx` + reusable
  `src/components/error-boundary.tsx` for individual sections (charts,
  alerts). Prevents full page crashes.
- Generated Supabase types (`src/lib/supabase/database.types.ts`) —
  `createBrowserClient<Database>` and `createServerClient<Database>`
  for type-safe DB queries. Custom exercise form uses DB enum types.
- Workout session split: 1,204-line god component → 4 files:
  `workout-session.tsx` (679 lines), `exercise-card.tsx` (337 lines),
  `workout-summary.tsx` (133 lines), `types.ts` (shared type defs)
- Analytics date-range filter: default 12 weeks, options for 6mo/1yr/all.
  Prevents unbounded queries on growing data.

Moderate:
- Plateau detection moved from every home page load to post-workout
  fire-and-forget. Home page reads cached alerts only.
- Rest timer useEffect split: interval runs once (empty deps), vibration
  effect watches `remaining` with ref guard. Was tearing down/recreating
  interval 180 times per rest period.
- Unit tests: vitest + 36 tests covering `computeE1rm`, `computePRs`,
  `checkNewPRs` (pr.test.ts) and all 6 plateau detection signals
  (plateau.test.ts). Run with `npm test`.

Marginal:
- Service worker offline fallback: `public/offline.html` cached on
  install, served when navigation requests fail (no network)
- Shared format utilities: `src/lib/format.ts` with `parseLocalDate`,
  `formatDateShort`, `formatDateLong`, `formatDateRelative`,
  `formatDuration`. Replaced 6 duplicate definitions across 7 files.
- "Finish" button changed from red destructive to primary (teal) variant
- Workout page parallelized: `prevSets` + `existingSets` queries run
  via `Promise.all` instead of sequentially
- Exercise search caching: exercise list (~250 items) fetched once and
  cached in ref; subsequent drawer opens only re-fetch recent IDs

New dev dependencies: `vitest` (test runner)
New files: `vitest.config.ts`, `src/lib/pr.test.ts`,
`src/lib/plateau.test.ts`, `src/lib/format.ts`

Housekeeping (all done):
- Middleware → proxy rename completed (`src/proxy.ts`), no deprecation warning
- Weekly digest route try-catch kept as safety net, indentation fixed
