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
import { BarChart3 } from "lucide-react";
import { getMonday, formatDateShort } from "@/lib/format";

export function FrequencyChart({ dates }: { dates: string[] }) {
  const { chartData, avg, insight } = useMemo(() => {
    const weekMap = new Map<string, number>();

    for (const date of dates) {
      const week = getMonday(date);
      weekMap.set(week, (weekMap.get(week) ?? 0) + 1);
    }

    const sorted = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8);

    const data = sorted.map(([week, count]) => ({
      week: formatDateShort(week),
      workouts: count,
    }));

    const total = data.reduce((sum, d) => sum + d.workouts, 0);
    const average = data.length > 0 ? Math.round((total / data.length) * 10) / 10 : 0;

    let insightText: string | null = null;
    if (sorted.length >= 5) {
      const mid = Math.floor(sorted.length / 2);
      const priorAvg = sorted.slice(0, mid).reduce((s, [, c]) => s + c, 0) / mid;
      const recentAvg = sorted.slice(mid).reduce((s, [, c]) => s + c, 0) / (sorted.length - mid);
      const priorR = Math.round(priorAvg * 10) / 10;
      const recentR = Math.round(recentAvg * 10) / 10;
      if (recentR > priorR * 1.1) {
        insightText = `Training ${recentR}x/week, up from ${priorR}`;
      } else if (recentR < priorR * 0.9) {
        insightText = `Frequency down from ${priorR} to ${recentR} sessions/week`;
      } else {
        insightText = `Steady at ${average}x/week`;
      }
    } else if (data.length > 0) {
      const lastWeek = data[data.length - 1].workouts;
      insightText = `${lastWeek} workout${lastWeek !== 1 ? "s" : ""} this week`;
    }

    return { chartData: data, avg: average, insight: insightText };
  }, [dates]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-base font-medium">Training Frequency</p>
          <p className="text-sm text-muted-foreground mt-1">Log a few workouts to see trends here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-3 px-2">
        <div className="flex items-baseline justify-between px-2 mb-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Workouts per week
            </p>
            {insight && (
              <p className="text-sm font-medium text-foreground mt-0.5 border-l-2 border-primary pl-2">{insight}</p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Avg: <span className="font-medium text-foreground">{avg}/wk</span>
          </p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="week" tick={{ fontSize: 13 }} />
            <YAxis
              tick={{ fontSize: 13 }}
              width={25}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(value) => [`${value}`, "Workouts"]}
            />
            <ReferenceLine
              y={avg}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <Bar
              dataKey="workouts"
              fill="var(--primary)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
