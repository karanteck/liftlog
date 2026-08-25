import { describe, it, expect } from "vitest";
import {
  detectStrengthStall,
  detectMissedTargets,
  detectVolumeRegression,
  detectUnderStimulus,
  detectExerciseStaleness,
  detectRPECreep,
  type ExerciseHistory,
  type WeeklyMuscleVolume,
  type DismissedAlert,
} from "./plateau";

function makeExercise(
  overrides: Partial<ExerciseHistory> = {}
): ExerciseHistory {
  return {
    exerciseId: "ex-1",
    exerciseName: "Bench Press",
    movementPattern: "horizontal_press",
    muscleGroup: "chest",
    targetRepMin: 8,
    targetRepMax: 12,
    sessions: [],
    ...overrides,
  };
}

function makeSessions(
  count: number,
  weightReps: { weight: number; reps: number; rpe?: number }[],
  startWeeksAgo = 12
): ExerciseHistory["sessions"] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (startWeeksAgo - i) * 7);
    return {
      workoutDate: date.toISOString().split("T")[0],
      workingSets: weightReps.map((wr) => ({
        weight: wr.weight,
        reps: wr.reps,
        rpe: wr.rpe ?? null,
      })),
    };
  });
}

const noDismissed: DismissedAlert[] = [];

describe("detectStrengthStall", () => {
  it("returns null with fewer than 6 sessions", () => {
    const ex = makeExercise({
      sessions: makeSessions(5, [{ weight: 80, reps: 8 }]),
    });
    expect(detectStrengthStall(ex, noDismissed)).toBeNull();
  });

  it("returns null when e1RM is improving", () => {
    const sessions = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (8 - i) * 7);
      return {
        workoutDate: date.toISOString().split("T")[0],
        workingSets: [{ weight: 80 + i * 5, reps: 8, rpe: null }],
      };
    });
    const ex = makeExercise({ sessions });
    expect(detectStrengthStall(ex, noDismissed)).toBeNull();
  });

  it("detects stall when latest 3 sessions are worse than prior 3", () => {
    const sessions = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (8 - i) * 7);
      const weight = i < 3 ? 100 : 90;
      return {
        workoutDate: date.toISOString().split("T")[0],
        workingSets: [{ weight, reps: 8, rpe: null }],
      };
    });
    const ex = makeExercise({ sessions });
    const alert = detectStrengthStall(ex, noDismissed);
    expect(alert).not.toBeNull();
    expect(alert!.alertType).toBe("strength_stall");
  });

  it("respects cooldown", () => {
    const sessions = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (8 - i) * 7);
      return {
        workoutDate: date.toISOString().split("T")[0],
        workingSets: [{ weight: i < 3 ? 100 : 90, reps: 8, rpe: null }],
      };
    });
    const ex = makeExercise({ sessions });
    const dismissed: DismissedAlert[] = [{
      alertType: "strength_stall",
      exerciseId: "ex-1",
      muscleGroup: null,
      dismissedAt: new Date().toISOString(),
    }];
    expect(detectStrengthStall(ex, dismissed)).toBeNull();
  });
});

describe("detectMissedTargets", () => {
  it("returns null without target rep min", () => {
    const ex = makeExercise({
      targetRepMin: null,
      sessions: makeSessions(6, [{ weight: 80, reps: 5 }]),
    });
    expect(detectMissedTargets(ex, noDismissed)).toBeNull();
  });

  it("returns null when hitting targets", () => {
    const ex = makeExercise({
      sessions: makeSessions(6, [{ weight: 80, reps: 10 }]),
    });
    expect(detectMissedTargets(ex, noDismissed)).toBeNull();
  });

  it("detects 3 consecutive sessions missing targets", () => {
    const ex = makeExercise({
      sessions: makeSessions(6, [{ weight: 80, reps: 5 }]),
    });
    const alert = detectMissedTargets(ex, noDismissed);
    expect(alert).not.toBeNull();
    expect(alert!.alertType).toBe("missed_targets");
  });
});

describe("detectVolumeRegression", () => {
  it("returns null with fewer than 3 weeks", () => {
    const data: WeeklyMuscleVolume[] = [
      { muscleGroup: "chest", weekStart: "2026-01-01", volumeLoad: 1000, hardSets: 12 },
      { muscleGroup: "chest", weekStart: "2026-01-08", volumeLoad: 500, hardSets: 6 },
    ];
    expect(detectVolumeRegression(data, "chest", noDismissed)).toBeNull();
  });

  it("detects two consecutive weeks of >15% drop", () => {
    const data: WeeklyMuscleVolume[] = [
      { muscleGroup: "chest", weekStart: "2026-01-01", volumeLoad: 1000, hardSets: 12 },
      { muscleGroup: "chest", weekStart: "2026-01-08", volumeLoad: 800, hardSets: 10 },
      { muscleGroup: "chest", weekStart: "2026-01-15", volumeLoad: 600, hardSets: 8 },
    ];
    const alert = detectVolumeRegression(data, "chest", noDismissed);
    expect(alert).not.toBeNull();
    expect(alert!.alertType).toBe("volume_regression");
  });

  it("returns null when drop is under 15%", () => {
    const data: WeeklyMuscleVolume[] = [
      { muscleGroup: "chest", weekStart: "2026-01-01", volumeLoad: 1000, hardSets: 12 },
      { muscleGroup: "chest", weekStart: "2026-01-08", volumeLoad: 900, hardSets: 11 },
      { muscleGroup: "chest", weekStart: "2026-01-15", volumeLoad: 850, hardSets: 10 },
    ];
    expect(detectVolumeRegression(data, "chest", noDismissed)).toBeNull();
  });
});

describe("detectUnderStimulus", () => {
  it("detects 3 weeks below 10 hard sets", () => {
    const data: WeeklyMuscleVolume[] = [
      { muscleGroup: "chest", weekStart: "2026-01-01", volumeLoad: 500, hardSets: 8 },
      { muscleGroup: "chest", weekStart: "2026-01-08", volumeLoad: 400, hardSets: 7 },
      { muscleGroup: "chest", weekStart: "2026-01-15", volumeLoad: 450, hardSets: 9 },
    ];
    const alert = detectUnderStimulus(data, "chest", noDismissed);
    expect(alert).not.toBeNull();
    expect(alert!.alertType).toBe("under_stimulus");
  });

  it("returns null when any week has 10+ sets", () => {
    const data: WeeklyMuscleVolume[] = [
      { muscleGroup: "chest", weekStart: "2026-01-01", volumeLoad: 500, hardSets: 8 },
      { muscleGroup: "chest", weekStart: "2026-01-08", volumeLoad: 400, hardSets: 10 },
      { muscleGroup: "chest", weekStart: "2026-01-15", volumeLoad: 450, hardSets: 9 },
    ];
    expect(detectUnderStimulus(data, "chest", noDismissed)).toBeNull();
  });
});

describe("detectExerciseStaleness", () => {
  it("returns null for short spans", () => {
    const ex = makeExercise({
      sessions: makeSessions(6, [{ weight: 80, reps: 8 }], 8),
    });
    expect(detectExerciseStaleness(ex, noDismissed, null)).toBeNull();
  });

  it("detects staleness after 10+ weeks", () => {
    const sessions = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (12 - i) * 7);
      return {
        workoutDate: date.toISOString().split("T")[0],
        workingSets: [{ weight: 80, reps: 8, rpe: null }],
      };
    });
    const ex = makeExercise({ sessions });
    const alert = detectExerciseStaleness(ex, noDismissed, null);
    expect(alert).not.toBeNull();
    expect(alert!.alertType).toBe("exercise_staleness");
  });

  it("includes suggested exercise name", () => {
    const sessions = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (12 - i) * 7);
      return {
        workoutDate: date.toISOString().split("T")[0],
        workingSets: [{ weight: 80, reps: 8, rpe: null }],
      };
    });
    const ex = makeExercise({ sessions });
    const variation = { exerciseId: "ex-2", exerciseName: "Incline Press" };
    const alert = detectExerciseStaleness(ex, noDismissed, variation);
    expect(alert!.message).toContain("Incline Press");
    expect(alert!.suggestedExerciseId).toBe("ex-2");
  });
});

describe("detectRPECreep", () => {
  it("returns null with fewer than 3 sessions", () => {
    const ex = makeExercise({
      sessions: makeSessions(2, [{ weight: 80, reps: 8, rpe: 7 }]),
    });
    expect(detectRPECreep(ex, noDismissed)).toBeNull();
  });

  it("returns null when RPE coverage is under 60%", () => {
    const sessions = makeSessions(3, [
      { weight: 80, reps: 8 },
      { weight: 80, reps: 8 },
      { weight: 80, reps: 8 },
    ]);
    const ex = makeExercise({ sessions });
    expect(detectRPECreep(ex, noDismissed)).toBeNull();
  });

  it("detects RPE creep of 1.5+ at same weight", () => {
    const sessions = [
      {
        workoutDate: new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0],
        workingSets: [{ weight: 80, reps: 8, rpe: 7 }],
      },
      {
        workoutDate: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
        workingSets: [{ weight: 80, reps: 8, rpe: 8 }],
      },
      {
        workoutDate: new Date().toISOString().split("T")[0],
        workingSets: [{ weight: 80, reps: 8, rpe: 9 }],
      },
    ];
    const ex = makeExercise({ sessions });
    const alert = detectRPECreep(ex, noDismissed);
    expect(alert).not.toBeNull();
    expect(alert!.alertType).toBe("rpe_creep");
  });

  it("returns null when weight changed", () => {
    const sessions = [
      {
        workoutDate: new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0],
        workingSets: [{ weight: 80, reps: 8, rpe: 7 }],
      },
      {
        workoutDate: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
        workingSets: [{ weight: 85, reps: 8, rpe: 8 }],
      },
      {
        workoutDate: new Date().toISOString().split("T")[0],
        workingSets: [{ weight: 90, reps: 8, rpe: 9 }],
      },
    ];
    const ex = makeExercise({ sessions });
    expect(detectRPECreep(ex, noDismissed)).toBeNull();
  });
});
