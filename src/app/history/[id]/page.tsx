import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "In progress";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: workout } = await supabase
    .from("workouts")
    .select(
      `
      id,
      date,
      started_at,
      ended_at,
      notes,
      bodyweight,
      routines (
        name
      )
    `
    )
    .eq("id", id)
    .single();

  if (!workout) notFound();

  const { data: sets } = await supabase
    .from("sets")
    .select(
      `
      id,
      exercise_id,
      set_number,
      weight,
      reps,
      rpe,
      is_warmup,
      exercises (
        name
      )
    `
    )
    .eq("workout_id", workout.id)
    .order("set_number");

  type SetRow = {
    setNumber: number;
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    isWarmup: boolean;
  };

  const exerciseMap: Map<
    string,
    { name: string; sets: SetRow[] }
  > = new Map();

  for (const s of sets ?? []) {
    const exName =
      (s.exercises as unknown as { name: string } | null)?.name ?? "Unknown";
    if (!exerciseMap.has(s.exercise_id)) {
      exerciseMap.set(s.exercise_id, { name: exName, sets: [] });
    }
    exerciseMap.get(s.exercise_id)!.sets.push({
      setNumber: s.set_number,
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe,
      isWarmup: s.is_warmup,
    });
  }

  const routineName =
    (workout.routines as unknown as { name: string } | null)?.name ??
    "Empty Workout";
  const workingSets = (sets ?? []).filter((s) => !s.is_warmup).length;
  const totalVolume = (sets ?? [])
    .filter((s) => !s.is_warmup && s.weight && s.reps)
    .reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <Link href="/history">
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
        <h1 className="text-lg font-bold">{routineName}</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <div className="text-sm text-muted-foreground space-y-0.5">
          <p>{formatDate(workout.date)}</p>
          <p>
            Duration: {formatDuration(workout.started_at, workout.ended_at)}{" "}
            &middot; {workingSets} working sets &middot;{" "}
            {Math.round(totalVolume).toLocaleString()} kg volume
          </p>
          {workout.bodyweight && (
            <p>Bodyweight: {workout.bodyweight} kg</p>
          )}
          {workout.notes && <p>Notes: {workout.notes}</p>}
        </div>

        {exerciseMap.size === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No sets logged in this workout.
          </p>
        )}

        {Array.from(exerciseMap.entries()).map(([exId, ex]) => (
          <Card key={exId}>
            <CardContent className="py-3 px-4">
              <p className="font-semibold mb-2">{ex.name}</p>
              <div className="space-y-1">
                <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 text-xs text-muted-foreground font-medium px-1">
                  <span>Set</span>
                  <span>kg</span>
                  <span>Reps</span>
                  <span>RPE</span>
                </div>
                {ex.sets.map((s, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center px-1 py-1 rounded text-sm ${
                      s.isWarmup ? "text-muted-foreground" : ""
                    }`}
                  >
                    <span className="text-center">
                      {s.isWarmup ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 text-yellow-500 border-yellow-500/50"
                        >
                          W
                        </Badge>
                      ) : (
                        s.setNumber
                      )}
                    </span>
                    <span className="text-center tabular-nums">
                      {s.weight ?? "—"}
                    </span>
                    <span className="text-center tabular-nums">
                      {s.reps ?? "—"}
                    </span>
                    <span className="text-center tabular-nums text-muted-foreground">
                      {s.rpe ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
