"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
import { Upload, FileText, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  parseCsv,
  detectFormat,
  normalizeRows,
  groupIntoWorkouts,
  matchExercises,
  type CsvFormat,
  type ImportWorkout,
} from "@/lib/csv-import";

type ImportState =
  | { step: "upload" }
  | { step: "preview"; format: CsvFormat; workouts: ImportWorkout[]; unmatchedNames: string[]; totalSets: number }
  | { step: "importing"; progress: number; total: number }
  | { step: "done"; imported: number; skipped: number };

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>({ step: "upload" });
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    const text = await file.text();
    const { headers, rows } = parseCsv(text);

    if (rows.length === 0) {
      toast.error("CSV file is empty or could not be parsed.");
      return;
    }

    const format = detectFormat(headers);
    if (format === "unknown") {
      toast.error(
        "Could not detect CSV format. Supported formats: Strong, Hevy, JEFIT."
      );
      return;
    }

    const normalized = normalizeRows(format, rows);
    const grouped = groupIntoWorkouts(normalized);

    const supabase = createClient();
    const { data: exercises } = await supabase
      .from("exercises")
      .select("id, name, aliases");

    const { matched, unmatchedNames } = matchExercises(
      grouped,
      exercises ?? []
    );

    const totalSets = matched.reduce(
      (sum, w) => sum + w.exercises.reduce((s, e) => s + e.sets.length, 0),
      0
    );

    setState({
      step: "preview",
      format,
      workouts: matched,
      unmatchedNames,
      totalSets,
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function runImport(workouts: ImportWorkout[]) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not logged in.");
      return;
    }

    const importable = workouts.filter((w) =>
      w.exercises.some((e) => e.matchedExerciseId)
    );

    setState({ step: "importing", progress: 0, total: importable.length });

    let imported = 0;
    let skipped = 0;

    for (const w of importable) {
      const startHour = 8 + Math.floor(Math.random() * 10);
      const startedAt = `${w.date}T${String(startHour).padStart(2, "0")}:00:00Z`;
      const endedAt = `${w.date}T${String(startHour + 1).padStart(2, "0")}:00:00Z`;

      const { data: workout, error: wErr } = await supabase
        .from("workouts")
        .insert({
          user_id: user.id,
          date: w.date,
          started_at: startedAt,
          ended_at: endedAt,
          notes: `Imported from CSV (${w.workoutName})`,
        })
        .select("id")
        .single();

      if (wErr || !workout) {
        skipped++;
        continue;
      }

      const setRows = w.exercises
        .filter((e) => e.matchedExerciseId)
        .flatMap((e, eIdx) =>
          e.sets.map((s, sIdx) => ({
            workout_id: workout.id,
            exercise_id: e.matchedExerciseId!,
            set_number: eIdx * 100 + sIdx + 1,
            weight: s.weight,
            reps: s.reps,
            rpe: s.rpe,
            is_warmup: s.isWarmup,
            duration_seconds: s.durationSeconds,
            distance_meters: s.distanceMeters,
          }))
        );

      if (setRows.length > 0) {
        const { error: sErr } = await supabase.from("sets").insert(setRows);
        if (sErr) {
          await supabase.from("workouts").delete().eq("id", workout.id);
          skipped++;
          continue;
        }
      }

      imported++;
      setState({ step: "importing", progress: imported + skipped, total: importable.length });
    }

    setState({ step: "done", imported, skipped });
    if (imported > 0) {
      toast.success(`Imported ${imported} workout${imported !== 1 ? "s" : ""}`);
    }
  }

  const formatLabels: Record<CsvFormat, string> = {
    strong: "Strong",
    hevy: "Hevy",
    jefit: "JEFIT",
    unknown: "Unknown",
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="flex items-center gap-3 px-4 py-3 border-b">
        <BackButton />
        <h1 className="text-lg font-bold">Import Workouts</h1>
      </header>

      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {state.step === "upload" && (
          <>
            <p className="text-sm text-muted-foreground">
              Import your workout history from another app. Upload a CSV file
              exported from Strong, Hevy, or JEFIT. The format is detected
              automatically from the column headers.
            </p>

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">
                Drop your CSV file here
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                or tap to browse
              </p>
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
              >
                <FileText className="h-4 w-4 mr-2" />
                Choose file
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleInputChange}
              />
            </div>

            <Card>
              <CardContent className="py-3 px-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  How to export from each app
                </p>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li><span className="font-medium text-foreground">Strong:</span> Settings &rarr; Export Data &rarr; CSV</li>
                  <li><span className="font-medium text-foreground">Hevy:</span> Settings &rarr; Export Data</li>
                  <li><span className="font-medium text-foreground">JEFIT:</span> Export Logs (web or app)</li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}

        {state.step === "preview" && (
          <>
            <Card>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-medium">
                    Detected: {formatLabels[state.format]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Workouts:</span>{" "}
                    <span className="font-medium">{state.workouts.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sets:</span>{" "}
                    <span className="font-medium">{state.totalSets}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Exercises:</span>{" "}
                    <span className="font-medium">
                      {new Set(state.workouts.flatMap((w) => w.exercises.map((e) => e.name))).size}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date range:</span>{" "}
                    <span className="font-medium text-xs">
                      {state.workouts[0]?.date} &mdash;{" "}
                      {state.workouts[state.workouts.length - 1]?.date}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {state.unmatchedNames.length > 0 && (
              <Card>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <span className="font-medium text-sm">
                      {state.unmatchedNames.length} exercise{state.unmatchedNames.length !== 1 ? "s" : ""} not matched
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    These exercises don&apos;t match anything in the database.
                    Sets for unmatched exercises will be skipped.
                  </p>
                  <div className="max-h-40 overflow-y-auto">
                    {state.unmatchedNames.map((name) => (
                      <p key={name} className="text-xs py-0.5">{name}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setState({ step: "upload" })}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={() => runImport(state.workouts)}
              >
                Import {state.workouts.filter((w) => w.exercises.some((e) => e.matchedExerciseId)).length} workouts
              </Button>
            </div>
          </>
        )}

        {state.step === "importing" && (
          <Card>
            <CardContent className="py-6 px-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="font-medium">Importing workouts...</p>
              <p className="text-sm text-muted-foreground mt-1">
                {state.progress} of {state.total}
              </p>
              <div className="mt-3 w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${state.total > 0 ? (state.progress / state.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {state.step === "done" && (
          <>
            <Card>
              <CardContent className="py-6 px-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
                <p className="font-medium text-lg">Import complete</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {state.imported} workout{state.imported !== 1 ? "s" : ""} imported
                  {state.skipped > 0 && `, ${state.skipped} skipped`}
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setState({ step: "upload" })}
              >
                Import more
              </Button>
              <Button
                className="flex-1"
                onClick={() => router.push("/history")}
              >
                View history
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
