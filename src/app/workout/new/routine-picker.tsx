"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Routine = {
  id: string;
  name: string;
  lastPerformedAt: string | null;
  exercises: string[];
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

export function RoutinePicker({ routines }: { routines: Routine[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [starting, setStarting] = useState<string | null>(null);
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const isToday = selectedDate === todayStr;

  async function startWorkout(routineId: string | null) {
    setStarting(routineId ?? "empty");

    const startedAt = isToday
      ? new Date().toISOString()
      : new Date(selectedDate + "T12:00:00").toISOString();

    const { data, error } = await supabase
      .from("workouts")
      .insert({
        user_id: (await supabase.auth.getUser()).data.user!.id,
        routine_id: routineId,
        date: selectedDate,
        started_at: startedAt,
      })
      .select("id")
      .single();

    if (error || !data) {
      setStarting(null);
      alert("Failed to create workout: " + (error?.message ?? "unknown error"));
      return;
    }

    router.push(`/workout/${data.id}`);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <Link href="/">
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
        <h1 className="text-lg font-bold">Choose Routine</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium shrink-0">Date</label>
          <input
            type="date"
            value={selectedDate}
            max={todayStr}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 flex-1 rounded-md border bg-transparent px-3 text-sm"
          />
          {!isToday && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
          )}
        </div>

        {!isToday && (
          <p className="text-xs text-muted-foreground">
            Logging a past workout for{" "}
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        )}

        {routines.map((r) => (
          <Card
            key={r.id}
            className="cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => !starting && startWorkout(r.id)}
          >
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {r.exercises.join(", ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {r.lastPerformedAt
                      ? timeAgo(r.lastPerformedAt)
                      : "Never done"}
                  </span>
                </div>
              </div>
              {starting === r.id && (
                <p className="text-xs text-muted-foreground mt-2">
                  Starting...
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        <Card
          className="cursor-pointer active:scale-[0.98] transition-transform border-dashed"
          onClick={() => !starting && startWorkout(null)}
        >
          <CardContent className="py-3 px-4">
            <p className="font-semibold">Empty Workout</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Start from scratch
            </p>
            {starting === "empty" && (
              <p className="text-xs text-muted-foreground mt-2">Starting...</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
