"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Exercise = {
  id: string;
  name: string;
  aliases: string[];
  muscle_group: string;
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

export function ExerciseSearch({
  excludeIds,
  userId,
  onSelect,
  onClose,
}: {
  excludeIds: string[];
  userId: string;
  onSelect: (exercise: {
    id: string;
    name: string;
    repTier: string;
    trackingType: string;
  }) => void;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: allExercises }, { data: recentSets }] = await Promise.all([
        supabase
          .from("exercises")
          .select("id, name, aliases, muscle_group, default_rep_tier, tracking_type")
          .order("name"),
        supabase
          .from("sets")
          .select(
            `
            exercise_id,
            workouts!inner (
              user_id,
              date
            )
          `
          )
          .order("created_at", { ascending: false })
          .limit(200),
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

      setLoading(false);
    }
    load();
  }, [supabase, userId]);

  const filtered = useMemo(() => {
    const available = exercises.filter((e) => !excludeIds.includes(e.id));
    if (!query.trim()) return available;

    const q = query.toLowerCase();
    return available.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.muscle_group.toLowerCase().includes(q) ||
        e.aliases.some((a) => a.toLowerCase().includes(q))
    );
  }, [exercises, excludeIds, query]);

  const recentExercises = useMemo(() => {
    if (query.trim()) return [];
    return recentIds
      .map((id) => filtered.find((e) => e.id === id))
      .filter(Boolean) as Exercise[];
  }, [recentIds, filtered, query]);

  const grouped = useMemo(() => {
    const nonRecent = query.trim()
      ? filtered
      : filtered.filter((e) => !recentIds.includes(e.id));

    const groups: Record<string, Exercise[]> = {};
    for (const e of nonRecent) {
      if (!groups[e.muscle_group]) groups[e.muscle_group] = [];
      groups[e.muscle_group].push(e);
    }

    return MUSCLE_GROUP_ORDER.filter((mg) => groups[mg]?.length)
      .map((mg) => ({ muscleGroup: mg, exercises: groups[mg] }));
  }, [filtered, recentIds, query]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <header className="flex items-center gap-2 px-4 py-3 border-b">
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
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-2">
        {loading && (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No exercises found.
          </p>
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
                onSelect={() =>
                  onSelect({
                    id: e.id,
                    name: e.name,
                    repTier: e.default_rep_tier,
                    trackingType: e.tracking_type,
                  })
                }
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
                onSelect={() =>
                  onSelect({
                    id: e.id,
                    name: e.name,
                    repTier: e.default_rep_tier,
                    trackingType: e.tracking_type,
                  })
                }
              />
            ))}
          </div>
        ))}
      </main>
    </div>
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
      <span className="text-sm font-medium">{exercise.name}</span>
      <Badge variant="outline" className="text-[10px] shrink-0">
        {exercise.muscle_group}
      </Badge>
    </button>
  );
}
