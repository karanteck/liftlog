"use client";

import { PowerSyncDatabase } from "@powersync/web";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { schema } from "@/lib/powersync/schema";
import { SupabaseConnector } from "@/lib/powersync/connector";

const PowerSyncCtx = createContext<PowerSyncDatabase | null>(null);

export function usePowerSyncDb() {
  return useContext(PowerSyncCtx);
}

export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<PowerSyncDatabase | null>(null);

  useEffect(() => {
    const database = new PowerSyncDatabase({
      schema,
      database: { dbFilename: "strongboi.db" },
    });
    const connector = new SupabaseConnector();
    database.connect(connector).then(() => setDb(database));

    return () => {
      database.disconnect();
    };
  }, []);

  return (
    <PowerSyncCtx.Provider value={db}>
      {children}
    </PowerSyncCtx.Provider>
  );
}
