import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExerciseDetail } from "./exercise-detail";

export default async function ExerciseHistoryPage({
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

  return <ExerciseDetail exerciseId={id} userId={user.id} />;
}
