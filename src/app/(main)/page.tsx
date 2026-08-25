import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlateauAlerts } from "@/components/plateau-alerts";
import { getActiveAlerts } from "@/lib/plateau-runner";
import { ErrorBoundary } from "@/components/error-boundary";
import { Dumbbell, ChevronRight, Scale, Flame, TrendingUp } from "lucide-react";
import { formatDateRelative, formatDuration, getMonday } from "@/lib/format";

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const now = new Date();
  let streak = 0;
  let checkDate = new Date(now);

  for (let w = 0; w < 52; w++) {
    const monday = getMonday(checkDate.toISOString().split("T")[0]);
    const sunday = new Date(monday + "T00:00:00");
    sunday.setDate(sunday.getDate() + 6);
    const sundayStr = sunday.toISOString().split("T")[0];

    const hasWorkout = dates.some((d) => d >= monday && d <= sundayStr);
    if (hasWorkout) {
      streak++;
    } else if (w > 0) {
      break;
    } else {
      break;
    }
    checkDate.setDate(checkDate.getDate() - 7);
  }
  return streak;
}

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, is_approved, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_approved) {
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

  const mondayStr = getMonday(new Date().toISOString().split("T")[0]);

  const [alertsResult, bodyweightResult, weekWorkoutsResult, lastWorkoutResult, streakResult, lastRoutineResult] =
    await Promise.all([
      getActiveAlerts(supabase, user.id),
      supabase
        .from("bodyweight_log")
        .select("weight")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("workouts")
        .select("id")
        .eq("user_id", user.id)
        .gte("date", mondayStr)
        .not("ended_at", "is", null),
      supabase
        .from("workouts")
        .select("id, date, started_at, ended_at, routines ( name )")
        .eq("user_id", user.id)
        .not("ended_at", "is", null)
        .order("date", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("workouts")
        .select("date")
        .eq("user_id", user.id)
        .not("ended_at", "is", null)
        .order("date", { ascending: false })
        .limit(200),
      supabase
        .from("workouts")
        .select("routine_id, routines ( id, name )")
        .eq("user_id", user.id)
        .not("ended_at", "is", null)
        .not("routine_id", "is", null)
        .order("date", { ascending: false })
        .limit(1)
        .single(),
    ]);

  const alerts = alertsResult;
  const latestBodyweight = bodyweightResult.data?.weight
    ? Number(bodyweightResult.data.weight)
    : null;
  const weekWorkoutCount = weekWorkoutsResult.data?.length ?? 0;
  const streak = computeStreak(
    (streakResult.data ?? []).map((w) => w.date)
  );

  const lastWorkout = lastWorkoutResult.data;
  let lastWorkoutVolume = 0;
  let lastWorkoutSets = 0;
  if (lastWorkout) {
    const { data: sets } = await supabase
      .from("sets")
      .select("weight, reps, is_warmup")
      .eq("workout_id", lastWorkout.id)
      .eq("is_warmup", false);

    if (sets) {
      lastWorkoutSets = sets.length;
      lastWorkoutVolume = sets.reduce(
        (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
        0
      );
    }
  }

  const lastRoutineRaw = lastRoutineResult.data?.routines as unknown;
  const lastRoutine = Array.isArray(lastRoutineRaw)
    ? (lastRoutineRaw[0] as { id: string; name: string } | undefined) ?? null
    : (lastRoutineRaw as { id: string; name: string } | null);

  const firstName = profile.name.split(" ")[0];

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
                Quick start: <span className="font-medium text-foreground">{lastRoutine.name}</span>
              </span>
              <ChevronRight className="h-6 w-6" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-3 px-3 text-center">
              <TrendingUp className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-3xl font-bold tabular-nums">
                {weekWorkoutCount}
              </p>
              <p className="text-xs text-muted-foreground">this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-3 text-center">
              <Flame className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-3xl font-bold tabular-nums">{streak}</p>
              <p className="text-xs text-muted-foreground">
                week{streak !== 1 ? "s" : ""} streak
              </p>
            </CardContent>
          </Card>
        </div>

        {latestBodyweight && (
          <p className="text-xs text-muted-foreground text-center">
            <Scale className="h-3.5 w-3.5 inline mr-1 align-text-bottom" />
            {latestBodyweight} kg
          </p>
        )}

        {lastWorkout && (
          <Link href={`/history/${lastWorkout.id}`}>
            <Card className="hover:bg-accent/50 transition-colors">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">
                      {(() => {
                        const r = lastWorkout.routines as unknown;
                        const obj = Array.isArray(r) ? r[0] : r;
                        return (obj as { name: string } | null)?.name ?? "Workout";
                      })()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateRelative(lastWorkout.date)} &middot;{" "}
                      {formatDuration(lastWorkout.started_at, lastWorkout.ended_at)} &middot;{" "}
                      {lastWorkoutSets} sets
                      {lastWorkoutVolume > 0 && (
                        <> &middot; {(lastWorkoutVolume / 1000).toFixed(1)}t</>
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
