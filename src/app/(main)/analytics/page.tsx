import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HardSetsChart } from "@/components/hard-sets-chart";
import { VolumeTrendChart } from "@/components/volume-trend-chart";
import { FrequencyChart } from "@/components/frequency-chart";
import { ImbalanceChart } from "@/components/imbalance-chart";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";

const RANGE_OPTIONS = [
  { value: "12w", label: "12 weeks", days: 84 },
  { value: "26w", label: "6 months", days: 182 },
  { value: "52w", label: "1 year", days: 365 },
  { value: "all", label: "All time", days: null },
];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const activeRange = range ?? "12w";
  const rangeOption = RANGE_OPTIONS.find((r) => r.value === activeRange) ?? RANGE_OPTIONS[0];

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let setsQuery = supabase
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

  if (rangeOption.days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeOption.days);
    setsQuery = setsQuery.gte("workouts.date", cutoff.toISOString().split("T")[0]);
  }

  const { data: rawSets } = await setsQuery;

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

  let workoutsQuery = supabase
    .from("workouts")
    .select("date")
    .eq("user_id", user.id)
    .not("ended_at", "is", null);

  if (rangeOption.days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeOption.days);
    workoutsQuery = workoutsQuery.gte("date", cutoff.toISOString().split("T")[0]);
  }

  const { data: workouts } = await workoutsQuery;

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
    <div className="flex flex-col min-h-screen pb-24">
      <header className="px-4 py-3 border-b">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Analytics</h1>
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            {RANGE_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={`/analytics?range=${opt.value}`}
                replace
              >
                <Button
                  variant={activeRange === opt.value ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2"
                >
                  {opt.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <ErrorBoundary>
          <HardSetsChart sets={hardSetsData} />
        </ErrorBoundary>

        <ErrorBoundary>
          <VolumeTrendChart sets={volumeData} />
        </ErrorBoundary>

        <ErrorBoundary>
          <FrequencyChart dates={workoutDates} />
        </ErrorBoundary>

        <ErrorBoundary>
          <ImbalanceChart sets={imbalanceData} />
        </ErrorBoundary>
      </main>
    </div>
  );
}
