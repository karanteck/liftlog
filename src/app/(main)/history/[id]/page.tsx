import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteWorkoutButton } from "@/components/delete-workout-button";
import { Pencil } from "lucide-react";
import { formatDateLong, formatDuration } from "@/lib/format";

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
      user_id,
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
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Link href="/history">
            <Button variant="ghost" size="sm">
              Back
            </Button>
          </Link>
          <h1 className="text-lg font-bold">{routineName}</h1>
        </div>
        {workout.user_id === user.id && (
          <div className="flex items-center gap-1">
            <Link href={`/workout/${workout.id}`}>
              <Button variant="ghost" size="sm">
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </Link>
            <DeleteWorkoutButton workoutId={workout.id} />
          </div>
        )}
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <div className="text-sm text-muted-foreground space-y-0.5">
          <p>{formatDateLong(workout.date)}</p>
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
              <Link
                href={`/exercises/${exId}`}
                className="font-semibold mb-2 block text-primary underline-offset-2 hover:underline"
              >
                {ex.name}
              </Link>
              <div className="space-y-1">
                <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 text-sm text-muted-foreground font-medium px-1">
                  <span>Set</span>
                  <span>kg</span>
                  <span>Reps</span>
                  <span>RPE</span>
                </div>
                {ex.sets.map((s, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 items-center px-1 py-1.5 rounded text-sm ${
                      s.isWarmup ? "text-muted-foreground" : ""
                    }`}
                  >
                    <span className="text-center">
                      {s.isWarmup ? (
                        <Badge
                          variant="outline"
                          className="text-xs px-1 py-0 text-warning border-warning/50"
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
