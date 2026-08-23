import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildDigestData, buildDigestHtml } from "@/lib/weekly-digest";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json(
      { error: "Unauthorized", hasSecret: !!expected, secretLength: expected?.length ?? 0 },
      { status: 401 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const supabase = createAdminClient();

  // Get all approved profiles
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

  // Get emails from Supabase Auth
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
        from: "LiftLog <onboarding@resend.dev>",
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

  return NextResponse.json({ results });
}
