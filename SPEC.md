# Workout Tracker Spec

## 1. Basics

- **Users:** two only. Karan and Kriti. No public signup, no invite flow needed.
- **Units:** kg
- **Data sharing:** shared read. Both users can see each other's workouts, history and analytics. Each user can only write their own data.
- **Platform:** web app, installed to phone home screen as a PWA. Used one handed at the gym.
- **Reference product:** Strong (iOS app). The logging flow should feel that fast.

## 2. How routines attach to the calendar

**Free choice. Routines are NOT pinned to weekdays.**

- Routines have no `day_of_week` field.
- The home screen shows a "Start workout" action. Tapping it lists the user's routines.
- The routine that has gone longest without being trained is surfaced first, as a nudge. It is a suggestion, never a restriction.
- An "empty workout" option is always available for one-off sessions.

## 3. The actual routines

These are the starting templates. Both users must be able to edit them, reorder exercises, add and remove exercises, and create entirely new routines from the full exercise library.

Set counts below are **working sets**. Warm-up sets are logged separately with the `is_warmup` flag and are excluded from all hard-set counting and analytics.

### Karan (5 routines)

**Pull Day 1**

| # | Exercise | Working sets |
|---|---|---|
| 1 | Lat pulldown | 4 |
| 2 | Seated row | 4 |
| 3 | Rear delt cable pull | 3 |
| 4 | Shrug | 2 |
| 5 | Seated bicep curl | 3 |
| 6 | Hammer curl | 3 |

**Push Day 1**

| # | Exercise | Working sets |
|---|---|---|
| 1 | Dumbbell press | 4 |
| 2 | Torture fly | 4 |
| 3 | Lateral raise | 3 |
| 4 | Skullcrusher | 3 |
| 5 | Rope pushdown | 3 |

**Legs**

| # | Exercise | Working sets |
|---|---|---|
| 1 | Leg press | 3 |
| 2 | Leg extension | 3 |
| 3 | Romanian deadlift | 3 |
| 4 | Seated hamstring curl | 3 |

**Pull Day 2**

| # | Exercise | Working sets |
|---|---|---|
| 1 | Lat prayer | 4 |
| 2 | Seated row | 4 |
| 3 | Rear delt cable pull | 3 |
| 4 | Shrug | 2 |
| 5 | Cable curl | 3 |

**Push Day 2**

| # | Exercise | Working sets |
|---|---|---|
| 1 | Bench press | 4 |
| 2 | Pec deck | 4 |
| 3 | Lateral raise | 3 |
| 4 | Rope pushdown | 3 |

### Kriti (2 routines)

**Upper**

| # | Exercise | Working sets |
|---|---|---|
| 1 | Lat pulldown | 3 |
| 2 | Seated row | 3 |
| 3 | Pec deck | 3 |
| 4 | Lateral raise | 3 |
| 5 | Dumbbell curl | 3 |
| 6 | Rope pushdown | 3 |

**Lower**

| # | Exercise | Working sets |
|---|---|---|
| 1 | Kettlebell squat | 3 |
| 2 | Leg press | 3 |
| 3 | Romanian deadlift (dumbbell) | 3 |

### Two exercise names to confirm with me before seeding

- **"Torture fly"** is not a standard library name. Seed it as a chest fly variation and ask me which movement it maps to (cable fly, dumbbell fly, or a press-fly hybrid) so the muscle group tagging is correct.
- **"Lat prayer"** is a straight-arm cable pulldown, usually performed kneeling. Seed it as `Straight-arm pulldown` with `Lat prayer` as an alias, and confirm with me.

Do not silently guess at either. Ask.

## 4. Rep targets

Targets vary by lift type. Compounds lower, isolations higher. Apply these as defaults when seeding. Both users can override any target per exercise in the app.

| Tier | Default range | Applies to |
|---|---|---|
| Heavy compound | 5-8 | Barbell bench press |
| Compound | 8-12 | Lat pulldown, seated row, dumbbell press, leg press, Romanian deadlift, kettlebell squat |
| Isolation | 10-15 | Shrug, all curl variants, skullcrusher, rope pushdown, pec deck, torture fly, leg extension, seated hamstring curl, lat prayer |
| Small isolation | 12-20 | Lateral raise, rear delt cable pull |

### Double progression

This is the progression rule the app enforces:

1. When a user hits the **top** of the target rep range on **every** working set of an exercise, the app prompts at the start of that exercise next session: "Add weight? You hit 4x12 last time."
2. When a user fails to reach the **bottom** of the range on any working set, the app makes no suggestion.
3. Three consecutive sessions failing to reach the bottom of the range triggers the "missed targets" plateau alert (section 7).

## 5. Data model

Log at the **set level**, never the workout level. Everything else derives from sets.

```
users
  id, name, unit_pref, household_id

exercises
  id, name, aliases, muscle_group, secondary_muscles, equipment,
  movement_pattern, tracking_type, default_rep_tier,
  is_custom, owner_id

routines
  id, user_id, name, last_performed_at
  (no day_of_week - routines are free choice)

routine_exercises
  routine_id, exercise_id, order, target_sets,
  target_rep_min, target_rep_max

workouts
  id, user_id, routine_id, date, started_at, ended_at,
  bodyweight, notes

sets
  id, workout_id, exercise_id, set_number, weight, reps,
  rpe, is_warmup, rest_seconds
```

### Three things that must be right from day one

**`tracking_type` on exercises.** Different exercises log different things:

| tracking_type | Logs | Example |
|---|---|---|
| `weight_reps` | weight, reps | Bench press, leg press |
| `bodyweight_reps` | reps, optional added weight | Pull-up, dip |
| `time` | duration | Plank |
| `distance_time` | distance, duration | Treadmill, rowing |
| `reps_only` | reps | Push-up |

Bake this in at schema time or the whole thing gets refactored later.

**`rpe` field. Optional, never required.**

- One tap on a 1-10 scale, shown next to each working set.
- A set can always be saved without it. Never block set completion.
- RPE-dependent plateau rules (section 7) stay **dormant and silent** unless RPE is present on at least 60% of the relevant sets in the comparison window. Do not fire a fatigue alert off two data points.

**`is_warmup` flag.** Warm-up sets are logged but excluded from hard-set counts, volume load, PR detection, and every plateau rule.

## 6. Feature build order

Sequence matters. If the core logging loop is slow, we stop using the app in week three and the analytics never get any data.

### Phase 1: Logging (this is the whole product)

- Start a workout from a saved routine, or start empty
- Exercise search with recent and favourites pinned to the top
- **Previous performance shown inline while logging.** Under each exercise: "Last time: 80kg x 8, 8, 7". This is the single feature that makes Strong sticky. Do not skip it.
- One tap "repeat last set", then adjust weight or reps
- Rest timer that auto-starts when a set is marked complete
- Plate calculator (what plates to load per side for a target barbell weight)
- Double progression prompt (section 4)

**Target: under 5 taps to log a set.**

### Phase 2: History, PRs, and routine editing

- Full workout history, browsable by date
- Per exercise history view
- PR detection: heaviest weight, best estimated 1RM, best single-set volume
- Bodyweight log with trend
- Full routine builder and editor (section 9)

### Phase 3: Analytics

Do not build this until there are at least 8 weeks of real logged data. Charts designed against fake data are the wrong charts.

- Estimated 1RM trend per exercise. Use Epley: `weight x (1 + reps / 30)`. Only compute for sets of 12 reps or fewer, where the formula holds.
- Weekly hard sets per muscle group. This is the actual hypertrophy driver, more useful than total tonnage.
- Volume load trend (sets x reps x weight) per muscle group
- Training frequency and adherence
- Imbalance ratios: push to pull, quad to hamstring

### Phase 4: Plateau engine

See section 7.

### Phase 5: Notifications

See section 8.

## 7. Plateau engine

This is the differentiated feature and the reason for building rather than buying. Most trackers alert on noise. These rules are specific.

| Signal | Trigger condition | Suggested action | Needs RPE? |
|---|---|---|---|
| Strength stall | Rolling 3-session mean e1RM shows no improvement versus the prior 3 sessions, over at least 4 weeks, minimum 6 data points | Deload 10% and rebuild, or change rep range | No |
| Missed targets | Failed to reach the bottom of the target rep range on any working set for 3 consecutive sessions | Weight is too heavy. Reset to a lower load | No |
| Volume regression | Weekly volume load down more than 15% for 2 consecutive weeks on a muscle group | Check sleep, recovery, calories | No |
| Under-stimulus | Muscle group below 10 hard sets per week for 3 weeks | Add sets or add frequency | No |
| Exercise staleness | Same exercise unchanged for more than 10 weeks | Suggest a variation from the same movement_pattern | No |
| RPE creep | Same weight and same reps, but mean RPE up by 1.5 or more over 3 sessions | Fatigue accumulation. Take a deload week | Yes |

Because RPE is optional, the engine must work fully on the five rules that do not need it. RPE creep is a bonus that activates only when the data supports it.

### Four guardrails so it does not spam us

1. **Minimum data threshold.** No plateau alert fires on an exercise with fewer than 6 logged sessions. Anything less is statistically meaningless.
2. **RPE data threshold.** RPE-dependent rules require RPE on at least 60% of sets in the window. Below that, the rule stays silent. Do not surface a "not enough data" message either. Just stay quiet.
3. **Normalise to estimated 1RM, not raw weight.** 100kg x 5 followed by 90kg x 8 is progress, but a raw weight comparison reads it as regression.
4. **Cooldown.** Once an alert is dismissed, do not re-fire the same alert type on the same exercise for 14 days.

### Suggesting a swap

Build a hard-coded variation map keyed on `movement_pattern` (horizontal press, vertical press, hip hinge, squat, horizontal pull, vertical pull, elbow flexion, elbow extension, lateral raise, and so on). When staleness fires, suggest an alternative from the same pattern that already exists in the exercise library.

Do not call an external AI API for this in the first build. The hard-coded map is free, instant, and more reliable.

## 8. Notifications

Deliver in this order of priority:

1. **In-app insight cards** on the home screen. Zero infrastructure, always works, never gets blocked.
2. **Weekly email digest** via Resend, triggered by a Supabase `pg_cron` job. Reliable, and better suited to plateau alerts, which are not time sensitive.
3. **Web push** only if we want mid-workout nudges. iOS web push requires iOS 16.4 or later, requires the PWA to be installed to the home screen, and permissions get silently revoked. Low priority.

Do not use Vercel cron jobs. The Hobby tier only allows daily cron. Supabase `pg_cron` is free and unrestricted.

## 9. Exercise library and routine builder

The library is not only for logging. It is what we browse when building or editing a routine, so it has to be complete and well organised from the start.

### Seed requirements

Generate a single JSON seed file of roughly 250 to 300 exercises in one pass. Do not add exercises incrementally as we go. Every entry needs:

- `name`
- `aliases` (common alternative names, so search finds things)
- `muscle_group` (primary)
- `secondary_muscles`
- `equipment` — barbell, dumbbell, cable, machine, smith machine, bodyweight, kettlebell, resistance band, EZ bar
- `movement_pattern`
- `tracking_type`
- `default_rep_tier` (from section 4)

Coverage must include common variations across chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, abs, and forearms. Include machine-based and cable-based variations properly, not just free weights, since most of our training is machines and cables.

Every exercise named in section 3 must exist in the library under that exact name.

### Routine builder requirements (Phase 2)

- Browse the full library, filterable by muscle group and by equipment
- Search by name or alias
- Add an exercise to a routine, set target sets and target rep range
- Reorder exercises by drag
- Remove an exercise
- Duplicate an existing routine as a starting point
- Create a **custom exercise** if something is missing, with the same fields as a seeded one. Custom exercises are visible to both users.

## 10. Non-goals

Explicitly out of scope. Do not build these, do not suggest them.

- Nutrition or calorie tracking
- Form check video upload
- Progress photos (the one feature that would push us off the free storage tier)
- Social features, feeds, following
- Any third party fitness API integration
- Apple Health or Google Fit sync
- More than two user accounts

## 11. Cost constraint

The entire project must run at $0 per month.

- Supabase free tier
- Vercel Hobby tier
- Resend free tier
- No paid component libraries, no paid chart libraries, no managed auth service
- No metered API calls

If any proposed approach would create a recurring cost, flag it and propose the free alternative instead.
