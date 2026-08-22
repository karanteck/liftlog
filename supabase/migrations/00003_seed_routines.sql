-- 00003_seed_routines.sql
-- Seed the seven starting routines from SPEC.md section 3.
-- Karan: Pull Day 1, Push Day 1, Legs, Pull Day 2, Push Day 2
-- Kriti: Upper, Lower
--
-- Idempotent: skips if the user already has routines.
-- Kriti's routines are skipped if no second user exists yet.

DO $$
DECLARE
  v_karan_id uuid;
  v_kriti_id uuid;
  v_routine_id uuid;
  v_ex_id uuid;
BEGIN
  -- ============================================================
  -- Look up users
  -- ============================================================
  SELECT p.id INTO v_karan_id
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email = 'karan.teckchandani94@gmail.com';

  -- Kriti = first approved, non-admin user who is not Karan
  SELECT p.id INTO v_kriti_id
  FROM profiles p
  WHERE p.id != coalesce(v_karan_id, '00000000-0000-0000-0000-000000000000')
    AND p.is_approved = true
  ORDER BY p.created_at
  LIMIT 1;

  -- ============================================================
  -- Karan's 5 routines
  -- ============================================================
  IF v_karan_id IS NULL THEN
    RAISE NOTICE 'Karan not found, skipping routines.';
  ELSIF EXISTS (SELECT 1 FROM routines WHERE user_id = v_karan_id LIMIT 1) THEN
    RAISE NOTICE 'Karan already has routines, skipping.';
  ELSE
    -- --------------------------------------------------------
    -- Pull Day 1
    -- --------------------------------------------------------
    INSERT INTO routines (user_id, name) VALUES (v_karan_id, 'Pull Day 1')
      RETURNING id INTO v_routine_id;

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Lat pulldown';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 1, 4, 8, 12);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Seated row';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 2, 4, 8, 12);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Rear delt cable pull';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 3, 3, 12, 20);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Barbell shrug';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 4, 2, 10, 15);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Seated bicep curl';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 5, 3, 10, 15);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Hammer curl';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 6, 3, 10, 15);

    -- --------------------------------------------------------
    -- Push Day 1
    -- --------------------------------------------------------
    INSERT INTO routines (user_id, name) VALUES (v_karan_id, 'Push Day 1')
      RETURNING id INTO v_routine_id;

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Dumbbell bench press';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 1, 4, 8, 12);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Torture fly';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 2, 4, 10, 15);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Dumbbell lateral raise';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 3, 3, 12, 20);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Skullcrusher';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 4, 3, 10, 15);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Rope pushdown';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 5, 3, 10, 15);

    -- --------------------------------------------------------
    -- Legs
    -- --------------------------------------------------------
    INSERT INTO routines (user_id, name) VALUES (v_karan_id, 'Legs')
      RETURNING id INTO v_routine_id;

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Leg press';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 1, 3, 8, 12);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Leg extension';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 2, 3, 10, 15);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Romanian deadlift';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 3, 3, 8, 12);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Seated hamstring curl';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 4, 3, 10, 15);

    -- --------------------------------------------------------
    -- Pull Day 2
    -- --------------------------------------------------------
    INSERT INTO routines (user_id, name) VALUES (v_karan_id, 'Pull Day 2')
      RETURNING id INTO v_routine_id;

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Straight-arm pulldown';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 1, 4, 10, 15);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Seated row';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 2, 4, 8, 12);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Rear delt cable pull';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 3, 3, 12, 20);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Barbell shrug';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 4, 2, 10, 15);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Cable curl';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 5, 3, 10, 15);

    -- --------------------------------------------------------
    -- Push Day 2
    -- --------------------------------------------------------
    INSERT INTO routines (user_id, name) VALUES (v_karan_id, 'Push Day 2')
      RETURNING id INTO v_routine_id;

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Barbell bench press';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 1, 4, 5, 8);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Pec deck';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 2, 4, 10, 15);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Dumbbell lateral raise';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 3, 3, 12, 20);

    SELECT id INTO v_ex_id FROM exercises WHERE name = 'Rope pushdown';
    INSERT INTO routine_exercises (routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max)
      VALUES (v_routine_id, v_ex_id, 4, 3, 10, 15);

    RAISE NOTICE 'Seeded 5 routines for Karan.';
  END IF;

  -- ============================================================
  -- Kriti's 2 routines
  -- ============================================================
  IF v_kriti_id IS NULL THEN
    RAISE NOTICE 'Second user not found yet, skipping Kriti routines. Re-run after Kriti signs up.';
  ELSIF EXISTS (SELECT 1 FROM routines WHERE user_id = v_kriti_id LIMIT 1) THEN
    RAISE NOTICE 'Kriti already has routines, skipping.';
  ELSE
    -- --------------------------------------------------------
    -- Upper
    -- --------------------------------------------------------
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

    -- --------------------------------------------------------
    -- Lower
    -- --------------------------------------------------------
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
  END IF;

END $$;
