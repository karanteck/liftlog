import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { List, CalendarDays } from "lucide-react";
import { formatDateRelative, formatDuration } from "@/lib/format";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; display?: string }>;
}) {
  const { view, display } = await searchParams;
  const isCalendar = display === "calendar";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  const hasHousehold = !!profile?.household_id;
  const showAll = hasHousehold && view === "all";

  let query = supabase
    .from("workouts")
    .select(
      `
      id,
      user_id,
      date,
      started_at,
      ended_at,
      routines (
        name
      ),
      profiles (
        name
      )
    `
    )
    .order("date", { ascending: false })
    .order("started_at", { ascending: false })
    .limit(50);

  if (!showAll) {
    query = query.eq("user_id", user.id);
  }

  const { data: workouts } = await query;

  const workoutIds = workouts?.map((w) => w.id) ?? [];

  let setCounts: Record<string, number> = {};
  let volumeMap: Record<string, number> = {};
  let exerciseNamesMap: Record<string, string[]> = {};

  if (workoutIds.length > 0) {
    const { data: sets } = await supabase
      .from("sets")
      .select("workout_id, is_warmup, weight, reps, exercises(name)")
      .in("workout_id", workoutIds)
      .eq("is_warmup", false);

    if (sets) {
      for (const s of sets) {
        setCounts[s.workout_id] = (setCounts[s.workout_id] ?? 0) + 1;
        const w = (s.weight as number) ?? 0;
        const r = (s.reps as number) ?? 0;
        volumeMap[s.workout_id] = (volumeMap[s.workout_id] ?? 0) + w * r;

        const exName = (s.exercises as unknown as { name: string } | null)?.name;
        if (exName) {
          if (!exerciseNamesMap[s.workout_id]) exerciseNamesMap[s.workout_id] = [];
          if (!exerciseNamesMap[s.workout_id].includes(exName)) {
            exerciseNamesMap[s.workout_id].push(exName);
          }
        }
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="px-4 py-3 border-b">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Workout History</h1>
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            <Link href={`/history?${new URLSearchParams({ ...(view ? { view } : {}), display: "list" }).toString()}`} replace>
              <Button
                variant={isCalendar ? "ghost" : "secondary"}
                size="icon"
                className="h-8 w-8"
              >
                <List className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/history?${new URLSearchParams({ ...(view ? { view } : {}), display: "calendar" }).toString()}`} replace>
              <Button
                variant={isCalendar ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-2">
        {hasHousehold && (
          <div className="flex gap-1 mb-2">
            <Link href={`/history?${new URLSearchParams({ view: "mine", ...(display ? { display } : {}) }).toString()}`} replace>
              <Button
                variant={showAll ? "ghost" : "secondary"}
                size="sm"
                className="h-8 text-xs"
              >
                Mine
              </Button>
            </Link>
            <Link href={`/history?${new URLSearchParams({ view: "all", ...(display ? { display } : {}) }).toString()}`} replace>
              <Button
                variant={showAll ? "secondary" : "ghost"}
                size="sm"
                className="h-8 text-xs"
              >
                Household
              </Button>
            </Link>
          </div>
        )}

        {(!workouts || workouts.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No workouts yet.</p>
            <p className="mt-1 text-sm">
              Start your first workout from the home screen.
            </p>
          </div>
        )}

        {isCalendar && workouts && workouts.length > 0 && (
          <CalendarHeatmap
            workouts={workouts.map((w) => ({
              date: w.date,
              workoutId: w.id,
              routineName:
                (w.routines as unknown as { name: string } | null)?.name ??
                "Empty Workout",
            }))}
          />
        )}

        {!isCalendar && workouts?.map((w) => {
          const routineName =
            (w.routines as unknown as { name: string } | null)?.name ??
            "Empty Workout";
          const ownerName =
            (w.profiles as unknown as { name: string } | null)?.name ?? "";
          const isOwn = w.user_id === user.id;
          const sets = setCounts[w.id] ?? 0;
          const volume = volumeMap[w.id] ?? 0;
          const exNames = exerciseNamesMap[w.id] ?? [];
          const shown = exNames.slice(0, 3);
          const extra = exNames.length - shown.length;

          return (
            <Link key={w.id} href={`/history/${w.id}`}>
              <Card className="cursor-pointer active:scale-[0.98] transition-transform border-l-2 border-l-primary">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {routineName}
                        {showAll && !isOwn && (
                          <span className="text-muted-foreground font-normal ml-1.5 text-sm">
                            ({ownerName.split(" ")[0]})
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateRelative(w.date)} &middot;{" "}
                        {formatDuration(w.started_at, w.ended_at)} &middot;{" "}
                        {sets} sets
                        {volume > 0 && (
                          <> &middot; {volume >= 1000 ? `${(volume / 1000).toFixed(1)}t` : `${Math.round(volume)} kg`}</>
                        )}
                      </p>
                      {shown.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {shown.join(", ")}
                          {extra > 0 && `, +${extra} more`}
                        </p>
                      )}
                    </div>
                    <span className="text-muted-foreground text-sm ml-2">&rsaquo;</span>
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
