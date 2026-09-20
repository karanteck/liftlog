"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePowerSyncDb } from "@/components/powersync-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/back-button";
import { E1rmChart } from "@/components/e1rm-chart";
import { computeE1rm } from "@/lib/pr";
import { formatDateRelative } from "@/lib/format";

type SetRow = {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup: boolean;
  userId: string;
};

type SessionGroup = {
  workoutId: string;
  date: string;
  startedAt: string;
  routineName: string;
  isOwnWorkout: boolean;
  sets: SetRow[];
};

type ExerciseData = {
  name: string;
  muscleGroup: string;
  equipment: string;
  repTier: string;
  sessions: SessionGroup[];
  prMaxWeight: { value: number; setId: string } | null;
  prBestE1rm: { value: number; setId: string } | null;
  prBestVolume: { value: number; setId: string } | null;
  e1rmTrendData: { date: string; e1rm: number }[];
};

const TIER_LABELS: Record<string, string> = {
  heavy_compound: "Heavy compound",
  compound: "Compound",
  isolation: "Isolation",
  small_isolation: "Small isolation",
};

function ExerciseSkeleton() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-5 w-40 flex-1" />
      </header>
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Card>
          <CardContent className="py-3 px-4">
            <Skeleton className="h-4 w-32 mb-2" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-48 w-full rounded-md" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-3 px-4 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
              <div className="space-y-1">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-5 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}

async function loadExerciseDetail(
  db: import("@powersync/web").PowerSyncDatabase,
  exerciseId: string,
  userId: string
): Promise<ExerciseData | null> {
  const exercise = await db.getOptional<{
    id: string;
    name: string;
    muscle_group: string;
    equipment: string;
    default_rep_tier: string;
  }>(
    "SELECT id, name, muscle_group, equipment, default_rep_tier FROM exercises WHERE id = ?",
    [exerciseId]
  );

  if (!exercise) return null;

  const setsRows = await db.getAll<{
    id: string;
    set_number: number;
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    is_warmup: number;
    workout_id: string;
    workout_date: string;
    started_at: string;
    workout_user_id: string;
    routine_name: string | null;
  }>(
    `SELECT s.id, s.set_number, s.weight, s.reps, s.rpe, s.is_warmup,
            w.id AS workout_id, w.date AS workout_date, w.started_at,
            w.user_id AS workout_user_id, r.name AS routine_name
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     LEFT JOIN routines r ON w.routine_id = r.id
     WHERE s.exercise_id = ?
     ORDER BY s.set_number`,
    [exerciseId]
  );

  const sessionMap = new Map<string, SessionGroup>();
  for (const s of setsRows) {
    if (!sessionMap.has(s.workout_id)) {
      sessionMap.set(s.workout_id, {
        workoutId: s.workout_id,
        date: s.workout_date,
        startedAt: s.started_at,
        routineName: s.routine_name ?? "Empty Workout",
        isOwnWorkout: s.workout_user_id === userId,
        sets: [],
      });
    }
    sessionMap.get(s.workout_id)!.sets.push({
      id: s.id,
      setNumber: s.set_number,
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe,
      isWarmup: !!s.is_warmup,
      userId: s.workout_user_id,
    });
  }

  const sessions = Array.from(sessionMap.values()).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  const allWorkingSets = sessions
    .flatMap((s) => s.sets)
    .filter((s) => !s.isWarmup && s.userId === userId);

  let prMaxWeight: { value: number; setId: string } | null = null;
  let prBestE1rm: { value: number; setId: string } | null = null;
  let prBestVolume: { value: number; setId: string } | null = null;

  for (const s of allWorkingSets) {
    if (s.weight == null || s.weight <= 0) continue;
    if (prMaxWeight === null || s.weight > prMaxWeight.value) {
      prMaxWeight = { value: s.weight, setId: s.id };
    }
    if (s.reps != null && s.reps > 0) {
      const volume = s.weight * s.reps;
      if (prBestVolume === null || volume > prBestVolume.value) {
        prBestVolume = { value: volume, setId: s.id };
      }
      const e1rm = computeE1rm(s.weight, s.reps);
      if (e1rm !== null && (prBestE1rm === null || e1rm > prBestE1rm.value)) {
        prBestE1rm = { value: e1rm, setId: s.id };
      }
    }
  }

  const e1rmTrendData = sessions
    .filter((s) => s.isOwnWorkout)
    .map((s) => {
      const workingSets = s.sets.filter((set) => !set.isWarmup);
      let bestE1rm: number | null = null;
      for (const set of workingSets) {
        if (set.weight == null || set.weight <= 0 || set.reps == null) continue;
        const e1rm = computeE1rm(set.weight, set.reps);
        if (e1rm !== null && (bestE1rm === null || e1rm > bestE1rm)) {
          bestE1rm = e1rm;
        }
      }
      return bestE1rm !== null ? { date: s.date, e1rm: bestE1rm } : null;
    })
    .filter((d): d is { date: string; e1rm: number } => d !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    name: exercise.name,
    muscleGroup: exercise.muscle_group,
    equipment: exercise.equipment,
    repTier: exercise.default_rep_tier,
    sessions,
    prMaxWeight,
    prBestE1rm,
    prBestVolume,
    e1rmTrendData,
  };
}

export function ExerciseDetail({
  exerciseId,
  userId,
}: {
  exerciseId: string;
  userId: string;
}) {
  const db = usePowerSyncDb();
  const router = useRouter();
  const [data, setData] = useState<ExerciseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    loadExerciseDetail(db, exerciseId, userId).then((result) => {
      if (!result) {
        router.replace("/");
        return;
      }
      setData(result);
      setLoading(false);
    });
  }, [db, exerciseId, userId, router]);

  if (loading || !data) return <ExerciseSkeleton />;

  const hasPRs = data.prMaxWeight || data.prBestE1rm || data.prBestVolume;
  const prSetIds = new Set(
    [data.prMaxWeight?.setId, data.prBestE1rm?.setId, data.prBestVolume?.setId].filter(
      Boolean
    ) as string[]
  );

  function getPrLabels(setId: string): string[] {
    const labels: string[] = [];
    if (data!.prMaxWeight?.setId === setId) labels.push("Weight PR");
    if (data!.prBestE1rm?.setId === setId) labels.push("1RM PR");
    if (data!.prBestVolume?.setId === setId) labels.push("Volume PR");
    return labels;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <BackButton />
        <h1 className="text-lg font-bold flex-1">{data.name}</h1>
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(data.name + " exercise form")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0"
        >
          How to perform
        </a>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{data.muscleGroup}</Badge>
          <Badge variant="outline">{data.equipment}</Badge>
          <Badge variant="outline">
            {TIER_LABELS[data.repTier] ?? data.repTier}
          </Badge>
        </div>

        {hasPRs && (
          <Card>
            <CardContent className="py-3 px-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Personal Records
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {data.prMaxWeight && (
                  <div>
                    <p className="text-lg font-bold tabular-nums">
                      {data.prMaxWeight.value}kg
                    </p>
                    <p className="text-xs text-muted-foreground">Max weight</p>
                  </div>
                )}
                {data.prBestE1rm && (
                  <div>
                    <p className="text-lg font-bold tabular-nums">
                      {Math.round(data.prBestE1rm.value)}kg
                    </p>
                    <p className="text-xs text-muted-foreground">Est. 1RM</p>
                  </div>
                )}
                {data.prBestVolume && (
                  <div>
                    <p className="text-lg font-bold tabular-nums">
                      {Math.round(data.prBestVolume.value)}kg
                    </p>
                    <p className="text-xs text-muted-foreground">Best set vol.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <E1rmChart data={data.e1rmTrendData} />

        <p className="text-sm text-muted-foreground">
          {data.sessions.length}{" "}
          {data.sessions.length === 1 ? "session" : "sessions"} logged
        </p>

        {data.sessions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No history for this exercise yet.</p>
          </div>
        )}

        {data.sessions.map((session) => {
          const workingSets = session.sets.filter((s) => !s.isWarmup);
          const bestWeight = Math.max(
            ...workingSets
              .filter((s) => s.weight != null)
              .map((s) => s.weight!),
            0
          );

          return (
            <Link key={session.workoutId} href={`/history/${session.workoutId}`}>
              <Card className="cursor-pointer active:scale-[0.98] transition-transform mb-2">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">
                        {formatDateRelative(session.date)}
                        {!session.isOwnWorkout && (
                          <span className="text-muted-foreground ml-1">
                            (household)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.routineName} &middot;{" "}
                        {workingSets.length} working{" "}
                        {workingSets.length === 1 ? "set" : "sets"}
                        {bestWeight > 0 && (
                          <> &middot; up to {bestWeight}kg</>
                        )}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-sm">
                      &rsaquo;
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {session.sets.map((s, i) => {
                      const labels =
                        session.isOwnWorkout ? getPrLabels(s.id) : [];
                      return (
                        <div
                          key={i}
                          className={`grid grid-cols-[2rem_1fr_1fr_auto] gap-2 items-center text-sm ${
                            s.isWarmup ? "text-muted-foreground" : ""
                          }`}
                        >
                          <span className="text-center text-xs">
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
                            {s.weight != null ? `${s.weight}kg` : "—"}
                          </span>
                          <span className="text-center tabular-nums">
                            {s.reps != null ? `${s.reps} reps` : "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            {s.rpe != null && (
                              <span className="tabular-nums text-xs text-muted-foreground">
                                {s.rpe}
                              </span>
                            )}
                            {labels.map((l) => (
                              <Badge
                                key={l}
                                className="text-[9px] px-1 py-0 bg-warning/20 text-warning border-warning/30"
                                variant="outline"
                              >
                                {l}
                              </Badge>
                            ))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </main>
    </div>
  );
}
