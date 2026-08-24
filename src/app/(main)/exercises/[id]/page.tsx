import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeE1rm } from "@/lib/pr";
import { E1rmChart } from "@/components/e1rm-chart";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor(
    (today.getTime() - d.getTime()) / 86400000
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function ExerciseHistoryPage({
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

  const { data: exercise } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, equipment, default_rep_tier")
    .eq("id", id)
    .single();

  if (!exercise) notFound();

  const { data: sets } = await supabase
    .from("sets")
    .select(
      `
      id,
      set_number,
      weight,
      reps,
      rpe,
      is_warmup,
      workout_id,
      workouts (
        id,
        date,
        started_at,
        user_id,
        routines ( name )
      )
    `
    )
    .eq("exercise_id", id)
    .order("set_number");

  type WorkoutJoin = {
    id: string;
    date: string;
    started_at: string;
    user_id: string;
    routines: { name: string } | null;
  };

  type SetRow = {
    id: string;
    setNumber: number;
    weight: number | null;
    reps: number | null;
    rpe: number | null;
    isWarmup: boolean;
    userId: string;
  };

  type SessionGroup = {
    workoutId: string;
    date: string;
    startedAt: string;
    routineName: string;
    isOwnWorkout: boolean;
    sets: SetRow[];
  };

  const sessionMap = new Map<string, SessionGroup>();

  for (const s of sets ?? []) {
    const w = s.workouts as unknown as WorkoutJoin | null;
    if (!w) continue;

    if (!sessionMap.has(w.id)) {
      const routineName =
        (w.routines as unknown as { name: string } | null)?.name ??
        "Empty Workout";
      sessionMap.set(w.id, {
        workoutId: w.id,
        date: w.date,
        startedAt: w.started_at,
        routineName,
        isOwnWorkout: w.user_id === user.id,
        sets: [],
      });
    }

    sessionMap.get(w.id)!.sets.push({
      id: s.id,
      setNumber: s.set_number,
      weight: s.weight,
      reps: s.reps,
      rpe: s.rpe,
      isWarmup: s.is_warmup,
      userId: w.user_id,
    });
  }

  const sessions = Array.from(sessionMap.values()).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  // Compute PRs per user (only from working sets)
  const allWorkingSets = sessions
    .flatMap((s) => s.sets)
    .filter((s) => !s.isWarmup && s.userId === user.id);

  let prMaxWeight: { value: number; setId: string } | null = null;
  let prBestE1rm: { value: number; setId: string } | null = null;
  let prBestVolume: { value: number; setId: string } | null = null;

  for (const s of allWorkingSets) {
    if (s.weight == null || s.weight <= 0) continue;

    if (prMaxWeight === null || s.weight > prMaxWeight.value) {
      prMaxWeight = { value: s.weight, setId: s.id };
    }

    if (s.reps != null && s.reps > 0) {
      const volume = s.weight * s.reps;
      if (prBestVolume === null || volume > prBestVolume.value) {
        prBestVolume = { value: volume, setId: s.id };
      }

      const e1rm = computeE1rm(s.weight, s.reps);
      if (e1rm !== null && (prBestE1rm === null || e1rm > prBestE1rm.value)) {
        prBestE1rm = { value: e1rm, setId: s.id };
      }
    }
  }

  const prSetIds = new Set(
    [prMaxWeight?.setId, prBestE1rm?.setId, prBestVolume?.setId].filter(
      Boolean
    ) as string[]
  );

  function getPrLabels(setId: string): string[] {
    const labels: string[] = [];
    if (prMaxWeight?.setId === setId) labels.push("Weight PR");
    if (prBestE1rm?.setId === setId) labels.push("1RM PR");
    if (prBestVolume?.setId === setId) labels.push("Volume PR");
    return labels;
  }

  const hasPRs = prMaxWeight || prBestE1rm || prBestVolume;

  const e1rmTrendData = sessions
    .filter((s) => s.isOwnWorkout)
    .map((s) => {
      const workingSets = s.sets.filter((set) => !set.isWarmup);
      let bestE1rm: number | null = null;
      for (const set of workingSets) {
        if (set.weight == null || set.weight <= 0 || set.reps == null) continue;
        const e1rm = computeE1rm(set.weight, set.reps);
        if (e1rm !== null && (bestE1rm === null || e1rm > bestE1rm)) {
          bestE1rm = e1rm;
        }
      }
      return bestE1rm !== null ? { date: s.date, e1rm: bestE1rm } : null;
    })
    .filter((d): d is { date: string; e1rm: number } => d !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  const tierLabels: Record<string, string> = {
    heavy_compound: "Heavy compound",
    compound: "Compound",
    isolation: "Isolation",
    small_isolation: "Small isolation",
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <Link href="/history">
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
        <h1 className="text-lg font-bold">{exercise.name}</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{exercise.muscle_group}</Badge>
          <Badge variant="outline">{exercise.equipment}</Badge>
          <Badge variant="outline">
            {tierLabels[exercise.default_rep_tier] ?? exercise.default_rep_tier}
          </Badge>
        </div>

        {hasPRs && (
          <Card>
            <CardContent className="py-3 px-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Personal Records
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {prMaxWeight && (
                  <div>
                    <p className="text-lg font-bold tabular-nums">
                      {prMaxWeight.value}kg
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Max weight
                    </p>
                  </div>
                )}
                {prBestE1rm && (
                  <div>
                    <p className="text-lg font-bold tabular-nums">
                      {Math.round(prBestE1rm.value)}kg
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Est. 1RM
                    </p>
                  </div>
                )}
                {prBestVolume && (
                  <div>
                    <p className="text-lg font-bold tabular-nums">
                      {Math.round(prBestVolume.value)}kg
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Best set vol.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <E1rmChart data={e1rmTrendData} />

        <p className="text-sm text-muted-foreground">
          {sessions.length} {sessions.length === 1 ? "session" : "sessions"}{" "}
          logged
        </p>

        {sessions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No history for this exercise yet.</p>
          </div>
        )}

        {sessions.map((session) => {
          const workingSets = session.sets.filter((s) => !s.isWarmup);
          const bestWeight = Math.max(
            ...workingSets
              .filter((s) => s.weight != null)
              .map((s) => s.weight!),
            0
          );

          return (
            <Link key={session.workoutId} href={`/history/${session.workoutId}`}>
              <Card className="cursor-pointer active:scale-[0.98] transition-transform mb-2">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">
                        {formatDate(session.date)}
                        {!session.isOwnWorkout && (
                          <span className="text-muted-foreground ml-1">
                            (household)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.routineName} &middot;{" "}
                        {workingSets.length} working{" "}
                        {workingSets.length === 1 ? "set" : "sets"}
                        {bestWeight > 0 && (
                          <> &middot; up to {bestWeight}kg</>
                        )}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-sm">
                      &rsaquo;
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {session.sets.map((s, i) => {
                      const labels =
                        session.isOwnWorkout ? getPrLabels(s.id) : [];
                      return (
                        <div
                          key={i}
                          className={`grid grid-cols-[2rem_1fr_1fr_auto] gap-2 items-center text-sm ${
                            s.isWarmup ? "text-muted-foreground" : ""
                          }`}
                        >
                          <span className="text-center text-xs">
                            {s.isWarmup ? (
                              <Badge
                                variant="outline"
                                className="text-xs px-1 py-0 text-yellow-500 border-yellow-500/50"
                              >
                                W
                              </Badge>
                            ) : (
                              s.setNumber
                            )}
                          </span>
                          <span className="text-center tabular-nums">
                            {s.weight != null ? `${s.weight}kg` : "—"}
                          </span>
                          <span className="text-center tabular-nums">
                            {s.reps != null ? `${s.reps} reps` : "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            {s.rpe != null && (
                              <span className="tabular-nums text-xs text-muted-foreground">
                                {s.rpe}
                              </span>
                            )}
                            {labels.map((l) => (
                              <Badge
                                key={l}
                                className="text-[9px] px-1 py-0 bg-amber-500/20 text-amber-500 border-amber-500/30"
                                variant="outline"
                              >
                                {l}
                              </Badge>
                            ))}
                          </span>
                        </div>
                      );
                    })}
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
