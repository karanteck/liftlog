"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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

type Entry = {
  id: string;
  date: string;
  weight: number;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function BodyweightTracker({
  userId,
  initialEntries,
}: {
  userId: string;
  initialEntries: Entry[];
}) {
  const supabase = createClient();
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayEntry = entries.find((e) => e.date === todayStr);

  const chartData = useMemo(() => {
    return [...entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        date: formatDate(e.date),
        weight: e.weight,
      }));
  }, [entries]);

  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const current = sorted[sorted.length - 1].weight;
    const min = Math.min(...sorted.map((e) => e.weight));
    const max = Math.max(...sorted.map((e) => e.weight));
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];
    const weekEntry = sorted.find((e) => e.date <= weekAgoStr);
    const change = weekEntry ? current - weekEntry.weight : null;
    return { current, min, max, change };
  }, [entries]);

  async function handleSave() {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0 || w > 500) return;

    setSaving(true);

    if (todayEntry) {
      const { error } = await supabase
        .from("bodyweight_log")
        .update({ weight: w })
        .eq("id", todayEntry.id);

      if (error) {
        alert("Failed to update: " + error.message);
        setSaving(false);
        return;
      }

      setEntries((prev) =>
        prev.map((e) => (e.id === todayEntry.id ? { ...e, weight: w } : e))
      );
    } else {
      const { data, error } = await supabase
        .from("bodyweight_log")
        .insert({ user_id: userId, date: todayStr, weight: w })
        .select("id, date, weight")
        .single();

      if (error) {
        alert("Failed to save: " + error.message);
        setSaving(false);
        return;
      }

      setEntries((prev) => [
        { id: data.id, date: data.date, weight: Number(data.weight) },
        ...prev,
      ]);
    }

    setWeight("");
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from("bodyweight_log")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Failed to delete: " + error.message);
      return;
    }

    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3 px-4">
          <p className="text-sm font-medium mb-2">
            {todayEntry ? "Update today's weight" : "Log today's weight"}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              placeholder={todayEntry ? `${todayEntry.weight}` : "kg"}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="h-10 flex-1 rounded-md border bg-transparent px-3 text-sm tabular-nums"
            />
            <Button onClick={handleSave} disabled={saving || !weight}>
              {saving ? "..." : todayEntry ? "Update" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {stats && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <Card>
            <CardContent className="py-2 px-2">
              <p className="text-lg font-bold tabular-nums">
                {stats.current}kg
              </p>
              <p className="text-[11px] text-muted-foreground">Latest</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-2 px-2">
              <p className="text-lg font-bold tabular-nums">
                {stats.min}–{stats.max}
              </p>
              <p className="text-[11px] text-muted-foreground">Range (kg)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-2 px-2">
              <p className="text-lg font-bold tabular-nums">
                {stats.change !== null
                  ? `${stats.change > 0 ? "+" : ""}${stats.change.toFixed(1)}`
                  : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">7-day (kg)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {chartData.length >= 2 && (
        <Card>
          <CardContent className="py-3 px-2">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
              Trend
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tick={{ fontSize: 11 }}
                  width={40}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Recent entries
        </p>
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No entries yet. Log your first weight above.
          </p>
        )}
        {entries.slice(0, 30).map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between py-2 px-1 text-sm"
          >
            <span className="text-muted-foreground">
              {formatDateLong(e.date)}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-medium tabular-nums">{e.weight} kg</span>
              <button
                onClick={() => handleDelete(e.id)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
