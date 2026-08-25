import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildDigestData, buildDigestHtml } from "@/lib/weekly-digest";

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const supabase = createAdminClient();

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("is_approved", true);

    if (profilesError || !profiles?.length) {
      return NextResponse.json(
        { error: "Failed to fetch profiles", details: profilesError },
        { status: 500 }
      );
    }

    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      return NextResponse.json(
        { error: "Failed to fetch auth users", details: authError },
        { status: 500 }
      );
    }

    const emailMap = new Map(
      authData.users.map((u) => [u.id, u.email])
    );

    const results: { user: string; status: string; error?: string }[] = [];

    for (const profile of profiles) {
      const email = emailMap.get(profile.id);
      if (!email) {
        results.push({ user: profile.name, status: "skipped", error: "no email" });
        continue;
      }

      try {
        const digestData = await buildDigestData(supabase, profile.id, profile.name);
        const digestHtml = buildDigestHtml(digestData);

        const { error: sendError } = await resend.emails.send({
          from: "StrongBoi <onboarding@resend.dev>",
          to: email,
          subject: "Your week in training",
          html: digestHtml,
        });

        if (sendError) {
          results.push({ user: profile.name, status: "failed", error: sendError.message });
        } else {
          results.push({ user: profile.name, status: "sent" });
        }
      } catch (err) {
        results.push({
          user: profile.name,
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const weekId = getISOWeek(new Date());
    return NextResponse.json({ results, week: weekId }, {
      headers: { "X-Digest-Week": weekId },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Unexpected error", message: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
