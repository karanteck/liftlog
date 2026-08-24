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

type SetRecord = {
  date: string;
  muscleGroup: string;
};

function getMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}

function formatWeek(mondayStr: string): string {
  const d = new Date(mondayStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function HardSetsChart({ sets }: { sets: SetRecord[] }) {
  const { colors, fallback } = useMuscleColors();
  const { chartData, muscleGroups } = useMemo(() => {
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
      week: formatWeek(week),
      ...counts,
    }));

    const groups = Array.from(allGroups).sort();
    return { chartData: data, muscleGroups: groups };
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
        <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
          Weekly hard sets by muscle group
        </p>
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
