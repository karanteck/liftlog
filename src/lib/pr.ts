export type PRRecord = {
  maxWeight: number | null;
  bestE1rm: number | null;
  bestVolume: number | null;
};

export function computeE1rm(weight: number, reps: number): number | null {
  if (reps < 1 || reps > 12 || weight <= 0) return null;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function computePRs(
  sets: { weight: number | null; reps: number | null; isWarmup: boolean }[]
): PRRecord {
  let maxWeight: number | null = null;
  let bestE1rm: number | null = null;
  let bestVolume: number | null = null;

  for (const s of sets) {
    if (s.isWarmup || s.weight == null || s.weight <= 0) continue;

    if (maxWeight === null || s.weight > maxWeight) {
      maxWeight = s.weight;
    }

    if (s.reps != null && s.reps > 0) {
      const volume = s.weight * s.reps;
      if (bestVolume === null || volume > bestVolume) {
        bestVolume = volume;
      }

      const e1rm = computeE1rm(s.weight, s.reps);
      if (e1rm !== null && (bestE1rm === null || e1rm > bestE1rm)) {
        bestE1rm = e1rm;
      }
    }
  }

  return { maxWeight, bestE1rm, bestVolume };
}

export type PRType = "weight" | "e1rm" | "volume";

export function checkNewPRs(
  current: PRRecord,
  weight: number | null,
  reps: number | null
): PRType[] {
  if (weight == null || weight <= 0) return [];

  const prs: PRType[] = [];

  if (current.maxWeight === null || weight > current.maxWeight) {
    prs.push("weight");
  }

  if (reps != null && reps > 0) {
    const volume = weight * reps;
    if (current.bestVolume === null || volume > current.bestVolume) {
      prs.push("volume");
    }

    const e1rm = computeE1rm(weight, reps);
    if (e1rm !== null && (current.bestE1rm === null || e1rm > current.bestE1rm)) {
      prs.push("e1rm");
    }
  }

  return prs;
}

export const PR_LABELS: Record<PRType, string> = {
  weight: "Weight PR",
  e1rm: "1RM PR",
  volume: "Volume PR",
};
