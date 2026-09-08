-- 00012_home_page_data_function.sql
-- Single RPC that returns all data the home page needs,
-- replacing 7+ individual Supabase queries with one round-trip.

create or replace function home_page_data(p_user_id uuid)
returns json
language plpgsql
security invoker
stable
as $$
declare
  v_profile record;
  v_bodyweight numeric;
  v_week_count int;
  v_streak_dates json;
  v_last_workout record;
  v_last_workout_sets int := 0;
  v_last_workout_volume numeric := 0;
  v_last_routine record;
  v_active_workout record;
  v_active_set_count int := 0;
begin
  -- Profile (needed for is_approved gate)
  select name, is_approved, is_admin into v_profile
  from profiles where id = p_user_id;

  if not found or not v_profile.is_approved then
    return json_build_object(
      'profile', json_build_object(
        'name', coalesce(v_profile.name, ''),
        'is_approved', coalesce(v_profile.is_approved, false),
        'is_admin', coalesce(v_profile.is_admin, false)
      )
    );
  end if;

  -- Latest bodyweight
  select weight into v_bodyweight
  from bodyweight_log
  where user_id = p_user_id
  order by date desc
  limit 1;

  -- Workouts this week (Monday = start of ISO week)
  select count(*)::int into v_week_count
  from workouts
  where user_id = p_user_id
    and date >= date_trunc('week', current_date)::date
    and ended_at is not null;

  -- Last 200 workout dates for streak calculation
  select coalesce(json_agg(sub.date order by sub.date desc), '[]'::json)
  into v_streak_dates
  from (
    select date from workouts
    where user_id = p_user_id and ended_at is not null
    order by date desc
    limit 200
  ) sub;

  -- Last completed workout with routine name
  select w.id, w.date, w.started_at, w.ended_at, r.name as routine_name
  into v_last_workout
  from workouts w
  left join routines r on r.id = w.routine_id
  where w.user_id = p_user_id and w.ended_at is not null
  order by w.date desc
  limit 1;

  if v_last_workout.id is not null then
    select count(*)::int, coalesce(sum(coalesce(weight, 0) * coalesce(reps, 0)), 0)
    into v_last_workout_sets, v_last_workout_volume
    from sets
    where workout_id = v_last_workout.id
      and is_warmup = false;
  end if;

  -- Last routine used
  select r.id, r.name into v_last_routine
  from workouts w
  join routines r on r.id = w.routine_id
  where w.user_id = p_user_id
    and w.ended_at is not null
    and w.routine_id is not null
  order by w.date desc
  limit 1;

  -- Active workout (ended_at IS NULL)
  select w.id, w.started_at, r.name as routine_name
  into v_active_workout
  from workouts w
  left join routines r on r.id = w.routine_id
  where w.user_id = p_user_id and w.ended_at is null
  order by w.started_at desc
  limit 1;

  if v_active_workout.id is not null then
    select count(*)::int into v_active_set_count
    from sets
    where workout_id = v_active_workout.id
      and is_warmup = false;
  end if;

  return json_build_object(
    'profile', json_build_object(
      'name', v_profile.name,
      'is_approved', v_profile.is_approved,
      'is_admin', v_profile.is_admin
    ),
    'bodyweight', v_bodyweight,
    'week_workout_count', v_week_count,
    'streak_dates', v_streak_dates,
    'last_workout', case when v_last_workout.id is not null then
      json_build_object(
        'id', v_last_workout.id,
        'date', v_last_workout.date,
        'started_at', v_last_workout.started_at,
        'ended_at', v_last_workout.ended_at,
        'routine_name', v_last_workout.routine_name,
        'set_count', v_last_workout_sets,
        'volume', v_last_workout_volume
      )
    else null end,
    'last_routine', case when v_last_routine.id is not null then
      json_build_object(
        'id', v_last_routine.id,
        'name', v_last_routine.name
      )
    else null end,
    'active_workout', case when v_active_workout.id is not null then
      json_build_object(
        'id', v_active_workout.id,
        'started_at', v_active_workout.started_at,
        'routine_name', v_active_workout.routine_name,
        'set_count', v_active_set_count
      )
    else null end
  );
end;
$$;
