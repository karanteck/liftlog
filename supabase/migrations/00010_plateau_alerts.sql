-- 00010_plateau_alerts.sql
-- Plateau engine: stores detected alerts with dismissal tracking
-- for the 14-day cooldown. See SPEC.md section 7.

-- ============================================================
-- Enum for alert types
-- ============================================================

create type plateau_alert_type as enum (
  'strength_stall',
  'missed_targets',
  'volume_regression',
  'under_stimulus',
  'exercise_staleness',
  'rpe_creep'
);

-- ============================================================
-- Table
-- ============================================================

create table plateau_alerts (
  id                    uuid               primary key default gen_random_uuid(),
  user_id               uuid               not null references profiles(id) on delete cascade,
  alert_type            plateau_alert_type  not null,
  exercise_id           uuid               references exercises(id) on delete cascade,
  muscle_group          text,
  message               text               not null,
  suggested_exercise_id uuid               references exercises(id) on delete set null,
  detected_at           timestamptz        not null default now(),
  dismissed_at          timestamptz,
  created_at            timestamptz        not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================

-- Primary lookup: active alerts for a user (home page cards)
create index idx_plateau_alerts_user_active
  on plateau_alerts(user_id, dismissed_at)
  where dismissed_at is null;

-- Cooldown check: find recent dismissals by type + exercise
create index idx_plateau_alerts_cooldown
  on plateau_alerts(user_id, alert_type, exercise_id, dismissed_at)
  where dismissed_at is not null;

-- Cooldown check for muscle-group-level alerts
create index idx_plateau_alerts_cooldown_muscle
  on plateau_alerts(user_id, alert_type, muscle_group, dismissed_at)
  where dismissed_at is not null;

-- ============================================================
-- RLS
-- ============================================================

alter table plateau_alerts enable row level security;

create policy "Users read own alerts"
  on plateau_alerts for select
  using (user_id = auth.uid());

create policy "Users insert own alerts"
  on plateau_alerts for insert
  with check (user_id = auth.uid());

create policy "Users dismiss own alerts"
  on plateau_alerts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
