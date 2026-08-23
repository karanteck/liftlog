"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

export function RestTimer({
  duration,
  onDismiss,
}: {
  duration: number;
  onDismiss: () => void;
}) {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    if (remaining <= 0) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      return;
    }
    const t = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  const mins = Math.floor(Math.abs(remaining) / 60);
  const secs = Math.abs(remaining) % 60;
  const display = `${remaining < 0 ? "+" : ""}${mins}:${secs.toString().padStart(2, "0")}`;
  const progress = Math.max(0, remaining / duration);
  const done = remaining <= 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card px-4 py-3 safe-bottom">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground font-medium">
                {done ? "Rest complete" : "Rest timer"}
              </span>
              <span
                className={`text-lg font-mono font-bold tabular-nums ${done ? "text-green-500" : ""}`}
              >
                {display}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${done ? "bg-green-500" : "bg-primary"}`}
                style={{ width: `${(1 - progress) * 100}%` }}
              />
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
