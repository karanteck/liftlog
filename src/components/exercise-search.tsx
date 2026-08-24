"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomExerciseForm } from "@/components/custom-exercise-form";

type Exercise = {
  id: string;
  name: string;
  aliases: string[];
  muscle_group: string;
  equipment: string;
  default_rep_tier: string;
  tracking_type: string;
};

const MUSCLE_GROUP_ORDER = [
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

const MUSCLE_GROUPS = ["all", ...MUSCLE_GROUP_ORDER];

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

export function ExerciseSearch({
  open,
  excludeIds,
  userId,
  onSelect,
  onClose,
}: {
  open: boolean;
  excludeIds: string[];
  userId?: string;
  onSelect: (exercise: {
    id: string;
    name: string;
    muscleGroup: string;
    repTier: string;
    trackingType: string;
  }) => void;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showCustomForm, setShowCustomForm] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setMuscleFilter("all");
    setEquipmentFilter("all");
    setShowCustomForm(false);
    setLoading(true);

    async function load() {
      const exerciseQuery = supabase
        .from("exercises")
        .select("id, name, aliases, muscle_group, equipment, default_rep_tier, tracking_type")
        .order("name");

      if (userId) {
        const recentQuery = supabase
          .from("sets")
          .select(`exercise_id, workouts!inner (user_id, date)`)
          .order("created_at", { ascending: false })
          .limit(200);

        const [{ data: allExercises }, { data: recentSets }] = await Promise.all([
          exerciseQuery,
          recentQuery,
        ]);

        setExercises(allExercises ?? []);

        if (recentSets) {
          const userSets = recentSets.filter((s) => {
            const w = s.workouts as unknown as { user_id: string };
            return w.user_id === userId;
          });
          const seen = new Set<string>();
          const recent: string[] = [];
          for (const s of userSets) {
            if (!seen.has(s.exercise_id)) {
              seen.add(s.exercise_id);
              recent.push(s.exercise_id);
            }
            if (recent.length >= 10) break;
          }
          setRecentIds(recent);
        }
      } else {
        const { data: allExercises } = await exerciseQuery;
        setExercises(allExercises ?? []);
      }

      setLoading(false);
    }
    load();
  }, [open, supabase, userId]);

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

  const hasActiveFilter =
    query.trim() !== "" || muscleFilter !== "all" || equipmentFilter !== "all";

  const recentExercises = useMemo(() => {
    if (!userId || hasActiveFilter) return [];
    return recentIds
      .map((id) => filtered.find((e) => e.id === id))
      .filter(Boolean) as Exercise[];
  }, [userId, hasActiveFilter, recentIds, filtered]);

  const grouped = useMemo(() => {
    const nonRecent =
      !userId || hasActiveFilter
        ? filtered
        : filtered.filter((e) => !recentIds.includes(e.id));

    const groups: Record<string, Exercise[]> = {};
    for (const e of nonRecent) {
      if (!groups[e.muscle_group]) groups[e.muscle_group] = [];
      groups[e.muscle_group].push(e);
    }

    return MUSCLE_GROUP_ORDER.filter((mg) => groups[mg]?.length).map((mg) => ({
      muscleGroup: mg,
      exercises: groups[mg],
    }));
  }, [filtered, recentIds, userId, hasActiveFilter]);

  function handleSelect(e: Exercise) {
    onSelect({
      id: e.id,
      name: e.name,
      muscleGroup: e.muscle_group,
      repTier: e.default_rep_tier,
      trackingType: e.tracking_type,
    });
  }

  function handleCustomCreated(exercise: Exercise) {
    setExercises((prev) => [...prev, exercise]);
    setShowCustomForm(false);
    onSelect({
      id: exercise.id,
      name: exercise.name,
      muscleGroup: exercise.muscle_group,
      repTier: exercise.default_rep_tier,
      trackingType: exercise.tracking_type,
    });
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      showSwipeHandle
    >
      <DrawerContent>
        {showCustomForm ? (
          <CustomExerciseForm
            onCreated={handleCustomCreated}
            onClose={() => setShowCustomForm(false)}
          />
        ) : (
          <>
            <header className="border-b shrink-0">
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
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      muscleFilter === mg
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mg === "all"
                      ? "All"
                      : mg.charAt(0).toUpperCase() + mg.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto">
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <button
                    key={eq.value}
                    onClick={() => setEquipmentFilter(eq.value)}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
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

            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-2">
              {loading && (
                <div className="space-y-2 py-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 px-2">
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
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

              {recentExercises.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Recently used
                  </p>
                  {recentExercises.map((e) => (
                    <ExerciseRow
                      key={e.id}
                      exercise={e}
                      onSelect={() => handleSelect(e)}
                    />
                  ))}
                </div>
              )}

              {grouped.map((g) => (
                <div key={g.muscleGroup} className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    {g.muscleGroup}
                  </p>
                  {g.exercises.map((e) => (
                    <ExerciseRow
                      key={e.id}
                      exercise={e}
                      onSelect={() => handleSelect(e)}
                    />
                  ))}
                </div>
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
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function ExerciseRow({
  exercise,
  onSelect,
}: {
  exercise: Exercise;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left py-2.5 px-2 rounded hover:bg-accent active:bg-accent flex items-center justify-between"
    >
      <div className="min-w-0">
        <span className="text-sm font-medium block">{exercise.name}</span>
        <span className="text-xs text-muted-foreground">
          {exercise.equipment}
        </span>
      </div>
      <Badge variant="outline" className="text-xs shrink-0 ml-2">
        {exercise.muscle_group}
      </Badge>
    </button>
  );
}
