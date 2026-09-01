"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDateShort } from "@/lib/format";

type DataPoint = {
  date: string;
  e1rm: number;
};

export function E1rmChart({ data }: { data: DataPoint[] }) {
  if (data.length < 2) return null;

  const chartData = data.map((d) => ({
    date: formatDateShort(d.date),
    e1rm: Math.round(d.e1rm * 10) / 10,
  }));

  return (
    <Card>
      <CardContent className="py-3 px-2">
        <p className="text-sm font-medium text-muted-foreground mb-2 px-2">
          Estimated 1RM trend
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 13 }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={["dataMin - 2", "dataMax + 2"]}
              tick={{ fontSize: 13 }}
              width={40}
              unit="kg"
            />
            <Tooltip
              formatter={(value) => [`${value} kg`, "Est. 1RM"]}
            />
            <Line
              type="monotone"
              dataKey="e1rm"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
