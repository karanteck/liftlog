"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePowerSyncDb } from "@/components/powersync-provider";
import { computePRs, type PRRecord } from "@/lib/pr";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { WorkoutSession } from "./workout-session";
import type { ExerciseInfo, PrevSet, ExistingSet } from "./types";

type WorkoutData = {
  workout: {
    id: string;
    routineName: string | null;
    date: string;
    startedAt: string;
    isFinished: boolean;
    bodyweight: number | null;
    notes: string | null;
  };
  exercises: ExerciseInfo[];
  previousPerformance: Record<string, PrevSet[]>;
  existingSets: ExistingSet[];
  exercisePRs: Record<string, PRRecord>;
};

const REP_RANGES: Record<string, [number, number]> = {
  heavy_compound: [5, 8],
  compound: [8, 12],
  isolation: [10, 15],
  small_isolation: [12, 20],
};

function WorkoutSkeleton() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </header>
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4 px-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="h-11 w-20" />
                    <Skeleton className="h-11 w-16" />
                    <Skeleton className="h-12 w-12 rounded-md" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}

async function loadWorkoutData(
  db: import("@powersync/web").PowerSyncDatabase,
  workoutId: string,
  userId: string
): Promise<WorkoutData | null> {
  const workout = await db.getOptional<{
    id: string;
    routine_id: string | null;
    date: string;
    started_at: string;
    ended_at: string | null;
    bodyweight: number | null;
    notes: string | null;
    routine_name: string | null;
  }>(
    `SELECT w.id, w.routine_id, w.date, w.started_at, w.ended_at,
            w.bodyweight, w.notes, r.name AS routine_name
     FROM workouts w
     LEFT JOIN routines r ON w.routine_id = r.id
     WHERE w.id = ?`,
    [workoutId]
  );

  if (!workout) return null;

  let exercises: ExerciseInfo[] = [];

  if (workout.routine_id) {
    const routineExercises = await db.getAll<{
      position: number;
      target_sets: number;
      target_rep_min: number;
      target_rep_max: number;
      exercise_id: string;
      name: string;
      default_rep_tier: string;
      tracking_type: string;
    }>(
      `SELECT re.position, re.target_sets, re.target_rep_min, re.target_rep_max,
              e.id AS exercise_id, e.name, e.default_rep_tier, e.tracking_type
       FROM routine_exercises re
       JOIN exercises e ON re.exercise_id = e.id
       WHERE re.routine_id = ?
       ORDER BY re.position`,
      [workout.routine_id]
    );

    exercises = routineExercises.map((re) => ({
      exerciseId: re.exercise_id,
      name: re.name,
      repTier: re.default_rep_tier,
      trackingType: re.tracking_type,
      targetSets: re.target_sets,
      targetRepMin: re.target_rep_min,
      targetRepMax: re.target_rep_max,
      position: re.position,
    }));
  }

  const existingSetsRows = await db.getAll<{
    id: string;
    exercise_id: string;
    set_number: number;
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    is_warmup: number;
  }>(
    `SELECT id, exercise_id, set_number, weight, reps, rpe, is_warmup
     FROM sets WHERE workout_id = ? ORDER BY set_number`,
    [workoutId]
  );

  const existingSets: ExistingSet[] = existingSetsRows.map((s) => ({
    id: s.id,
    exerciseId: s.exercise_id,
    setNumber: s.set_number,
    weight: s.weight,
    reps: s.reps,
    rpe: s.rpe,
    isWarmup: !!s.is_warmup,
  }));

  const routineExerciseIds = new Set(exercises.map((e) => e.exerciseId));
  const extraExerciseIds = [
    ...new Set(
      existingSetsRows
        .map((s) => s.exercise_id)
        .filter((id) => !routineExerciseIds.has(id))
    ),
  ];

  if (extraExerciseIds.length > 0) {
    const placeholders = extraExerciseIds.map(() => "?").join(",");
    const extraExercises = await db.getAll<{
      id: string;
      name: string;
      default_rep_tier: string;
      tracking_type: string;
    }>(
      `SELECT id, name, default_rep_tier, tracking_type
       FROM exercises WHERE id IN (${placeholders})`,
      extraExerciseIds
    );

    for (const ex of extraExercises) {
      const [repMin, repMax] = REP_RANGES[ex.default_rep_tier] ?? [8, 12];
      exercises.push({
        exerciseId: ex.id,
        name: ex.name,
        repTier: ex.default_rep_tier,
        trackingType: ex.tracking_type,
        targetSets: 3,
        targetRepMin: repMin,
        targetRepMax: repMax,
        position: exercises.length + 1,
      });
    }
  }

  const allExerciseIds = exercises.map((e) => e.exerciseId);
  let previousPerformance: Record<string, PrevSet[]> = {};
  const exercisePRs: Record<string, PRRecord> = {};

  if (allExerciseIds.length > 0) {
    const placeholders = allExerciseIds.map(() => "?").join(",");
    const prevSets = await db.getAll<{
      exercise_id: string;
      set_number: number;
      weight: number | null;
      reps: number | null;
      rpe: number | null;
      is_warmup: number;
      workout_date: string;
    }>(
      `SELECT s.exercise_id, s.set_number, s.weight, s.reps, s.rpe, s.is_warmup,
              w.date AS workout_date
       FROM sets s
       JOIN workouts w ON s.workout_id = w.id
       WHERE s.is_warmup = 0
         AND w.user_id = ?
         AND w.id != ?
         AND s.exercise_id IN (${placeholders})
       ORDER BY s.set_number`,
      [userId, workoutId, ...allExerciseIds]
    );

    if (prevSets.length > 0) {
      const byExercise: Record<
        string,
        {
          workoutDate: string;
          sets: { weight: number | null; reps: number | null; rpe: number | null; setNumber: number }[];
        }[]
      > = {};

      for (const s of prevSets) {
        if (!byExercise[s.exercise_id]) byExercise[s.exercise_id] = [];
        let workoutGroup = byExercise[s.exercise_id].find(
          (g) => g.workoutDate === s.workout_date
        );
        if (!workoutGroup) {
          workoutGroup = { workoutDate: s.workout_date, sets: [] };
          byExercise[s.exercise_id].push(workoutGroup);
        }
        workoutGroup.sets.push({
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe,
          setNumber: s.set_number,
        });
      }

      for (const [exId, workouts] of Object.entries(byExercise)) {
        workouts.sort(
          (a, b) =>
            new Date(b.workoutDate).getTime() -
            new Date(a.workoutDate).getTime()
        );
        const mostRecent = workouts[0];
        previousPerformance[exId] = mostRecent.sets
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((s) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe }));
      }

      const prByExercise: Record<
        string,
        { weight: number | null; reps: number | null; isWarmup: boolean }[]
      > = {};
      for (const s of prevSets) {
        if (!prByExercise[s.exercise_id]) prByExercise[s.exercise_id] = [];
        prByExercise[s.exercise_id].push({
          weight: s.weight,
          reps: s.reps,
          isWarmup: !!s.is_warmup,
        });
      }
      for (const [exId, exSets] of Object.entries(prByExercise)) {
        exercisePRs[exId] = computePRs(exSets);
      }
    }
  }

  return {
    workout: {
      id: workout.id,
      routineName: workout.routine_name,
      date: workout.date,
      startedAt: workout.started_at,
      isFinished: !!workout.ended_at,
      bodyweight: workout.bodyweight ? Number(workout.bodyweight) : null,
      notes: workout.notes,
    },
    exercises,
    previousPerformance,
    existingSets,
    exercisePRs,
  };
}

export function WorkoutLoader({
  workoutId,
  userId,
}: {
  workoutId: string;
  userId: string;
}) {
  const db = usePowerSyncDb();
  const router = useRouter();
  const [data, setData] = useState<WorkoutData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    loadWorkoutData(db, workoutId, userId).then((result) => {
      if (!result) {
        router.replace("/");
        return;
      }
      setData(result);
      setLoading(false);
    });
  }, [db, workoutId, userId, router]);

  if (loading || !data) return <WorkoutSkeleton />;

  return (
    <WorkoutSession
      workout={data.workout}
      exercises={data.exercises}
      previousPerformance={data.previousPerformance}
      existingSets={data.existingSets}
      userId={userId}
      exercisePRs={data.exercisePRs}
    />
  );
}
