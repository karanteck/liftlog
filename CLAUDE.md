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

**Phase 3: Analytics.**

Phase 1 (logging) is complete — all 12 build steps done.

Phase 2 (history, PRs, routine editing) is complete — all 10 steps done.

Pre-Phase 3 fixes (all DONE):
1. Household toggle on workout history (Mine / Household view)
2. Bodyweight and notes inputs added to workout session
3. Exercise library topped up from 240 to 250 (spec minimum)
4. Equipment filter added to exercise picker in routine builder

Also done from Kriti's feedback:
- Delete workout button (two-step confirm, own workouts only)
- Back button on workout logging screen
- Retroactive workout logging (date picker on workout creation)
- Sports/cardio tracking (10 exercises seeded, UI adapts per tracking
  type: weight+reps, bodyweight+reps, reps-only, duration, distance+time)
- Core routine — Kriti will build it herself using routine builder

Offline-first was removed from the spec (not pursuing).

9 database migrations exist (00001–00009). Migration 00009 needs to be
pushed to Supabase.

Phase 3 tasks (analytics — SPEC.md section 6 Phase 3):
1. ~~Analytics page scaffold~~ DONE
2. ~~e1RM trend chart per exercise~~ DONE
3. Weekly hard sets per muscle group — bar chart (the spec calls this "the
   actual hypertrophy driver")
4. Volume load trend per muscle group — line chart of sets × reps × weight
   per muscle group per week
5. Training frequency & adherence — workouts per week chart
6. Imbalance ratios — push:pull, quad:hamstring computed from weekly volume
   by movement pattern

Do not build the plateau engine or notifications yet — those are Phase 4
and 5.
