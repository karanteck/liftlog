"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/sign-out-button";
import Link from "next/link";

type Profile = {
  id: string;
  name: string;
  is_approved: boolean;
  household_id: string | null;
  created_at: string;
};

type Household = {
  id: string;
  name: string;
};

export function AdminPanel() {
  const supabase = createClient();
  const [users, setUsers] = useState<Profile[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [newHouseholdName, setNewHouseholdName] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [{ data: profiles }, { data: hh }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, is_approved, household_id, created_at")
        .order("created_at"),
      supabase.from("households").select("id, name").order("created_at"),
    ]);

    setUsers(profiles ?? []);
    setHouseholds(hh ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function approveUser(userId: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: true })
      .eq("id", userId);
    if (error) return;
    loadData();
  }

  async function assignHousehold(userId: string, householdId: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ household_id: householdId })
      .eq("id", userId);
    if (error) return;
    loadData();
  }

  async function createHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!newHouseholdName.trim()) return;

    const { error } = await supabase.from("households").insert({ name: newHouseholdName.trim() });
    if (error) return;
    setNewHouseholdName("");
    loadData();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Admin</h1>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              Home
            </Button>
          </Link>
          <SignOutButton variant="ghost" size="sm" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Households</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {households.map((h) => (
            <div key={h.id} className="flex items-center justify-between">
              <span className="text-sm">{h.name}</span>
              <Badge variant="outline">
                {users.filter((u) => u.household_id === h.id).length} members
              </Badge>
            </div>
          ))}

          <form onSubmit={createHousehold} className="flex gap-2 pt-2">
            <Input
              placeholder="New household name"
              value={newHouseholdName}
              onChange={(e) => setNewHouseholdName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm">
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-col gap-2 border-b pb-3 last:border-0 last:pb-0"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{u.name}</span>
                {u.is_approved ? (
                  <Badge>Approved</Badge>
                ) : (
                  <Badge variant="destructive">Pending</Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!u.is_approved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => approveUser(u.id)}
                  >
                    Approve
                  </Button>
                )}

                {households.length > 0 && (
                  <select
                    className="text-sm bg-transparent border rounded px-2 py-1"
                    value={u.household_id ?? ""}
                    onChange={(e) =>
                      e.target.value && assignHousehold(u.id, e.target.value)
                    }
                  >
                    <option value="">No household</option>
                    {households.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No users yet. Sign up to create the first account.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
