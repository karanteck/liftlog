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
import { BarChart3 } from "lucide-react";
import { useImbalanceColors } from "@/lib/chart-colors";
import { getMonday, formatDateShort } from "@/lib/format";

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

function ratio(a: number, b: number): string {
  if (b === 0) return a === 0 ? "—" : `${a}:0`;
  const r = a / b;
  return `${r.toFixed(1)}:1`;
}

export function ImbalanceChart({ sets }: { sets: SetRecord[] }) {
  const imbalanceColors = useImbalanceColors();
  const { pushPullData, quadHamData, overallPushPull, overallQuadHam, insight } =
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
        week: formatDateShort(week),
        Push: c.push,
        Pull: c.pull,
      }));

      const qh = sorted.map(([week, c]) => ({
        week: formatDateShort(week),
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

      let insightText: string | null = null;
      const ppRatio = totals.pull > 0 ? totals.push / totals.pull : null;
      const qhRatio = totals.ham > 0 ? totals.quad / totals.ham : null;
      if (ppRatio !== null && ppRatio > 1.5) {
        insightText = `Push:pull ratio is ${ppRatio.toFixed(1)}:1 — consider adding more pulling work`;
      } else if (qhRatio !== null && qhRatio > 2.0) {
        insightText = `Quad:ham ratio is ${qhRatio.toFixed(1)}:1 — consider adding hamstring work`;
      }

      return {
        pushPullData: pp,
        quadHamData: qh,
        overallPushPull: ratio(totals.push, totals.pull),
        overallQuadHam: ratio(totals.quad, totals.ham),
        insight: insightText,
      };
    }, [sets]);

  if (pushPullData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-base font-medium">Imbalance Ratios</p>
          <p className="text-sm text-muted-foreground mt-1">Log a few workouts to see trends here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3 px-2">
          <div className="flex items-baseline justify-between px-2 mb-1">
            <p className="text-sm font-medium text-muted-foreground">
              Push vs Pull (sets)
            </p>
            <p className="text-sm text-muted-foreground">
              Overall:{" "}
              <span className="font-medium text-foreground">
                {overallPushPull}
              </span>
            </p>
          </div>
          {insight && (
            <p className="text-sm font-medium text-foreground px-2 mb-2 border-l-2 border-primary pl-2">{insight}</p>
          )}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pushPullData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="week" tick={{ fontSize: 13 }} />
              <YAxis
                tick={{ fontSize: 13 }}
                width={25}
                allowDecimals={false}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 13 }} iconSize={12} />
              <Bar dataKey="Push" fill={imbalanceColors.push} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Pull" fill={imbalanceColors.pull} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-3 px-2">
          <div className="flex items-baseline justify-between px-2 mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Quads vs Hamstrings (sets)
            </p>
            <p className="text-sm text-muted-foreground">
              Overall:{" "}
              <span className="font-medium text-foreground">
                {overallQuadHam}
              </span>
            </p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={quadHamData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="week" tick={{ fontSize: 13 }} />
              <YAxis
                tick={{ fontSize: 13 }}
                width={25}
                allowDecimals={false}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 13 }} iconSize={12} />
              <Bar dataKey="Quads" fill={imbalanceColors.quads} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Hamstrings" fill={imbalanceColors.hamstrings} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
