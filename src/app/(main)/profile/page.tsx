import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  ListChecks,
  Scale,
  Calculator,
  Shield,
  ChevronRight,
} from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, is_admin")
    .eq("id", user.id)
    .single();

  const links = [
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/routines", label: "Routines", icon: ListChecks },
    { href: "/bodyweight", label: "Bodyweight", icon: Scale },
    { href: "/plates", label: "Plate Calculator", icon: Calculator },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="px-4 py-4 border-b">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{profile?.name ?? "Profile"}</h1>
            <p className="text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:bg-accent/50 transition-colors">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <link.icon className="h-6 w-6 text-muted-foreground" />
                  <span className="font-medium">{link.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}

        {profile?.is_admin && (
          <Link href="/admin">
            <Card className="hover:bg-accent/50 transition-colors">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-muted-foreground" />
                  <span className="font-medium">Admin Panel</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}

        <div className="pt-4">
          <SignOutButton className="w-full" variant="outline" />
        </div>
      </main>
    </div>
  );
}
