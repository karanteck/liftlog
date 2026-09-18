"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type SetRow = {
  workout_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  is_warmup: boolean;
  rest_seconds: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  created_at: string;
  exercises: { name: string } | { name: string }[] | null;
};

type WorkoutRow = {
  id: string;
  date: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  bodyweight: number | null;
  routines: { name: string } | { name: string }[] | null;
};

function getExName(ex: SetRow["exercises"]): string {
  if (!ex) return "Unknown";
  if (Array.isArray(ex)) return ex[0]?.name ?? "Unknown";
  return ex.name;
}

function getRoutineName(r: WorkoutRow["routines"]): string {
  if (!r) return "Empty Workout";
  if (Array.isArray(r)) return r[0]?.name ?? "Empty Workout";
  return r.name;
}

async function fetchAllData(userId: string) {
  const supabase = createClient();

  const allWorkouts: WorkoutRow[] = [];
  let from = 0;
  const batchSize = 500;
  while (true) {
    const { data } = await supabase
      .from("workouts")
      .select("id, date, started_at, ended_at, notes, bodyweight, routines(name)")
      .eq("user_id", userId)
      .order("date", { ascending: true })
      .range(from, from + batchSize - 1);
    if (!data || data.length === 0) break;
    allWorkouts.push(...(data as WorkoutRow[]));
    if (data.length < batchSize) break;
    from += batchSize;
  }

  if (allWorkouts.length === 0) return { workouts: [], sets: [] };

  const workoutIds = allWorkouts.map((w) => w.id);
  const allSets: SetRow[] = [];
  for (let i = 0; i < workoutIds.length; i += 50) {
    const batch = workoutIds.slice(i, i + 50);
    const { data } = await supabase
      .from("sets")
      .select(
        "workout_id, set_number, weight, reps, rpe, is_warmup, rest_seconds, distance_meters, duration_seconds, created_at, exercises(name)"
      )
      .in("workout_id", batch)
      .order("created_at")
      .order("set_number");
    if (data) allSets.push(...(data as SetRow[]));
  }

  return { workouts: allWorkouts, sets: allSets };
}

function toCSV(workouts: WorkoutRow[], sets: SetRow[]): string {
  const workoutMap = new Map(workouts.map((w) => [w.id, w]));

  const headers = [
    "Date",
    "Routine",
    "Exercise",
    "Set",
    "Weight (kg)",
    "Reps",
    "RPE",
    "Warmup",
    "Rest (s)",
    "Distance (m)",
    "Duration (s)",
    "Completed At",
    "Workout Start",
    "Workout End",
    "Bodyweight (kg)",
    "Notes",
  ];

  const escape = (v: string | number) => {
    const str = String(v);
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const rows = sets.map((s) => {
    const w = workoutMap.get(s.workout_id);
    return [
      w?.date ?? "",
      w ? getRoutineName(w.routines) : "",
      getExName(s.exercises),
      s.set_number,
      s.weight ?? "",
      s.reps ?? "",
      s.rpe ?? "",
      s.is_warmup ? "Yes" : "No",
      s.rest_seconds ?? "",
      s.distance_meters ?? "",
      s.duration_seconds ?? "",
      s.created_at,
      w?.started_at ?? "",
      w?.ended_at ?? "",
      w?.bodyweight ?? "",
      w?.notes ?? "",
    ];
  });

  return [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
}

function toJSON(workouts: WorkoutRow[], sets: SetRow[]): string {
  const setsByWorkout = new Map<string, SetRow[]>();
  for (const s of sets) {
    if (!setsByWorkout.has(s.workout_id)) setsByWorkout.set(s.workout_id, []);
    setsByWorkout.get(s.workout_id)!.push(s);
  }

  const structured = workouts.map((w) => {
    const wSets = setsByWorkout.get(w.id) ?? [];
    const exerciseMap = new Map<string, SetRow[]>();
    for (const s of wSets) {
      const name = getExName(s.exercises);
      if (!exerciseMap.has(name)) exerciseMap.set(name, []);
      exerciseMap.get(name)!.push(s);
    }

    return {
      date: w.date,
      routine: getRoutineName(w.routines),
      startedAt: w.started_at,
      endedAt: w.ended_at,
      bodyweight: w.bodyweight,
      notes: w.notes,
      exercises: Array.from(exerciseMap.entries()).map(([name, eSets]) => ({
        name,
        sets: eSets.map((s) => ({
          set: s.set_number,
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe,
          warmup: s.is_warmup,
          restSeconds: s.rest_seconds,
          distanceMeters: s.distance_meters,
          durationSeconds: s.duration_seconds,
          completedAt: s.created_at,
        })),
      })),
    };
  });

  return JSON.stringify(structured, null, 2);
}

export function ExportAllWorkoutsButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleExport(format: "csv" | "json") {
    setOpen(false);
    setLoading(true);
    try {
      const { workouts, sets } = await fetchAllData(userId);
      if (workouts.length === 0) {
        toast.info("No workouts to export");
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      if (format === "csv") {
        downloadFile(toCSV(workouts, sets), `strongboi-export-${today}.csv`, "text/csv");
      } else {
        downloadFile(toJSON(workouts, sets), `strongboi-export-${today}.json`, "application/json");
      }
      toast.success(`Exported ${workouts.length} workouts`);
    } catch {
      toast.error("Export failed — try again");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="h-10 w-10" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10"
        onClick={() => setOpen(!open)}
        aria-label="Export all workouts"
      >
        <Download className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border rounded-lg shadow-lg p-1 min-w-[160px]">
            <button
              className="w-full text-left px-3 py-2.5 text-sm rounded hover:bg-muted"
              onClick={() => handleExport("csv")}
            >
              Export as CSV
            </button>
            <button
              className="w-full text-left px-3 py-2.5 text-sm rounded hover:bg-muted"
              onClick={() => handleExport("json")}
            >
              Export as JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
