-- 00006_seed_kriti_routines.sql
-- Kriti is now signed up and approved. Re-run her routine seeding
-- (originally skipped in 00003 because she didn't exist yet).
-- Idempotent: skips if she already has routines.

DO $$
DECLARE
  v_karan_id uuid;
  v_kriti_id uuid;
  v_routine_id uuid;
  v_ex_id uuid;
BEGIN
  SELECT p.id INTO v_karan_id
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email = 'karan.teckchandani94@gmail.com';

  SELECT p.id INTO v_kriti_id
  FROM profiles p
  WHERE p.id != coalesce(v_karan_id, '00000000-0000-0000-0000-000000000000')
    AND p.is_approved = true
  ORDER BY p.created_at
  LIMIT 1;

  IF v_kriti_id IS NULL THEN
    RAISE NOTICE 'Kriti not found or not approved yet.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM routines WHERE user_id = v_kriti_id LIMIT 1) THEN
    RAISE NOTICE 'Kriti already has routines, skipping.';
    RETURN;
  END IF;

  -- Upper
  INSERT INTO routines (user_id, name) VALUES (v_kriti_id, 'Upper')
    RETURNING id INTO v_routine_id;

  SELECT id INTO v_ex_id FROM exercises WHERE name = 'Lat pulldown';
  INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
    VALUES (v_routine_id, v_ex_id, 1, 3, 8, 12);

  SELECT id INTO v_ex_id FROM exercises WHERE name = 'Seated row';
  INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
    VALUES (v_routine_id, v_ex_id, 2, 3, 8, 12);

  SELECT id INTO v_ex_id FROM exercises WHERE name = 'Pec deck';
  INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
    VALUES (v_routine_id, v_ex_id, 3, 3, 10, 15);

  SELECT id INTO v_ex_id FROM exercises WHERE name = 'Dumbbell lateral raise';
  INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
    VALUES (v_routine_id, v_ex_id, 4, 3, 12, 20);

  SELECT id INTO v_ex_id FROM exercises WHERE name = 'Dumbbell curl';
  INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
    VALUES (v_routine_id, v_ex_id, 5, 3, 10, 15);

  SELECT id INTO v_ex_id FROM exercises WHERE name = 'Rope pushdown';
  INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
    VALUES (v_routine_id, v_ex_id, 6, 3, 10, 15);

  -- Lower
  INSERT INTO routines (user_id, name) VALUES (v_kriti_id, 'Lower')
    RETURNING id INTO v_routine_id;

  SELECT id INTO v_ex_id FROM exercises WHERE name = 'Kettlebell squat';
  INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
    VALUES (v_routine_id, v_ex_id, 1, 3, 8, 12);

  SELECT id INTO v_ex_id FROM exercises WHERE name = 'Leg press';
  INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
    VALUES (v_routine_id, v_ex_id, 2, 3, 8, 12);

  SELECT id INTO v_ex_id FROM exercises WHERE name = 'Romanian deadlift (dumbbell)';
  INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
    VALUES (v_routine_id, v_ex_id, 3, 3, 8, 12);

  RAISE NOTICE 'Seeded 2 routines for Kriti.';
END $$;
