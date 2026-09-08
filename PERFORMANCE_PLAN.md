# Performance & Audit Fix Plan for StrongBoi

Read CLAUDE.md and SPEC.md first. This is a performance and bug-fix pass — no new features. The app currently feels laggy because every page navigation does a full server round-trip to Supabase with no caching, no prefetching, and no optimistic updates. There are also code quality issues from a recent audit. Work through these tiers in order, one step at a time. Stop after each step, show me what changed, and give me a commit message.

**Do not add any npm packages without asking me first.**

---

## Tier 1: Eliminate the biggest lag sources (you'll feel these immediately)

### Step 1 — Optimistic set completion (fix the race condition + make it feel instant)

The set completion checkmark in `src/app/(main)/workout/[id]/workout-session.tsx` currently `await`s the Supabase insert before updating the UI. On bad gym WiFi this means a 500ms+ freeze per tap, and double-tapping can insert duplicate sets.

Fix:
- Add a per-set `saving` boolean to the set state (or a `Set<string>` of saving keys at the exercise level).
- On tap: immediately mark the set as completed in React state (optimistic), disable the checkmark, fire the Supabase insert in the background.
- On success: update the `dbId` from the response.
- On error: roll back — mark the set as not completed, show a toast, re-enable the checkmark.
- The rest timer, PR detection, and vibration should still fire on the optimistic update, not on the DB response.

### Step 2 — Kill the bottom nav queries

`src/components/bottom-nav.tsx` calls `supabase.auth.getUser()` + queries for active workouts on every single route change (the `useEffect` depends on `pathname`). That's 2 API calls every time you tap a tab.

Fix:
- Create a lightweight React context (`ActiveWorkoutContext`) in `src/app/(main)/layout.tsx`.
- The server layout already has access to the user — query for active workout there (one query, server-side, already happening for the home page anyway) and pass it down as a prop to a client provider.
- The bottom nav reads from context instead of querying.
- When the user starts or finishes a workout, update the context from the client side (the routine-picker and workout-session components already know when this happens).
- Delete the `useEffect` and Supabase calls from `bottom-nav.tsx`.

### Step 3 — Prefetch likely next pages

Next.js `<Link>` components prefetch by default for static routes, but all of StrongBoi's routes are dynamic (they call `cookies()` which opts out of caching). This means zero prefetching happens.

Fix:
- Add `router.prefetch('/workout/new')` on the home page mount.
- Add `router.prefetch('/')` on the workout summary page mount.
- In `routine-picker.tsx`, after creating the workout row, call `router.prefetch(`/workout/${data.id}`)` before navigating. This lets Next.js start fetching the workout page server component while the user sees "Starting...".
- In the bottom nav, prefetch the non-active tabs on mount: `router.prefetch('/history')`, `router.prefetch('/analytics')`, etc.

### Step 4 — Consolidate home page queries

`src/app/(main)/page.tsx` runs 7 queries in `Promise.all` plus 1-2 sequential queries after. Every home page visit hits Supabase 8-9 times.

Fix:
- Create a single Postgres function `home_page_data(p_user_id uuid)` in a new migration file.
- It should return: week workout count, streak (last 200 workout dates), latest bodyweight, last workout summary (id, date, started_at, ended_at, routine name, set count, volume), active workout (id, started_at, routine name, set count), last routine (id, name).
- Call it once from the home page: `supabase.rpc('home_page_data')`.
- The alerts query (`getActiveAlerts`) can stay separate since it reads a different table.
- This turns 8-9 round trips into 2.

---

## Tier 2: Fix data scaling issues (these bite within weeks/months)

### Step 5 — History pagination

`src/app/(main)/history/page.tsx` is hard-limited to 50 workouts with no way to see older ones. At 4 workouts/week, a user hits this in 3 months.

Fix:
- Add cursor-based pagination using `date` + `id` as the cursor.
- Load 20 workouts at a time.
- Add a "Load more" button at the bottom (not infinite scroll — the page also has a calendar view toggle, and infinite scroll fights with that).
- The sets query for the loaded workouts should use the same `workoutIds` array, so it stays bounded.
- The calendar view can stay as-is (it only needs dates, not full workout data).

### Step 6 — Analytics "All time" cap

`src/app/(main)/analytics/page.tsx` with range="all" fetches every set ever logged with joins. For an active user this will degrade over time.

Fix:
- Cap "All time" to 52 weeks (1 year). If you want true all-time later, the right answer is a materialized view, but for now a 1-year cap is plenty.
- Change the label from "All time" to "1 year" and adjust `RANGE_OPTIONS` accordingly. Or keep "All time" as the label but add the 365-day filter.

---

## Tier 3: Code quality fixes (won't change UX, but prevent future bugs)

### Step 7 — Extract Supabase relation unwrapper

There are 23 instances of `as unknown as { name: string }` scattered across the codebase to work around Supabase's typed relation responses. If the schema changes, these silently produce wrong types.

Fix:
- Create a helper function in `src/lib/supabase/helpers.ts`:
  ```ts
  export function unwrapRelation<T>(rel: unknown): T | null {
    if (rel == null) return null;
    if (Array.isArray(rel)) return (rel[0] as T) ?? null;
    return rel as T;
  }
  ```
- Replace all 23 `as unknown as` casts across the codebase with `unwrapRelation<{ name: string }>(workout.routines)` etc.
- This centralizes the assumption so if Supabase's codegen changes, you fix one function.

### Step 8 — Supabase client singleton

`workout-session.tsx` and `exercise-search.tsx` call `createClient()` at the component body level, creating a new Supabase client on every render. The client is listed as a `useCallback` dependency, which defeats memoization (every callback "changes" every render).

Fix:
- In both components, change `const supabase = createClient()` to `const supabaseRef = useRef(createClient())` and use `supabaseRef.current` everywhere.
- Remove `supabase` from all `useCallback` dependency arrays.
- Do the same in `bottom-nav.tsx` (though if Step 2 is done, this is moot for that file).

### Step 9 — Weekly digest idempotency

`src/app/api/weekly-digest/route.ts` computes a week ID but doesn't use it for deduplication. If pg_cron fires twice (which happens during Supabase restarts), users get duplicate emails.

Fix:
- Add a `last_digest_week` text column to the `profiles` table (new migration).
- Before sending, check `profile.last_digest_week !== currentWeekId`.
- After sending, update `profiles.last_digest_week = currentWeekId`.
- This is a single extra read per user (the profile is already being fetched) and one write.

### Step 10 — Remove `router.refresh()` calls

There are 5 places that call `router.refresh()` after mutations (login, sign-out, routine editor, delete workout, plateau dismiss). Each one throws away the entire cached server component tree and re-fetches everything.

Fix:
- For `plateau-alerts.tsx`: remove the refresh, just update local state (already dismissing from the alerts array client-side).
- For `routine-editor.tsx` and `delete-workout-button.tsx`: use `router.push()` to navigate, which already triggers a fresh server component fetch for the destination page. The `refresh()` is redundant.
- For `login/page.tsx` and `sign-out-button.tsx`: these are navigating to a different auth state, so `router.push` + the middleware redirect is sufficient. Remove the `refresh()`.

### Step 11 — Minor cleanups

- Remove `userScalable: false` and `maximumScale: 1` from `src/app/layout.tsx` viewport config (blocks accessibility zoom on Android).
- Remove the manual theme script from `layout.tsx` `<head>` (lines 32-37) — it conflicts with `next-themes` ThemeProvider which already handles flash-of-unstyled-content prevention. Let `next-themes` manage the `dark` class exclusively.
- Either expand the service worker to cache the app shell (CSS, JS, critical routes), or remove `public/sw.js` and the registration script entirely. A service worker that only serves `offline.html` adds complexity without value. My recommendation: remove it for now unless you want to invest in proper offline support later.

---

## After all steps

Update `CLAUDE.md` with a new "Performance pass" section documenting what was done. Run `npm run build` to verify no type errors. Run `npm test` to verify existing tests still pass.
