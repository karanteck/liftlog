import { BottomNav } from "@/components/bottom-nav";
import { RestTimerProvider } from "@/components/rest-timer-provider";
import { LayoutRestTimer } from "@/components/layout-rest-timer";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestTimerProvider>
      {children}
      <LayoutRestTimer />
      <BottomNav />
    </RestTimerProvider>
  );
}
