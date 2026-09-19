import { column, Schema, Table } from "@powersync/web";

const exercises = new Table({
  name: column.text,
  aliases: column.text,
  muscle_group: column.text,
  secondary_muscles: column.text,
  equipment: column.text,
  movement_pattern: column.text,
  tracking_type: column.text,
  default_rep_tier: column.text,
  is_custom: column.integer,
  owner_id: column.text,
  created_at: column.text,
});

const profiles = new Table({
  name: column.text,
  unit_pref: column.text,
  household_id: column.text,
  is_admin: column.integer,
  is_approved: column.integer,
  last_digest_week: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const routines = new Table({
  name: column.text,
  user_id: column.text,
  last_performed_at: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const routine_exercises = new Table({
  routine_id: column.text,
  exercise_id: column.text,
  position: column.integer,
  target_sets: column.integer,
  target_rep_min: column.integer,
  target_rep_max: column.integer,
  created_at: column.text,
});

const workouts = new Table({
  user_id: column.text,
  routine_id: column.text,
  date: column.text,
  started_at: column.text,
  ended_at: column.text,
  bodyweight: column.real,
  notes: column.text,
  created_at: column.text,
});

const sets = new Table({
  workout_id: column.text,
  exercise_id: column.text,
  set_number: column.integer,
  weight: column.real,
  reps: column.integer,
  rpe: column.real,
  is_warmup: column.integer,
  rest_seconds: column.real,
  duration_seconds: column.real,
  distance_meters: column.real,
  created_at: column.text,
});

const bodyweight_log = new Table({
  user_id: column.text,
  date: column.text,
  weight: column.real,
  created_at: column.text,
});

const plateau_alerts = new Table({
  user_id: column.text,
  exercise_id: column.text,
  muscle_group: column.text,
  alert_type: column.text,
  message: column.text,
  detected_at: column.text,
  dismissed_at: column.text,
  suggested_exercise_id: column.text,
  created_at: column.text,
});

export const schema = new Schema({
  exercises,
  profiles,
  routines,
  routine_exercises,
  workouts,
  sets,
  bodyweight_log,
  plateau_alerts,
});
