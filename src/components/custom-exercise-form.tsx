"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const MUSCLE_GROUPS = [
  "chest", "back", "shoulders", "biceps", "triceps",
  "quads", "hamstrings", "glutes", "calves", "abs", "forearms",
];

const EQUIPMENT = [
  "barbell", "dumbbell", "cable", "machine", "smith machine",
  "bodyweight", "kettlebell", "resistance band", "EZ bar",
];

const MOVEMENT_PATTERNS = [
  "horizontal press", "vertical press", "horizontal pull", "vertical pull",
  "hip hinge", "squat", "lunge", "elbow flexion", "elbow extension",
  "lateral raise", "fly", "leg extension", "leg curl", "calf raise",
  "core", "carry", "rotation",
];

const TRACKING_TYPES = [
  { value: "weight_reps", label: "Weight + reps" },
  { value: "bodyweight_reps", label: "Bodyweight + reps" },
  { value: "reps_only", label: "Reps only" },
  { value: "time", label: "Duration" },
  { value: "distance_time", label: "Distance + time" },
];

const REP_TIERS = [
  { value: "heavy_compound", label: "Heavy compound (5-8 reps)" },
  { value: "compound", label: "Compound (8-12 reps)" },
  { value: "isolation", label: "Isolation (10-15 reps)" },
  { value: "small_isolation", label: "Small isolation (12-20 reps)" },
];

type Exercise = {
  id: string;
  name: string;
  aliases: string[];
  muscle_group: string;
  equipment: string;
  default_rep_tier: string;
};

export function CustomExerciseForm({
  onCreated,
  onClose,
}: {
  onCreated: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("chest");
  const [equipment, setEquipment] = useState("machine");
  const [movementPattern, setMovementPattern] = useState("horizontal press");
  const [trackingType, setTrackingType] = useState("weight_reps");
  const [repTier, setRepTier] = useState("compound");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      alert("Exercise name is required.");
      return;
    }

    setSaving(true);

    const userId = (await supabase.auth.getUser()).data.user!.id;

    const { data, error } = await supabase
      .from("exercises")
      .insert({
        name: name.trim(),
        aliases: [],
        muscle_group: muscleGroup,
        secondary_muscles: [],
        equipment,
        movement_pattern: movementPattern,
        tracking_type: trackingType,
        default_rep_tier: repTier,
        is_custom: true,
        owner_id: userId,
      })
      .select("id, name, aliases, muscle_group, equipment, default_rep_tier")
      .single();

    if (error || !data) {
      alert("Failed to create: " + (error?.message ?? "unknown error"));
      setSaving(false);
      return;
    }

    onCreated(data);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <h1 className="text-lg font-bold">New Exercise</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-lg mx-auto w-full">
        <div>
          <label className="text-sm font-medium block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cable crunch"
            className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
            autoFocus
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Muscle group</label>
          <select
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value)}
            className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {MUSCLE_GROUPS.map((mg) => (
              <option key={mg} value={mg}>
                {mg.charAt(0).toUpperCase() + mg.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Equipment</label>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {EQUIPMENT.map((eq) => (
              <option key={eq} value={eq}>
                {eq.charAt(0).toUpperCase() + eq.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">
            Movement pattern
          </label>
          <select
            value={movementPattern}
            onChange={(e) => setMovementPattern(e.target.value)}
            className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {MOVEMENT_PATTERNS.map((mp) => (
              <option key={mp} value={mp}>
                {mp.charAt(0).toUpperCase() + mp.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">
            What do you log?
          </label>
          <select
            value={trackingType}
            onChange={(e) => setTrackingType(e.target.value)}
            className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {TRACKING_TYPES.map((tt) => (
              <option key={tt.value} value={tt.value}>
                {tt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Rep range tier</label>
          <select
            value={repTier}
            onChange={(e) => setRepTier(e.target.value)}
            className="h-10 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {REP_TIERS.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          className="w-full h-12 text-base"
          onClick={handleCreate}
          disabled={saving}
        >
          {saving ? "Creating..." : "Create exercise"}
        </Button>
      </main>
    </div>
  );
}
