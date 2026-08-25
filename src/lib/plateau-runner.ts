import { SupabaseClient } from "@supabase/supabase-js";
import {
  detectAllAlerts,
  type AlertCandidate,
  type ExerciseHistory,
  type SessionData,
  type WeeklyMuscleVolume,
  type DismissedAlert,
  type VariationOption,
} from "./plateau";

// ============================================================
// Public API
// ============================================================

export type ActiveAlert = {
  id: string;
  alertType: string;
  exerciseId: string | null;
  muscleGroup: string | null;
  message: string;
  suggestedExerciseId: string | null;
  suggestedExerciseName: string | null;
  detectedAt: string;
};

export async function runPlateauDetection(
  supabase: SupabaseClient,
  userId: string
): Promise<ActiveAlert[]> {
  const [exerciseHistories, weeklyData, dismissed, activeAlerts, allExercises] =
    await Promise.all([
      fetchExerciseHistories(supabase, userId),
      fetchWeeklyMuscleVolume(supabase, userId),
      fetchDismissedAlerts(supabase, userId),
      fetchActiveAlerts(supabase, userId),
      fetchAllExercises(supabase),
    ]);

  const variations = buildVariationMap(exerciseHistories, allExercises);

  const candidates = detectAllAlerts(
    exerciseHistories,
    weeklyData,
    dismissed,
    variations
  );

  const newAlerts = candidates.filter(
    (c) => !isDuplicate(c, activeAlerts)
  );

  if (newAlerts.length > 0) {
    const rows = newAlerts.map((a) => ({
      user_id: userId,
      alert_type: a.alertType,
      exercise_id: a.exerciseId ?? null,
      muscle_group: a.muscleGroup ?? null,
      message: a.message,
      suggested_exercise_id: a.suggestedExerciseId ?? null,
    }));

    await supabase.from("plateau_alerts").insert(rows);
  }

  return fetchActiveAlerts(supabase, userId);
}

export async function getActiveAlerts(
  supabase: SupabaseClient,
  userId: string
): Promise<ActiveAlert[]> {
  return fetchActiveAlerts(supabase, userId);
}

export async function dismissAlert(
  supabase: SupabaseClient,
  alertId: string
): Promise<void> {
  await supabase
    .from("plateau_alerts")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", alertId);
}

// ============================================================
// Data fetching
// ============================================================

async function fetchExerciseHistories(
  supabase: SupabaseClient,
  userId: string
): Promise<ExerciseHistory[]> {
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
  const cutoff = twelveWeeksAgo.toISOString().split("T")[0];

  const { data: rawSets } = await supabase
    .from("sets")
    .select(
      `
      exercise_id, weight, reps, rpe, set_number,
      workouts!inner ( id, date, user_id ),
      exercises!inner ( name, movement_pattern, muscle_group )
    `
    )
    .eq("is_warmup", false)
    .eq("workouts.user_id", userId)
    .gte("workouts.date", cutoff)
    .order("set_number", { ascending: true });

  if (!rawSets || rawSets.length === 0) return [];

  const { data: routineExercises } = await supabase
    .from("routine_exercises")
    .select("exercise_id, target_rep_min, target_rep_max, routines!inner ( user_id )")
    .eq("routines.user_id", userId);

  const repTargets = new Map<string, { min: number; max: number }>();
  if (routineExercises) {
    for (const re of routineExercises) {
      repTargets.set(re.exercise_id, {
        min: re.target_rep_min,
        max: re.target_rep_max,
      });
    }
  }

  type RawSet = {
    exercise_id: string;
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    workouts: { id: string; date: string };
    exercises: { name: string; movement_pattern: string; muscle_group: string };
  };

  const grouped = new Map<
    string,
    {
      exerciseName: string;
      movementPattern: string;
      muscleGroup: string;
      sessionMap: Map<string, SessionData>;
    }
  >();

  for (const raw of rawSets as unknown as RawSet[]) {
    const exId = raw.exercise_id;
    const wo = raw.workouts;
    const ex = raw.exercises;

    if (!grouped.has(exId)) {
      grouped.set(exId, {
        exerciseName: ex.name,
        movementPattern: ex.movement_pattern,
        muscleGroup: ex.muscle_group,
        sessionMap: new Map(),
      });
    }

    const entry = grouped.get(exId)!;
    const dateKey = wo.date;

    if (!entry.sessionMap.has(dateKey)) {
      entry.sessionMap.set(dateKey, {
        workoutDate: dateKey,
        workingSets: [],
      });
    }

    entry.sessionMap.get(dateKey)!.workingSets.push({
      weight: raw.weight != null ? Number(raw.weight) : null,
      reps: raw.reps != null ? Number(raw.reps) : null,
      rpe: raw.rpe != null ? Number(raw.rpe) : null,
    });
  }

  const histories: ExerciseHistory[] = [];
  grouped.forEach((val, exId) => {
    const sessions = Array.from(val.sessionMap.values()).sort((a, b) =>
      a.workoutDate.localeCompare(b.workoutDate)
    );
    const targets = repTargets.get(exId);
    histories.push({
      exerciseId: exId,
      exerciseName: val.exerciseName,
      movementPattern: val.movementPattern,
      muscleGroup: val.muscleGroup,
      targetRepMin: targets?.min ?? null,
      targetRepMax: targets?.max ?? null,
      sessions,
    });
  });

  return histories;
}

async function fetchWeeklyMuscleVolume(
  supabase: SupabaseClient,
  userId: string
): Promise<WeeklyMuscleVolume[]> {
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const cutoff = fourWeeksAgo.toISOString().split("T")[0];

  const { data: rawSets } = await supabase
    .from("sets")
    .select(
      `
      weight, reps,
      exercises!inner ( muscle_group ),
      workouts!inner ( date, user_id )
    `
    )
    .eq("is_warmup", false)
    .eq("workouts.user_id", userId)
    .gte("workouts.date", cutoff);

  if (!rawSets || rawSets.length === 0) return [];

  type RawVolumeSet = {
    weight: number | null;
    reps: number | null;
    exercises: { muscle_group: string };
    workouts: { date: string };
  };

  const weeklyMap = new Map<string, { volumeLoad: number; hardSets: number }>();

  for (const raw of rawSets as unknown as RawVolumeSet[]) {
    const mg = raw.exercises.muscle_group;
    const weekStart = getWeekStart(raw.workouts.date);
    const key = `${mg}::${weekStart}`;

    if (!weeklyMap.has(key)) {
      weeklyMap.set(key, { volumeLoad: 0, hardSets: 0 });
    }

    const entry = weeklyMap.get(key)!;
    entry.hardSets += 1;
    const w = raw.weight != null ? Number(raw.weight) : 0;
    const r = raw.reps != null ? Number(raw.reps) : 0;
    if (w > 0 && r > 0) {
      entry.volumeLoad += w * r;
    }
  }

  const result: WeeklyMuscleVolume[] = [];
  weeklyMap.forEach((val, key) => {
    const [muscleGroup, weekStart] = key.split("::");
    result.push({
      muscleGroup,
      weekStart,
      volumeLoad: val.volumeLoad,
      hardSets: val.hardSets,
    });
  });

  return result;
}

async function fetchDismissedAlerts(
  supabase: SupabaseClient,
  userId: string
): Promise<DismissedAlert[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - COOLDOWN_DAYS);

  const { data } = await supabase
    .from("plateau_alerts")
    .select("alert_type, exercise_id, muscle_group, dismissed_at")
    .eq("user_id", userId)
    .not("dismissed_at", "is", null)
    .gte("dismissed_at", cutoff.toISOString());

  if (!data) return [];

  return data.map((d) => ({
    alertType: d.alert_type,
    exerciseId: d.exercise_id,
    muscleGroup: d.muscle_group,
    dismissedAt: d.dismissed_at,
  }));
}

async function fetchActiveAlerts(
  supabase: SupabaseClient,
  userId: string
): Promise<ActiveAlert[]> {
  const { data } = await supabase
    .from("plateau_alerts")
    .select(
      `
      id, alert_type, exercise_id, muscle_group,
      message, suggested_exercise_id, detected_at
    `
    )
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .order("detected_at", { ascending: false });

  if (!data) return [];

  const suggestedIds = data
    .map((a) => a.suggested_exercise_id)
    .filter((id): id is string => id != null);

  let suggestedNames = new Map<string, string>();
  if (suggestedIds.length > 0) {
    const { data: exercises } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", suggestedIds);

    if (exercises) {
      for (const e of exercises) {
        suggestedNames.set(e.id, e.name);
      }
    }
  }

  return data.map((a) => ({
    id: a.id,
    alertType: a.alert_type,
    exerciseId: a.exercise_id,
    muscleGroup: a.muscle_group,
    message: a.message,
    suggestedExerciseId: a.suggested_exercise_id,
    suggestedExerciseName: a.suggested_exercise_id
      ? suggestedNames.get(a.suggested_exercise_id) ?? null
      : null,
    detectedAt: a.detected_at,
  }));
}

async function fetchAllExercises(
  supabase: SupabaseClient
): Promise<{ id: string; name: string; movementPattern: string }[]> {
  const { data } = await supabase
    .from("exercises")
    .select("id, name, movement_pattern");

  if (!data) return [];
  return data.map((e) => ({
    id: e.id,
    name: e.name,
    movementPattern: e.movement_pattern,
  }));
}

// ============================================================
// Helpers
// ============================================================

const COOLDOWN_DAYS = 14;

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

function isDuplicate(candidate: AlertCandidate, active: ActiveAlert[]): boolean {
  return active.some(
    (a) =>
      a.alertType === candidate.alertType &&
      a.exerciseId === (candidate.exerciseId ?? null) &&
      a.muscleGroup === (candidate.muscleGroup ?? null)
  );
}

function buildVariationMap(
  histories: ExerciseHistory[],
  allExercises: { id: string; name: string; movementPattern: string }[]
): Map<string, VariationOption | null> {
  const map = new Map<string, VariationOption | null>();

  for (const ex of histories) {
    const candidates = allExercises.filter(
      (e) =>
        e.movementPattern === ex.movementPattern && e.id !== ex.exerciseId
    );

    if (candidates.length === 0) {
      map.set(ex.exerciseId, null);
    } else {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      map.set(ex.exerciseId, {
        exerciseId: pick.id,
        exerciseName: pick.name,
      });
    }
  }

  return map;
}
