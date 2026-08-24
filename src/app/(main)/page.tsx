import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlateauAlerts } from "@/components/plateau-alerts";
import { runPlateauDetection } from "@/lib/plateau-runner";
import { Dumbbell, ChevronRight, Scale, Flame, TrendingUp } from "lucide-react";

function getMonday(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "In progress";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString("en-GB", { weekday: "long" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const now = new Date();
  let streak = 0;
  let checkDate = new Date(now);

  for (let w = 0; w < 52; w++) {
    const monday = getMonday(checkDate);
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

  const mondayStr = getMonday(new Date());

  const [alertsResult, bodyweightResult, weekWorkoutsResult, lastWorkoutResult, streakResult, lastRoutineResult] =
    await Promise.all([
      runPlateauDetection(supabase, user.id),
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
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 px-4">
            <Link href="/workout/new">
              <Button className="w-full h-14 text-lg font-semibold" size="lg">
                <Dumbbell className="h-6 w-6 mr-2" />
                Start Workout
              </Button>
            </Link>
            {lastRoutine && (
              <Link
                href="/workout/new"
                className="flex items-center justify-between mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>
                  Quick start: <span className="font-medium text-foreground">{lastRoutine.name}</span>
                </span>
                <ChevronRight className="h-6 w-6" />
              </Link>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-3 px-2 text-center">
              <Scale className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold tabular-nums">
                {latestBodyweight ? `${latestBodyweight}` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">kg</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-2 text-center">
              <TrendingUp className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold tabular-nums">
                {weekWorkoutCount}
              </p>
              <p className="text-xs text-muted-foreground">this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-2 text-center">
              <Flame className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold tabular-nums">{streak}</p>
              <p className="text-xs text-muted-foreground">
                week{streak !== 1 ? "s" : ""} streak
              </p>
            </CardContent>
          </Card>
        </div>

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
                      {formatDate(lastWorkout.date)} &middot;{" "}
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

        <PlateauAlerts alerts={alerts} />
      </main>
    </div>
  );
}
