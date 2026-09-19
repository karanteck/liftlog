"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePowerSyncDb } from "@/components/powersync-provider";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlateauAlerts } from "@/components/plateau-alerts";
import { ErrorBoundary } from "@/components/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dumbbell,
  ChevronRight,
  Scale,
  Flame,
  TrendingUp,
  Play,
} from "lucide-react";
import { formatDateRelative, formatDuration, getMonday } from "@/lib/format";
import type { ActiveAlert } from "@/lib/plateau-runner";

type DashboardData = {
  profileName: string;
  bodyweight: number | null;
  weekWorkoutCount: number;
  streak: number;
  lastWorkout: {
    id: string;
    date: string;
    startedAt: string;
    endedAt: string;
    routineName: string | null;
    setCount: number;
    volume: number;
  } | null;
  lastRoutine: { id: string; name: string } | null;
  activeWorkout: {
    id: string;
    startedAt: string;
    routineName: string | null;
    setCount: number;
  } | null;
  alerts: ActiveAlert[];
};

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const now = new Date();
  let streak = 0;
  const checkDate = new Date(now);

  for (let w = 0; w < 52; w++) {
    const monday = getMonday(checkDate.toISOString().split("T")[0]);
    const sunday = new Date(monday + "T00:00:00");
    sunday.setDate(sunday.getDate() + 6);
    const sundayStr = sunday.toISOString().split("T")[0];

    const hasWorkout = dates.some((d) => d >= monday && d <= sundayStr);
    if (hasWorkout) {
      streak++;
    } else {
      break;
    }
    checkDate.setDate(checkDate.getDate() - 7);
  }
  return streak;
}

async function loadDashboard(
  db: import("@powersync/web").PowerSyncDatabase,
  userId: string
): Promise<DashboardData> {
  const monday = getMonday(new Date().toISOString().split("T")[0]);

  const [profile, bwRow, weekCount, streakRows, lastWk, activeWk, alertRows] =
    await Promise.all([
      db.getOptional<{ name: string }>(
        "SELECT name FROM profiles WHERE id = ?",
        [userId]
      ),
      db.getOptional<{ weight: number }>(
        "SELECT weight FROM bodyweight_log WHERE user_id = ? ORDER BY date DESC LIMIT 1",
        [userId]
      ),
      db.getOptional<{ cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM workouts WHERE user_id = ? AND date >= ? AND ended_at IS NOT NULL",
        [userId, monday]
      ),
      db.getAll<{ date: string }>(
        "SELECT DISTINCT date FROM workouts WHERE user_id = ? AND ended_at IS NOT NULL ORDER BY date DESC LIMIT 365",
        [userId]
      ),
      db.getOptional<{
        id: string;
        date: string;
        started_at: string;
        ended_at: string;
        routine_name: string | null;
      }>(
        `SELECT w.id, w.date, w.started_at, w.ended_at,
                r.name AS routine_name
         FROM workouts w
         LEFT JOIN routines r ON w.routine_id = r.id
         WHERE w.user_id = ? AND w.ended_at IS NOT NULL
         ORDER BY w.date DESC, w.started_at DESC LIMIT 1`,
        [userId]
      ),
      db.getOptional<{
        id: string;
        started_at: string;
        routine_name: string | null;
      }>(
        `SELECT w.id, w.started_at,
                r.name AS routine_name
         FROM workouts w
         LEFT JOIN routines r ON w.routine_id = r.id
         WHERE w.user_id = ? AND w.ended_at IS NULL
         ORDER BY w.started_at DESC LIMIT 1`,
        [userId]
      ),
      db.getAll<{
        id: string;
        alert_type: string;
        exercise_id: string | null;
        muscle_group: string | null;
        message: string;
        suggested_exercise_id: string | null;
        detected_at: string;
      }>(
        "SELECT id, alert_type, exercise_id, muscle_group, message, suggested_exercise_id, detected_at FROM plateau_alerts WHERE user_id = ? AND dismissed_at IS NULL ORDER BY detected_at DESC",
        [userId]
      ),
    ]);

  let lastWorkout: DashboardData["lastWorkout"] = null;
  if (lastWk) {
    const stats = await db.getOptional<{ set_count: number; volume: number }>(
      `SELECT COUNT(*) AS set_count,
              COALESCE(SUM(CASE WHEN weight IS NOT NULL AND reps IS NOT NULL THEN weight * reps ELSE 0 END), 0) AS volume
       FROM sets WHERE workout_id = ? AND is_warmup = 0`,
      [lastWk.id]
    );
    lastWorkout = {
      id: lastWk.id,
      date: lastWk.date,
      startedAt: lastWk.started_at,
      endedAt: lastWk.ended_at,
      routineName: lastWk.routine_name,
      setCount: stats?.set_count ?? 0,
      volume: stats?.volume ?? 0,
    };
  }

  let activeWorkout: DashboardData["activeWorkout"] = null;
  if (activeWk) {
    const activeStats = await db.getOptional<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM sets WHERE workout_id = ? AND is_warmup = 0",
      [activeWk.id]
    );
    activeWorkout = {
      id: activeWk.id,
      startedAt: activeWk.started_at,
      routineName: activeWk.routine_name,
      setCount: activeStats?.cnt ?? 0,
    };
  }

  const lastRoutineRow = await db.getOptional<{ id: string; name: string }>(
    `SELECT r.id, r.name FROM routines r
     INNER JOIN workouts w ON w.routine_id = r.id
     WHERE w.user_id = ? AND w.ended_at IS NOT NULL
     ORDER BY w.date DESC LIMIT 1`,
    [userId]
  );

  const suggestedIds = alertRows
    .map((a) => a.suggested_exercise_id)
    .filter((id): id is string => id != null);

  let suggestedNames = new Map<string, string>();
  if (suggestedIds.length > 0) {
    const placeholders = suggestedIds.map(() => "?").join(",");
    const exRows = await db.getAll<{ id: string; name: string }>(
      `SELECT id, name FROM exercises WHERE id IN (${placeholders})`,
      suggestedIds
    );
    for (const e of exRows) suggestedNames.set(e.id, e.name);
  }

  return {
    profileName: profile?.name ?? "",
    bodyweight: bwRow?.weight ?? null,
    weekWorkoutCount: weekCount?.cnt ?? 0,
    streak: computeStreak(streakRows.map((r) => r.date)),
    lastWorkout,
    lastRoutine: lastRoutineRow ?? null,
    activeWorkout,
    alerts: alertRows.map((a) => ({
      id: a.id,
      alertType: a.alert_type,
      exerciseId: a.exercise_id,
      muscleGroup: a.muscle_group,
      message: a.message,
      suggestedExerciseId: a.suggested_exercise_id,
      suggestedExerciseName: a.suggested_exercise_id
        ? suggestedNames.get(a.suggested_exercise_id) ?? null
        : null,
      detectedAt: a.detected_at,
    })),
  };
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="px-4 pt-4 pb-2 max-w-lg mx-auto w-full">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-48 mt-2" />
      </header>
      <main className="flex-1 px-4 py-3 max-w-lg mx-auto w-full space-y-4">
        <Skeleton className="h-16 w-full rounded-md" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-md" />
          <Skeleton className="h-24 rounded-md" />
        </div>
        <Skeleton className="h-20 w-full rounded-md" />
      </main>
    </div>
  );
}

export function HomeDashboard({
  userId,
  isApproved,
}: {
  userId: string;
  isApproved: boolean;
}) {
  const db = usePowerSyncDb();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!db) return;
    loadDashboard(db, userId).then(setData);
  }, [db, userId]);

  if (!isApproved) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold">Almost there</h1>
        <p className="mt-2 text-muted-foreground max-w-xs">
          Your account is pending approval. You&apos;ll be able to start logging
          workouts once an admin lets you in.
        </p>
        <SignOutButton className="mt-6" />
      </div>
    );
  }

  if (!data) return <HomeSkeleton />;

  const {
    profileName,
    bodyweight,
    weekWorkoutCount,
    streak,
    lastWorkout,
    lastRoutine,
    activeWorkout,
    alerts,
  } = data;

  const firstName = profileName.split(" ")[0];
  const activeWorkoutRoutineName = activeWorkout?.routineName ?? "Empty Workout";
  const activeWorkoutSetCount = activeWorkout?.setCount ?? 0;
  const lastWorkoutSets = lastWorkout?.setCount ?? 0;
  const lastWorkoutVolume = lastWorkout?.volume ?? 0;

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="px-4 pt-4 pb-2 max-w-lg mx-auto w-full">
        <p className="text-2xl font-bold">Hey {firstName}</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {weekWorkoutCount === 0
            ? "No workouts this week yet"
            : `${weekWorkoutCount} workout${weekWorkoutCount !== 1 ? "s" : ""} this week`}
        </p>
      </header>

      <main className="flex-1 px-4 py-3 max-w-lg mx-auto w-full space-y-4">
        {activeWorkout ? (
          <div>
            <Link href={`/workout/${activeWorkout.id}`}>
              <Button className="w-full h-16 text-xl font-bold" size="lg">
                <Play className="h-6 w-6 mr-2 fill-current" />
                Resume Workout
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground text-center mt-1.5">
              {activeWorkoutRoutineName}
              {activeWorkoutSetCount > 0 && (
                <>
                  {" "}
                  &middot; {activeWorkoutSetCount} set
                  {activeWorkoutSetCount !== 1 ? "s" : ""} done
                </>
              )}
            </p>
            <Link
              href="/workout/new"
              className="block text-center mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              or start a new workout
            </Link>
          </div>
        ) : (
          <div>
            <Link href="/workout/new">
              <Button className="w-full h-16 text-xl font-bold" size="lg">
                <Dumbbell className="h-6 w-6 mr-2" />
                Start Workout
              </Button>
            </Link>
            {lastRoutine && (
              <Link
                href="/workout/new"
                className="flex items-center justify-between mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>
                  Quick start:{" "}
                  <span className="font-medium text-foreground">
                    {lastRoutine.name}
                  </span>
                </span>
                <ChevronRight className="h-6 w-6" />
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-3 px-3 text-center">
              <TrendingUp className="h-6 w-6 mx-auto text-primary mb-1" />
              <p className="text-3xl font-bold tabular-nums">
                {weekWorkoutCount}
              </p>
              <p className="text-sm text-muted-foreground">this week</p>
            </CardContent>
          </Card>
          <Card className={streak >= 3 ? "bg-warning/5" : ""}>
            <CardContent className="py-3 px-3 text-center">
              <Flame className="h-6 w-6 mx-auto text-warning mb-1" />
              <p className="text-3xl font-bold tabular-nums">{streak}</p>
              <p className="text-sm text-muted-foreground">
                week{streak !== 1 ? "s" : ""} streak
              </p>
            </CardContent>
          </Card>
        </div>

        {bodyweight && (
          <p className="text-sm text-muted-foreground text-center">
            <Scale className="h-4 w-4 inline mr-1 align-text-bottom" />
            {bodyweight} kg
          </p>
        )}

        {lastWorkout && (
          <Link href={`/history/${lastWorkout.id}`}>
            <Card className="hover:bg-accent/50 transition-colors">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">
                      {lastWorkout.routineName ?? "Workout"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {formatDateRelative(lastWorkout.date)} &middot;{" "}
                      {formatDuration(
                        lastWorkout.startedAt,
                        lastWorkout.endedAt
                      )}{" "}
                      &middot; {lastWorkoutSets} sets
                      {lastWorkoutVolume > 0 && (
                        <>
                          {" "}
                          &middot; {(lastWorkoutVolume / 1000).toFixed(1)}t
                        </>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        <ErrorBoundary>
          <PlateauAlerts alerts={alerts} />
        </ErrorBoundary>
      </main>
    </div>
  );
}
