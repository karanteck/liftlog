"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "strongboi_rest_timer";
const STALE_BUFFER = 300;

type TimerState = {
  duration: number;
  setDbId: string;
  startedAt: number;
};

type RestTimerContextValue = {
  timerState: TimerState | null;
  startTimer: (duration: number, setDbId: string) => void;
  dismissTimer: () => void;
};

const RestTimerContext = createContext<RestTimerContextValue>({
  timerState: null,
  startTimer: () => {},
  dismissTimer: () => {},
});

export function useRestTimer() {
  return useContext(RestTimerContext);
}

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved: TimerState = JSON.parse(raw);
      const elapsed = (Date.now() - saved.startedAt) / 1000;
      if (elapsed < saved.duration + STALE_BUFFER) {
        setTimerState(saved);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const startTimer = useCallback((duration: number, setDbId: string) => {
    const state: TimerState = { duration, setDbId, startedAt: Date.now() };
    setTimerState(state);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, []);

  const dismissTimer = useCallback(() => {
    if (timerState) {
      const restSeconds = Math.round((Date.now() - timerState.startedAt) / 1000);
      supabaseRef.current
        .from("sets")
        .update({ rest_seconds: restSeconds })
        .eq("id", timerState.setDbId)
        .then();
    }
    setTimerState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, [timerState]);

  return (
    <RestTimerContext.Provider value={{ timerState, startTimer, dismissTimer }}>
      {children}
    </RestTimerContext.Provider>
  );
}
