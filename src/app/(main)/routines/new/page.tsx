import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { RoutineEditor } from "@/components/routine-editor";

export default async function NewRoutinePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: routine, error } = await supabase
    .from("routines")
    .insert({ user_id: user.id, name: "New Routine" })
    .select("id, name")
    .single();

  if (error || !routine) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-destructive">
          Failed to create routine: {error?.message ?? "unknown error"}
        </p>
        <Link href="/routines" className="mt-4">
          <Button variant="outline">Back to routines</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <Link href="/routines">
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
        <h1 className="text-lg font-bold">New Routine</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        <RoutineEditor
          routineId={routine.id}
          initialName={routine.name}
          initialExercises={[]}
          isNew={true}
        />
      </main>
    </div>
  );
}
