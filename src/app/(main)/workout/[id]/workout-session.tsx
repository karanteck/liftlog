"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { RestTimer } from "@/components/rest-timer";
import { ExerciseSearch } from "@/components/exercise-search";
import { toast } from "sonner";
import { ChevronLeft, ChevronUp, ChevronDown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { checkNewPRs, computePRs, type PRRecord, type PRType } from "@/lib/pr";
import { runPlateauDetection } from "@/lib/plateau-runner";
import type { ExerciseInfo, PrevSet, ExistingSet, ExerciseState, ProgressionPrompt } from "./types";
import { WorkoutSummary } from "./workout-summary";
import { ExerciseCard } from "./exercise-card";

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

function restDuration(repTier: string): number {
  if (repTier === "heavy_compound") return 180;
  if (repTier === "compound") return 150;
  if (repTier === "isolation") return 90;
  return 60;
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
    const sets = Array.from({ length: numSets }, (_, i) => {
      const existing = saved.find((s) => s.setNumber === i + 1);
      if (existing) {
        return {
          dbId: existing.id,
          setNumber: i + 1,
          weight: existing.weight?.toString() ?? "",
          reps: existing.reps?.toString() ?? "",
          rpe: existing.rpe?.toString() ?? "",
          duration: "",
          distance: "",
          isWarmup: existing.isWarmup,
          isCompleted: true,
        };
      }
      const prevForSet = prev[i];
      return {
        dbId: null,
        setNumber: i + 1,
        weight: prevForSet?.weight?.toString() ?? "",
        reps: prevForSet?.reps?.toString() ?? "",
        rpe: "",
        duration: "",
        distance: "",
        isWarmup: false,
        isCompleted: false,
      };
    });

    let progressionPrompt: ProgressionPrompt | null = null;
    if (
      prev.length > 0 &&
      prev.every(
        (s) => s.reps != null && s.weight != null && s.reps >= ex.targetRepMax
      )
    ) {
      const prevWeight = prev[0].weight!;
      progressionPrompt = {
        previousWeight: prevWeight,
        suggestedWeight: prevWeight + 2.5,
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
    bodyweight: number | null;
    notes: string | null;
  };
  exercises: ExerciseInfo[];
  previousPerformance: Record<string, PrevSet[]>;
  existingSets: ExistingSet[];
  userId: string;
  exercisePRs: Record<string, PRRecord>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const isEditing = workout.isFinished;

  const [exerciseStates, setExerciseStates] = useState<ExerciseState[]>(() => {
    const states = buildInitialState(exercises, previousPerformance, existingSets);
    if (isEditing) {
      return states.map((s) => ({ ...s, progressionPrompt: null }));
    }
    return states;
  });
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
  const [bodyweight, setBodyweight] = useState(workout.bodyweight?.toString() ?? "");
  const [notes, setNotes] = useState(workout.notes ?? "");
  const [showDetails, setShowDetails] = useState(isEditing);
  const [rpeOpenFor, setRpeOpenFor] = useState<{ exIdx: number; setIdx: number } | null>(null);
  const [collapsedExercises, setCollapsedExercises] = useState<Set<string>>(new Set());
  const [lastSetAt, setLastSetAt] = useState<number | null>(null);

  const exerciseStatesRef = useRef(exerciseStates);
  exerciseStatesRef.current = exerciseStates;
  const currentPRsRef = useRef(currentPRs);
  currentPRsRef.current = currentPRs;

  const addExercise = useCallback(
    async (exercise: { id: string; name: string; muscleGroup: string; repTier: string; trackingType: string }) => {
      setShowSearch(false);
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
        s.isCompleted ? s : { ...s, weight: prompt.suggestedWeight.toString() }
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

  useEffect(() => {
    if (isEditing) return;
    setCollapsedExercises((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const ex of exerciseStates) {
        const workingSets = ex.sets.filter((s) => !s.isWarmup);
        const allDone = workingSets.length > 0 && workingSets.every((s) => s.isCompleted);
        if (allDone && !next.has(ex.exerciseId)) {
          next.add(ex.exerciseId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [exerciseStates, isEditing]);

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
      ex.sets[setIdx] = { ...ex.sets[setIdx], isWarmup: !ex.sets[setIdx].isWarmup };
      next[exIdx] = ex;
      return next;
    });
  }, []);

  const completeSet = useCallback(
    async (exIdx: number, setIdx: number) => {
      const ex = exerciseStatesRef.current[exIdx];
      const set = ex.sets[setIdx];
      if (set.isCompleted) return;

      const tt = ex.trackingType;
      if (tt === "weight_reps" || tt === "bodyweight_reps") {
        if (set.weight && isNaN(parseFloat(set.weight))) {
          toast.error("Invalid weight — enter a number");
          return;
        }
        if (set.reps && isNaN(parseInt(set.reps, 10))) {
          toast.error("Invalid reps — enter a whole number");
          return;
        }
      } else if (tt === "reps_only") {
        if (set.reps && isNaN(parseInt(set.reps, 10))) {
          toast.error("Invalid reps — enter a whole number");
          return;
        }
      } else if (tt === "time" || tt === "distance_time") {
        if (set.duration && parseDuration(set.duration) === null) {
          toast.error("Invalid duration — enter minutes or mm:ss");
          return;
        }
        if (tt === "distance_time" && set.distance && isNaN(parseFloat(set.distance))) {
          toast.error("Invalid distance — enter a number in km");
          return;
        }
      }

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

      if (!isEditing && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(50);
      }

      setExerciseStates((prev) => {
        const next = [...prev];
        const exCopy = { ...next[exIdx], sets: [...next[exIdx].sets] };
        exCopy.sets[setIdx] = { ...exCopy.sets[setIdx], dbId: data.id, isCompleted: true };

        const tt = exCopy.trackingType;
        const nextEmptyIdx = exCopy.sets.findIndex(
          (s, i) => i > setIdx && !s.isCompleted && !s.weight && !s.reps && !s.duration && !s.distance
        );
        if (nextEmptyIdx !== -1) {
          if (tt === "time" || tt === "distance_time") {
            exCopy.sets[nextEmptyIdx] = { ...exCopy.sets[nextEmptyIdx], duration: set.duration, distance: set.distance };
          } else if (weight != null) {
            exCopy.sets[nextEmptyIdx] = { ...exCopy.sets[nextEmptyIdx], weight: weight.toString(), reps: reps?.toString() ?? "" };
          }
        }

        next[exIdx] = exCopy;
        return next;
      });

      const isCardio = ex.trackingType === "time" || ex.trackingType === "distance_time";

      if (!isEditing && !set.isWarmup && !isCardio) {
        setLastSetAt(Date.now());
        setRestTimer({ duration: restDuration(ex.repTier), setDbId: data.id, startedAt: Date.now() });

        const prRecord = currentPRsRef.current[ex.exerciseId] ?? { maxWeight: null, bestE1rm: null, bestVolume: null };
        const newPRs = checkNewPRs(prRecord, weight, reps);
        if (newPRs.length > 0) {
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate([100, 50, 100]);
          }
          setPrFlash({ exerciseName: ex.name, types: newPRs });
          setTimeout(() => setPrFlash(null), 5000);
          setSessionPRs((prev) => [...prev, { exerciseName: ex.name, types: newPRs }]);

          const allSetsForExercise = exerciseStatesRef.current[exIdx].sets
            .filter((s) => s.isCompleted && !s.isWarmup)
            .map((s) => ({ weight: s.weight ? parseFloat(s.weight) : null, reps: s.reps ? parseInt(s.reps, 10) : null, isWarmup: false }));
          allSetsForExercise.push({ weight, reps, isWarmup: false });

          const previousSets = (previousPerformance[ex.exerciseId] ?? []).map(
            (s) => ({ weight: s.weight, reps: s.reps, isWarmup: false })
          );
          setCurrentPRs((prev) => ({ ...prev, [ex.exerciseId]: computePRs([...previousSets, ...allSetsForExercise]) }));
        }
      }
    },
    [supabase, workout.id, previousPerformance]
  );

  const uncompleteSet = useCallback(
    async (exIdx: number, setIdx: number) => {
      const ex = exerciseStatesRef.current[exIdx];
      const set = ex.sets[setIdx];
      if (!set.isCompleted || !set.dbId) return;

      const { error } = await supabase.from("sets").delete().eq("id", set.dbId);
      if (error) {
        toast.error("Failed to undo set: " + error.message);
        return;
      }

      setExerciseStates((prev) => {
        const next = [...prev];
        const exCopy = { ...next[exIdx], sets: [...next[exIdx].sets] };
        exCopy.sets[setIdx] = { ...exCopy.sets[setIdx], dbId: null, isCompleted: false };
        next[exIdx] = exCopy;
        return next;
      });

      const allRemaining = exerciseStatesRef.current[exIdx].sets
        .filter((s, i) => i !== setIdx && s.isCompleted && !s.isWarmup)
        .map((s) => ({ weight: s.weight ? parseFloat(s.weight) : null, reps: s.reps ? parseInt(s.reps, 10) : null, isWarmup: false }));
      const previousSets = (previousPerformance[ex.exerciseId] ?? []).map(
        (s) => ({ weight: s.weight, reps: s.reps, isWarmup: false })
      );
      setCurrentPRs((prev) => ({ ...prev, [ex.exerciseId]: computePRs([...previousSets, ...allRemaining]) }));
    },
    [supabase, previousPerformance]
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

  const updateRpe = useCallback(
    async (exIdx: number, setIdx: number, value: number) => {
      const set = exerciseStatesRef.current[exIdx]?.sets[setIdx];
      if (!set?.dbId) return;

      const { error } = await supabase.from("sets").update({ rpe: value }).eq("id", set.dbId);
      if (error) {
        toast.error("Failed to save RPE");
        return;
      }

      setExerciseStates((prev) => {
        const next = [...prev];
        const exCopy = { ...next[exIdx], sets: [...next[exIdx].sets] };
        exCopy.sets[setIdx] = { ...exCopy.sets[setIdx], rpe: value.toString() };
        next[exIdx] = exCopy;
        return next;
      });
      setRpeOpenFor(null);
    },
    [supabase]
  );

  const finishWorkout = useCallback(async () => {
    setFinishing(true);

    const bw = bodyweight ? parseFloat(bodyweight) : null;
    const updateData: { ended_at: string; bodyweight?: number; notes?: string } = {
      ended_at: new Date().toISOString(),
    };
    if (bw && bw > 0) updateData.bodyweight = bw;
    if (notes.trim()) updateData.notes = notes.trim();

    const { error: finishError } = await supabase
      .from("workouts")
      .update(updateData)
      .eq("id", workout.id);

    if (finishError) {
      toast.error("Failed to save workout. Check your connection and try again.");
      setFinishing(false);
      return;
    }

    if (bw && bw > 0) {
      const { error: bwError } = await supabase
        .from("bodyweight_log")
        .upsert(
          { user_id: userId, date: workout.date, weight: bw },
          { onConflict: "user_id,date" }
        );
      if (bwError) toast.error("Bodyweight entry failed to save.");
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

    runPlateauDetection(supabase, userId).catch(() => {});

    setShowSummary(true);
  }, [supabase, workout.id, workout.date, exercises, bodyweight, notes, userId]);

  const saveEdits = useCallback(async () => {
    setFinishing(true);

    const bw = bodyweight ? parseFloat(bodyweight) : null;
    const { error } = await supabase
      .from("workouts")
      .update({
        bodyweight: bw && bw > 0 ? bw : null,
        notes: notes.trim() || null,
      })
      .eq("id", workout.id);

    if (error) {
      toast.error("Failed to save changes");
      setFinishing(false);
      return;
    }

    if (bw && bw > 0) {
      await supabase
        .from("bodyweight_log")
        .upsert(
          { user_id: userId, date: workout.date, weight: bw },
          { onConflict: "user_id,date" }
        );
    }

    toast.success("Changes saved");
    router.push(`/history/${workout.id}`);
  }, [supabase, workout.id, workout.date, bodyweight, notes, userId, router]);

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  const totalCompleted = exerciseStates.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted && !s.isWarmup).length,
    0
  );
  const totalSets = exerciseStates.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => !s.isWarmup).length,
    0
  );
  const progress = totalSets > 0 ? totalCompleted / totalSets : 0;
  const exercisesWithSets = exerciseStates.filter(
    (ex) => ex.sets.some((s) => s.isCompleted)
  ).length;

  if (showSummary) {
    return (
      <WorkoutSummary
        exerciseStates={exerciseStates}
        elapsed={elapsed}
        sessionPRs={sessionPRs}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-background border-b px-4 py-2">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Link href={isEditing ? `/history/${workout.id}` : "/"} className="text-muted-foreground hover:text-foreground p-2">
              <ChevronLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="font-bold">{workout.routineName ?? "Empty Workout"}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {isEditing ? (
                  <span>Editing</span>
                ) : isBackdated ? (
                  <span>
                    {new Date(workout.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
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
          {isEditing ? (
            <Button size="sm" disabled={finishing} onClick={saveEdits}>
              {finishing ? "Saving..." : "Save"}
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button size="sm" disabled={finishing} />}
              >
                {finishing ? "Saving..." : "Finish"}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finish this workout?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You logged {totalCompleted} set{totalCompleted !== 1 ? "s" : ""} across{" "}
                    {exercisesWithSets} exercise{exercisesWithSets !== 1 ? "s" : ""}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep going</AlertDialogCancel>
                  <AlertDialogAction onClick={finishWorkout}>Finish workout</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="h-2 bg-muted mt-2 -mx-4 rounded-full">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="text-sm text-muted-foreground hover:text-foreground w-full text-left"
        >
          <span className="inline-flex items-center gap-1">
            {showDetails ? "Hide" : "Add"} bodyweight &amp; notes
            {showDetails ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />}
          </span>
        </button>

        {showDetails && (
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Bodyweight (kg)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 75.0"
                value={bodyweight}
                onChange={(e) => setBodyweight(e.target.value)}
                className="h-11 w-full rounded-md border bg-transparent px-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Notes</label>
              <textarea
                placeholder="How did it feel?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm resize-none"
              />
            </div>
          </div>
        )}

        {exerciseStates.map((ex, exIdx) => (
          <ExerciseCard
            key={ex.exerciseId}
            ex={ex}
            exIdx={exIdx}
            isCollapsed={collapsedExercises.has(ex.exerciseId)}
            onToggleCollapse={() => {
              setCollapsedExercises((prev) => {
                const next = new Set(prev);
                if (next.has(ex.exerciseId)) {
                  next.delete(ex.exerciseId);
                } else {
                  next.add(ex.exerciseId);
                }
                return next;
              });
            }}
            rpeOpenFor={rpeOpenFor}
            onUpdateSet={updateSet}
            onToggleWarmup={toggleWarmup}
            onCompleteSet={completeSet}
            onUncompleteSet={uncompleteSet}
            onAddSet={addSet}
            onAcceptProgression={acceptProgression}
            onDismissProgression={dismissProgression}
            onUpdateRpe={updateRpe}
            onSetRpeOpen={setRpeOpenFor}
          />
        ))}

        <Button variant="outline" className="w-full" onClick={() => setShowSearch(true)}>
          + Add Exercise
        </Button>
      </main>

      <ExerciseSearch
        open={showSearch}
        excludeIds={exerciseStates.map((e) => e.exerciseId)}
        userId={userId}
        lastSetCompleted={lastSetAt}
        onSelect={addExercise}
        onClose={() => setShowSearch(false)}
      />

      {prFlash && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-[pr-celebrate_600ms_ease-out]">
          <div className="rounded-lg bg-warning text-white px-4 py-2 shadow-lg text-center">
            <p className="font-bold text-sm">New PR!</p>
            <p className="text-xs">
              {prFlash.exerciseName} &mdash;{" "}
              {prFlash.types.map((t) => {
                const labels: Record<string, string> = { weight: "Weight PR", e1rm: "1RM PR", volume: "Volume PR" };
                return labels[t];
              }).join(", ")}
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
            supabase.from("sets").update({ rest_seconds: restSeconds }).eq("id", restTimer.setDbId).then();
            setRestTimer(null);
          }}
        />
      )}
    </div>
  );
}
