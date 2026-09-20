"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePowerSyncDb } from "@/components/powersync-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RoutineEditor } from "@/components/routine-editor";

type RoutineData = {
  routineId: string;
  name: string;
  exercises: {
    routineExerciseId: string;
    exerciseId: string;
    name: string;
    muscleGroup: string;
    repTier: string;
    position: number;
    targetSets: number;
    targetRepMin: number;
    targetRepMax: number;
  }[];
};

function RoutineSkeleton() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-5 w-36" />
        </div>
        <Skeleton className="h-9 w-16 rounded-md" />
      </header>
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-3">
        <Skeleton className="h-10 w-full rounded-md" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}

export function RoutineDetail({
  routineId,
  userId,
}: {
  routineId: string;
  userId: string;
}) {
  const db = usePowerSyncDb();
  const router = useRouter();
  const [data, setData] = useState<RoutineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    (async () => {
      const routine = await db.getOptional<{
        id: string;
        name: string;
        user_id: string;
      }>("SELECT id, name, user_id FROM routines WHERE id = ?", [routineId]);

      if (!routine || routine.user_id !== userId) {
        router.replace("/routines");
        return;
      }

      const rows = await db.getAll<{
        id: string;
        position: number;
        target_sets: number;
        target_rep_min: number;
        target_rep_max: number;
        exercise_id: string;
        exercise_name: string;
        muscle_group: string;
        default_rep_tier: string;
      }>(
        `SELECT re.id, re.position, re.target_sets, re.target_rep_min,
                re.target_rep_max, e.id AS exercise_id, e.name AS exercise_name,
                e.muscle_group, e.default_rep_tier
         FROM routine_exercises re
         JOIN exercises e ON re.exercise_id = e.id
         WHERE re.routine_id = ?
         ORDER BY re.position`,
        [routineId]
      );

      setData({
        routineId: routine.id,
        name: routine.name,
        exercises: rows.map((r) => ({
          routineExerciseId: r.id,
          exerciseId: r.exercise_id,
          name: r.exercise_name,
          muscleGroup: r.muscle_group,
          repTier: r.default_rep_tier,
          position: r.position,
          targetSets: r.target_sets,
          targetRepMin: r.target_rep_min,
          targetRepMax: r.target_rep_max,
        })),
      });
      setLoading(false);
    })();
  }, [db, routineId, userId, router]);

  if (loading || !data) return <RoutineSkeleton />;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <Link href="/routines">
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
        <h1 className="text-lg font-bold">Edit Routine</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        <RoutineEditor
          routineId={data.routineId}
          initialName={data.name}
          initialExercises={data.exercises}
          isNew={false}
        />
      </main>
    </div>
  );
}
