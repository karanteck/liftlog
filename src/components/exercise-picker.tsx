"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CustomExerciseForm } from "@/components/custom-exercise-form";

type Exercise = {
  id: string;
  name: string;
  aliases: string[];
  muscle_group: string;
  equipment: string;
  default_rep_tier: string;
};

const MUSCLE_GROUPS = [
  "all",
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "forearms",
];

const EQUIPMENT_OPTIONS = [
  { value: "all", label: "All equip." },
  { value: "barbell", label: "Barbell" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "cable", label: "Cable" },
  { value: "machine", label: "Machine" },
  { value: "bodyweight", label: "Bodyweight" },
  { value: "smith_machine", label: "Smith machine" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "ez_bar", label: "EZ bar" },
  { value: "resistance_band", label: "Resistance band" },
];

export function ExercisePicker({
  excludeIds,
  onSelect,
  onClose,
}: {
  excludeIds: string[];
  onSelect: (exercise: {
    id: string;
    name: string;
    muscleGroup: string;
    repTier: string;
  }) => void;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showCustomForm, setShowCustomForm] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("exercises")
        .select("id, name, aliases, muscle_group, equipment, default_rep_tier")
        .order("name");

      setExercises(data ?? []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const filtered = useMemo(() => {
    let list = exercises.filter((e) => !excludeIds.includes(e.id));

    if (muscleFilter !== "all") {
      list = list.filter((e) => e.muscle_group === muscleFilter);
    }

    if (equipmentFilter !== "all") {
      list = list.filter((e) => e.equipment === equipmentFilter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.muscle_group.toLowerCase().includes(q) ||
          e.equipment.toLowerCase().includes(q) ||
          e.aliases.some((a) => a.toLowerCase().includes(q))
      );
    }

    return list;
  }, [exercises, excludeIds, query, muscleFilter, equipmentFilter]);

  function handleCustomCreated(exercise: Exercise) {
    setExercises((prev) => [...prev, exercise]);
    setShowCustomForm(false);
    onSelect({
      id: exercise.id,
      name: exercise.name,
      muscleGroup: exercise.muscle_group,
      repTier: exercise.default_rep_tier,
    });
  }

  if (showCustomForm) {
    return (
      <CustomExerciseForm
        onCreated={handleCustomCreated}
        onClose={() => setShowCustomForm(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <header className="border-b">
        <div className="flex items-center gap-2 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Input
            autoFocus
            placeholder="Search exercises..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
        </div>
        <div className="flex gap-1.5 px-4 pb-1.5 overflow-x-auto">
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg}
              onClick={() => setMuscleFilter(mg)}
              className={`shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                muscleFilter === mg
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {mg === "all" ? "All" : mg.charAt(0).toUpperCase() + mg.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto">
          {EQUIPMENT_OPTIONS.map((eq) => (
            <button
              key={eq.value}
              onClick={() => setEquipmentFilter(eq.value)}
              className={`shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                equipmentFilter === eq.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {eq.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-2">
        {loading && (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No exercises found.</p>
            <Button
              variant="link"
              className="mt-2 text-sm"
              onClick={() => setShowCustomForm(true)}
            >
              Create a custom exercise
            </Button>
          </div>
        )}

        {filtered.map((e) => (
          <button
            key={e.id}
            onClick={() =>
              onSelect({
                id: e.id,
                name: e.name,
                muscleGroup: e.muscle_group,
                repTier: e.default_rep_tier,
              })
            }
            className="w-full text-left py-2.5 px-2 rounded hover:bg-accent active:bg-accent flex items-center justify-between"
          >
            <div className="min-w-0">
              <span className="text-sm font-medium block">{e.name}</span>
              <span className="text-[11px] text-muted-foreground">
                {e.equipment}
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
              {e.muscle_group}
            </Badge>
          </button>
        ))}

        {!loading && filtered.length > 0 && (
          <div className="py-4 text-center">
            <Button
              variant="link"
              className="text-sm"
              onClick={() => setShowCustomForm(true)}
            >
              Can&apos;t find it? Create a custom exercise
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
