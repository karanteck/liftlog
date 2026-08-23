"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RestTimer } from "@/components/rest-timer";

type ExerciseInfo = {
  exerciseId: string;
  name: string;
  repTier: string;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  position: number;
};

type PrevSet = {
  weight: number | null;
  reps: number | null;
  rpe: number | null;
};

type ExistingSet = {
  id: string;
  exerciseId: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup: boolean;
};

type SetState = {
  dbId: string | null;
  setNumber: number;
  weight: string;
  reps: string;
  isWarmup: boolean;
  isCompleted: boolean;
};

type ExerciseState = {
  exerciseId: string;
  name: string;
  repTier: string;
  targetRepMin: number;
  targetRepMax: number;
  sets: SetState[];
  previousSets: PrevSet[];
};

function restDuration(repTier: string): number {
  if (repTier === "heavy_compound") return 180;
  if (repTier === "compound") return 150;
  if (repTier === "isolation") return 90;
  return 60;
}

function formatPrevious(sets: PrevSet[]): string {
  if (sets.length === 0) return "";
  const allSameWeight =
    sets.every((s) => s.weight === sets[0].weight) && sets[0].weight != null;
  if (allSameWeight) {
    return `${sets[0].weight}kg × ${sets.map((s) => s.reps ?? "?").join(", ")}`;
  }
  return sets
    .map((s) => `${s.weight ?? "?"}×${s.reps ?? "?"}`)
    .join(", ");
}

function buildInitialState(
  exercises: ExerciseInfo[],
  previousPerformance: Record<string, PrevSet[]>,
  existingSets: ExistingSet[]
): ExerciseState[] {
  return exercises.map((ex) => {
    const prev = previousPerformance[ex.exerciseId] ?? [];
    const saved = existingSets
      .filter((s) => s.exerciseId === ex.exerciseId)
      .sort((a, b) => a.setNumber - b.setNumber);

    const numSets = Math.max(ex.targetSets, saved.length);
    const sets: SetState[] = [];

    for (let i = 0; i < numSets; i++) {
      const existing = saved.find((s) => s.setNumber === i + 1);
      if (existing) {
        sets.push({
          dbId: existing.id,
          setNumber: i + 1,
          weight: existing.weight?.toString() ?? "",
          reps: existing.reps?.toString() ?? "",
          isWarmup: existing.isWarmup,
          isCompleted: true,
        });
      } else {
        const prevForSet = prev[i];
        sets.push({
          dbId: null,
          setNumber: i + 1,
          weight: prevForSet?.weight?.toString() ?? "",
          reps: prevForSet?.reps?.toString() ?? "",
          isWarmup: false,
          isCompleted: false,
        });
      }
    }

    return {
      exerciseId: ex.exerciseId,
      name: ex.name,
      repTier: ex.repTier,
      targetRepMin: ex.targetRepMin,
      targetRepMax: ex.targetRepMax,
      sets,
      previousSets: prev,
    };
  });
}

export function WorkoutSession({
  workout,
  exercises,
  previousPerformance,
  existingSets,
}: {
  workout: {
    id: string;
    routineName: string | null;
    startedAt: string;
    isFinished: boolean;
  };
  exercises: ExerciseInfo[];
  previousPerformance: Record<string, PrevSet[]>;
  existingSets: ExistingSet[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [exerciseStates, setExerciseStates] = useState<ExerciseState[]>(() =>
    buildInitialState(exercises, previousPerformance, existingSets)
  );
  const [elapsed, setElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState<{
    duration: number;
  } | null>(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (workout.isFinished) return;
    const start = new Date(workout.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [workout.startedAt, workout.isFinished]);

  const updateSet = useCallback(
    (exIdx: number, setIdx: number, field: "weight" | "reps", value: string) => {
      setExerciseStates((prev) => {
        const next = [...prev];
        const ex = { ...next[exIdx], sets: [...next[exIdx].sets] };
        ex.sets[setIdx] = { ...ex.sets[setIdx], [field]: value };
        next[exIdx] = ex;
        return next;
      });
    },
    []
  );

  const toggleWarmup = useCallback((exIdx: number, setIdx: number) => {
    setExerciseStates((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx], sets: [...next[exIdx].sets] };
      ex.sets[setIdx] = {
        ...ex.sets[setIdx],
        isWarmup: !ex.sets[setIdx].isWarmup,
      };
      next[exIdx] = ex;
      return next;
    });
  }, []);

  const completeSet = useCallback(
    async (exIdx: number, setIdx: number) => {
      const ex = exerciseStates[exIdx];
      const set = ex.sets[setIdx];
      if (set.isCompleted) return;

      const weight = set.weight ? parseFloat(set.weight) : null;
      const reps = set.reps ? parseInt(set.reps, 10) : null;

      const { data, error } = await supabase
        .from("sets")
        .insert({
          workout_id: workout.id,
          exercise_id: ex.exerciseId,
          set_number: set.setNumber,
          weight,
          reps,
          is_warmup: set.isWarmup,
        })
        .select("id")
        .single();

      if (error) {
        alert("Failed to save set: " + error.message);
        return;
      }

      setExerciseStates((prev) => {
        const next = [...prev];
        const exCopy = { ...next[exIdx], sets: [...next[exIdx].sets] };
        exCopy.sets[setIdx] = {
          ...exCopy.sets[setIdx],
          dbId: data.id,
          isCompleted: true,
        };

        const nextEmptyIdx = exCopy.sets.findIndex(
          (s, i) => i > setIdx && !s.isCompleted && !s.weight && !s.reps
        );
        if (nextEmptyIdx !== -1 && weight != null) {
          exCopy.sets[nextEmptyIdx] = {
            ...exCopy.sets[nextEmptyIdx],
            weight: weight.toString(),
            reps: reps?.toString() ?? "",
          };
        }

        next[exIdx] = exCopy;
        return next;
      });

      if (!set.isWarmup) {
        setRestTimer({ duration: restDuration(ex.repTier) });
      }
    },
    [exerciseStates, supabase, workout.id]
  );

  const addSet = useCallback((exIdx: number) => {
    setExerciseStates((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx], sets: [...next[exIdx].sets] };
      const lastSet = ex.sets[ex.sets.length - 1];
      ex.sets.push({
        dbId: null,
        setNumber: ex.sets.length + 1,
        weight: lastSet?.weight ?? "",
        reps: lastSet?.reps ?? "",
        isWarmup: false,
        isCompleted: false,
      });
      next[exIdx] = ex;
      return next;
    });
  }, []);

  const finishWorkout = useCallback(async () => {
    setFinishing(true);

    await supabase
      .from("workouts")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", workout.id);

    const routineExercise = exercises[0];
    if (routineExercise) {
      const { data: w } = await supabase
        .from("workouts")
        .select("routine_id")
        .eq("id", workout.id)
        .single();

      if (w?.routine_id) {
        await supabase
          .from("routines")
          .update({ last_performed_at: new Date().toISOString() })
          .eq("id", w.routine_id);
      }
    }

    router.push("/");
  }, [supabase, workout.id, exercises, router]);

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  const totalCompleted = exerciseStates.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted && !s.isWarmup).length,
    0
  );

  if (workout.isFinished) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold">Workout complete</h1>
        <p className="mt-2 text-muted-foreground">
          This workout has already been finished.
        </p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-background border-b px-4 py-2">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="font-bold">
              {workout.routineName ?? "Empty Workout"}
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">
                {elapsedMin}:{elapsedSec.toString().padStart(2, "0")}
              </span>
              <span>{totalCompleted} sets done</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={finishWorkout}
            disabled={finishing}
          >
            {finishing ? "Saving..." : "Finish"}
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {exerciseStates.map((ex, exIdx) => (
          <Card key={ex.exerciseId}>
            <CardContent className="py-3 px-4">
              <div className="mb-2">
                <p className="font-semibold">{ex.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    Target: {ex.targetRepMin}–{ex.targetRepMax} reps
                  </span>
                  {ex.previousSets.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Last: {formatPrevious(ex.previousSets)}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 text-xs text-muted-foreground font-medium px-1">
                  <span>Set</span>
                  <span>kg</span>
                  <span>Reps</span>
                  <span />
                </div>

                {ex.sets.map((set, setIdx) => (
                  <div
                    key={setIdx}
                    className={`grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center px-1 py-1 rounded ${
                      set.isCompleted
                        ? "bg-green-500/10"
                        : set.isWarmup
                          ? "bg-yellow-500/10"
                          : ""
                    }`}
                  >
                    <button
                      onClick={() => toggleWarmup(exIdx, setIdx)}
                      disabled={set.isCompleted}
                      className="text-sm font-medium text-center"
                      title={set.isWarmup ? "Warmup set" : "Working set"}
                    >
                      {set.isWarmup ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 text-yellow-500 border-yellow-500/50"
                        >
                          W
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          {set.setNumber}
                        </span>
                      )}
                    </button>

                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={set.weight}
                      onChange={(e) =>
                        updateSet(exIdx, setIdx, "weight", e.target.value)
                      }
                      disabled={set.isCompleted}
                      className="h-9 w-full rounded-md border bg-transparent px-2 text-sm tabular-nums text-center disabled:opacity-60"
                    />

                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={set.reps}
                      onChange={(e) =>
                        updateSet(exIdx, setIdx, "reps", e.target.value)
                      }
                      disabled={set.isCompleted}
                      className="h-9 w-full rounded-md border bg-transparent px-2 text-sm tabular-nums text-center disabled:opacity-60"
                    />

                    <button
                      onClick={() => completeSet(exIdx, setIdx)}
                      disabled={set.isCompleted}
                      className={`h-9 w-9 rounded-md flex items-center justify-center text-lg transition-colors ${
                        set.isCompleted
                          ? "bg-green-500 text-white"
                          : "border hover:bg-accent"
                      }`}
                    >
                      {set.isCompleted ? "✓" : "✓"}
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addSet(exIdx)}
                className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground py-1"
              >
                + Add set
              </button>
            </CardContent>
          </Card>
        ))}

        {exerciseStates.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Empty workout — exercise search coming soon.</p>
          </div>
        )}
      </main>

      {restTimer && (
        <RestTimer
          key={Date.now()}
          duration={restTimer.duration}
          onDismiss={() => setRestTimer(null)}
        />
      )}
    </div>
  );
}
