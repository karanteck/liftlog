"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, CircleCheckBig } from "lucide-react";
import { PR_LABELS, type PRType } from "@/lib/pr";
import type { ExerciseState } from "./types";

export function WorkoutSummary({
  exerciseStates,
  elapsed,
  sessionPRs,
}: {
  exerciseStates: ExerciseState[];
  elapsed: number;
  sessionPRs: { exerciseName: string; types: PRType[] }[];
}) {
  const router = useRouter();

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;

  const totalCompleted = exerciseStates.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.isCompleted && !s.isWarmup).length,
    0
  );

  const totalVolume = exerciseStates.reduce((sum, ex) => {
    return sum + ex.sets
      .filter((s) => s.isCompleted && !s.isWarmup)
      .reduce((setSum, s) => {
        const w = s.weight ? parseFloat(s.weight) : 0;
        const r = s.reps ? parseInt(s.reps, 10) : 0;
        return setSum + w * r;
      }, 0);
  }, 0);

  const exerciseSummaries = exerciseStates
    .filter((ex) => ex.sets.some((s) => s.isCompleted))
    .map((ex) => {
      const completedSets = ex.sets.filter((s) => s.isCompleted && !s.isWarmup);
      const topWeight = Math.max(
        0,
        ...completedSets.map((s) => (s.weight ? parseFloat(s.weight) : 0))
      );
      return {
        name: ex.name,
        setsCount: completedSets.length,
        topWeight,
        trackingType: ex.trackingType,
      };
    });

  return (
    <div className="flex min-h-screen flex-col px-4 py-8 pb-24">
      <div className="max-w-lg mx-auto w-full space-y-6">
        <div className="text-center space-y-2 pt-4">
          <CircleCheckBig className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">Workout Complete</h1>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <Card>
            <CardContent className="py-3 px-2">
              <p className="text-lg font-bold tabular-nums">
                {elapsedMin}:{elapsedSec.toString().padStart(2, "0")}
              </p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-2">
              <p className="text-lg font-bold tabular-nums">{totalCompleted}</p>
              <p className="text-xs text-muted-foreground">Working sets</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-2">
              <p className="text-lg font-bold tabular-nums">
                {totalVolume >= 1000
                  ? `${(totalVolume / 1000).toFixed(1)}t`
                  : `${Math.round(totalVolume)}kg`}
              </p>
              <p className="text-xs text-muted-foreground">Volume</p>
            </CardContent>
          </Card>
        </div>

        {sessionPRs.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <p className="font-semibold text-sm">Personal Records</p>
              </div>
              <div className="space-y-1">
                {sessionPRs.map((pr, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {pr.exerciseName} — {pr.types.map((t) => PR_LABELS[t]).join(", ")}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Exercises</p>
          {exerciseSummaries.map((ex, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 px-1 text-sm"
            >
              <span className="font-medium">{ex.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {ex.setsCount} set{ex.setsCount !== 1 ? "s" : ""}
                {ex.topWeight > 0 && ` · ${ex.topWeight}kg`}
              </span>
            </div>
          ))}
        </div>

        <Button
          className="w-full h-12 text-base"
          onClick={() => router.push("/")}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
