"use client";

import { useTheme } from "@/components/theme-provider";

const MUSCLE_COLORS_DARK: Record<string, string> = {
  chest: "#ff6b6b",
  back: "#4ecdc4",
  shoulders: "#ffd93d",
  quads: "#6bcb77",
  hamstrings: "#4d96ff",
  glutes: "#c084fc",
  biceps: "#fb923c",
  triceps: "#67e8f9",
  abs: "#34d399",
  calves: "#f97316",
  forearms: "#94a3b8",
  core: "#a3e635",
};

const MUSCLE_COLORS_LIGHT: Record<string, string> = {
  chest: "#dc2626",
  back: "#0d9488",
  shoulders: "#ca8a04",
  quads: "#16a34a",
  hamstrings: "#2563eb",
  glutes: "#9333ea",
  biceps: "#ea580c",
  triceps: "#0891b2",
  abs: "#059669",
  calves: "#c2410c",
  forearms: "#64748b",
  core: "#65a30d",
};

export const IMBALANCE_COLORS = {
  dark: { push: "#ff6b6b", pull: "#4ecdc4", quads: "#6bcb77", hamstrings: "#4d96ff" },
  light: { push: "#dc2626", pull: "#0d9488", quads: "#16a34a", hamstrings: "#2563eb" },
} as const;

const FALLBACK = { dark: "#6b7280", light: "#9ca3af" };

export function useMuscleColors() {
  const { theme } = useTheme();
  const map = theme === "dark" ? MUSCLE_COLORS_DARK : MUSCLE_COLORS_LIGHT;
  const fallback = theme === "dark" ? FALLBACK.dark : FALLBACK.light;
  return { colors: map, fallback };
}

export function useImbalanceColors() {
  const { theme } = useTheme();
  return IMBALANCE_COLORS[theme];
}
