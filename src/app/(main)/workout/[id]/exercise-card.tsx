"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Minus, Plus, ChevronUp, ExternalLink } from "lucide-react";
import type { ExerciseState } from "./types";

export function ExerciseCard({
  ex,
  exIdx,
  isCollapsed,
  onToggleCollapse,
  rpeOpenFor,
  onUpdateSet,
  onToggleWarmup,
  onCompleteSet,
  onUncompleteSet,
  onAddSet,
  onAcceptProgression,
  onDismissProgression,
  onUpdateRpe,
  onSetRpeOpen,
}: {
  ex: ExerciseState;
  exIdx: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  rpeOpenFor: { exIdx: number; setIdx: number } | null;
  onUpdateSet: (exIdx: number, setIdx: number, field: "weight" | "reps" | "rpe" | "duration" | "distance", value: string) => void;
  onToggleWarmup: (exIdx: number, setIdx: number) => void;
  onCompleteSet: (exIdx: number, setIdx: number) => void;
  onUncompleteSet: (exIdx: number, setIdx: number) => void;
  onAddSet: (exIdx: number) => void;
  onAcceptProgression: (exIdx: number) => void;
  onDismissProgression: (exIdx: number) => void;
  onUpdateRpe: (exIdx: number, setIdx: number, value: number) => void;
  onSetRpeOpen: (value: { exIdx: number; setIdx: number } | null) => void;
}) {
  const completedWorkingSets = ex.sets.filter((s) => s.isCompleted && !s.isWarmup);
  const topWeight = Math.max(0, ...completedWorkingSets.map((s) => (s.weight ? parseFloat(s.weight) : 0)));
  const allSetsComplete = ex.sets.filter((s) => !s.isWarmup).length > 0 &&
    ex.sets.filter((s) => !s.isWarmup).every((s) => s.isCompleted);

  if (isCollapsed) {
    return (
      <Card>
        <CardContent className="py-3 px-4">
          <button onClick={onToggleCollapse} className="w-full text-left">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-primary">{ex.name}</span>
                <span className="text-sm text-muted-foreground ml-2">
                  {completedWorkingSets.length} set{completedWorkingSets.length !== 1 ? "s" : ""}
                  {topWeight > 0 ? ` · ${topWeight}kg top` : ""}
                </span>
              </div>
              <Check className="h-5 w-5 text-success shrink-0" />
            </div>
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="mb-2">
          <div className="flex items-center">
            <Link href={`/exercises/${ex.exerciseId}`} className="font-semibold text-primary hover:underline">
              {ex.name}
            </Link>
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + " exercise form")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1.5 text-muted-foreground hover:text-foreground shrink-0"
              aria-label={`How to perform ${ex.name}`}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            {allSetsComplete && (
              <button onClick={onToggleCollapse} className="ml-2 text-muted-foreground hover:text-foreground">
                <ChevronUp className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {(ex.trackingType === "weight_reps" || ex.trackingType === "bodyweight_reps" || ex.trackingType === "reps_only") && (
              <span className="text-xs text-muted-foreground">
                Target: {ex.targetRepMin}–{ex.targetRepMax} reps
              </span>
            )}
            {ex.trackingType === "time" && (
              <span className="text-xs text-muted-foreground">Log duration</span>
            )}
            {ex.trackingType === "distance_time" && (
              <span className="text-xs text-muted-foreground">Log distance and time</span>
            )}
          </div>
        </div>

        {ex.progressionPrompt && ex.trackingType === "weight_reps" && (
          <div className="mb-3 rounded-md bg-info/10 border border-info/20 px-3 py-2">
            <p className="text-sm font-medium text-info">
              Add weight? You hit {ex.progressionPrompt.summary}
            </p>
            <div className="flex gap-2 mt-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-info/30 text-info hover:bg-info/10"
                onClick={() => onAcceptProgression(exIdx)}
              >
                Use {ex.progressionPrompt.suggestedWeight}kg
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => onDismissProgression(exIdx)}
              >
                Keep {ex.progressionPrompt.previousWeight}kg
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <SetGridHeader trackingType={ex.trackingType} />

          {ex.sets.map((set, setIdx) => (
            <div
              key={setIdx}
              className={`grid ${
                ex.trackingType === "time" || ex.trackingType === "reps_only"
                  ? "grid-cols-[2rem_1fr_3.5rem]"
                  : "grid-cols-[2rem_1fr_1fr_3.5rem]"
              } gap-2 items-center px-1 py-1 rounded ${
                set.isCompleted
                  ? "bg-success/10"
                  : set.isWarmup
                    ? "bg-warning/10"
                    : ""
              }`}
            >
              {(ex.trackingType === "weight_reps" || ex.trackingType === "bodyweight_reps" || ex.trackingType === "reps_only") ? (
                <button
                  onClick={() => onToggleWarmup(exIdx, setIdx)}
                  disabled={set.isCompleted}
                  className="text-sm font-medium text-center"
                  title={set.isWarmup ? "Warmup set" : "Working set"}
                >
                  {set.isWarmup ? (
                    <Badge
                      variant="outline"
                      className="text-xs px-1 py-0 text-warning border-warning/50"
                    >
                      W
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">{set.setNumber}</span>
                  )}
                </button>
              ) : (
                <span className="text-sm text-muted-foreground text-center">{set.setNumber}</span>
              )}

              <SetInputs
                trackingType={ex.trackingType}
                set={set}
                setIdx={setIdx}
                previousSets={ex.previousSets}
                exIdx={exIdx}
                onUpdateSet={onUpdateSet}
              />

              <button
                onClick={() =>
                  set.isCompleted
                    ? onUncompleteSet(exIdx, setIdx)
                    : onCompleteSet(exIdx, setIdx)
                }
                className={`h-14 w-14 rounded-md flex items-center justify-center text-lg transition-colors ${
                  set.isCompleted
                    ? "bg-success text-white active:bg-success/80 animate-[set-complete_300ms_ease-out]"
                    : "border hover:bg-accent"
                }`}
              >
                <Check className="h-7 w-7" />
              </button>

              {set.isCompleted && !set.isWarmup && (ex.trackingType === "weight_reps" || ex.trackingType === "bodyweight_reps" || ex.trackingType === "reps_only") && (
                <div className="col-span-full flex justify-end">
                  {rpeOpenFor?.exIdx === exIdx && rpeOpenFor?.setIdx === setIdx ? (
                    <div className="flex items-center gap-1.5">
                      {[6, 7, 8, 9, 10].map((v) => (
                        <button
                          key={v}
                          onClick={() => onUpdateRpe(exIdx, setIdx, v)}
                          className={`h-7 w-7 rounded-full text-xs font-medium transition-colors ${
                            set.rpe === v.toString()
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent hover:bg-accent/80 text-foreground"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                      <button
                        onClick={() => onSetRpeOpen(null)}
                        className="h-7 w-7 rounded-full text-xs text-muted-foreground hover:text-foreground bg-accent/50"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSetRpeOpen({ exIdx, setIdx })}
                      className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded"
                    >
                      {set.rpe ? (
                        <span className="bg-accent px-1.5 py-0.5 rounded tabular-nums">RPE {set.rpe}</span>
                      ) : (
                        "RPE"
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => onAddSet(exIdx)}
          className="mt-2 w-full text-sm text-muted-foreground hover:text-foreground py-3"
        >
          + Add set
        </button>
      </CardContent>
    </Card>
  );
}

function SetGridHeader({ trackingType }: { trackingType: string }) {
  if (trackingType === "weight_reps") {
    return (
      <div className="grid grid-cols-[2rem_1fr_1fr_3.5rem] gap-2 text-xs text-muted-foreground font-medium px-1">
        <span>Set</span><span>kg</span><span>Reps</span><span />
      </div>
    );
  }
  if (trackingType === "bodyweight_reps") {
    return (
      <div className="grid grid-cols-[2rem_1fr_1fr_3.5rem] gap-2 text-xs text-muted-foreground font-medium px-1">
        <span>Set</span><span>+kg</span><span>Reps</span><span />
      </div>
    );
  }
  if (trackingType === "reps_only") {
    return (
      <div className="grid grid-cols-[2rem_1fr_3.5rem] gap-2 text-xs text-muted-foreground font-medium px-1">
        <span>Set</span><span>Reps</span><span />
      </div>
    );
  }
  if (trackingType === "time") {
    return (
      <div className="grid grid-cols-[2rem_1fr_3.5rem] gap-2 text-xs text-muted-foreground font-medium px-1">
        <span>#</span><span>Minutes</span><span />
      </div>
    );
  }
  if (trackingType === "distance_time") {
    return (
      <div className="grid grid-cols-[2rem_1fr_1fr_3.5rem] gap-2 text-xs text-muted-foreground font-medium px-1">
        <span>#</span><span>km</span><span>Minutes</span><span />
      </div>
    );
  }
  return null;
}

function SetInputs({
  trackingType,
  set,
  setIdx,
  previousSets,
  exIdx,
  onUpdateSet,
}: {
  trackingType: string;
  set: { weight: string; reps: string; duration: string; distance: string; isCompleted: boolean };
  setIdx: number;
  previousSets: { weight: number | null; reps: number | null }[];
  exIdx: number;
  onUpdateSet: (exIdx: number, setIdx: number, field: "weight" | "reps" | "duration" | "distance", value: string) => void;
}) {
  const inputClass = "h-11 w-full rounded-md border bg-transparent px-2 text-sm tabular-nums text-center disabled:opacity-60";

  if (trackingType === "weight_reps" || trackingType === "bodyweight_reps") {
    const stepperBtnClass = "h-8 w-8 shrink-0 rounded-md border flex items-center justify-center disabled:opacity-40 active:bg-accent";
    return (
      <>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const current = parseFloat(set.weight) || 0;
              const next = Math.max(0, current - 2.5);
              onUpdateSet(exIdx, setIdx, "weight", next.toString());
            }}
            disabled={set.isCompleted}
            className={stepperBtnClass}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            type="text"
            inputMode="decimal"
            placeholder={previousSets[setIdx]?.weight?.toString() ?? "0"}
            value={set.weight}
            onChange={(e) => onUpdateSet(exIdx, setIdx, "weight", e.target.value)}
            disabled={set.isCompleted}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => {
              const current = parseFloat(set.weight) || 0;
              onUpdateSet(exIdx, setIdx, "weight", (current + 2.5).toString());
            }}
            disabled={set.isCompleted}
            className={stepperBtnClass}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <input
          type="text"
          inputMode="numeric"
          placeholder={previousSets[setIdx]?.reps?.toString() ?? "0"}
          value={set.reps}
          onChange={(e) => onUpdateSet(exIdx, setIdx, "reps", e.target.value)}
          disabled={set.isCompleted}
          className={inputClass}
        />
      </>
    );
  }

  if (trackingType === "reps_only") {
    return (
      <input
        type="text"
        inputMode="numeric"
        placeholder={previousSets[setIdx]?.reps?.toString() ?? "0"}
        value={set.reps}
        onChange={(e) => onUpdateSet(exIdx, setIdx, "reps", e.target.value)}
        disabled={set.isCompleted}
        className={inputClass}
      />
    );
  }

  if (trackingType === "time") {
    return (
      <input
        type="text"
        inputMode="decimal"
        placeholder="30 or 1:30"
        value={set.duration}
        onChange={(e) => onUpdateSet(exIdx, setIdx, "duration", e.target.value)}
        disabled={set.isCompleted}
        className={inputClass}
      />
    );
  }

  if (trackingType === "distance_time") {
    return (
      <>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={set.distance}
          onChange={(e) => onUpdateSet(exIdx, setIdx, "distance", e.target.value)}
          disabled={set.isCompleted}
          className={inputClass}
        />
        <input
          type="text"
          inputMode="decimal"
          placeholder="30 or 1:30"
          value={set.duration}
          onChange={(e) => onUpdateSet(exIdx, setIdx, "duration", e.target.value)}
          disabled={set.isCompleted}
          className={inputClass}
        />
      </>
    );
  }

  return null;
}
