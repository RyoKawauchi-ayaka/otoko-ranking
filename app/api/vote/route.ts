import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicErrorMessage } from "@/lib/safe-error";
import { publicVoteError } from "@/lib/vote-error";

function inferTagSlugsFromMaleProfile(m: any): string[] {
  const slugs = new Set<string>();

  const height = typeof m?.height === "number" ? m.height : null;
  if (height != null && height >= 175) slugs.add("tall");

  const hobbies: string[] = Array.isArray(m?.hobbies) ? m.hobbies : [];
  const appeal = typeof m?.appeal === "string" ? m.appeal : "";
  const text = (hobbies.join(" ") + " " + appeal).toLowerCase();

  if (text.includes("筋トレ") || text.includes("ジム") || text.includes("workout")) {
    slugs.add("muscular");
    slugs.add("fit");
  }
  if (text.includes("清潔") || text.includes("きれい好き") || text.includes("身だしなみ")) slugs.add("clean");
  if (text.includes("おしゃれ") || text.includes("ファッション")) slugs.add("fashionable");
  if (text.includes("優しい") || text.includes("思いやり")) slugs.add("kind");
  if (text.includes("面白い") || text.includes("笑")) slugs.add("funny");
  if (text.includes("研究") || text.includes("読書") || text.includes("勉強") || text.includes("知的")) slugs.add("smart");

  return Array.from(slugs);
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { targetId?: string; rating?: "normal" | "good" | "excellent" }
    | null;
  const targetId = body?.targetId;
  if (!targetId) return NextResponse.json({ error: "targetId required" }, { status: 400 });
  const rating = body?.rating ?? "good";
  if (rating !== "normal" && rating !== "good" && rating !== "excellent") {
    return NextResponse.json({ error: "invalid rating" }, { status: 400 });
  }

  // 既に投票済みの場合、cast_vote は no-op で成功になり UI が進捗を誤カウントしうるため、
  // API 側で事前に検知して明示的に返す。
  const { data: existingVote, error: exErr } = await supabase
    .from("votes")
    .select("id")
    .eq("voter_id", userRes.user.id)
    .eq("target_id", targetId)
    .maybeSingle();
  if (exErr) {
    const pe = publicVoteError(exErr);
    return NextResponse.json({ error: pe.message }, { status: pe.status });
  }
  if (existingVote?.id) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const dailyLimit = Number(process.env.VOTE_DAILY_LIMIT ?? "10");

  const { error } = await supabase.rpc("cast_vote", {
    p_target_id: targetId,
    p_rating: rating,
    p_daily_limit: Number.isFinite(dailyLimit) ? dailyLimit : 10,
  });

  if (error) {
    const pe = publicVoteError(error);
    return NextResponse.json({ error: pe.message }, { status: pe.status });
  }

  // Auto-collect features (no extra UI). Best-effort; failures shouldn't block vote.
  try {
    const [{ data: voteRow }, { data: male }, { data: tags }] = await Promise.all([
      supabase.from("votes").select("id").eq("voter_id", userRes.user.id).eq("target_id", targetId).maybeSingle(),
      supabase.from("male_profiles").select("height,hobbies,appeal").eq("id", targetId).maybeSingle(),
      supabase.from("vote_feature_tags").select("id,slug"),
    ]);
    const voteId = (voteRow as any)?.id ?? null;
    if (voteId && male && tags) {
      const want = new Set(inferTagSlugsFromMaleProfile(male));
      const rows = (tags as any[])
        .filter((t) => want.has(t.slug))
        .map((t) => ({ vote_id: voteId, tag_id: t.id }));
      if (rows.length) {
        await supabase.from("vote_feature_selections").upsert(rows as any, { onConflict: "vote_id,tag_id" });
      }
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true, noop: false });
}

