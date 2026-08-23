-- 00007_bodyweight_log.sql
-- Standalone bodyweight logging table so users can log on rest days too.

create table bodyweight_log (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  date       date        not null default current_date,
  weight     numeric(5,1) not null,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

create index idx_bodyweight_log_user_date on bodyweight_log(user_id, date desc);

-- RLS
alter table bodyweight_log enable row level security;

create policy "Users read own bodyweight"
  on bodyweight_log for select
  using (user_id = auth.uid());

create policy "Approved users read household bodyweight"
  on bodyweight_log for select
  using (
    auth_is_approved()
    and user_id in (
      select id from profiles
      where household_id is not null
        and household_id = auth_household_id()
    )
  );

create policy "Approved users insert own bodyweight"
  on bodyweight_log for insert
  with check (user_id = auth.uid() and auth_is_approved());

create policy "Users update own bodyweight"
  on bodyweight_log for update
  using (user_id = auth.uid());

create policy "Users delete own bodyweight"
  on bodyweight_log for delete
  using (user_id = auth.uid());
