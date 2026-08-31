export type CsvFormat = "strong" | "hevy" | "jefit" | "unknown";

export type NormalizedSet = {
  date: string; // YYYY-MM-DD
  workoutName: string;
  exerciseName: string;
  setOrder: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup: boolean;
  durationSeconds: number | null;
  distanceMeters: number | null;
  notes: string;
};

export type ImportWorkout = {
  date: string;
  workoutName: string;
  exercises: {
    name: string;
    matchedExerciseId: string | null;
    sets: Omit<NormalizedSet, "date" | "workoutName" | "exerciseName">[];
  }[];
};

const STRONG_HEADERS = ["Date", "Workout Name", "Exercise Name", "Set Order", "Weight", "Reps"];
const HEVY_HEADERS = ["title", "start_time", "exercise_title", "set_index", "set_type", "weight_kg"];
const JEFIT_HEADERS = ["Date", "Exercise", "Reps", "Weight"];

export function detectFormat(headers: string[]): CsvFormat {
  const h = headers.map((s) => s.trim());
  if (STRONG_HEADERS.every((sh) => h.includes(sh))) return "strong";
  if (HEVY_HEADERS.every((sh) => h.includes(sh))) return "hevy";
  if (JEFIT_HEADERS.every((sh) => h.some((hh) => hh.toLowerCase() === sh.toLowerCase()))) return "jefit";
  return "unknown";
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j].trim()] = (values[j] ?? "").trim();
    }
    rows.push(row);
  }
  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === "," || ch === ";") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function parseDate(str: string): string {
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  const parts = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (parts) return `${parts[1]}-${parts[2]}-${parts[3]}`;
  return str.slice(0, 10);
}

function num(s: string | undefined): number | null {
  if (!s || s.trim() === "") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseStrong(rows: Record<string, string>[]): NormalizedSet[] {
  return rows.map((r) => ({
    date: parseDate(r["Date"] ?? ""),
    workoutName: r["Workout Name"] ?? "",
    exerciseName: r["Exercise Name"] ?? "",
    setOrder: parseInt(r["Set Order"] ?? "1") || 1,
    weight: num(r["Weight"]),
    reps: num(r["Reps"]) !== null ? Math.round(num(r["Reps"])!) : null,
    rpe: num(r["RPE"]),
    isWarmup: false,
    durationSeconds: num(r["Seconds"]) !== null ? Math.round(num(r["Seconds"])!) : null,
    distanceMeters: num(r["Distance"]),
    notes: r["Notes"] ?? "",
  }));
}

function parseHevy(rows: Record<string, string>[]): NormalizedSet[] {
  return rows.map((r) => ({
    date: parseDate(r["start_time"] ?? ""),
    workoutName: r["title"] ?? "",
    exerciseName: r["exercise_title"] ?? "",
    setOrder: (parseInt(r["set_index"] ?? "0") || 0) + 1,
    weight: num(r["weight_kg"]),
    reps: num(r["reps"]) !== null ? Math.round(num(r["reps"])!) : null,
    rpe: num(r["rpe"]),
    isWarmup: (r["set_type"] ?? "").toLowerCase() === "warmup",
    durationSeconds: num(r["duration_seconds"]) !== null ? Math.round(num(r["duration_seconds"])!) : null,
    distanceMeters: r["distance_km"] ? (num(r["distance_km"])! * 1000) : null,
    notes: r["exercise_notes"] ?? "",
  }));
}

function parseJefit(rows: Record<string, string>[]): NormalizedSet[] {
  const headers = Object.keys(rows[0] ?? {});
  const dateCol = headers.find((h) => h.toLowerCase() === "date") ?? "Date";
  const exerciseCol = headers.find((h) => h.toLowerCase() === "exercise" || h.toLowerCase() === "exercisename" || h.toLowerCase() === "exercise name") ?? "Exercise";
  const weightCol = headers.find((h) => h.toLowerCase() === "weight") ?? "Weight";
  const repsCol = headers.find((h) => h.toLowerCase() === "reps") ?? "Reps";
  const setsCol = headers.find((h) => h.toLowerCase() === "sets" || h.toLowerCase() === "set") ?? "";

  return rows.map((r, i) => ({
    date: parseDate(r[dateCol] ?? ""),
    workoutName: "JEFIT Import",
    exerciseName: r[exerciseCol] ?? "",
    setOrder: setsCol ? (parseInt(r[setsCol] ?? "1") || 1) : (i + 1),
    weight: num(r[weightCol]),
    reps: num(r[repsCol]) !== null ? Math.round(num(r[repsCol])!) : null,
    rpe: null,
    isWarmup: false,
    durationSeconds: null,
    distanceMeters: null,
    notes: "",
  }));
}

export function normalizeRows(format: CsvFormat, rows: Record<string, string>[]): NormalizedSet[] {
  switch (format) {
    case "strong": return parseStrong(rows);
    case "hevy": return parseHevy(rows);
    case "jefit": return parseJefit(rows);
    default: return [];
  }
}

export function groupIntoWorkouts(sets: NormalizedSet[]): ImportWorkout[] {
  const workoutMap = new Map<string, NormalizedSet[]>();

  for (const s of sets) {
    if (!s.exerciseName.trim()) continue;
    const key = `${s.date}||${s.workoutName}`;
    if (!workoutMap.has(key)) workoutMap.set(key, []);
    workoutMap.get(key)!.push(s);
  }

  const workouts: ImportWorkout[] = [];

  for (const [key, wSets] of workoutMap) {
    const [date, workoutName] = key.split("||");

    const exerciseMap = new Map<string, NormalizedSet[]>();
    for (const s of wSets) {
      if (!exerciseMap.has(s.exerciseName)) exerciseMap.set(s.exerciseName, []);
      exerciseMap.get(s.exerciseName)!.push(s);
    }

    const exercises = Array.from(exerciseMap.entries()).map(([name, eSets]) => ({
      name,
      matchedExerciseId: null,
      sets: eSets
        .sort((a, b) => a.setOrder - b.setOrder)
        .map((s) => ({
          setOrder: s.setOrder,
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe,
          isWarmup: s.isWarmup,
          durationSeconds: s.durationSeconds,
          distanceMeters: s.distanceMeters,
          notes: s.notes,
        })),
    }));

    workouts.push({ date, workoutName, exercises });
  }

  return workouts.sort((a, b) => a.date.localeCompare(b.date));
}

export function matchExercises(
  workouts: ImportWorkout[],
  dbExercises: { id: string; name: string; aliases: string[] }[]
): { matched: ImportWorkout[]; unmatchedNames: string[] } {
  const nameMap = new Map<string, string>();

  for (const ex of dbExercises) {
    nameMap.set(ex.name.toLowerCase().trim(), ex.id);
    for (const alias of ex.aliases) {
      nameMap.set(alias.toLowerCase().trim(), ex.id);
    }
  }

  const unmatchedSet = new Set<string>();

  const matched = workouts.map((w) => ({
    ...w,
    exercises: w.exercises.map((e) => {
      const normalized = e.name.toLowerCase().trim();
      const id = nameMap.get(normalized) ?? null;
      if (!id) unmatchedSet.add(e.name);
      return { ...e, matchedExerciseId: id };
    }),
  }));

  return { matched, unmatchedNames: Array.from(unmatchedSet).sort() };
}
