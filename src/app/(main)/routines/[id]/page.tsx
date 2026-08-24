import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { RoutineEditor } from "@/components/routine-editor";

export default async function EditRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: routine } = await supabase
    .from("routines")
    .select("id, name, user_id")
    .eq("id", id)
    .single();

  if (!routine) notFound();
  if (routine.user_id !== user.id) notFound();

  const { data: routineExercises } = await supabase
    .from("routine_exercises")
    .select(
      `
      id,
      position,
      target_sets,
      target_rep_min,
      target_rep_max,
      exercises (
        id,
        name,
        muscle_group,
        default_rep_tier
      )
    `
    )
    .eq("routine_id", id)
    .order("position");

  const exercises =
    routineExercises?.map((re) => {
      const ex = re.exercises as unknown as {
        id: string;
        name: string;
        muscle_group: string;
        default_rep_tier: string;
      };
      return {
        routineExerciseId: re.id,
        exerciseId: ex.id,
        name: ex.name,
        muscleGroup: ex.muscle_group,
        repTier: ex.default_rep_tier,
        position: re.position,
        targetSets: re.target_sets,
        targetRepMin: re.target_rep_min,
        targetRepMax: re.target_rep_max,
      };
    }) ?? [];

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
          routineId={routine.id}
          initialName={routine.name}
          initialExercises={exercises}
          isNew={false}
        />
      </main>
    </div>
  );
}
