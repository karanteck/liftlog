"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Home, Dumbbell, Clock, BarChart3, Menu } from "lucide-react";
import { useKeyboardOpen } from "@/lib/use-keyboard-open";

export function BottomNav() {
  const pathname = usePathname();
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const keyboardOpen = useKeyboardOpen();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("workouts")
        .select("id")
        .eq("user_id", user.id)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          setActiveWorkoutId(data?.id ?? null);
        });
    });
  }, [pathname]);

  const tabs = [
    { href: "/", label: "Home", icon: Home, match: "/" },
    { href: activeWorkoutId ? `/workout/${activeWorkoutId}` : "/workout/new", label: "Workout", icon: Dumbbell, match: "/workout" },
    { href: "/history", label: "History", icon: Clock, match: "/history" },
    { href: "/analytics", label: "Analytics", icon: BarChart3, match: "/analytics" },
    { href: "/more", label: "More", icon: Menu, match: "/more" },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t bg-background backdrop-blur safe-bottom pb-3 transition-all duration-200 ${keyboardOpen ? "translate-y-full opacity-0 pointer-events-none" : ""}`}>
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive =
            tab.match === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.match);

          return (
            <Link
              key={tab.match}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-7 w-7" />
              <span className="text-xs font-medium">{tab.label}</span>
              {tab.match === "/workout" && activeWorkoutId && (
                <span className="absolute top-1.5 right-1 h-2.5 w-2.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
