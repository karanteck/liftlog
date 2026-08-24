import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { RoutineList } from "@/components/routine-list";

export default async function RoutinesPage() {
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
        id
      )
    `
    )
    .eq("user_id", user.id)
    .order("name");

  const formatted =
    routines?.map((r) => ({
      id: r.id,
      name: r.name,
      lastPerformedAt: r.last_performed_at,
      exerciseCount: (r.routine_exercises as unknown as { id: string }[])
        ?.length ?? 0,
    })) ?? [];

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <h1 className="text-lg font-bold">Routines</h1>
        <Link href="/routines/new">
          <Button size="sm">New routine</Button>
        </Link>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        <RoutineList routines={formatted} />
      </main>
    </div>
  );
}
