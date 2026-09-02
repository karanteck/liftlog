"use client";

import { useRestTimer } from "@/components/rest-timer-provider";
import { RestTimer } from "@/components/rest-timer";

export function LayoutRestTimer() {
  const { timerState, dismissTimer } = useRestTimer();

  if (!timerState) return null;

  return (
    <RestTimer
      key={timerState.startedAt}
      duration={timerState.duration}
      startedAt={timerState.startedAt}
      onDismiss={dismissTimer}
    />
  );
}
