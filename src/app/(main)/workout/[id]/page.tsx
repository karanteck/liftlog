import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkoutLoader } from "./workout-loader";

export default async function WorkoutPage({
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

  return <WorkoutLoader workoutId={id} userId={user.id} />;
}
