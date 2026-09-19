import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from "@powersync/web";
import { createClient } from "@/lib/supabase/client";

const ARRAY_COLUMNS: Record<string, string[]> = {
  exercises: ["aliases", "secondary_muscles"],
};

function prepareForSupabase(table: string, data: Record<string, unknown>) {
  const arrayCols = ARRAY_COLUMNS[table];
  if (!arrayCols) return data;

  const result = { ...data };
  for (const col of arrayCols) {
    if (typeof result[col] === "string") {
      try {
        result[col] = JSON.parse(result[col] as string);
      } catch {
        // leave as-is
      }
    }
  }
  return result;
}

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) throw new Error("Not authenticated");

    return {
      endpoint: process.env.NEXT_PUBLIC_POWERSYNC_URL!,
      token: session.access_token,
      expiresAt: new Date(session.expires_at! * 1000),
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const supabase = createClient();
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        await this.applyOperation(supabase, op);
      }
      await transaction.complete();
    } catch (e) {
      console.error("PowerSync upload failed:", e);
      throw e;
    }
  }

  private async applyOperation(supabase: ReturnType<typeof createClient>, op: CrudEntry) {
    const table = op.table as "exercises" | "profiles" | "routines" | "routine_exercises" | "workouts" | "sets" | "bodyweight_log" | "plateau_alerts";
    const id = op.id;

    switch (op.op) {
      case UpdateType.PUT: {
        const data = prepareForSupabase(op.table, { id, ...op.opData });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from(table).upsert(data as any);
        if (error) throw error;
        break;
      }
      case UpdateType.PATCH: {
        const data = prepareForSupabase(op.table, op.opData!);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from(table).update(data as any).eq("id", id);
        if (error) throw error;
        break;
      }
      case UpdateType.DELETE: {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) throw error;
        break;
      }
    }
  }
}
