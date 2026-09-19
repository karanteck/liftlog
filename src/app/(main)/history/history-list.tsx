"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { PowerSyncDatabase } from "@powersync/web";
import { usePowerSyncDb } from "@/components/powersync-provider";
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
  db: PowerSyncDatabase,
  userId: string,
  showAll: boolean,
  cursor: { date: string; startedAt: string }
): Promise<{ items: WorkoutItem[]; hasMore: boolean }> {
  const params: (string | number)[] = [cursor.date, cursor.date, cursor.startedAt];
  let sql = `
    SELECT w.id, w.user_id, w.date, w.started_at, w.ended_at,
           COALESCE(r.name, 'Empty Workout') AS routine_name,
           COALESCE(p.name, '') AS owner_name
    FROM workouts w
    LEFT JOIN routines r ON w.routine_id = r.id
    LEFT JOIN profiles p ON w.user_id = p.id
    WHERE (w.date < ? OR (w.date = ? AND w.started_at < ?))`;

  if (!showAll) {
    sql += ` AND w.user_id = ?`;
    params.push(userId);
  }

  sql += ` ORDER BY w.date DESC, w.started_at DESC LIMIT ?`;
  params.push(PAGE_SIZE + 1);

  const workouts = await db.getAll<{
    id: string;
    user_id: string;
    date: string;
    started_at: string;
    ended_at: string | null;
    routine_name: string;
    owner_name: string;
  }>(sql, params);

  if (workouts.length === 0) return { items: [], hasMore: false };

  const hasMore = workouts.length > PAGE_SIZE;
  const page = hasMore ? workouts.slice(0, PAGE_SIZE) : workouts;
  const workoutIds = page.map((w) => w.id);

  const placeholders = workoutIds.map(() => "?").join(",");
  const sets = await db.getAll<{
    workout_id: string;
    weight: number | null;
    reps: number | null;
    exercise_name: string;
  }>(
    `SELECT s.workout_id, s.weight, s.reps, e.name AS exercise_name
     FROM sets s
     INNER JOIN exercises e ON s.exercise_id = e.id
     WHERE s.workout_id IN (${placeholders})
       AND s.is_warmup = 0`,
    workoutIds
  );

  const setCounts: Record<string, number> = {};
  const volumeMap: Record<string, number> = {};
  const exerciseNamesMap: Record<string, string[]> = {};

  for (const s of sets) {
    setCounts[s.workout_id] = (setCounts[s.workout_id] ?? 0) + 1;
    const w = s.weight ?? 0;
    const r = s.reps ?? 0;
    volumeMap[s.workout_id] = (volumeMap[s.workout_id] ?? 0) + w * r;

    if (s.exercise_name) {
      if (!exerciseNamesMap[s.workout_id]) exerciseNamesMap[s.workout_id] = [];
      if (!exerciseNamesMap[s.workout_id].includes(s.exercise_name)) {
        exerciseNamesMap[s.workout_id].push(s.exercise_name);
      }
    }
  }

  const items: WorkoutItem[] = page.map((w) => ({
    id: w.id,
    userId: w.user_id,
    date: w.date,
    startedAt: w.started_at,
    endedAt: w.ended_at,
    routineName: w.routine_name,
    ownerName: w.owner_name,
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
  const db = usePowerSyncDb();
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || items.length === 0 || !db) return;
    setLoading(true);

    const last = items[items.length - 1];
    const result = await fetchPage(db, userId, showAll, {
      date: last.date,
      startedAt: last.startedAt,
    });

    setItems((prev) => [...prev, ...result.items]);
    setHasMore(result.hasMore);
    setLoading(false);
  }, [loading, hasMore, items, userId, showAll, db]);

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
