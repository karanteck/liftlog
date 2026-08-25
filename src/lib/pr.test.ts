import { describe, it, expect } from "vitest";
import { computeE1rm, computePRs, checkNewPRs } from "./pr";

describe("computeE1rm", () => {
  it("returns weight for 1 rep", () => {
    expect(computeE1rm(100, 1)).toBe(100);
  });

  it("uses Epley formula for 2-12 reps", () => {
    expect(computeE1rm(100, 10)).toBeCloseTo(133.33, 1);
    expect(computeE1rm(80, 5)).toBeCloseTo(93.33, 1);
  });

  it("returns null for reps > 12", () => {
    expect(computeE1rm(100, 13)).toBeNull();
  });

  it("returns null for reps < 1", () => {
    expect(computeE1rm(100, 0)).toBeNull();
  });

  it("returns null for zero weight", () => {
    expect(computeE1rm(0, 5)).toBeNull();
  });

  it("returns null for negative weight", () => {
    expect(computeE1rm(-10, 5)).toBeNull();
  });
});

describe("computePRs", () => {
  it("returns nulls for empty sets", () => {
    expect(computePRs([])).toEqual({
      maxWeight: null,
      bestE1rm: null,
      bestVolume: null,
    });
  });

  it("skips warmup sets", () => {
    const result = computePRs([
      { weight: 200, reps: 5, isWarmup: true },
      { weight: 100, reps: 5, isWarmup: false },
    ]);
    expect(result.maxWeight).toBe(100);
  });

  it("skips null/zero weight", () => {
    const result = computePRs([
      { weight: null, reps: 10, isWarmup: false },
      { weight: 0, reps: 10, isWarmup: false },
      { weight: 50, reps: 10, isWarmup: false },
    ]);
    expect(result.maxWeight).toBe(50);
  });

  it("computes correct max weight, e1rm, and volume", () => {
    const result = computePRs([
      { weight: 80, reps: 8, isWarmup: false },
      { weight: 100, reps: 3, isWarmup: false },
      { weight: 60, reps: 12, isWarmup: false },
    ]);
    expect(result.maxWeight).toBe(100);
    expect(result.bestVolume).toBe(720); // 60 * 12
    expect(result.bestE1rm).toBeCloseTo(110, 0); // 100 * (1 + 3/30)
  });
});

describe("checkNewPRs", () => {
  const current = { maxWeight: 100, bestE1rm: 120, bestVolume: 800 };

  it("detects weight PR", () => {
    const prs = checkNewPRs(current, 105, 5);
    expect(prs).toContain("weight");
  });

  it("detects volume PR", () => {
    const prs = checkNewPRs(current, 90, 10); // 900 > 800
    expect(prs).toContain("volume");
  });

  it("detects e1rm PR", () => {
    const prs = checkNewPRs(current, 100, 8); // 100 * (1 + 8/30) ≈ 126.7 > 120
    expect(prs).toContain("e1rm");
  });

  it("returns empty when no PRs", () => {
    const prs = checkNewPRs(current, 50, 5); // 250 vol, 58.3 e1rm
    expect(prs).toEqual([]);
  });

  it("returns empty for null weight", () => {
    expect(checkNewPRs(current, null, 10)).toEqual([]);
  });

  it("returns empty for zero weight", () => {
    expect(checkNewPRs(current, 0, 10)).toEqual([]);
  });

  it("detects all PRs against null baseline", () => {
    const empty = { maxWeight: null, bestE1rm: null, bestVolume: null };
    const prs = checkNewPRs(empty, 50, 5);
    expect(prs).toContain("weight");
    expect(prs).toContain("volume");
    expect(prs).toContain("e1rm");
  });
});
