import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "In progress";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: workouts } = await supabase
    .from("workouts")
    .select(
      `
      id,
      date,
      started_at,
      ended_at,
      routines (
        name
      )
    `
    )
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("started_at", { ascending: false })
    .limit(50);

  const workoutIds = workouts?.map((w) => w.id) ?? [];

  let setCounts: Record<string, number> = {};
  if (workoutIds.length > 0) {
    const { data: sets } = await supabase
      .from("sets")
      .select("workout_id, is_warmup")
      .in("workout_id", workoutIds)
      .eq("is_warmup", false);

    if (sets) {
      for (const s of sets) {
        setCounts[s.workout_id] = (setCounts[s.workout_id] ?? 0) + 1;
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <Link href="/">
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
        <h1 className="text-lg font-bold">Workout History</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-2">
        {(!workouts || workouts.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No workouts yet.</p>
            <p className="mt-1 text-sm">
              Start your first workout from the home screen.
            </p>
          </div>
        )}

        {workouts?.map((w) => {
          const routineName =
            (w.routines as unknown as { name: string } | null)?.name ??
            "Empty Workout";
          const sets = setCounts[w.id] ?? 0;

          return (
            <Link key={w.id} href={`/history/${w.id}`}>
              <Card className="cursor-pointer active:scale-[0.98] transition-transform">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{routineName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(w.date)} &middot;{" "}
                        {formatDuration(w.started_at, w.ended_at)} &middot;{" "}
                        {sets} sets
                      </p>
                    </div>
                    <span className="text-muted-foreground text-sm">&rsaquo;</span>
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
