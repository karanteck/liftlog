import { SupabaseClient } from "@supabase/supabase-js";

export type DigestData = {
  userName: string;
  weekStart: string;
  weekEnd: string;
  workouts: {
    date: string;
    routineName: string | null;
    hardSets: number;
  }[];
  muscleGroupSets: Record<string, number>;
  totalHardSets: number;
  totalVolumeLoad: number;
  plateauAlerts: {
    message: string;
    alertType: string;
  }[];
};

export async function buildDigestData(
  supabase: SupabaseClient,
  userId: string,
  userName: string
): Promise<DigestData> {
  const now = new Date();
  const weekEnd = now.toISOString().split("T")[0];
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStart = weekAgo.toISOString().split("T")[0];

  const [workoutsResult, setsResult, alertsResult] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, date, routines ( name )")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .gte("date", weekStart)
      .lte("date", weekEnd)
      .order("date", { ascending: true }),

    supabase
      .from("sets")
      .select(
        `
        weight, reps, workout_id,
        exercises!inner ( muscle_group ),
        workouts!inner ( date, user_id )
      `
      )
      .eq("is_warmup", false)
      .eq("workouts.user_id", userId)
      .gte("workouts.date", weekStart)
      .lte("workouts.date", weekEnd),

    supabase
      .from("plateau_alerts")
      .select("message, alert_type")
      .eq("user_id", userId)
      .is("dismissed_at", null),
  ]);

  const workouts = (workoutsResult.data ?? []).map((w) => {
    const routine = w.routines as unknown as { name: string } | null;
    return {
      id: w.id as string,
      date: w.date as string,
      routineName: routine?.name ?? null,
    };
  });

  type RawSet = {
    weight: number | null;
    reps: number | null;
    workout_id: string;
    exercises: { muscle_group: string };
    workouts: { date: string };
  };

  const sets = (setsResult.data ?? []) as unknown as RawSet[];

  const setsPerWorkout = new Map<string, number>();
  const muscleGroupSets: Record<string, number> = {};
  let totalVolumeLoad = 0;

  for (const s of sets) {
    setsPerWorkout.set(
      s.workout_id,
      (setsPerWorkout.get(s.workout_id) ?? 0) + 1
    );

    const mg = s.exercises.muscle_group;
    muscleGroupSets[mg] = (muscleGroupSets[mg] ?? 0) + 1;

    const w = s.weight != null ? Number(s.weight) : 0;
    const r = s.reps != null ? Number(s.reps) : 0;
    if (w > 0 && r > 0) {
      totalVolumeLoad += w * r;
    }
  }

  const workoutsWithSets = workouts.map((w) => ({
    date: w.date,
    routineName: w.routineName,
    hardSets: setsPerWorkout.get(w.id) ?? 0,
  }));

  const plateauAlerts = (alertsResult.data ?? []).map((a) => ({
    message: a.message as string,
    alertType: a.alert_type as string,
  }));

  return {
    userName,
    weekStart,
    weekEnd,
    workouts: workoutsWithSets,
    muscleGroupSets,
    totalHardSets: sets.length,
    totalVolumeLoad: Math.round(totalVolumeLoad),
    plateauAlerts,
  };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function alertTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    strength_stall: "Strength stall",
    missed_targets: "Missed targets",
    volume_regression: "Volume drop",
    under_stimulus: "Low volume",
    exercise_staleness: "Exercise staleness",
    rpe_creep: "Fatigue building",
  };
  return labels[type] ?? type;
}

export function buildDigestHtml(data: DigestData): string {
  const { userName, weekStart, weekEnd, workouts, muscleGroupSets, totalHardSets, totalVolumeLoad, plateauAlerts } = data;

  const hasWorkouts = workouts.length > 0;

  const workoutRows = workouts
    .map(
      (w) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;">${formatDate(w.date)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;">${w.routineName ?? "Empty workout"}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">${w.hardSets} sets</td>
        </tr>`
    )
    .join("");

  const muscleRows = Object.entries(muscleGroupSets)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([mg, count]) =>
        `<tr>
          <td style="padding:4px 12px;border-bottom:1px solid #eee;text-transform:capitalize;">${mg}</td>
          <td style="padding:4px 12px;border-bottom:1px solid #eee;text-align:right;">${count} sets</td>
        </tr>`
    )
    .join("");

  const alertRows = plateauAlerts
    .map(
      (a) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;">
            <strong>${alertTypeLabel(a.alertType)}</strong><br/>
            <span style="color:#666;font-size:13px;">${a.message}</span>
          </td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;padding:20px;color:#1a1a1a;">
      <h1 style="font-size:20px;margin:0 0 4px;">Hey ${userName} 👋</h1>
      <p style="color:#666;font-size:14px;margin:0 0 20px;">
        ${formatDate(weekStart)} – ${formatDate(weekEnd)}
      </p>

      ${
        hasWorkouts
          ? `
        <h2 style="font-size:16px;margin:0 0 8px;">This week</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;">
          ${workoutRows}
          <tr style="font-weight:bold;">
            <td style="padding:8px 12px;" colspan="2">Total</td>
            <td style="padding:8px 12px;text-align:right;">${totalHardSets} sets</td>
          </tr>
        </table>

        ${
          totalVolumeLoad > 0
            ? `<p style="font-size:14px;color:#666;margin:0 0 20px;">
                Total volume load: <strong>${totalVolumeLoad.toLocaleString()} kg</strong>
              </p>`
            : ""
        }

        ${
          muscleRows
            ? `
          <h2 style="font-size:16px;margin:0 0 8px;">Hard sets by muscle group</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;">
            ${muscleRows}
          </table>`
            : ""
        }
      `
          : `
        <p style="font-size:14px;color:#666;margin:0 0 20px;">
          No workouts logged this week. Rest weeks happen — get after it next week 💪
        </p>
      `
      }

      ${
        plateauAlerts.length > 0
          ? `
        <h2 style="font-size:16px;margin:0 0 8px;">⚠️ Active alerts</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;">
          ${alertRows}
        </table>
      `
          : ""
      }

      <p style="font-size:12px;color:#999;margin:20px 0 0;border-top:1px solid #eee;padding-top:12px;">
        StrongBoi weekly digest
      </p>
    </div>
  `;
}
