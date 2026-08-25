import { computeE1rm } from "./pr";

// ============================================================
// Types
// ============================================================

export type PlateauAlertType =
  | "strength_stall"
  | "missed_targets"
  | "volume_regression"
  | "under_stimulus"
  | "exercise_staleness"
  | "rpe_creep";

export type AlertCandidate = {
  alertType: PlateauAlertType;
  exerciseId?: string;
  muscleGroup?: string;
  message: string;
  suggestedExerciseId?: string;
};

export type SessionData = {
  workoutDate: string;
  workingSets: {
    weight: number | null;
    reps: number | null;
    rpe: number | null;
  }[];
};

export type ExerciseHistory = {
  exerciseId: string;
  exerciseName: string;
  movementPattern: string;
  muscleGroup: string;
  targetRepMin: number | null;
  targetRepMax: number | null;
  sessions: SessionData[];
};

export type WeeklyMuscleVolume = {
  muscleGroup: string;
  weekStart: string;
  volumeLoad: number;
  hardSets: number;
};

export type DismissedAlert = {
  alertType: PlateauAlertType;
  exerciseId: string | null;
  muscleGroup: string | null;
  dismissedAt: string;
};

export type VariationOption = {
  exerciseId: string;
  exerciseName: string;
};

const MIN_SESSIONS = 6;
export const COOLDOWN_DAYS = 14;

// ============================================================
// Cooldown check
// ============================================================

function isOnCooldown(
  dismissed: DismissedAlert[],
  alertType: PlateauAlertType,
  exerciseId?: string,
  muscleGroup?: string
): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - COOLDOWN_DAYS);

  return dismissed.some(
    (d) =>
      d.alertType === alertType &&
      d.exerciseId === (exerciseId ?? null) &&
      d.muscleGroup === (muscleGroup ?? null) &&
      new Date(d.dismissedAt) > cutoff
  );
}

// ============================================================
// Signal 1: Strength stall
// Rolling 3-session mean e1RM shows no improvement versus
// the prior 3 sessions, over at least 4 weeks, min 6 sessions.
// ============================================================

export function detectStrengthStall(
  exercise: ExerciseHistory,
  dismissed: DismissedAlert[]
): AlertCandidate | null {
  if (exercise.sessions.length < MIN_SESSIONS) return null;
  if (isOnCooldown(dismissed, "strength_stall", exercise.exerciseId))
    return null;

  const sessionsWithE1rm: { date: string; bestE1rm: number }[] = [];
  for (const session of exercise.sessions) {
    let best: number | null = null;
    for (const s of session.workingSets) {
      if (s.weight != null && s.weight > 0 && s.reps != null && s.reps > 0) {
        const e1rm = computeE1rm(s.weight, s.reps);
        if (e1rm !== null && (best === null || e1rm > best)) {
          best = e1rm;
        }
      }
    }
    if (best !== null) {
      sessionsWithE1rm.push({ date: session.workoutDate, bestE1rm: best });
    }
  }

  if (sessionsWithE1rm.length < MIN_SESSIONS) return null;

  const recent = sessionsWithE1rm.slice(-6);
  const firstDate = new Date(recent[0].date);
  const lastDate = new Date(recent[recent.length - 1].date);
  const spanWeeks =
    (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000);
  if (spanWeeks < 4) return null;

  const prior3 = recent.slice(0, 3);
  const latest3 = recent.slice(3, 6);
  const priorMean =
    prior3.reduce((sum, s) => sum + s.bestE1rm, 0) / prior3.length;
  const latestMean =
    latest3.reduce((sum, s) => sum + s.bestE1rm, 0) / latest3.length;

  if (latestMean >= priorMean) return null;

  return {
    alertType: "strength_stall",
    exerciseId: exercise.exerciseId,
    message: `${exercise.exerciseName}: e1RM hasn't improved over the last 6 sessions. Consider deloading 10% and rebuilding, or switching rep range.`,
  };
}

// ============================================================
// Signal 2: Missed targets
// Failed to reach bottom of target rep range on any working
// set for 3 consecutive sessions.
// ============================================================

export function detectMissedTargets(
  exercise: ExerciseHistory,
  dismissed: DismissedAlert[]
): AlertCandidate | null {
  if (exercise.targetRepMin === null) return null;
  if (exercise.sessions.length < MIN_SESSIONS) return null;
  if (isOnCooldown(dismissed, "missed_targets", exercise.exerciseId))
    return null;

  const last3 = exercise.sessions.slice(-3);

  for (const session of last3) {
    const weightSets = session.workingSets.filter(
      (s) => s.weight != null && s.weight > 0
    );
    if (weightSets.length === 0) return null;

    const allHitMin = weightSets.every(
      (s) => s.reps != null && s.reps >= exercise.targetRepMin!
    );
    if (allHitMin) return null;
  }

  return {
    alertType: "missed_targets",
    exerciseId: exercise.exerciseId,
    message: `${exercise.exerciseName}: you've missed the target rep range (${exercise.targetRepMin}+) for 3 sessions in a row. The weight may be too heavy — consider resetting to a lighter load.`,
  };
}

// ============================================================
// Signal 3: Volume regression
// Weekly volume load down more than 15% for 2 consecutive
// weeks on a muscle group.
// ============================================================

export function detectVolumeRegression(
  weeklyData: WeeklyMuscleVolume[],
  muscleGroup: string,
  dismissed: DismissedAlert[]
): AlertCandidate | null {
  if (isOnCooldown(dismissed, "volume_regression", undefined, muscleGroup))
    return null;

  const sorted = weeklyData
    .filter((w) => w.muscleGroup === muscleGroup)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  if (sorted.length < 3) return null;

  const last3 = sorted.slice(-3);
  const [weekA, weekB, weekC] = last3;

  if (weekA.volumeLoad === 0) return null;

  const dropB = (weekA.volumeLoad - weekB.volumeLoad) / weekA.volumeLoad;
  const dropC = (weekB.volumeLoad - weekC.volumeLoad) / weekB.volumeLoad;

  if (dropB <= 0.15 || dropC <= 0.15) return null;
  if (weekB.volumeLoad === 0) return null;

  return {
    alertType: "volume_regression",
    muscleGroup,
    message: `${muscleGroup}: volume has dropped more than 15% two weeks in a row. Check sleep, recovery, and calories.`,
  };
}

// ============================================================
// Signal 4: Under-stimulus
// Muscle group below 10 hard sets per week for 3 weeks.
// ============================================================

export function detectUnderStimulus(
  weeklyData: WeeklyMuscleVolume[],
  muscleGroup: string,
  dismissed: DismissedAlert[]
): AlertCandidate | null {
  if (isOnCooldown(dismissed, "under_stimulus", undefined, muscleGroup))
    return null;

  const sorted = weeklyData
    .filter((w) => w.muscleGroup === muscleGroup)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  if (sorted.length < 3) return null;

  const last3 = sorted.slice(-3);
  const allBelow = last3.every((w) => w.hardSets < 10);

  if (!allBelow) return null;

  const avg = Math.round(
    last3.reduce((sum, w) => sum + w.hardSets, 0) / last3.length
  );

  return {
    alertType: "under_stimulus",
    muscleGroup,
    message: `${muscleGroup}: averaging ${avg} hard sets/week over the last 3 weeks (below the 10-set minimum for growth). Add sets or train it more often.`,
  };
}

// ============================================================
// Signal 5: Exercise staleness
// Same exercise unchanged for more than 10 weeks.
// ============================================================

export function detectExerciseStaleness(
  exercise: ExerciseHistory,
  dismissed: DismissedAlert[],
  variation: VariationOption | null
): AlertCandidate | null {
  if (exercise.sessions.length < MIN_SESSIONS) return null;
  if (isOnCooldown(dismissed, "exercise_staleness", exercise.exerciseId))
    return null;

  const dates = exercise.sessions.map((s) => new Date(s.workoutDate));
  const earliest = dates[0];
  const latest = dates[dates.length - 1];
  const spanWeeks =
    (latest.getTime() - earliest.getTime()) / (7 * 24 * 60 * 60 * 1000);

  if (spanWeeks < 10) return null;

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  if (latest < twoWeeksAgo) return null;

  const suggestion = variation
    ? ` Try swapping to ${variation.exerciseName}.`
    : "";

  return {
    alertType: "exercise_staleness",
    exerciseId: exercise.exerciseId,
    suggestedExerciseId: variation?.exerciseId,
    message: `${exercise.exerciseName}: you've been doing this for ${Math.round(spanWeeks)} weeks.${suggestion}`,
  };
}

// ============================================================
// Signal 6: RPE creep
// Same weight and reps, but mean RPE up by 1.5+ over 3
// sessions. Requires RPE on 60%+ of sets in the window.
// ============================================================

export function detectRPECreep(
  exercise: ExerciseHistory,
  dismissed: DismissedAlert[]
): AlertCandidate | null {
  if (exercise.sessions.length < 3) return null;
  if (isOnCooldown(dismissed, "rpe_creep", exercise.exerciseId)) return null;

  const last3 = exercise.sessions.slice(-3);

  const allSets = last3.flatMap((s) => s.workingSets);
  const setsWithRpe = allSets.filter((s) => s.rpe !== null);
  if (allSets.length === 0 || setsWithRpe.length / allSets.length < 0.6)
    return null;

  function sessionMeanRpe(session: SessionData): number | null {
    const withRpe = session.workingSets.filter((s) => s.rpe !== null);
    if (withRpe.length === 0) return null;
    return withRpe.reduce((sum, s) => sum + s.rpe!, 0) / withRpe.length;
  }

  function sessionMedianWeight(session: SessionData): number | null {
    const weights = session.workingSets
      .filter((s) => s.weight != null && s.weight > 0)
      .map((s) => s.weight!)
      .sort((a, b) => a - b);
    if (weights.length === 0) return null;
    return weights[Math.floor(weights.length / 2)];
  }

  function sessionMedianReps(session: SessionData): number | null {
    const reps = session.workingSets
      .filter((s) => s.reps != null && s.reps > 0)
      .map((s) => s.reps!)
      .sort((a, b) => a - b);
    if (reps.length === 0) return null;
    return reps[Math.floor(reps.length / 2)];
  }

  const firstWeight = sessionMedianWeight(last3[0]);
  const lastWeight = sessionMedianWeight(last3[2]);
  const firstReps = sessionMedianReps(last3[0]);
  const lastReps = sessionMedianReps(last3[2]);

  if (
    firstWeight === null ||
    lastWeight === null ||
    firstReps === null ||
    lastReps === null
  )
    return null;

  const weightDiff = Math.abs(lastWeight - firstWeight) / firstWeight;
  const repsDiff = Math.abs(lastReps - firstReps);
  if (weightDiff > 0.05 || repsDiff > 1) return null;

  const firstRpe = sessionMeanRpe(last3[0]);
  const lastRpe = sessionMeanRpe(last3[2]);
  if (firstRpe === null || lastRpe === null) return null;

  if (lastRpe - firstRpe < 1.5) return null;

  return {
    alertType: "rpe_creep",
    exerciseId: exercise.exerciseId,
    message: `${exercise.exerciseName}: RPE has climbed from ${firstRpe.toFixed(1)} to ${lastRpe.toFixed(1)} at the same weight. Fatigue may be accumulating — consider a deload week.`,
  };
}

// ============================================================
// Main orchestrator
// ============================================================

export function detectAllAlerts(
  exercises: ExerciseHistory[],
  weeklyData: WeeklyMuscleVolume[],
  dismissed: DismissedAlert[],
  variations: Map<string, VariationOption | null>
): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];

  for (const ex of exercises) {
    const stall = detectStrengthStall(ex, dismissed);
    if (stall) alerts.push(stall);

    const missed = detectMissedTargets(ex, dismissed);
    if (missed) alerts.push(missed);

    const staleness = detectExerciseStaleness(
      ex,
      dismissed,
      variations.get(ex.exerciseId) ?? null
    );
    if (staleness) alerts.push(staleness);

    const rpe = detectRPECreep(ex, dismissed);
    if (rpe) alerts.push(rpe);
  }

  const muscleGroups = Array.from(new Set(weeklyData.map((w) => w.muscleGroup)));
  for (const mg of muscleGroups) {
    const vol = detectVolumeRegression(weeklyData, mg, dismissed);
    if (vol) alerts.push(vol);

    const under = detectUnderStimulus(weeklyData, mg, dismissed);
    if (under) alerts.push(under);
  }

  return alerts;
}
