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
  ReferenceLine,
} from "recharts";

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

export function FrequencyChart({ dates }: { dates: string[] }) {
  const { chartData, avg } = useMemo(() => {
    const weekMap = new Map<string, number>();

    for (const date of dates) {
      const week = getMonday(date);
      weekMap.set(week, (weekMap.get(week) ?? 0) + 1);
    }

    const sorted = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8);

    const data = sorted.map(([week, count]) => ({
      week: formatWeek(week),
      workouts: count,
    }));

    const total = data.reduce((sum, d) => sum + d.workouts, 0);
    const average = data.length > 0 ? Math.round((total / data.length) * 10) / 10 : 0;

    return { chartData: data, avg: average };
  }, [dates]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          <p className="font-medium text-foreground">Training Frequency</p>
          <p className="mt-1">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-3 px-2">
        <div className="flex items-baseline justify-between px-2 mb-2">
          <p className="text-xs font-medium text-muted-foreground">
            Workouts per week
          </p>
          <p className="text-xs text-muted-foreground">
            Avg: <span className="font-medium text-foreground">{avg}/wk</span>
          </p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              width={25}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value) => [`${value}`, "Workouts"]}
            />
            <ReferenceLine
              y={avg}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <Bar
              dataKey="workouts"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
