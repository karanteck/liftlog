"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePowerSyncDb } from "@/components/powersync-provider";

type ActiveWorkoutContextValue = {
  activeWorkoutId: string | null;
  setActiveWorkoutId: (id: string | null) => void;
};

const ActiveWorkoutContext = createContext<ActiveWorkoutContextValue>({
  activeWorkoutId: null,
  setActiveWorkoutId: () => {},
});

export function useActiveWorkout() {
  return useContext(ActiveWorkoutContext);
}

export function ActiveWorkoutProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const db = usePowerSyncDb();
  const [activeWorkoutId, setActiveWorkoutIdState] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    db.getOptional<{ id: string }>(
      "SELECT id FROM workouts WHERE user_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
      [userId]
    ).then((row) => {
      setActiveWorkoutIdState(row?.id ?? null);
    });
  }, [db, userId]);

  const setActiveWorkoutId = useCallback((id: string | null) => {
    setActiveWorkoutIdState(id);
  }, []);

  return (
    <ActiveWorkoutContext.Provider value={{ activeWorkoutId, setActiveWorkoutId }}>
      {children}
    </ActiveWorkoutContext.Provider>
  );
}
