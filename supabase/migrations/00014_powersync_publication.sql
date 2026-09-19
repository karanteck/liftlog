-- Create a Postgres publication for PowerSync.
-- PowerSync watches this publication to detect row changes and sync them to devices.
CREATE PUBLICATION powersync FOR TABLE
  exercises,
  routines,
  routine_exercises,
  workouts,
  sets,
  profiles,
  bodyweight_log,
  plateau_alerts;
