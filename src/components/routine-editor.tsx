"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { ExercisePicker } from "@/components/exercise-picker";

type RoutineExercise = {
  routineExerciseId: string | null;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  repTier: string;
  position: number;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
};

const REP_RANGES: Record<string, [number, number]> = {
  heavy_compound: [5, 8],
  compound: [8, 12],
  isolation: [10, 15],
  small_isolation: [12, 20],
};

export function RoutineEditor({
  routineId,
  initialName,
  initialExercises,
  isNew,
}: {
  routineId: string;
  initialName: string;
  initialExercises: RoutineExercise[];
  isNew: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(initialName);
  const [exercises, setExercises] = useState<RoutineExercise[]>(initialExercises);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameEdited, setNameEdited] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const moveUp = useCallback((idx: number) => {
    if (idx === 0) return;
    setExercises((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((e, i) => ({ ...e, position: i + 1 }));
    });
  }, []);

  const moveDown = useCallback(
    (idx: number) => {
      setExercises((prev) => {
        if (idx >= prev.length - 1) return prev;
        const next = [...prev];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        return next.map((e, i) => ({ ...e, position: i + 1 }));
      });
    },
    []
  );

  const removeExercise = useCallback((idx: number) => {
    setExercises((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((e, i) => ({ ...e, position: i + 1 }));
    });
  }, []);

  const addExercise = useCallback(
    (exercise: { id: string; name: string; muscleGroup: string; repTier: string }) => {
      const [repMin, repMax] = REP_RANGES[exercise.repTier] ?? [8, 12];
      setExercises((prev) => [
        ...prev,
        {
          routineExerciseId: null,
          exerciseId: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          repTier: exercise.repTier,
          position: prev.length + 1,
          targetSets: 3,
          targetRepMin: repMin,
          targetRepMax: repMax,
        },
      ]);
      setShowPicker(false);
    },
    []
  );

  const updateTarget = useCallback(
    (idx: number, field: "targetSets" | "targetRepMin" | "targetRepMax", value: string) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 0) return;
      setExercises((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: num };
        return next;
      });
    },
    []
  );

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Routine name is required.");
      return;
    }

    setSaving(true);

    if (nameEdited || isNew) {
      const { error } = await supabase
        .from("routines")
        .update({ name: name.trim() })
        .eq("id", routineId);

      if (error) {
        toast.error("Failed to save name: " + error.message);
        setSaving(false);
        return;
      }
    }

    const { error: deleteError } = await supabase
      .from("routine_exercises")
      .delete()
      .eq("routine_id", routineId);

    if (deleteError) {
      toast.error("Failed to update exercises: " + deleteError.message);
      setSaving(false);
      return;
    }

    if (exercises.length > 0) {
      const rows = exercises.map((e, i) => ({
        routine_id: routineId,
        exercise_id: e.exerciseId,
        position: i + 1,
        target_sets: e.targetSets,
        target_rep_min: e.targetRepMin,
        target_rep_max: e.targetRepMax,
      }));

      const { error: insertError } = await supabase
        .from("routine_exercises")
        .insert(rows);

      if (insertError) {
        toast.error("Failed to save exercises: " + insertError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.push("/routines");
    router.refresh();
  }

  return (
    <div className="space-y-4 pb-24">
      <div>
        <label className="text-sm font-medium block mb-1">Routine name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameEdited(true);
          }}
          className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
          placeholder="e.g. Push Day 1"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Exercises ({exercises.length})
        </p>

        {exercises.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No exercises yet. Tap &ldquo;Add exercise&rdquo; below.
          </p>
        )}

        {exercises.map((ex, idx) => (
          <Card key={`${ex.exerciseId}-${idx}`}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{ex.name}</p>
                  <Badge variant="outline" className="text-[10px] mt-0.5">
                    {ex.muscleGroup}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="w-7 h-7 rounded border flex items-center justify-center disabled:opacity-30 hover:bg-accent"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === exercises.length - 1}
                    className="w-7 h-7 rounded border flex items-center justify-center disabled:opacity-30 hover:bg-accent"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeExercise(idx)}
                    className="w-7 h-7 rounded border flex items-center justify-center text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {editingIdx === idx ? (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground block">
                      Sets
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ex.targetSets}
                      onChange={(e) =>
                        updateTarget(idx, "targetSets", e.target.value)
                      }
                      className="h-8 w-full rounded border bg-transparent px-2 text-sm text-center tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block">
                      Min reps
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ex.targetRepMin}
                      onChange={(e) =>
                        updateTarget(idx, "targetRepMin", e.target.value)
                      }
                      className="h-8 w-full rounded border bg-transparent px-2 text-sm text-center tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block">
                      Max reps
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ex.targetRepMax}
                      onChange={(e) =>
                        updateTarget(idx, "targetRepMax", e.target.value)
                      }
                      className="h-8 w-full rounded border bg-transparent px-2 text-sm text-center tabular-nums"
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setEditingIdx(idx)}
                  className="text-xs text-muted-foreground hover:text-foreground mt-1"
                >
                  {ex.targetSets} sets &middot; {ex.targetRepMin}–
                  {ex.targetRepMax} reps &middot; tap to edit
                </button>
              )}
            </CardContent>
          </Card>
        ))}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowPicker(true)}
        >
          + Add exercise
        </Button>
      </div>

      <Button
        className="w-full h-12 text-base"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save routine"}
      </Button>

      {showPicker && (
        <ExercisePicker
          excludeIds={exercises.map((e) => e.exerciseId)}
          onSelect={addExercise}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
