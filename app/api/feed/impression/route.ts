import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicErrorMessage } from "@/lib/safe-error";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { profileId?: string } | null;
  const profileId = body?.profileId;
  if (!profileId) return NextResponse.json({ error: "profileId required" }, { status: 400 });

  const { error } = await supabase.rpc("record_male_profile_view", { p_profile_id: profileId });
  if (error) return NextResponse.json({ error: publicErrorMessage(error, "request failed") }, { status: 400 });

  return NextResponse.json({ ok: true });
}
