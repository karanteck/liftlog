"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell } from "lucide-react";
import { formatDateRelative, formatDuration, getMonday } from "@/lib/format";

const PAGE_SIZE = 20;

export type WorkoutItem = {
  id: string;
  userId: string;
  date: string;
  startedAt: string;
  endedAt: string | null;
  routineName: string;
  ownerName: string;
  setCount: number;
  volume: number;
  exerciseNames: string[];
};

function groupByWeek(workouts: WorkoutItem[]) {
  if (workouts.length === 0) return [];

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const currentMonday = getMonday(now.toISOString().split("T")[0]);
  const prevMonday = (() => {
    const d = new Date(currentMonday + "T00:00:00");
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  })();

  const groups: { label: string; items: WorkoutItem[] }[] = [];
  let current: (typeof groups)[0] | null = null;

  for (const w of workouts) {
    const monday = getMonday(w.date);
    let label: string;
    if (monday === currentMonday) label = "This week";
    else if (monday === prevMonday) label = "Last week";
    else {
      const d = new Date(monday + "T00:00:00");
      label = `Week of ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
    }

    if (!current || current.label !== label) {
      current = { label, items: [] };
      groups.push(current);
    }
    current.items.push(w);
  }

  return groups;
}

async function fetchPage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  showAll: boolean,
  cursor: { date: string; startedAt: string }
): Promise<{ items: WorkoutItem[]; hasMore: boolean }> {
  let query = supabase
    .from("workouts")
    .select("id, user_id, date, started_at, ended_at, routines(name), profiles(name)")
    .or(`date.lt.${cursor.date},and(date.eq.${cursor.date},started_at.lt.${cursor.startedAt})`)
    .order("date", { ascending: false })
    .order("started_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (!showAll) query = query.eq("user_id", userId);

  const { data: workouts } = await query;
  if (!workouts || workouts.length === 0) return { items: [], hasMore: false };

  const hasMore = workouts.length > PAGE_SIZE;
  const page = hasMore ? workouts.slice(0, PAGE_SIZE) : workouts;
  const workoutIds = page.map((w) => w.id);

  const { data: sets } = await supabase
    .from("sets")
    .select("workout_id, weight, reps, exercises(name)")
    .in("workout_id", workoutIds)
    .eq("is_warmup", false);

  const setCounts: Record<string, number> = {};
  const volumeMap: Record<string, number> = {};
  const exerciseNamesMap: Record<string, string[]> = {};

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

  const items: WorkoutItem[] = page.map((w) => ({
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

  return { items, hasMore };
}

export function HistoryList({
  initialItems,
  initialHasMore,
  userId,
  showAll,
}: {
  initialItems: WorkoutItem[];
  initialHasMore: boolean;
  userId: string;
  showAll: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const supabaseRef = useRef(createClient());

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || items.length === 0) return;
    setLoading(true);

    const last = items[items.length - 1];
    const result = await fetchPage(supabaseRef.current, userId, showAll, {
      date: last.date,
      startedAt: last.startedAt,
    });

    setItems((prev) => [...prev, ...result.items]);
    setHasMore(result.hasMore);
    setLoading(false);
  }, [loading, hasMore, items, userId, showAll]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-base font-medium">No workouts yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your workout history will appear here
        </p>
        <Link href="/workout/new">
          <Button variant="outline" size="sm" className="mt-4">
            Start your first workout
          </Button>
        </Link>
      </div>
    );
  }

  const weekGroups = groupByWeek(items);

  return (
    <div className="space-y-2">
      {weekGroups.map((group, gi) => (
        <div key={gi} className="space-y-2">
          <p className="sticky top-0 z-10 bg-background text-sm font-medium text-muted-foreground pt-3 pb-1">
            {group.label}
          </p>
          {group.items.map((w) => {
            const isOwn = w.userId === userId;
            const shown = w.exerciseNames.slice(0, 3);
            const extra = w.exerciseNames.length - shown.length;

            return (
              <Link key={w.id} href={`/history/${w.id}`}>
                <Card className="cursor-pointer active:scale-[0.98] transition-transform border-l-2 border-l-primary">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {w.routineName}
                          {showAll && !isOwn && (
                            <span className="text-muted-foreground font-normal ml-1.5 text-sm">
                              ({w.ownerName.split(" ")[0]})
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateRelative(w.date)} &middot;{" "}
                          {formatDuration(w.startedAt, w.endedAt)} &middot;{" "}
                          {w.setCount} sets
                          {w.volume > 0 && (
                            <> &middot; {w.volume >= 1000 ? `${(w.volume / 1000).toFixed(1)}t` : `${Math.round(w.volume)} kg`}</>
                          )}
                        </p>
                        {shown.length > 0 && (
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">
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
        </div>
      ))}

      {hasMore && (
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={loadMore}
          disabled={loading}
        >
          {loading ? "Loading..." : "Load more"}
        </Button>
      )}
    </div>
  );
}
