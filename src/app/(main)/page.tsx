import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlateauAlerts } from "@/components/plateau-alerts";
import { getActiveAlerts } from "@/lib/plateau-runner";
import { ErrorBoundary } from "@/components/error-boundary";
import { Dumbbell, ChevronRight, Scale, Flame, TrendingUp, Play } from "lucide-react";
import { formatDateRelative, formatDuration, getMonday } from "@/lib/format";

type HomePageData = {
  profile: { name: string; is_approved: boolean; is_admin: boolean };
  bodyweight: number | null;
  week_workout_count: number;
  streak_dates: string[];
  last_workout: {
    id: string;
    date: string;
    started_at: string;
    ended_at: string;
    routine_name: string | null;
    set_count: number;
    volume: number;
  } | null;
  last_routine: { id: string; name: string } | null;
  active_workout: {
    id: string;
    started_at: string;
    routine_name: string | null;
    set_count: number;
  } | null;
};

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

  const [{ data: rpcData }, alerts] = await Promise.all([
    supabase.rpc("home_page_data", { p_user_id: user.id }),
    getActiveAlerts(supabase, user.id),
  ]);

  const data = rpcData as HomePageData | null;

  if (!data?.profile?.is_approved) {
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

  const latestBodyweight = data.bodyweight ? Number(data.bodyweight) : null;
  const weekWorkoutCount = data.week_workout_count;
  const streak = computeStreak(data.streak_dates);
  const lastWorkout = data.last_workout;
  const lastWorkoutSets = lastWorkout?.set_count ?? 0;
  const lastWorkoutVolume = lastWorkout?.volume ?? 0;
  const lastRoutine = data.last_routine;
  const activeWorkout = data.active_workout;
  const activeWorkoutRoutineName = activeWorkout?.routine_name ?? "Empty Workout";
  const activeWorkoutSetCount = activeWorkout?.set_count ?? 0;
  const firstName = data.profile.name.split(" ")[0];

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
                <> &middot; {activeWorkoutSetCount} set{activeWorkoutSetCount !== 1 ? "s" : ""} done</>
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
                  Quick start: <span className="font-medium text-foreground">{lastRoutine.name}</span>
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

        {latestBodyweight && (
          <p className="text-sm text-muted-foreground text-center">
            <Scale className="h-4 w-4 inline mr-1 align-text-bottom" />
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
                      {lastWorkout.routine_name ?? "Workout"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
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
