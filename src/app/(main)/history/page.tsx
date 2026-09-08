import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { List, CalendarDays } from "lucide-react";
import { HistoryList, type WorkoutItem } from "./history-list";

const PAGE_SIZE = 20;

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

  if (isCalendar) {
    let calQuery = supabase
      .from("workouts")
      .select("id, date, routines(name)")
      .order("date", { ascending: false })
      .limit(200);

    if (!showAll) calQuery = calQuery.eq("user_id", user.id);

    const { data: calWorkouts } = await calQuery;

    return (
      <div className="flex flex-col min-h-screen pb-24">
        <Header isCalendar={isCalendar} view={view} display={display} />
        <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-2">
          {hasHousehold && <HouseholdToggle showAll={showAll} display={display} />}
          {calWorkouts && calWorkouts.length > 0 ? (
            <CalendarHeatmap
              workouts={calWorkouts.map((w) => ({
                date: w.date,
                workoutId: w.id,
                routineName:
                  (w.routines as unknown as { name: string } | null)?.name ??
                  "Empty Workout",
              }))}
            />
          ) : (
            <HistoryList initialItems={[]} initialHasMore={false} userId={user.id} showAll={showAll} />
          )}
        </main>
      </div>
    );
  }

  let query = supabase
    .from("workouts")
    .select("id, user_id, date, started_at, ended_at, routines(name), profiles(name)")
    .order("date", { ascending: false })
    .order("started_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (!showAll) query = query.eq("user_id", user.id);

  const { data: workouts } = await query;

  const hasMore = (workouts?.length ?? 0) > PAGE_SIZE;
  const page = hasMore ? workouts!.slice(0, PAGE_SIZE) : (workouts ?? []);
  const workoutIds = page.map((w) => w.id);

  let setCounts: Record<string, number> = {};
  let volumeMap: Record<string, number> = {};
  let exerciseNamesMap: Record<string, string[]> = {};

  if (workoutIds.length > 0) {
    const { data: sets } = await supabase
      .from("sets")
      .select("workout_id, weight, reps, exercises(name)")
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

  const initialItems: WorkoutItem[] = page.map((w) => ({
    id: w.id,
    userId: w.user_id,
    date: w.date,
    startedAt: w.started_at,
    endedAt: w.ended_at,
    routineName: (w.routines as unknown as { name: string } | null)?.name ?? "Empty Workout",
    ownerName: (w.profiles as unknown as { name: string } | null)?.name ?? "",
    setCount: setCounts[w.id] ?? 0,
    volume: volumeMap[w.id] ?? 0,
    exerciseNames: exerciseNamesMap[w.id] ?? [],
  }));

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <Header isCalendar={isCalendar} view={view} display={display} />
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-2">
        {hasHousehold && <HouseholdToggle showAll={showAll} display={display} />}
        <HistoryList
          initialItems={initialItems}
          initialHasMore={hasMore}
          userId={user.id}
          showAll={showAll}
        />
      </main>
    </div>
  );
}

function Header({
  isCalendar,
  view,
  display,
}: {
  isCalendar: boolean;
  view?: string;
  display?: string;
}) {
  return (
    <header className="px-4 py-3 border-b">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <h1 className="text-lg font-bold">Workout History</h1>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <Link
            href={`/history?${new URLSearchParams({ ...(view ? { view } : {}), display: "list" }).toString()}`}
            replace
          >
            <Button
              variant={isCalendar ? "ghost" : "secondary"}
              size="icon"
              className="h-10 w-10"
            >
              <List className="h-4 w-4" />
            </Button>
          </Link>
          <Link
            href={`/history?${new URLSearchParams({ ...(view ? { view } : {}), display: "calendar" }).toString()}`}
            replace
          >
            <Button
              variant={isCalendar ? "secondary" : "ghost"}
              size="icon"
              className="h-10 w-10"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function HouseholdToggle({
  showAll,
  display,
}: {
  showAll: boolean;
  display?: string;
}) {
  return (
    <div className="flex gap-1 mb-2">
      <Link
        href={`/history?${new URLSearchParams({ view: "mine", ...(display ? { display } : {}) }).toString()}`}
        replace
      >
        <Button
          variant={showAll ? "ghost" : "secondary"}
          size="sm"
          className="h-10 text-sm"
        >
          Mine
        </Button>
      </Link>
      <Link
        href={`/history?${new URLSearchParams({ view: "all", ...(display ? { display } : {}) }).toString()}`}
        replace
      >
        <Button
          variant={showAll ? "secondary" : "ghost"}
          size="sm"
          className="h-10 text-sm"
        >
          Household
        </Button>
      </Link>
    </div>
  );
}
