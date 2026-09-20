import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkoutDetail } from "./workout-detail";

export default async function WorkoutDetailPage({
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

  return <WorkoutDetail workoutId={id} userId={user.id} />;
}
