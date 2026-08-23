-- 00008_seed_sports_exercises.sql
-- Add sports and outdoor cardio exercises.

insert into exercises (name, aliases, muscle_group, secondary_muscles, equipment, movement_pattern, tracking_type, default_rep_tier, is_custom, owner_id)
values
  ('Walking', '{"walk", "brisk walk"}', 'quads', '{"glutes", "calves", "hamstrings"}', 'bodyweight', 'cardio', 'distance_time', 'compound', false, null),
  ('Running', '{"run", "jogging", "jog"}', 'quads', '{"glutes", "calves", "hamstrings"}', 'bodyweight', 'cardio', 'distance_time', 'compound', false, null),
  ('Outdoor cycling', '{"bike ride", "cycling"}', 'quads', '{"glutes", "hamstrings", "calves"}', 'bodyweight', 'cardio', 'distance_time', 'compound', false, null),
  ('Swimming', '{"swim", "laps"}', 'back', '{"shoulders", "chest", "abs"}', 'bodyweight', 'cardio', 'distance_time', 'compound', false, null),
  ('Hiking', '{"hike", "trail walk"}', 'quads', '{"glutes", "calves", "hamstrings"}', 'bodyweight', 'cardio', 'distance_time', 'compound', false, null),
  ('Badminton', '{"shuttlecock"}', 'shoulders', '{"quads", "calves", "forearms"}', 'bodyweight', 'cardio', 'time', 'compound', false, null),
  ('Jump rope', '{"skipping", "skipping rope"}', 'calves', '{"quads", "shoulders"}', 'bodyweight', 'cardio', 'time', 'compound', false, null),
  ('Tennis', '{"racquet"}', 'shoulders', '{"quads", "calves", "forearms"}', 'bodyweight', 'cardio', 'time', 'compound', false, null),
  ('Basketball', '{}', 'quads', '{"glutes", "calves", "shoulders"}', 'bodyweight', 'cardio', 'time', 'compound', false, null),
  ('Football', '{"soccer"}', 'quads', '{"glutes", "hamstrings", "calves"}', 'bodyweight', 'cardio', 'time', 'compound', false, null);
