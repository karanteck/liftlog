import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BodyweightTracker } from "@/components/bodyweight-tracker";

export default async function BodyweightPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: entries } = await supabase
    .from("bodyweight_log")
    .select("id, date, weight")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(90);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <Link href="/">
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
        <h1 className="text-lg font-bold">Bodyweight</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        <BodyweightTracker
          userId={user.id}
          initialEntries={
            entries?.map((e) => ({
              id: e.id,
              date: e.date,
              weight: Number(e.weight),
            })) ?? []
          }
        />
      </main>
    </div>
  );
}
