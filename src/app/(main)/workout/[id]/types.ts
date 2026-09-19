export type ExerciseInfo = {
  exerciseId: string;
  name: string;
  repTier: string;
  trackingType: string;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  position: number;
};

export type PrevSet = {
  weight: number | null;
  reps: number | null;
  rpe: number | null;
};

export type ExistingSet = {
  id: string;
  exerciseId: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup: boolean;
};

export type SetState = {
  dbId: string | null;
  setNumber: number;
  weight: string;
  reps: string;
  rpe: string;
  duration: string;
  distance: string;
  isWarmup: boolean;
  isCompleted: boolean;
};

export type ProgressionPrompt = {
  previousWeight: number;
  suggestedWeight: number;
  summary: string;
};

export type ExerciseState = {
  exerciseId: string;
  name: string;
  repTier: string;
  trackingType: string;
  targetRepMin: number;
  targetRepMax: number;
  sets: SetState[];
  previousSets: PrevSet[];
  progressionPrompt: ProgressionPrompt | null;
};
