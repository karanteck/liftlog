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
  ReferenceLine,
} from "recharts";

type SetRecord = {
  date: string;
  movementPattern: string;
};

const PUSH_PATTERNS = new Set([
  "horizontal_press",
  "vertical_press",
  "fly",
  "elbow_extension",
  "lateral_raise",
  "front_raise",
]);

const PULL_PATTERNS = new Set([
  "horizontal_pull",
  "vertical_pull",
  "rear_delt",
  "elbow_flexion",
]);

const QUAD_PATTERNS = new Set(["squat", "lunge", "leg_extension"]);

const HAMSTRING_PATTERNS = new Set(["hip_hinge", "leg_curl", "hip_extension"]);

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

function ratio(a: number, b: number): string {
  if (b === 0) return a === 0 ? "—" : `${a}:0`;
  const r = a / b;
  return `${r.toFixed(1)}:1`;
}

export function ImbalanceChart({ sets }: { sets: SetRecord[] }) {
  const { pushPullData, quadHamData, overallPushPull, overallQuadHam } =
    useMemo(() => {
      const weeks = new Map<
        string,
        { push: number; pull: number; quad: number; ham: number }
      >();

      for (const s of sets) {
        const week = getMonday(s.date);
        if (!weeks.has(week))
          weeks.set(week, { push: 0, pull: 0, quad: 0, ham: 0 });
        const c = weeks.get(week)!;

        if (PUSH_PATTERNS.has(s.movementPattern)) c.push++;
        else if (PULL_PATTERNS.has(s.movementPattern)) c.pull++;

        if (QUAD_PATTERNS.has(s.movementPattern)) c.quad++;
        else if (HAMSTRING_PATTERNS.has(s.movementPattern)) c.ham++;
      }

      const sorted = Array.from(weeks.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-8);

      const pp = sorted.map(([week, c]) => ({
        week: formatWeek(week),
        Push: c.push,
        Pull: c.pull,
      }));

      const qh = sorted.map(([week, c]) => ({
        week: formatWeek(week),
        Quads: c.quad,
        Hamstrings: c.ham,
      }));

      const totals = { push: 0, pull: 0, quad: 0, ham: 0 };
      for (const c of weeks.values()) {
        totals.push += c.push;
        totals.pull += c.pull;
        totals.quad += c.quad;
        totals.ham += c.ham;
      }

      return {
        pushPullData: pp,
        quadHamData: qh,
        overallPushPull: ratio(totals.push, totals.pull),
        overallQuadHam: ratio(totals.quad, totals.ham),
      };
    }, [sets]);

  if (pushPullData.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          <p className="font-medium text-foreground">Imbalance Ratios</p>
          <p className="mt-1">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3 px-2">
          <div className="flex items-baseline justify-between px-2 mb-2">
            <p className="text-xs font-medium text-muted-foreground">
              Push vs Pull (sets)
            </p>
            <p className="text-xs text-muted-foreground">
              Overall:{" "}
              <span className="font-medium text-foreground">
                {overallPushPull}
              </span>
            </p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pushPullData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                width={25}
                allowDecimals={false}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
              <Bar dataKey="Push" fill="#e74c3c" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Pull" fill="#3498db" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-3 px-2">
          <div className="flex items-baseline justify-between px-2 mb-2">
            <p className="text-xs font-medium text-muted-foreground">
              Quads vs Hamstrings (sets)
            </p>
            <p className="text-xs text-muted-foreground">
              Overall:{" "}
              <span className="font-medium text-foreground">
                {overallQuadHam}
              </span>
            </p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={quadHamData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                width={25}
                allowDecimals={false}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={10} />
              <Bar dataKey="Quads" fill="#2ecc71" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Hamstrings" fill="#1abc9c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
