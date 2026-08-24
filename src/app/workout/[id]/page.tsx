import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkoutSession } from "./workout-session";
import { computePRs, type PRRecord } from "@/lib/pr";

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: workout } = await supabase
    .from("workouts")
    .select(
      `
      id,
      routine_id,
      date,
      started_at,
      ended_at,
      routines (
        name
      )
    `
    )
    .eq("id", id)
    .single();

  if (!workout) notFound();

  let exercises: {
    exerciseId: string;
    name: string;
    repTier: string;
    trackingType: string;
    targetSets: number;
    targetRepMin: number;
    targetRepMax: number;
    position: number;
  }[] = [];

  if (workout.routine_id) {
    const { data: routineExercises } = await supabase
      .from("routine_exercises")
      .select(
        `
        position,
        target_sets,
        target_rep_min,
        target_rep_max,
        exercises (
          id,
          name,
          default_rep_tier,
          tracking_type
        )
      `
      )
      .eq("routine_id", workout.routine_id)
      .order("position");

    exercises =
      routineExercises?.map((re) => {
        const ex = re.exercises as unknown as {
          id: string;
          name: string;
          default_rep_tier: string;
          tracking_type: string;
        };
        return {
          exerciseId: ex.id,
          name: ex.name,
          repTier: ex.default_rep_tier,
          trackingType: ex.tracking_type,
          targetSets: re.target_sets,
          targetRepMin: re.target_rep_min,
          targetRepMax: re.target_rep_max,
          position: re.position,
        };
      }) ?? [];
  }

  const exerciseIds = exercises.map((e) => e.exerciseId);

  let previousPerformance: Record<
    string,
    { weight: number | null; reps: number | null; rpe: number | null }[]
  > = {};
  const exercisePRs: Record<string, PRRecord> = {};

  if (exerciseIds.length > 0) {
    const { data: prevSets } = await supabase
      .from("sets")
      .select(
        `
        exercise_id,
        set_number,
        weight,
        reps,
        rpe,
        is_warmup,
        workouts!inner (
          id,
          user_id,
          date
        )
      `
      )
      .eq("is_warmup", false)
      .eq("workouts.user_id", user.id)
      .in("exercise_id", exerciseIds)
      .neq("workouts.id", workout.id)
      .order("set_number");

    if (prevSets && prevSets.length > 0) {
      const byExercise: Record<
        string,
        {
          workoutDate: string;
          sets: {
            weight: number | null;
            reps: number | null;
            rpe: number | null;
            setNumber: number;
          }[];
        }[]
      > = {};

      for (const s of prevSets) {
        const w = s.workouts as unknown as { id: string; date: string };
        if (!byExercise[s.exercise_id]) byExercise[s.exercise_id] = [];
        let workoutGroup = byExercise[s.exercise_id].find(
          (g) => g.workoutDate === w.date
        );
        if (!workoutGroup) {
          workoutGroup = { workoutDate: w.date, sets: [] };
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
          isWarmup: s.is_warmup,
        });
      }
      for (const [exId, exSets] of Object.entries(prByExercise)) {
        exercisePRs[exId] = computePRs(exSets);
      }
    }
  }

  const { data: existingSets } = await supabase
    .from("sets")
    .select("id, exercise_id, set_number, weight, reps, rpe, is_warmup")
    .eq("workout_id", workout.id)
    .order("set_number");

  return (
    <WorkoutSession
      workout={{
        id: workout.id,
        routineName: (workout.routines as unknown as { name: string } | null)?.name ?? null,
        date: workout.date,
        startedAt: workout.started_at,
        isFinished: !!workout.ended_at,
      }}
      exercises={exercises}
      previousPerformance={previousPerformance}
      existingSets={
        existingSets?.map((s) => ({
          id: s.id,
          exerciseId: s.exercise_id,
          setNumber: s.set_number,
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe,
          isWarmup: s.is_warmup,
        })) ?? []
      }
      userId={user.id}
      exercisePRs={exercisePRs}
    />
  );
}
