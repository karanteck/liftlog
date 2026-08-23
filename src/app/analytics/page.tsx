import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HardSetsChart } from "@/components/hard-sets-chart";
import { VolumeTrendChart } from "@/components/volume-trend-chart";
import { FrequencyChart } from "@/components/frequency-chart";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: rawSets } = await supabase
    .from("sets")
    .select(
      `
      id,
      weight,
      reps,
      is_warmup,
      exercises ( muscle_group ),
      workouts!inner ( date, user_id )
    `
    )
    .eq("is_warmup", false)
    .eq("workouts.user_id", user.id);

  type ParsedSet = {
    date: string;
    muscleGroup: string;
    weight: number | null;
    reps: number | null;
  };

  const parsedSets: ParsedSet[] = (rawSets ?? [])
    .filter((s) => {
      const ex = s.exercises as unknown as { muscle_group: string } | null;
      const wo = s.workouts as unknown as { date: string } | null;
      return ex && wo;
    })
    .map((s) => {
      const ex = s.exercises as unknown as { muscle_group: string };
      const wo = s.workouts as unknown as { date: string };
      return {
        date: wo.date,
        muscleGroup: ex.muscle_group,
        weight: s.weight != null ? Number(s.weight) : null,
        reps: s.reps != null ? Number(s.reps) : null,
      };
    });

  const hardSetsData = parsedSets.map((s) => ({
    date: s.date,
    muscleGroup: s.muscleGroup,
  }));

  const { data: workouts } = await supabase
    .from("workouts")
    .select("date")
    .eq("user_id", user.id)
    .not("ended_at", "is", null);

  const workoutDates = (workouts ?? []).map((w) => w.date as string);

  const volumeData = parsedSets
    .filter((s) => s.weight != null && s.weight > 0 && s.reps != null && s.reps > 0)
    .map((s) => ({
      date: s.date,
      muscleGroup: s.muscleGroup,
      weight: s.weight!,
      reps: s.reps!,
    }));

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <Link href="/">
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
        <h1 className="text-lg font-bold">Analytics</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <p className="text-sm text-muted-foreground">
          Charts and trends from your training data. More sections coming soon.
        </p>

        <HardSetsChart sets={hardSetsData} />

        <VolumeTrendChart sets={volumeData} />

        <FrequencyChart dates={workoutDates} />

        <Card>
          <CardContent className="py-6 text-center text-muted-foreground text-sm">
            <p className="font-medium text-foreground">Imbalance Ratios</p>
            <p className="mt-1">Coming soon</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
