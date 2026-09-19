"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePowerSyncDb } from "@/components/powersync-provider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Routine = {
  id: string;
  name: string;
  lastPerformedAt: string | null;
  exerciseCount: number;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

export function RoutineList({ routines: initial, userId }: { routines: Routine[]; userId: string }) {
  const router = useRouter();
  const db = usePowerSyncDb();
  const [routines, setRoutines] = useState(initial);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function handleDuplicate(routine: Routine) {
    if (!db) return;
    setBusy(routine.id);

    try {
      const newId = crypto.randomUUID();
      await db.execute(
        "INSERT INTO routines (id, user_id, name) VALUES (?, ?, ?)",
        [newId, userId, `${routine.name} (Copy)`]
      );

      const exercises = await db.getAll<{
        exercise_id: string;
        position: number;
        target_sets: number;
        target_rep_min: number;
        target_rep_max: number;
      }>(
        "SELECT exercise_id, position, target_sets, target_rep_min, target_rep_max FROM routine_exercises WHERE routine_id = ? ORDER BY position",
        [routine.id]
      );

      for (const e of exercises) {
        await db.execute(
          "INSERT INTO routine_exercises (id, routine_id, exercise_id, position, target_sets, target_rep_min, target_rep_max) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [crypto.randomUUID(), newId, e.exercise_id, e.position, e.target_sets, e.target_rep_min, e.target_rep_max]
        );
      }

      setRoutines((prev) => [
        ...prev,
        {
          id: newId,
          name: `${routine.name} (Copy)`,
          lastPerformedAt: null,
          exerciseCount: exercises.length,
        },
      ]);
    } catch (e: unknown) {
      toast.error("Failed to duplicate: " + (e instanceof Error ? e.message : "unknown"));
    }
    setBusy(null);
  }

  async function handleDelete(id: string) {
    if (!db) return;
    setBusy(id);

    try {
      await db.execute("DELETE FROM routine_exercises WHERE routine_id = ?", [id]);
      await db.execute("DELETE FROM routines WHERE id = ?", [id]);
      setRoutines((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) {
      toast.error("Failed to delete: " + (e instanceof Error ? e.message : "unknown"));
    }
    setConfirmDelete(null);
    setBusy(null);
  }

  return (
    <div className="space-y-3">
      {routines.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No routines yet.</p>
          <p className="mt-1 text-sm">
            Tap &ldquo;New routine&rdquo; to create one.
          </p>
        </div>
      )}

      {routines.map((r) => (
        <Card key={r.id}>
          <CardContent className="py-3 px-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{r.name}</p>
                <p className="text-sm text-muted-foreground">
                  {r.exerciseCount}{" "}
                  {r.exerciseCount === 1 ? "exercise" : "exercises"}
                  {r.lastPerformedAt && (
                    <> &middot; Last: {timeAgo(r.lastPerformedAt)}</>
                  )}
                </p>
              </div>
            </div>

            {confirmDelete === r.id ? (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2">
                <span className="text-sm flex-1">Delete this routine?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleDelete(r.id)}
                  disabled={busy === r.id}
                >
                  {busy === r.id ? "..." : "Yes"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setConfirmDelete(null)}
                  disabled={busy === r.id}
                >
                  No
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link href={`/routines/${r.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleDuplicate(r)}
                  disabled={busy === r.id}
                >
                  {busy === r.id ? "..." : "Duplicate"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(r.id)}
                >
                  Delete
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
