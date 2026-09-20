"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePowerSyncDb } from "@/components/powersync-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteWorkoutButton } from "@/components/delete-workout-button";
import { ExportWorkoutButton } from "@/components/export-workout-button";
import { Pencil } from "lucide-react";
import { formatDateLong, formatDuration } from "@/lib/format";

type SetRow = {
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup: boolean;
};

type WorkoutData = {
  id: string;
  userId: string;
  date: string;
  startedAt: string;
  endedAt: string | null;
  bodyweight: number | null;
  notes: string | null;
  routineName: string;
  workingSets: number;
  totalVolume: number;
  exercises: Map<string, { name: string; sets: SetRow[] }>;
  exportData: {
    routineName: string;
    date: string;
    startedAt: string;
    endedAt: string | null;
    bodyweight: number | null;
    notes: string | null;
    sets: {
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
    }[];
  };
};

function DetailSkeleton() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <Skeleton className="h-8 w-14" />
        <Skeleton className="h-5 w-36" />
      </header>
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-3 px-4 space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="space-y-1.5">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}

async function loadWorkoutDetail(
  db: import("@powersync/web").PowerSyncDatabase,
  workoutId: string
): Promise<WorkoutData | null> {
  const workout = await db.getOptional<{
    id: string;
    user_id: string;
    date: string;
    started_at: string;
    ended_at: string | null;
    bodyweight: number | null;
    notes: string | null;
    routine_name: string | null;
  }>(
    `SELECT w.id, w.user_id, w.date, w.started_at, w.ended_at,
            w.bodyweight, w.notes, r.name AS routine_name
     FROM workouts w
     LEFT JOIN routines r ON w.routine_id = r.id
     WHERE w.id = ?`,
    [workoutId]
  );

  if (!workout) return null;

  const setsRows = await db.getAll<{
    id: string;
    exercise_id: string;
    exercise_name: string;
    set_number: number;
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    is_warmup: number;
    rest_seconds: number | null;
    distance_meters: number | null;
    duration_seconds: number | null;
    created_at: string;
  }>(
    `SELECT s.id, s.exercise_id, e.name AS exercise_name,
            s.set_number, s.weight, s.reps, s.rpe, s.is_warmup,
            s.rest_seconds, s.distance_meters, s.duration_seconds, s.created_at
     FROM sets s
     JOIN exercises e ON s.exercise_id = e.id
     WHERE s.workout_id = ?
     ORDER BY s.created_at, s.set_number`,
    [workoutId]
  );

  const routineName = workout.routine_name ?? "Empty Workout";

  const exerciseMap = new Map<string, { name: string; sets: SetRow[] }>();
  for (const s of setsRows) {
    if (!exerciseMap.has(s.exercise_id)) {
      exerciseMap.set(s.exercise_id, { name: s.exercise_name, sets: [] });
    }
    exerciseMap.get(s.exercise_id)!.sets.push({
      setNumber: s.set_number,
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe,
      isWarmup: !!s.is_warmup,
    });
  }

  const workingSets = setsRows.filter((s) => !s.is_warmup).length;
  const totalVolume = setsRows
    .filter((s) => !s.is_warmup && s.weight && s.reps)
    .reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);

  return {
    id: workout.id,
    userId: workout.user_id,
    date: workout.date,
    startedAt: workout.started_at,
    endedAt: workout.ended_at,
    bodyweight: workout.bodyweight ? Number(workout.bodyweight) : null,
    notes: workout.notes,
    routineName,
    workingSets,
    totalVolume,
    exercises: exerciseMap,
    exportData: {
      routineName,
      date: workout.date,
      startedAt: workout.started_at,
      endedAt: workout.ended_at,
      bodyweight: workout.bodyweight,
      notes: workout.notes,
      sets: setsRows.map((s) => ({
        exercise: s.exercise_name,
        setNumber: s.set_number,
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe,
        isWarmup: !!s.is_warmup,
        restSeconds: s.rest_seconds,
        distanceMeters: s.distance_meters,
        durationSeconds: s.duration_seconds,
        completedAt: s.created_at,
      })),
    },
  };
}

export function WorkoutDetail({
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

    loadWorkoutDetail(db, workoutId).then((result) => {
      if (!result) {
        router.replace("/history");
        return;
      }
      setData(result);
      setLoading(false);
    });
  }, [db, workoutId, router]);

  if (loading || !data) return <DetailSkeleton />;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Link href="/history">
            <Button variant="ghost" size="sm">
              Back
            </Button>
          </Link>
          <h1 className="text-lg font-bold">{data.routineName}</h1>
        </div>
        <div className="flex items-center gap-1">
          <ExportWorkoutButton workout={data.exportData} />
          {data.userId === userId && (
            <>
              <Link href={`/workout/${data.id}`}>
                <Button variant="ghost" size="sm">
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </Link>
              <DeleteWorkoutButton workoutId={data.id} />
            </>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <div className="text-sm text-muted-foreground space-y-0.5">
          <p>{formatDateLong(data.date)}</p>
          <p>
            Duration: {formatDuration(data.startedAt, data.endedAt)}{" "}
            &middot; {data.workingSets} working sets &middot;{" "}
            {Math.round(data.totalVolume).toLocaleString()} kg volume
          </p>
          {data.bodyweight && (
            <p>Bodyweight: {data.bodyweight} kg</p>
          )}
          {data.notes && <p>Notes: {data.notes}</p>}
        </div>

        {data.exercises.size === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No sets logged in this workout.
          </p>
        )}

        {Array.from(data.exercises.entries()).map(([exId, ex]) => (
          <Card key={exId}>
            <CardContent className="py-3 px-4">
              <Link
                href={`/exercises/${exId}`}
                className="font-semibold mb-2 block text-primary underline-offset-2 hover:underline"
              >
                {ex.name}
              </Link>
              <div className="space-y-1">
                <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 text-sm text-muted-foreground font-medium px-1">
                  <span>Set</span>
                  <span>kg</span>
                  <span>Reps</span>
                  <span>RPE</span>
                </div>
                {ex.sets.map((s, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center px-1 py-1.5 rounded text-sm ${
                      s.isWarmup ? "text-muted-foreground" : ""
                    }`}
                  >
                    <span className="text-center">
                      {s.isWarmup ? (
                        <Badge
                          variant="outline"
                          className="text-xs px-1 py-0 text-warning border-warning/50"
                        >
                          W
                        </Badge>
                      ) : (
                        s.setNumber
                      )}
                    </span>
                    <span className="text-center tabular-nums">
                      {s.weight ?? "—"}
                    </span>
                    <span className="text-center tabular-nums">
                      {s.reps ?? "—"}
                    </span>
                    <span className="text-center tabular-nums text-muted-foreground">
                      {s.rpe ?? "—"}
                    </span>
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
