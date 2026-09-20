import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoutineDetail } from "./routine-detail";

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

  return <RoutineDetail routineId={id} userId={user.id} />;
}
