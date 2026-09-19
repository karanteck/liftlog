"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePowerSyncDb } from "@/components/powersync-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { List, CalendarDays } from "lucide-react";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { ExportAllWorkoutsButton } from "@/components/export-all-workouts-button";
import { HistoryList } from "./history-list";

export function HistoryDashboard({ userId }: { userId: string }) {
  const db = usePowerSyncDb();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const display = searchParams.get("display");
  const isCalendar = display === "calendar";

  const [householdId, setHouseholdId] = useState<string | null | undefined>(undefined);
  const [calendarWorkouts, setCalendarWorkouts] = useState<
    { date: string; workoutId: string; routineName: string }[] | null
  >(null);

  const hasHousehold = householdId != null;
  const showAll = hasHousehold && view === "all";

  useEffect(() => {
    if (!db) return;
    db.getOptional<{ household_id: string | null }>(
      "SELECT household_id FROM profiles WHERE id = ?",
      [userId]
    ).then((profile) => {
      setHouseholdId(profile?.household_id ?? null);
    });
  }, [db, userId]);

  useEffect(() => {
    if (!db || !isCalendar) return;

    const params: string[] = [];
    let sql = `
      SELECT w.id, w.date, COALESCE(r.name, 'Empty Workout') AS routine_name
      FROM workouts w
      LEFT JOIN routines r ON w.routine_id = r.id`;

    if (!showAll) {
      sql += ` WHERE w.user_id = ?`;
      params.push(userId);
    }

    sql += ` ORDER BY w.date DESC LIMIT 200`;

    db.getAll<{ id: string; date: string; routine_name: string }>(sql, params).then(
      (rows) => {
        setCalendarWorkouts(
          rows.map((w) => ({
            date: w.date,
            workoutId: w.id,
            routineName: w.routine_name,
          }))
        );
      }
    );
  }, [db, isCalendar, showAll, userId]);

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="px-4 py-3 border-b">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Workout History</h1>
          <div className="flex items-center gap-2">
            <ExportAllWorkoutsButton userId={userId} />
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              <Link
                href={`/history?${new URLSearchParams({
                  ...(view ? { view } : {}),
                  display: "list",
                }).toString()}`}
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
                href={`/history?${new URLSearchParams({
                  ...(view ? { view } : {}),
                  display: "calendar",
                }).toString()}`}
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
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-2">
        {hasHousehold && (
          <div className="flex gap-1 mb-2">
            <Link
              href={`/history?${new URLSearchParams({
                view: "mine",
                ...(display ? { display } : {}),
              }).toString()}`}
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
              href={`/history?${new URLSearchParams({
                view: "all",
                ...(display ? { display } : {}),
              }).toString()}`}
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
        )}

        {isCalendar ? (
          calendarWorkouts === null ? (
            <HistorySkeleton />
          ) : calendarWorkouts.length > 0 ? (
            <CalendarHeatmap workouts={calendarWorkouts} />
          ) : (
            <HistoryList userId={userId} showAll={showAll} />
          )
        ) : (
          <HistoryList userId={userId} showAll={showAll} />
        )}
      </main>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24" />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-md" />
      ))}
    </div>
  );
}
