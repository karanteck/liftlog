"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePowerSyncDb } from "@/components/powersync-provider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  const router = useRouter();
  const db = usePowerSyncDb();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!db) return;
    setDeleting(true);
    try {
      await db.execute("DELETE FROM sets WHERE workout_id = ?", [workoutId]);
      await db.execute("DELETE FROM workouts WHERE id = ?", [workoutId]);
      router.push("/history");
    } catch (e: unknown) {
      toast.error("Failed to delete: " + (e instanceof Error ? e.message : "unknown error"));
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setConfirming(true)}
      >
        Delete
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2">
      <span className="text-sm">Delete this workout?</span>
      <Button
        variant="destructive"
        size="sm"
        className="h-7 text-xs"
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? "Deleting..." : "Yes, delete"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={() => setConfirming(false)}
        disabled={deleting}
      >
        Cancel
      </Button>
    </div>
  );
}
