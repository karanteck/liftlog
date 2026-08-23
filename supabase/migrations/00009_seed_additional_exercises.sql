-- 00009_seed_additional_exercises.sql
-- Add 10 more exercises to bring the library from 240 to 250.
-- Fills gaps in forearms, calves, hamstrings, triceps, chest, and abs.

INSERT INTO exercises (name, aliases, muscle_group, secondary_muscles, equipment, movement_pattern, tracking_type, default_rep_tier, is_custom)
VALUES
  ('Farmer walk', ARRAY['Farmer''s carry', 'Farmer''s walk'], 'forearms', ARRAY['traps', 'core', 'quads'], 'dumbbell', 'carry', 'weight_reps', 'compound', false),
  ('Behind-the-back wrist curl', ARRAY['Behind back wrist curl'], 'forearms', '{}', 'barbell', 'wrist_flexion', 'weight_reps', 'small_isolation', false),
  ('Single-leg calf raise', ARRAY['One-leg calf raise', 'Unilateral calf raise'], 'calves', '{}', 'bodyweight', 'calf_raise', 'bodyweight_reps', 'small_isolation', false),
  ('Tibialis raise', ARRAY['Tib raise', 'Tibialis anterior raise'], 'calves', '{}', 'bodyweight', 'tibialis_raise', 'bodyweight_reps', 'small_isolation', false),
  ('Swiss ball hamstring curl', ARRAY['Stability ball leg curl', 'Physio ball hamstring curl'], 'hamstrings', ARRAY['glutes', 'core'], 'bodyweight', 'leg_curl', 'bodyweight_reps', 'isolation', false),
  ('Cable overhead tricep extension', ARRAY['Overhead cable extension', 'Cable French press'], 'triceps', '{}', 'cable', 'elbow_extension', 'weight_reps', 'isolation', false),
  ('Low cable crossover', ARRAY['Low to high cable fly', 'Low cable fly'], 'chest', ARRAY['front delts'], 'cable', 'fly', 'weight_reps', 'isolation', false),
  ('Svend press', ARRAY['Plate squeeze press'], 'chest', ARRAY['front delts', 'triceps'], 'bodyweight', 'horizontal_press', 'weight_reps', 'isolation', false),
  ('Hanging knee raise', ARRAY['Hanging knee tuck', 'Knee raise'], 'abs', ARRAY['hip flexors'], 'bodyweight', 'core', 'bodyweight_reps', 'isolation', false),
  ('Copenhagen plank', ARRAY['Copenhagen adductor plank'], 'abs', ARRAY['adductors', 'obliques'], 'bodyweight', 'core', 'time', 'isolation', false)
ON CONFLICT DO NOTHING;
