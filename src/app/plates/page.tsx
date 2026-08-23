"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const AVAILABLE_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

const PLATE_COLORS: Record<number, string> = {
  25: "bg-red-600",
  20: "bg-blue-600",
  15: "bg-yellow-500",
  10: "bg-green-600",
  5: "bg-white border border-border text-black",
  2.5: "bg-gray-500",
  1.25: "bg-gray-400",
};

function calculatePlates(
  targetWeight: number,
  barWeight: number
): { plates: number[]; remainder: number } {
  const perSide = (targetWeight - barWeight) / 2;
  if (perSide <= 0) return { plates: [], remainder: 0 };

  const plates: number[] = [];
  let remaining = perSide;

  for (const plate of AVAILABLE_PLATES) {
    while (remaining >= plate - 0.001) {
      plates.push(plate);
      remaining -= plate;
    }
  }

  return { plates, remainder: Math.round(remaining * 100) / 100 };
}

export default function PlateCalculatorPage() {
  const [targetWeight, setTargetWeight] = useState("");
  const [barWeight, setBarWeight] = useState("20");

  const target = parseFloat(targetWeight) || 0;
  const bar = parseFloat(barWeight) || 20;
  const { plates, remainder } = calculatePlates(target, bar);
  const perSide = Math.max(0, (target - bar) / 2);
  const valid = target > bar && remainder < 0.01;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <Link href="/">
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
        <h1 className="text-lg font-bold">Plate Calculator</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        <Card>
          <CardContent className="py-4 px-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Target weight (kg)
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="100"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                className="h-12 w-full rounded-md border bg-transparent px-3 text-lg tabular-nums text-center"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Bar weight (kg)
              </label>
              <div className="flex gap-2">
                {["20", "15", "10"].map((w) => (
                  <button
                    key={w}
                    onClick={() => setBarWeight(w)}
                    className={`flex-1 h-10 rounded-md border text-sm font-medium transition-colors ${
                      barWeight === w
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    }`}
                  >
                    {w}kg
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {target > 0 && target > bar && (
          <Card>
            <CardContent className="py-4 px-4">
              <p className="text-sm text-muted-foreground mb-1">
                Each side: {perSide}kg
              </p>

              {valid ? (
                <>
                  <div className="flex items-end gap-1 mt-3 justify-center h-24">
                    <div className="w-3 h-20 bg-muted-foreground/30 rounded-sm" />
                    {plates.map((p, i) => (
                      <div
                        key={i}
                        className={`rounded-sm flex items-center justify-center text-xs font-bold ${PLATE_COLORS[p]} ${
                          p >= 15
                            ? "w-8 h-20"
                            : p >= 5
                              ? "w-7 h-16"
                              : "w-6 h-12"
                        }`}
                      >
                        {p}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-1">
                    {Array.from(new Set(plates)).map((p) => {
                      const count = plates.filter((x) => x === p).length;
                      return (
                        <div
                          key={p}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-sm ${PLATE_COLORS[p]}`}
                            />
                            <span>{p}kg</span>
                          </div>
                          <span className="text-muted-foreground">
                            {count} × per side
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : target <= bar ? null : (
                <p className="text-sm text-destructive mt-2">
                  Can't make {perSide}kg exactly with standard plates.
                  Off by {remainder}kg.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {target > 0 && target <= bar && (
          <p className="text-center text-sm text-muted-foreground">
            Target must be more than the bar weight ({bar}kg).
          </p>
        )}
      </main>
    </div>
  );
}
