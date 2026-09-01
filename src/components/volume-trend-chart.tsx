"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { useMuscleColors } from "@/lib/chart-colors";
import { getMonday, formatDateShort } from "@/lib/format";

type SetRecord = {
  date: string;
  muscleGroup: string;
  weight: number;
  reps: number;
};

export function VolumeTrendChart({ sets }: { sets: SetRecord[] }) {
  const { colors, fallback } = useMuscleColors();
  const { chartData, muscleGroups, insight } = useMemo(() => {
    const weekMap = new Map<string, Record<string, number>>();

    for (const s of sets) {
      const week = getMonday(s.date);
      if (!weekMap.has(week)) weekMap.set(week, {});
      const volumes = weekMap.get(week)!;
      volumes[s.muscleGroup] =
        (volumes[s.muscleGroup] ?? 0) + s.weight * s.reps;
    }

    const allGroups = new Set<string>();
    for (const volumes of weekMap.values()) {
      for (const g of Object.keys(volumes)) allGroups.add(g);
    }

    const sorted = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8);

    const data = sorted.map(([week, volumes]) => {
      const rounded: Record<string, number | string> = { week: formatDateShort(week) };
      for (const [g, v] of Object.entries(volumes)) {
        rounded[g] = Math.round(v);
      }
      return rounded;
    });

    const groups = Array.from(allGroups).sort();

    let insightText: string | null = null;
    if (sorted.length >= 5) {
      const mid = Math.floor(sorted.length / 2);
      const priorWeeks = sorted.slice(0, mid);
      const recentWeeks = sorted.slice(mid);
      let bestGroup = "";
      let bestDelta = 0;
      let bestDir = "";
      for (const g of groups) {
        const prior = priorWeeks.reduce((s, [, v]) => s + (v[g] ?? 0), 0);
        const recent = recentWeeks.reduce((s, [, v]) => s + (v[g] ?? 0), 0);
        const delta = recent - prior;
        if (Math.abs(delta) > Math.abs(bestDelta)) {
          bestDelta = delta;
          bestGroup = g.charAt(0).toUpperCase() + g.slice(1);
          bestDir = delta > 0 ? "up" : "down";
        }
      }
      if (bestGroup && Math.abs(bestDelta) >= 500) {
        insightText = `${bestGroup} volume ${bestDir} ${Math.abs(Math.round(bestDelta)).toLocaleString()} kg vs prior weeks`;
      }
    }

    return { chartData: data, muscleGroups: groups, insight: insightText };
  }, [sets]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-base font-medium">Volume Load Trends</p>
          <p className="text-sm text-muted-foreground mt-1">Log a few workouts to see trends here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-3 px-2">
        <p className="text-sm font-medium text-muted-foreground mb-1 px-2">
          Weekly volume load by muscle group (kg)
        </p>
        {insight && (
          <p className="text-sm font-medium text-foreground px-2 mb-2 border-l-2 border-primary pl-2">{insight}</p>
        )}
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="week" tick={{ fontSize: 13 }} />
            <YAxis tick={{ fontSize: 13 }} width={45} />
            <Tooltip
              formatter={(value) => [`${value} kg`, undefined]}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} iconSize={12} />
            {muscleGroups.map((g) => (
              <Line
                key={g}
                type="monotone"
                dataKey={g}
                stroke={colors[g] ?? fallback}
                strokeWidth={2}
                dot={{ r: 2 }}
                name={g.charAt(0).toUpperCase() + g.slice(1)}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
