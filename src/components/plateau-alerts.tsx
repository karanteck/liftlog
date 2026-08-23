"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Alert = {
  id: string;
  alertType: string;
  exerciseId: string | null;
  muscleGroup: string | null;
  message: string;
  suggestedExerciseId: string | null;
  suggestedExerciseName: string | null;
  detectedAt: string;
};

const ALERT_LABELS: Record<string, string> = {
  strength_stall: "Strength Stall",
  missed_targets: "Missed Targets",
  volume_regression: "Volume Drop",
  under_stimulus: "Low Volume",
  exercise_staleness: "Swap Time",
  rpe_creep: "Fatigue",
};

const MAX_VISIBLE = 3;

export function PlateauAlerts({ alerts }: { alerts: Alert[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  if (alerts.length === 0) return null;

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const shown = expanded ? visible : visible.slice(0, MAX_VISIBLE);
  const hiddenCount = visible.length - MAX_VISIBLE;

  async function handleDismiss(alertId: string) {
    setDismissing(alertId);
    const { error } = await supabase
      .from("plateau_alerts")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", alertId);

    if (!error) {
      setDismissed((prev) => new Set(prev).add(alertId));
      router.refresh();
    }
    setDismissing(null);
  }

  return (
    <div className="w-full max-w-xs space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Insights</p>
      {shown.map((alert) => (
        <Card key={alert.id} className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 px-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  {ALERT_LABELS[alert.alertType] ?? alert.alertType}
                </p>
                <p className="text-sm mt-1 leading-snug">{alert.message}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground shrink-0"
                onClick={() => handleDismiss(alert.id)}
                disabled={dismissing === alert.id}
              >
                {dismissing === alert.id ? "..." : "Dismiss"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {!expanded && hiddenCount > 0 && (
        <button
          className="text-xs text-muted-foreground hover:text-foreground w-full text-center py-1"
          onClick={() => setExpanded(true)}
        >
          {hiddenCount} more insight{hiddenCount === 1 ? "" : "s"}
        </button>
      )}
    </div>
  );
}
