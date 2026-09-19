import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";
import { RestTimerProvider } from "@/components/rest-timer-provider";
import { ActiveWorkoutProvider } from "@/components/active-workout-provider";
import { LayoutRestTimer } from "@/components/layout-rest-timer";
import { PowerSyncProvider } from "@/components/powersync-provider";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <PowerSyncProvider>
      <ActiveWorkoutProvider userId={user.id}>
        <RestTimerProvider>
          {children}
          <LayoutRestTimer />
          <BottomNav />
        </RestTimerProvider>
      </ActiveWorkoutProvider>
    </PowerSyncProvider>
  );
}
