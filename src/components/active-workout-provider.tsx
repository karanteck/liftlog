"use client";

import { createContext, useContext, useState, useCallback } from "react";

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
  initialId,
  children,
}: {
  initialId: string | null;
  children: React.ReactNode;
}) {
  const [activeWorkoutId, setActiveWorkoutIdState] = useState(initialId);

  const setActiveWorkoutId = useCallback((id: string | null) => {
    setActiveWorkoutIdState(id);
  }, []);

  return (
    <ActiveWorkoutContext.Provider value={{ activeWorkoutId, setActiveWorkoutId }}>
      {children}
    </ActiveWorkoutContext.Provider>
  );
}
