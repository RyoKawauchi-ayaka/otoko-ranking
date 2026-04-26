import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicErrorMessage } from "@/lib/safe-error";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { targetProfileId?: string; reason?: string }
    | null;
  const targetProfileId = body?.targetProfileId;
  const reason = body?.reason?.trim();
  if (!targetProfileId) return NextResponse.json({ error: "targetProfileId required" }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "reason required" }, { status: 400 });

  const { error } = await supabase.from("reports").insert({
    reporter_id: userRes.user.id,
    target_profile_id: targetProfileId,
    reason,
  });
  if (error) return NextResponse.json({ error: publicErrorMessage(error, "request failed") }, { status: 400 });

  return NextResponse.json({ ok: true });
}

