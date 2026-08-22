-- 00001_initial_schema.sql
-- LiftLog core schema: households, profiles, exercises,
-- routines, workouts, and sets with row level security.

-- ============================================================
-- Enums
-- ============================================================

create type tracking_type as enum (
  'weight_reps',
  'bodyweight_reps',
  'time',
  'distance_time',
  'reps_only'
);

create type rep_tier as enum (
  'heavy_compound',
  'compound',
  'isolation',
  'small_isolation'
);

-- ============================================================
-- Tables
-- ============================================================

create table households (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  name         text        not null,
  unit_pref    text        not null default 'kg' check (unit_pref in ('kg', 'lb')),
  household_id uuid        references households(id) on delete set null,
  is_approved  boolean     not null default false,
  is_admin     boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table exercises (
  id               uuid          primary key default gen_random_uuid(),
  name             text          not null,
  aliases          text[]        not null default '{}',
  muscle_group     text          not null,
  secondary_muscles text[]       not null default '{}',
  equipment        text          not null,
  movement_pattern text          not null,
  tracking_type    tracking_type not null default 'weight_reps',
  default_rep_tier rep_tier      not null default 'compound',
  is_custom        boolean       not null default false,
  owner_id         uuid          references profiles(id) on delete set null,
  created_at       timestamptz   not null default now()
);

create table routines (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references profiles(id) on delete cascade,
  name              text        not null,
  last_performed_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table routine_exercises (
  id             uuid     primary key default gen_random_uuid(),
  routine_id     uuid     not null references routines(id) on delete cascade,
  exercise_id    uuid     not null references exercises(id) on delete cascade,
  position       smallint not null,
  target_sets    smallint not null default 3,
  target_rep_min smallint not null default 8,
  target_rep_max smallint not null default 12,
  created_at     timestamptz not null default now()
);

create table workouts (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  routine_id uuid        references routines(id) on delete set null,
  date       date        not null default current_date,
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  bodyweight numeric(5,1),
  notes      text,
  created_at timestamptz not null default now()
);

create table sets (
  id               uuid        primary key default gen_random_uuid(),
  workout_id       uuid        not null references workouts(id) on delete cascade,
  exercise_id      uuid        not null references exercises(id) on delete cascade,
  set_number       smallint    not null,
  weight           numeric(6,2),
  reps             smallint,
  rpe              numeric(3,1) check (rpe >= 1 and rpe <= 10),
  is_warmup        boolean     not null default false,
  rest_seconds     smallint,
  duration_seconds integer,
  distance_meters  numeric(10,1),
  created_at       timestamptz not null default now()
);

-- ============================================================
-- Triggers: auto-update updated_at
-- ============================================================

create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger routines_updated_at
  before update on routines
  for each row execute function update_updated_at();

-- ============================================================
-- Trigger: auto-create profile on signup
-- First user is auto-approved + admin. Everyone else is pending.
-- ============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists(select 1 from profiles) into is_first;

  insert into profiles (id, name, unit_pref, is_approved, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'kg',
    is_first,
    is_first
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- RLS helper functions
-- These run as the DB owner (security definer) so they can
-- read profiles without being blocked by RLS.
-- ============================================================

create or replace function auth_household_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id from profiles where id = auth.uid()
$$;

create or replace function auth_is_approved()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_approved from profiles where id = auth.uid()), false)
$$;

create or replace function auth_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false)
$$;

-- ============================================================
-- Enable RLS on every table
-- ============================================================

alter table households       enable row level security;
alter table profiles         enable row level security;
alter table exercises        enable row level security;
alter table routines         enable row level security;
alter table routine_exercises enable row level security;
alter table workouts         enable row level security;
alter table sets             enable row level security;

-- ============================================================
-- RLS policies: households
-- ============================================================

create policy "Users read own household"
  on households for select
  using (id = auth_household_id());

create policy "Admins insert households"
  on households for insert
  with check (auth_is_admin());

create policy "Admins update households"
  on households for update
  using (auth_is_admin());

-- ============================================================
-- RLS policies: profiles
-- ============================================================

create policy "Users read own profile"
  on profiles for select
  using (id = auth.uid());

create policy "Approved users read household profiles"
  on profiles for select
  using (
    auth_is_approved()
    and household_id is not null
    and household_id = auth_household_id()
  );

create policy "Users update own profile"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Admins update any profile"
  on profiles for update
  using (auth_is_admin());

-- ============================================================
-- RLS policies: exercises
-- ============================================================

create policy "Approved users read all exercises"
  on exercises for select
  using (auth_is_approved());

create policy "Approved users insert custom exercises"
  on exercises for insert
  with check (
    auth_is_approved()
    and is_custom = true
    and owner_id = auth.uid()
  );

create policy "Users update own custom exercises"
  on exercises for update
  using (is_custom = true and owner_id = auth.uid());

create policy "Users delete own custom exercises"
  on exercises for delete
  using (is_custom = true and owner_id = auth.uid());

-- ============================================================
-- RLS policies: routines
-- ============================================================

create policy "Users read own routines"
  on routines for select
  using (user_id = auth.uid());

create policy "Approved users read household routines"
  on routines for select
  using (
    auth_is_approved()
    and user_id in (
      select id from profiles
      where household_id is not null
        and household_id = auth_household_id()
    )
  );

create policy "Approved users insert own routines"
  on routines for insert
  with check (user_id = auth.uid() and auth_is_approved());

create policy "Users update own routines"
  on routines for update
  using (user_id = auth.uid());

create policy "Users delete own routines"
  on routines for delete
  using (user_id = auth.uid());

-- ============================================================
-- RLS policies: routine_exercises
-- ============================================================

create policy "Users read own routine exercises"
  on routine_exercises for select
  using (
    routine_id in (select id from routines where user_id = auth.uid())
  );

create policy "Approved users read household routine exercises"
  on routine_exercises for select
  using (
    auth_is_approved()
    and routine_id in (
      select r.id from routines r
      join profiles p on p.id = r.user_id
      where p.household_id is not null
        and p.household_id = auth_household_id()
    )
  );

create policy "Users insert own routine exercises"
  on routine_exercises for insert
  with check (
    routine_id in (select id from routines where user_id = auth.uid())
  );

create policy "Users update own routine exercises"
  on routine_exercises for update
  using (
    routine_id in (select id from routines where user_id = auth.uid())
  );

create policy "Users delete own routine exercises"
  on routine_exercises for delete
  using (
    routine_id in (select id from routines where user_id = auth.uid())
  );

-- ============================================================
-- RLS policies: workouts
-- ============================================================

create policy "Users read own workouts"
  on workouts for select
  using (user_id = auth.uid());

create policy "Approved users read household workouts"
  on workouts for select
  using (
    auth_is_approved()
    and user_id in (
      select id from profiles
      where household_id is not null
        and household_id = auth_household_id()
    )
  );

create policy "Approved users insert own workouts"
  on workouts for insert
  with check (user_id = auth.uid() and auth_is_approved());

create policy "Users update own workouts"
  on workouts for update
  using (user_id = auth.uid());

create policy "Users delete own workouts"
  on workouts for delete
  using (user_id = auth.uid());

-- ============================================================
-- RLS policies: sets
-- ============================================================

create policy "Users read own sets"
  on sets for select
  using (
    workout_id in (select id from workouts where user_id = auth.uid())
  );

create policy "Approved users read household sets"
  on sets for select
  using (
    auth_is_approved()
    and workout_id in (
      select w.id from workouts w
      join profiles p on p.id = w.user_id
      where p.household_id is not null
        and p.household_id = auth_household_id()
    )
  );

create policy "Users insert own sets"
  on sets for insert
  with check (
    workout_id in (select id from workouts where user_id = auth.uid())
  );

create policy "Users update own sets"
  on sets for update
  using (
    workout_id in (select id from workouts where user_id = auth.uid())
  );

create policy "Users delete own sets"
  on sets for delete
  using (
    workout_id in (select id from workouts where user_id = auth.uid())
  );

-- ============================================================
-- Indexes
-- ============================================================

create index idx_profiles_household      on profiles(household_id);
create index idx_exercises_muscle_group  on exercises(muscle_group);
create index idx_exercises_name          on exercises(name);
create index idx_routines_user           on routines(user_id);
create index idx_routine_exercises_routine on routine_exercises(routine_id);
create index idx_workouts_user_date      on workouts(user_id, date desc);
create index idx_sets_workout            on sets(workout_id);
create index idx_sets_exercise           on sets(exercise_id);
