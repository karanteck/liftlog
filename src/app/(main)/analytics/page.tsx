import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HardSetsChart } from "@/components/hard-sets-chart";
import { VolumeTrendChart } from "@/components/volume-trend-chart";
import { FrequencyChart } from "@/components/frequency-chart";
import { ImbalanceChart } from "@/components/imbalance-chart";

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
      exercises ( muscle_group, movement_pattern ),
      workouts!inner ( date, user_id )
    `
    )
    .eq("is_warmup", false)
    .eq("workouts.user_id", user.id);

  type ParsedSet = {
    date: string;
    muscleGroup: string;
    movementPattern: string;
    weight: number | null;
    reps: number | null;
  };

  const parsedSets: ParsedSet[] = (rawSets ?? [])
    .filter((s) => {
      const ex = s.exercises as unknown as { muscle_group: string; movement_pattern: string } | null;
      const wo = s.workouts as unknown as { date: string } | null;
      return ex && wo;
    })
    .map((s) => {
      const ex = s.exercises as unknown as { muscle_group: string; movement_pattern: string };
      const wo = s.workouts as unknown as { date: string };
      return {
        date: wo.date,
        muscleGroup: ex.muscle_group,
        movementPattern: ex.movement_pattern,
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

  const imbalanceData = parsedSets.map((s) => ({
    date: s.date,
    movementPattern: s.movementPattern,
  }));

  const volumeData = parsedSets
    .filter((s) => s.weight != null && s.weight > 0 && s.reps != null && s.reps > 0)
    .map((s) => ({
      date: s.date,
      muscleGroup: s.muscleGroup,
      weight: s.weight!,
      reps: s.reps!,
    }));

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <header className="px-4 py-3 border-b">
        <h1 className="text-lg font-bold">Analytics</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <p className="text-sm text-muted-foreground">
          Charts and trends from your training data.
        </p>

        <HardSetsChart sets={hardSetsData} />

        <VolumeTrendChart sets={volumeData} />

        <FrequencyChart dates={workoutDates} />

        <ImbalanceChart sets={imbalanceData} />
      </main>
    </div>
  );
}
