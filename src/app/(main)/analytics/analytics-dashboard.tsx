"use client";

import { useEffect, useState, useMemo } from "react";
import { usePowerSyncDb } from "@/components/powersync-provider";
import { HardSetsChart } from "@/components/hard-sets-chart";
import { VolumeTrendChart } from "@/components/volume-trend-chart";
import { FrequencyChart } from "@/components/frequency-chart";
import { ImbalanceChart } from "@/components/imbalance-chart";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const RANGE_OPTIONS = [
  { value: "12w", label: "12 weeks", days: 84 },
  { value: "26w", label: "6 months", days: 182 },
  { value: "52w", label: "1 year", days: 365 },
];

type RawSet = {
  date: string;
  muscle_group: string;
  movement_pattern: string;
  weight: number | null;
  reps: number | null;
};

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="px-4 py-3 border-b">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Analytics</h1>
          <Skeleton className="h-9 w-56 rounded-lg" />
        </div>
      </header>
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4 px-4 space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}

function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export function AnalyticsDashboard({ userId }: { userId: string }) {
  const db = usePowerSyncDb();
  const [allSets, setAllSets] = useState<RawSet[] | null>(null);
  const [allWorkoutDates, setAllWorkoutDates] = useState<string[] | null>(null);
  const [activeRange, setActiveRange] = useState("12w");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const maxCutoff = cutoffDate(365);

    Promise.all([
      db.getAll<{
        date: string;
        muscle_group: string;
        movement_pattern: string;
        weight: number | null;
        reps: number | null;
      }>(
        `SELECT w.date, e.muscle_group, e.movement_pattern, s.weight, s.reps
         FROM sets s
         JOIN exercises e ON s.exercise_id = e.id
         JOIN workouts w ON s.workout_id = w.id
         WHERE s.is_warmup = 0
           AND w.user_id = ?
           AND w.date >= ?`,
        [userId, maxCutoff]
      ),
      db.getAll<{ date: string }>(
        `SELECT DISTINCT date FROM workouts
         WHERE user_id = ? AND ended_at IS NOT NULL AND date >= ?
         ORDER BY date`,
        [userId, maxCutoff]
      ),
    ]).then(([sets, workouts]) => {
      setAllSets(sets);
      setAllWorkoutDates(workouts.map((w) => w.date));
      setLoading(false);
    });
  }, [db, userId]);

  const rangeOption =
    RANGE_OPTIONS.find((r) => r.value === activeRange) ?? RANGE_OPTIONS[0];
  const cutoff = cutoffDate(rangeOption.days);

  const { hardSetsData, volumeData, imbalanceData, workoutDates } = useMemo(() => {
    if (!allSets || !allWorkoutDates) {
      return { hardSetsData: [], volumeData: [], imbalanceData: [], workoutDates: [] };
    }

    const filtered = allSets.filter((s) => s.date >= cutoff);

    return {
      hardSetsData: filtered.map((s) => ({
        date: s.date,
        muscleGroup: s.muscle_group,
      })),
      volumeData: filtered
        .filter((s) => s.weight != null && s.weight > 0 && s.reps != null && s.reps > 0)
        .map((s) => ({
          date: s.date,
          muscleGroup: s.muscle_group,
          weight: s.weight!,
          reps: s.reps!,
        })),
      imbalanceData: filtered.map((s) => ({
        date: s.date,
        movementPattern: s.movement_pattern,
      })),
      workoutDates: allWorkoutDates.filter((d) => d >= cutoff),
    };
  }, [allSets, allWorkoutDates, cutoff]);

  if (loading) return <AnalyticsSkeleton />;

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="px-4 py-3 border-b">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Analytics</h1>
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            {RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={activeRange === opt.value ? "secondary" : "ghost"}
                size="sm"
                className="h-9 text-sm px-3"
                onClick={() => setActiveRange(opt.value)}
              >
                {opt.label}
              </Button>
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
