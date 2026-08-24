"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RestTimer } from "@/components/rest-timer";
import { ExerciseSearch } from "@/components/exercise-search";
import { toast } from "sonner";
import { ChevronLeft, ChevronUp, ChevronDown, Check, Trophy, CircleCheckBig } from "lucide-react";
import { checkNewPRs, computePRs, PR_LABELS, type PRRecord, type PRType } from "@/lib/pr";

type ExerciseInfo = {
  exerciseId: string;
  name: string;
  repTier: string;
  trackingType: string;
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
  rpe: string;
  duration: string;
  distance: string;
  isWarmup: boolean;
  isCompleted: boolean;
};

type ProgressionPrompt = {
  previousWeight: number;
  suggestedWeight: number;
  summary: string;
};

type ExerciseState = {
  exerciseId: string;
  name: string;
  repTier: string;
  trackingType: string;
  targetRepMin: number;
  targetRepMax: number;
  sets: SetState[];
  previousSets: PrevSet[];
  progressionPrompt: ProgressionPrompt | null;
};

function parseDuration(input: string): number | null {
  if (input.includes(":")) {
    const parts = input.split(":");
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  const mins = parseFloat(input);
  if (isNaN(mins)) return null;
  return Math.round(mins * 60);
}

function formatDurationValue(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins}`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

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
          rpe: existing.rpe?.toString() ?? "",
          duration: "",
          distance: "",
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
          rpe: "",
          duration: "",
          distance: "",
          isWarmup: false,
          isCompleted: false,
        });
      }
    }

    let progressionPrompt: ProgressionPrompt | null = null;
    if (
      prev.length > 0 &&
      prev.every(
        (s) => s.reps != null && s.weight != null && s.reps >= ex.targetRepMax
      )
    ) {
      const prevWeight = prev[0].weight!;
      const increment = 2.5;
      progressionPrompt = {
        previousWeight: prevWeight,
        suggestedWeight: prevWeight + increment,
        summary: `${prev.length}×${ex.targetRepMax} at ${prevWeight}kg`,
      };
    }

    return {
      exerciseId: ex.exerciseId,
      name: ex.name,
      repTier: ex.repTier,
      trackingType: ex.trackingType ?? "weight_reps",
      targetRepMin: ex.targetRepMin,
      targetRepMax: ex.targetRepMax,
      sets,
      previousSets: prev,
      progressionPrompt,
    };
  });
}

export function WorkoutSession({
  workout,
  exercises,
  previousPerformance,
  existingSets,
  userId,
  exercisePRs: initialPRs,
}: {
  workout: {
    id: string;
    routineName: string | null;
    date: string;
    startedAt: string;
    isFinished: boolean;
  };
  exercises: ExerciseInfo[];
  previousPerformance: Record<string, PrevSet[]>;
  existingSets: ExistingSet[];
  userId: string;
  exercisePRs: Record<string, PRRecord>;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [exerciseStates, setExerciseStates] = useState<ExerciseState[]>(() =>
    buildInitialState(exercises, previousPerformance, existingSets)
  );
  const [elapsed, setElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState<{
    duration: number;
    setDbId: string;
    startedAt: number;
  } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [currentPRs, setCurrentPRs] = useState<Record<string, PRRecord>>(initialPRs);
  const [prFlash, setPrFlash] = useState<{ exerciseName: string; types: PRType[] } | null>(null);
  const [sessionPRs, setSessionPRs] = useState<{ exerciseName: string; types: PRType[] }[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [bodyweight, setBodyweight] = useState("");
  const [notes, setNotes] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const addExercise = useCallback(
    async (exercise: { id: string; name: string; repTier: string; trackingType: string }) => {
      const repRanges: Record<string, [number, number]> = {
        heavy_compound: [5, 8],
        compound: [8, 12],
        isolation: [10, 15],
        small_isolation: [12, 20],
      };
      const [repMin, repMax] = repRanges[exercise.repTier] ?? [8, 12];
      const tt = exercise.trackingType ?? "weight_reps";
      const numSets = tt === "time" || tt === "distance_time" ? 1 : 3;

      let prev: PrevSet[] = [];
      let progressionPrompt: ProgressionPrompt | null = null;

      const { data: prevSets } = await supabase
        .from("sets")
        .select("weight, reps, rpe, set_number, is_warmup, workouts!inner ( date, user_id )")
        .eq("exercise_id", exercise.id)
        .eq("is_warmup", false)
        .eq("workouts.user_id", userId)
        .order("set_number");

      if (prevSets && prevSets.length > 0) {
        const byDate: Record<string, { weight: number | null; reps: number | null; rpe: number | null; setNumber: number }[]> = {};
        for (const s of prevSets) {
          const wo = s.workouts as unknown as { date: string };
          if (!byDate[wo.date]) byDate[wo.date] = [];
          byDate[wo.date].push({ weight: s.weight, reps: s.reps, rpe: s.rpe, setNumber: s.set_number });
        }
        const dates = Object.keys(byDate).sort().reverse();
        const mostRecent = byDate[dates[0]]
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((s) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe }));
        prev = mostRecent;

        if (
          prev.length > 0 &&
          prev.every((s) => s.reps != null && s.weight != null && s.reps >= repMax)
        ) {
          const prevWeight = prev[0].weight!;
          progressionPrompt = {
            previousWeight: prevWeight,
            suggestedWeight: prevWeight + 2.5,
            summary: `${prev.length}×${repMax} at ${prevWeight}kg`,
          };
        }

        const prSets = prevSets.map((s) => ({
          weight: s.weight,
          reps: s.reps,
          isWarmup: s.is_warmup,
        }));
        setCurrentPRs((p) => ({ ...p, [exercise.id]: computePRs(prSets) }));
      }

      setExerciseStates((states) => [
        ...states,
        {
          exerciseId: exercise.id,
          name: exercise.name,
          repTier: exercise.repTier,
          trackingType: tt,
          targetRepMin: repMin,
          targetRepMax: repMax,
          sets: Array.from({ length: Math.max(numSets, prev.length) }, (_, i) => ({
            dbId: null,
            setNumber: i + 1,
            weight: prev[i]?.weight?.toString() ?? "",
            reps: prev[i]?.reps?.toString() ?? "",
            rpe: "",
            duration: "",
            distance: "",
            isWarmup: false,
            isCompleted: false,
          })),
          previousSets: prev,
          progressionPrompt,
        },
      ]);
      setShowSearch(false);
    },
    [supabase, userId]
  );

  const acceptProgression = useCallback((exIdx: number) => {
    setExerciseStates((prev) => {
      const next = [...prev];
      const ex = { ...next[exIdx], sets: [...next[exIdx].sets] };
      const prompt = ex.progressionPrompt;
      if (!prompt) return prev;

      ex.sets = ex.sets.map((s) =>
        s.isCompleted
          ? s
          : { ...s, weight: prompt.suggestedWeight.toString() }
      );
      ex.progressionPrompt = null;
      next[exIdx] = ex;
      return next;
    });
  }, []);

  const dismissProgression = useCallback((exIdx: number) => {
    setExerciseStates((prev) => {
      const next = [...prev];
      next[exIdx] = { ...next[exIdx], progressionPrompt: null };
      return next;
    });
  }, []);

  const isBackdated = workout.date !== new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (workout.isFinished || isBackdated) return;
    const start = new Date(workout.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [workout.startedAt, workout.isFinished, isBackdated]);

  const updateSet = useCallback(
    (exIdx: number, setIdx: number, field: "weight" | "reps" | "rpe" | "duration" | "distance", value: string) => {
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
      const rpe = set.rpe ? parseFloat(set.rpe) : null;
      const durationSeconds = set.duration ? parseDuration(set.duration) : null;
      const distanceMeters = set.distance ? parseFloat(set.distance) * 1000 : null;

      const { data, error } = await supabase
        .from("sets")
        .insert({
          workout_id: workout.id,
          exercise_id: ex.exerciseId,
          set_number: set.setNumber,
          weight,
          reps,
          rpe,
          duration_seconds: durationSeconds,
          distance_meters: distanceMeters,
          is_warmup: set.isWarmup,
        })
        .select("id")
        .single();

      if (error) {
        toast.error("Failed to save set: " + error.message);
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

        const tt = exCopy.trackingType;
        const nextEmptyIdx = exCopy.sets.findIndex(
          (s, i) => i > setIdx && !s.isCompleted && !s.weight && !s.reps && !s.duration && !s.distance
        );
        if (nextEmptyIdx !== -1) {
          if (tt === "time" || tt === "distance_time") {
            exCopy.sets[nextEmptyIdx] = {
              ...exCopy.sets[nextEmptyIdx],
              duration: set.duration,
              distance: set.distance,
            };
          } else if (weight != null) {
            exCopy.sets[nextEmptyIdx] = {
              ...exCopy.sets[nextEmptyIdx],
              weight: weight.toString(),
              reps: reps?.toString() ?? "",
            };
          }
        }

        next[exIdx] = exCopy;
        return next;
      });

      const isCardio = ex.trackingType === "time" || ex.trackingType === "distance_time";

      if (!set.isWarmup && !isCardio) {
        setRestTimer({ duration: restDuration(ex.repTier), setDbId: data.id, startedAt: Date.now() });

        const prRecord = currentPRs[ex.exerciseId] ?? {
          maxWeight: null,
          bestE1rm: null,
          bestVolume: null,
        };
        const newPRs = checkNewPRs(prRecord, weight, reps);
        if (newPRs.length > 0) {
          setPrFlash({ exerciseName: ex.name, types: newPRs });
          setTimeout(() => setPrFlash(null), 4000);
          setSessionPRs((prev) => [...prev, { exerciseName: ex.name, types: newPRs }]);

          const allSetsForExercise = exerciseStates[exIdx].sets
            .filter((s) => s.isCompleted && !s.isWarmup)
            .map((s) => ({
              weight: s.weight ? parseFloat(s.weight) : null,
              reps: s.reps ? parseInt(s.reps, 10) : null,
              isWarmup: false,
            }));
          allSetsForExercise.push({ weight, reps, isWarmup: false });

          const previousSets = (previousPerformance[ex.exerciseId] ?? []).map(
            (s) => ({ weight: s.weight, reps: s.reps, isWarmup: false })
          );

          const combined = [...previousSets, ...allSetsForExercise];
          setCurrentPRs((prev) => ({
            ...prev,
            [ex.exerciseId]: computePRs(combined),
          }));
        }
      }
    },
    [exerciseStates, supabase, workout.id, currentPRs, previousPerformance]
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
        rpe: "",
        duration: lastSet?.duration ?? "",
        distance: lastSet?.distance ?? "",
        isWarmup: false,
        isCompleted: false,
      });
      next[exIdx] = ex;
      return next;
    });
  }, []);

  const finishWorkout = useCallback(async () => {
    setFinishing(true);

    const bw = bodyweight ? parseFloat(bodyweight) : null;
    const updateData: Record<string, unknown> = {
      ended_at: new Date().toISOString(),
    };
    if (bw && bw > 0) updateData.bodyweight = bw;
    if (notes.trim()) updateData.notes = notes.trim();

    await supabase
      .from("workouts")
      .update(updateData)
      .eq("id", workout.id);

    if (bw && bw > 0) {
      const todayStr = workout.date;
      await supabase
        .from("bodyweight_log")
        .upsert(
          { user_id: userId, date: todayStr, weight: bw },
          { onConflict: "user_id,date" }
        );
    }

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

    setShowSummary(true);
  }, [supabase, workout.id, exercises, bodyweight, notes, userId]);

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  const totalCompleted = exerciseStates.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted && !s.isWarmup).length,
    0
  );

  if (workout.isFinished && !showSummary) {
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

  if (showSummary) {
    const totalVolume = exerciseStates.reduce((sum, ex) => {
      return sum + ex.sets
        .filter((s) => s.isCompleted && !s.isWarmup)
        .reduce((setSum, s) => {
          const w = s.weight ? parseFloat(s.weight) : 0;
          const r = s.reps ? parseInt(s.reps, 10) : 0;
          return setSum + w * r;
        }, 0);
    }, 0);

    const exerciseSummaries = exerciseStates
      .filter((ex) => ex.sets.some((s) => s.isCompleted))
      .map((ex) => {
        const completedSets = ex.sets.filter((s) => s.isCompleted && !s.isWarmup);
        const topWeight = Math.max(
          0,
          ...completedSets.map((s) => (s.weight ? parseFloat(s.weight) : 0))
        );
        return {
          name: ex.name,
          setsCount: completedSets.length,
          topWeight,
          trackingType: ex.trackingType,
        };
      });

    return (
      <div className="flex min-h-screen flex-col px-4 py-8 pb-20">
        <div className="max-w-lg mx-auto w-full space-y-6">
          <div className="text-center space-y-2 pt-4">
            <CircleCheckBig className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-2xl font-bold">Workout Complete</h1>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <Card>
              <CardContent className="py-3 px-2">
                <p className="text-lg font-bold tabular-nums">
                  {elapsedMin}:{elapsedSec.toString().padStart(2, "0")}
                </p>
                <p className="text-[10px] text-muted-foreground">Duration</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-2">
                <p className="text-lg font-bold tabular-nums">{totalCompleted}</p>
                <p className="text-[10px] text-muted-foreground">Working sets</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-2">
                <p className="text-lg font-bold tabular-nums">
                  {totalVolume >= 1000
                    ? `${(totalVolume / 1000).toFixed(1)}t`
                    : `${Math.round(totalVolume)}kg`}
                </p>
                <p className="text-[10px] text-muted-foreground">Volume</p>
              </CardContent>
            </Card>
          </div>

          {sessionPRs.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <p className="font-semibold text-sm">Personal Records</p>
                </div>
                <div className="space-y-1">
                  {sessionPRs.map((pr, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      {pr.exerciseName} — {pr.types.map((t) => PR_LABELS[t]).join(", ")}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Exercises</p>
            {exerciseSummaries.map((ex, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 px-1 text-sm"
              >
                <span className="font-medium">{ex.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {ex.setsCount} set{ex.setsCount !== 1 ? "s" : ""}
                  {ex.topWeight > 0 && ` · ${ex.topWeight}kg`}
                </span>
              </div>
            ))}
          </div>

          <Button
            className="w-full h-12 text-base"
            onClick={() => router.push("/")}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-background border-b px-4 py-2">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-bold">
                {workout.routineName ?? "Empty Workout"}
              </h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {isBackdated ? (
                  <span>
                    {new Date(workout.date + "T00:00:00").toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short" }
                    )}
                  </span>
                ) : (
                  <span className="font-mono tabular-nums">
                    {elapsedMin}:{elapsedSec.toString().padStart(2, "0")}
                  </span>
                )}
                <span>{totalCompleted} sets done</span>
              </div>
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
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground w-full text-left"
        >
          <span className="inline-flex items-center gap-1">
            {showDetails ? "Hide" : "Add"} bodyweight &amp; notes
            {showDetails ? <ChevronUp className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />}
          </span>
        </button>

        {showDetails && (
          <Card>
            <CardContent className="py-3 px-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Bodyweight (kg)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 75.0"
                  value={bodyweight}
                  onChange={(e) => setBodyweight(e.target.value)}
                  className="h-9 w-full rounded-md border bg-transparent px-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Notes
                </label>
                <textarea
                  placeholder="How did it feel?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm resize-none"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {exerciseStates.map((ex, exIdx) => (
          <Card key={ex.exerciseId}>
            <CardContent className="py-3 px-4">
              <div className="mb-2">
                <p className="font-semibold">{ex.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {(ex.trackingType === "weight_reps" || ex.trackingType === "bodyweight_reps" || ex.trackingType === "reps_only") && (
                    <span className="text-xs text-muted-foreground">
                      Target: {ex.targetRepMin}–{ex.targetRepMax} reps
                    </span>
                  )}
                  {ex.trackingType === "time" && (
                    <span className="text-xs text-muted-foreground">
                      Log duration
                    </span>
                  )}
                  {ex.trackingType === "distance_time" && (
                    <span className="text-xs text-muted-foreground">
                      Log distance and time
                    </span>
                  )}
                  {ex.previousSets.length > 0 && (ex.trackingType === "weight_reps" || ex.trackingType === "bodyweight_reps") && (
                    <span className="text-xs text-muted-foreground">
                      Last: {formatPrevious(ex.previousSets)}
                    </span>
                  )}
                </div>
              </div>

              {ex.progressionPrompt && ex.trackingType === "weight_reps" && (
                <div className="mb-3 rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-2">
                  <p className="text-sm font-medium text-blue-400">
                    Add weight? You hit {ex.progressionPrompt.summary}
                  </p>
                  <div className="flex gap-2 mt-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                      onClick={() => acceptProgression(exIdx)}
                    >
                      Use {ex.progressionPrompt.suggestedWeight}kg
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => dismissProgression(exIdx)}
                    >
                      Keep {ex.progressionPrompt.previousWeight}kg
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                {ex.trackingType === "weight_reps" && (
                  <div className="grid grid-cols-[2rem_1fr_1fr_3rem_2.5rem] gap-2 text-xs text-muted-foreground font-medium px-1">
                    <span>Set</span>
                    <span>kg</span>
                    <span>Reps</span>
                    <span>RPE</span>
                    <span />
                  </div>
                )}
                {ex.trackingType === "bodyweight_reps" && (
                  <div className="grid grid-cols-[2rem_1fr_1fr_3rem_2.5rem] gap-2 text-xs text-muted-foreground font-medium px-1">
                    <span>Set</span>
                    <span>+kg</span>
                    <span>Reps</span>
                    <span>RPE</span>
                    <span />
                  </div>
                )}
                {ex.trackingType === "reps_only" && (
                  <div className="grid grid-cols-[2rem_1fr_3rem_2.5rem] gap-2 text-xs text-muted-foreground font-medium px-1">
                    <span>Set</span>
                    <span>Reps</span>
                    <span>RPE</span>
                    <span />
                  </div>
                )}
                {ex.trackingType === "time" && (
                  <div className="grid grid-cols-[2rem_1fr_2.5rem] gap-2 text-xs text-muted-foreground font-medium px-1">
                    <span>#</span>
                    <span>Minutes</span>
                    <span />
                  </div>
                )}
                {ex.trackingType === "distance_time" && (
                  <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 text-xs text-muted-foreground font-medium px-1">
                    <span>#</span>
                    <span>km</span>
                    <span>Minutes</span>
                    <span />
                  </div>
                )}

                {ex.sets.map((set, setIdx) => (
                  <div
                    key={setIdx}
                    className={`grid ${
                      ex.trackingType === "time"
                        ? "grid-cols-[2rem_1fr_2.5rem]"
                        : ex.trackingType === "reps_only"
                          ? "grid-cols-[2rem_1fr_3rem_2.5rem]"
                          : ex.trackingType === "distance_time"
                            ? "grid-cols-[2rem_1fr_1fr_2.5rem]"
                            : "grid-cols-[2rem_1fr_1fr_3rem_2.5rem]"
                    } gap-2 items-center px-1 py-1 rounded ${
                      set.isCompleted
                        ? "bg-green-500/10"
                        : set.isWarmup
                          ? "bg-yellow-500/10"
                          : ""
                    }`}
                  >
                    {(ex.trackingType === "weight_reps" || ex.trackingType === "bodyweight_reps" || ex.trackingType === "reps_only") ? (
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
                    ) : (
                      <span className="text-sm text-muted-foreground text-center">
                        {set.setNumber}
                      </span>
                    )}

                    {ex.trackingType === "weight_reps" && (
                      <>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={set.weight}
                          onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value)}
                          disabled={set.isCompleted}
                          className="h-9 w-full rounded-md border bg-transparent px-2 text-sm tabular-nums text-center disabled:opacity-60"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={set.reps}
                          onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value)}
                          disabled={set.isCompleted}
                          className="h-9 w-full rounded-md border bg-transparent px-2 text-sm tabular-nums text-center disabled:opacity-60"
                        />
                        <select
                          value={set.rpe}
                          onChange={(e) => updateSet(exIdx, setIdx, "rpe", e.target.value)}
                          disabled={set.isCompleted}
                          className="h-9 w-full rounded-md border bg-transparent text-xs tabular-nums text-center disabled:opacity-60"
                        >
                          <option value="">—</option>
                          {[1,2,3,4,5,6,7,8,9,10].map(v => (
                            <option key={v} value={v.toString()}>{v}</option>
                          ))}
                        </select>
                      </>
                    )}

                    {ex.trackingType === "bodyweight_reps" && (
                      <>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={set.weight}
                          onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value)}
                          disabled={set.isCompleted}
                          className="h-9 w-full rounded-md border bg-transparent px-2 text-sm tabular-nums text-center disabled:opacity-60"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={set.reps}
                          onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value)}
                          disabled={set.isCompleted}
                          className="h-9 w-full rounded-md border bg-transparent px-2 text-sm tabular-nums text-center disabled:opacity-60"
                        />
                        <select
                          value={set.rpe}
                          onChange={(e) => updateSet(exIdx, setIdx, "rpe", e.target.value)}
                          disabled={set.isCompleted}
                          className="h-9 w-full rounded-md border bg-transparent text-xs tabular-nums text-center disabled:opacity-60"
                        >
                          <option value="">—</option>
                          {[1,2,3,4,5,6,7,8,9,10].map(v => (
                            <option key={v} value={v.toString()}>{v}</option>
                          ))}
                        </select>
                      </>
                    )}

                    {ex.trackingType === "reps_only" && (
                      <>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={set.reps}
                          onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value)}
                          disabled={set.isCompleted}
                          className="h-9 w-full rounded-md border bg-transparent px-2 text-sm tabular-nums text-center disabled:opacity-60"
                        />
                        <select
                          value={set.rpe}
                          onChange={(e) => updateSet(exIdx, setIdx, "rpe", e.target.value)}
                          disabled={set.isCompleted}
                          className="h-9 w-full rounded-md border bg-transparent text-xs tabular-nums text-center disabled:opacity-60"
                        >
                          <option value="">—</option>
                          {[1,2,3,4,5,6,7,8,9,10].map(v => (
                            <option key={v} value={v.toString()}>{v}</option>
                          ))}
                        </select>
                      </>
                    )}

                    {ex.trackingType === "time" && (
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="30 or 1:30"
                        value={set.duration}
                        onChange={(e) => updateSet(exIdx, setIdx, "duration", e.target.value)}
                        disabled={set.isCompleted}
                        className="h-9 w-full rounded-md border bg-transparent px-2 text-sm tabular-nums text-center disabled:opacity-60"
                      />
                    )}

                    {ex.trackingType === "distance_time" && (
                      <>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={set.distance}
                          onChange={(e) => updateSet(exIdx, setIdx, "distance", e.target.value)}
                          disabled={set.isCompleted}
                          className="h-9 w-full rounded-md border bg-transparent px-2 text-sm tabular-nums text-center disabled:opacity-60"
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="30 or 1:30"
                          value={set.duration}
                          onChange={(e) => updateSet(exIdx, setIdx, "duration", e.target.value)}
                          disabled={set.isCompleted}
                          className="h-9 w-full rounded-md border bg-transparent px-2 text-sm tabular-nums text-center disabled:opacity-60"
                        />
                      </>
                    )}

                    <button
                      onClick={() => completeSet(exIdx, setIdx)}
                      disabled={set.isCompleted}
                      className={`h-9 w-9 rounded-md flex items-center justify-center text-lg transition-colors ${
                        set.isCompleted
                          ? "bg-green-500 text-white"
                          : "border hover:bg-accent"
                      }`}
                    >
                      <Check className="h-4 w-4" />
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

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowSearch(true)}
        >
          + Add Exercise
        </Button>
      </main>

      {showSearch && (
        <ExerciseSearch
          excludeIds={exerciseStates.map((e) => e.exerciseId)}
          userId={userId}
          onSelect={addExercise}
          onClose={() => setShowSearch(false)}
        />
      )}

      {prFlash && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="rounded-lg bg-amber-500 text-white px-4 py-2 shadow-lg text-center">
            <p className="font-bold text-sm">New PR!</p>
            <p className="text-xs">
              {prFlash.exerciseName} &mdash;{" "}
              {prFlash.types.map((t) => PR_LABELS[t]).join(", ")}
            </p>
          </div>
        </div>
      )}

      {restTimer && (
        <RestTimer
          key={restTimer.startedAt}
          duration={restTimer.duration}
          onDismiss={() => {
            const restSeconds = Math.round((Date.now() - restTimer.startedAt) / 1000);
            supabase
              .from("sets")
              .update({ rest_seconds: restSeconds })
              .eq("id", restTimer.setDbId)
              .then();
            setRestTimer(null);
          }}
        />
      )}
    </div>
  );
}
