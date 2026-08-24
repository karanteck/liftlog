"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const CIRCLE_SIZE = 120;
const STROKE_WIDTH = 6;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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
    }
    const t = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  const done = remaining <= 0;
  const progress = done ? 0 : remaining / duration;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const absRemaining = Math.abs(remaining);
  const mins = Math.floor(absRemaining / 60);
  const secs = absRemaining % 60;
  const display = `${done ? "+" : ""}${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card safe-bottom">
      <div className="max-w-lg mx-auto flex flex-col items-center py-5 gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {done ? "Rest complete" : "Rest"}
        </span>
        <div className={`relative ${done ? "animate-[rest-done-pulse_1s_ease-in-out_infinite]" : ""}`} style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
          <svg
            width={CIRCLE_SIZE}
            height={CIRCLE_SIZE}
            viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}
            className="-rotate-90"
          >
            <circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              fill="none"
              className="stroke-muted"
              strokeWidth={STROKE_WIDTH}
            />
            <circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              fill="none"
              className={done ? "stroke-green-500" : "stroke-primary"}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`text-2xl font-mono font-bold tabular-nums ${done ? "text-green-500" : "text-foreground"}`}
            >
              {display}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-sm h-11 px-6"
          onClick={onDismiss}
        >
          {done ? "Dismiss" : "Skip"}
        </Button>
      </div>
    </div>
  );
}
