"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase
      .from("workouts")
      .delete()
      .eq("id", workoutId);

    if (error) {
      alert("Failed to delete: " + error.message);
      setDeleting(false);
      setConfirming(false);
      return;
    }

    router.push("/history");
    router.refresh();
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
