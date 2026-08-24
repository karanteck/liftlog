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

11 database migrations exist (00001–00011). Migrations 00009–00011 need
to be pushed to Supabase.

Vercel environment variables set: `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`,
`CRON_SECRET` (all marked sensitive, production + preview).

pg_cron job `weekly-digest` is scheduled in Supabase (Sunday 8am UTC).

Resend is on free tier — currently can only send to Karan's email. To
send to Kriti, verify a domain in Resend dashboard.

Housekeeping (all done):
- Middleware → proxy rename completed (`src/proxy.ts`), no deprecation warning
- Weekly digest route try-catch kept as safety net, indentation fixed
