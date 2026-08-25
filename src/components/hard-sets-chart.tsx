"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useMuscleColors } from "@/lib/chart-colors";
import { getMonday, formatDateShort } from "@/lib/format";

type SetRecord = {
  date: string;
  muscleGroup: string;
};

export function HardSetsChart({ sets }: { sets: SetRecord[] }) {
  const { colors, fallback } = useMuscleColors();
  const { chartData, muscleGroups, insight } = useMemo(() => {
    const weekMap = new Map<string, Record<string, number>>();

    for (const s of sets) {
      const week = getMonday(s.date);
      if (!weekMap.has(week)) weekMap.set(week, {});
      const counts = weekMap.get(week)!;
      counts[s.muscleGroup] = (counts[s.muscleGroup] ?? 0) + 1;
    }

    const allGroups = new Set<string>();
    for (const counts of weekMap.values()) {
      for (const g of Object.keys(counts)) allGroups.add(g);
    }

    const sorted = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8);

    const data = sorted.map(([week, counts]) => ({
      week: formatDateShort(week),
      ...counts,
    }));

    const groups = Array.from(allGroups).sort();

    let insightText: string | null = null;
    if (sorted.length >= 5) {
      const mid = Math.floor(sorted.length / 2);
      const priorWeeks = sorted.slice(0, mid);
      const recentWeeks = sorted.slice(mid);
      let bestGroup = "";
      let bestPct = 0;
      let bestDir = "";
      for (const g of groups) {
        const prior = priorWeeks.reduce((s, [, c]) => s + (c[g] ?? 0), 0);
        const recent = recentWeeks.reduce((s, [, c]) => s + (c[g] ?? 0), 0);
        if (prior === 0) continue;
        const pct = Math.round(((recent - prior) / prior) * 100);
        if (Math.abs(pct) > Math.abs(bestPct)) {
          bestPct = pct;
          bestGroup = g.charAt(0).toUpperCase() + g.slice(1);
          bestDir = pct > 0 ? "up" : "down";
        }
      }
      if (bestGroup && Math.abs(bestPct) >= 10) {
        insightText = `${bestGroup} sets ${bestDir} ${Math.abs(bestPct)}% vs prior weeks`;
      }
    }

    return { chartData: data, muscleGroups: groups, insight: insightText };
  }, [sets]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          <p className="font-medium text-foreground">Hard Sets per Muscle Group</p>
          <p className="mt-1">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-3 px-2">
        <p className="text-xs font-medium text-muted-foreground mb-1 px-2">
          Weekly hard sets by muscle group
        </p>
        {insight && (
          <p className="text-sm text-muted-foreground px-2 mb-2">{insight}</p>
        )}
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={30} allowDecimals={false} />
            <Tooltip />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconSize={10}
            />
            {muscleGroups.map((g) => (
              <Bar
                key={g}
                dataKey={g}
                stackId="sets"
                fill={colors[g] ?? fallback}
                name={g.charAt(0).toUpperCase() + g.slice(1)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
