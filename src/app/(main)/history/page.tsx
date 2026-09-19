import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HistoryDashboard } from "./history-dashboard";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <HistoryDashboard userId={user.id} />;
}
