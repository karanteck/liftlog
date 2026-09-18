"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type ExportSet = {
  exercise: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup: boolean;
  restSeconds: number | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  completedAt: string;
};

type ExportWorkout = {
  routineName: string;
  date: string;
  startedAt: string;
  endedAt: string | null;
  bodyweight: number | null;
  notes: string | null;
  sets: ExportSet[];
};

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCSV(workout: ExportWorkout): string {
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
    "Bodyweight (kg)",
    "Notes",
  ];

  const rows = workout.sets.map((s) => [
    workout.date,
    workout.routineName,
    s.exercise,
    s.setNumber,
    s.weight ?? "",
    s.reps ?? "",
    s.rpe ?? "",
    s.isWarmup ? "Yes" : "No",
    s.restSeconds ?? "",
    s.distanceMeters ?? "",
    s.durationSeconds ?? "",
    s.completedAt,
    workout.bodyweight ?? "",
    workout.notes ?? "",
  ]);

  const escape = (v: string | number) => {
    const str = String(v);
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  return [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
}

function toJSON(workout: ExportWorkout): string {
  const exerciseMap = new Map<string, ExportSet[]>();
  for (const s of workout.sets) {
    if (!exerciseMap.has(s.exercise)) exerciseMap.set(s.exercise, []);
    exerciseMap.get(s.exercise)!.push(s);
  }

  const structured = {
    routine: workout.routineName,
    date: workout.date,
    startedAt: workout.startedAt,
    endedAt: workout.endedAt,
    bodyweight: workout.bodyweight,
    notes: workout.notes,
    exercises: Array.from(exerciseMap.entries()).map(([name, sets]) => ({
      name,
      sets: sets.map((s) => ({
        set: s.setNumber,
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe,
        warmup: s.isWarmup,
        restSeconds: s.restSeconds,
        distanceMeters: s.distanceMeters,
        durationSeconds: s.durationSeconds,
        completedAt: s.completedAt,
      })),
    })),
  };

  return JSON.stringify(structured, null, 2);
}

export function ExportWorkoutButton({ workout }: { workout: ExportWorkout }) {
  const [open, setOpen] = useState(false);

  const safeDate = workout.date.replace(/\s/g, "-");
  const safeName = workout.routineName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  const baseName = `${safeDate}_${safeName}`;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        aria-label="Export workout"
      >
        <Download className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border rounded-lg shadow-lg p-1 min-w-[140px]">
            <button
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted"
              onClick={() => {
                downloadFile(toCSV(workout), `${baseName}.csv`, "text/csv");
                setOpen(false);
              }}
            >
              Export as CSV
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted"
              onClick={() => {
                downloadFile(
                  toJSON(workout),
                  `${baseName}.json`,
                  "application/json"
                );
                setOpen(false);
              }}
            >
              Export as JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
