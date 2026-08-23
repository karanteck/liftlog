import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, is_approved, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_approved) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold">Almost there</h1>
        <p className="mt-2 text-muted-foreground max-w-xs">
          Your account is pending approval. You'll be able to start logging
          workouts once an admin lets you in.
        </p>
        <SignOutButton className="mt-6" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <h1 className="text-lg font-bold">LiftLog</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton variant="ghost" size="sm" />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
        <p className="text-2xl font-bold">Hey {profile.name.split(" ")[0]}</p>
        <Link href="/workout/new" className="w-full max-w-xs">
          <Button className="w-full h-14 text-lg font-semibold" size="lg">
            Start Workout
          </Button>
        </Link>
        <Link href="/history" className="w-full max-w-xs">
          <Button
            className="w-full h-12 text-base"
            size="lg"
            variant="outline"
          >
            History
          </Button>
        </Link>
      </main>

      <footer className="px-4 py-3 border-t text-center flex justify-center gap-4">
        {profile.is_admin && (
          <Link
            href="/admin"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Admin panel
          </Link>
        )}
      </footer>
    </div>
  );
}
