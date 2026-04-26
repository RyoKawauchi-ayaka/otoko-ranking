import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicErrorMessage } from "@/lib/safe-error";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { targetId?: string; tagSlugs?: string[] } | null;
  const targetId = body?.targetId;
  const tagSlugs = Array.isArray(body?.tagSlugs) ? body?.tagSlugs.filter((s) => typeof s === "string") : [];
  if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 });
  if (!tagSlugs.length) return NextResponse.json({ ok: true });

  // find today's vote id for (me, target)
  const { data: voteRow, error: vErr } = await supabase
    .from("votes")
    .select("id")
    .eq("voter_id", userRes.user.id)
    .eq("target_id", targetId)
    .maybeSingle();
  if (vErr) return NextResponse.json({ error: publicErrorMessage(vErr, "request failed") }, { status: 400 });
  if (!voteRow?.id) return NextResponse.json({ error: "vote not found" }, { status: 404 });

  const { data: tags, error: tErr } = await supabase
    .from("vote_feature_tags")
    .select("id,slug")
    .in("slug", tagSlugs);
  if (tErr) return NextResponse.json({ error: publicErrorMessage(tErr, "request failed") }, { status: 400 });
  const rows = (tags ?? []).map((t: any) => ({ vote_id: voteRow.id, tag_id: t.id }));
  if (!rows.length) return NextResponse.json({ ok: true });

  const { error: insErr } = await supabase.from("vote_feature_selections").insert(rows);
  if (insErr) return NextResponse.json({ error: publicErrorMessage(insErr, "request failed") }, { status: 400 });

  return NextResponse.json({ ok: true });
}

