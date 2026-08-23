import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoutinePicker } from "./routine-picker";

export default async function NewWorkoutPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: routines } = await supabase
    .from("routines")
    .select(
      `
      id,
      name,
      last_performed_at,
      routine_exercises (
        position,
        exercises (
          name
        )
      )
    `
    )
    .eq("user_id", user.id)
    .order("last_performed_at", { ascending: true, nullsFirst: true });

  const formatted =
    routines?.map((r) => ({
      id: r.id,
      name: r.name,
      lastPerformedAt: r.last_performed_at,
      exercises: (r.routine_exercises ?? [])
        .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
        .map((re: { exercises: unknown }) => (re.exercises as { name: string } | null)?.name ?? "")
        .filter(Boolean),
    })) ?? [];

  return <RoutinePicker routines={formatted} />;
}
