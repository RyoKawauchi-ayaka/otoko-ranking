import { NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicErrorMessage } from "@/lib/safe-error";

function hashInput(input: unknown) {
  const s = JSON.stringify(input);
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 32);
}

function points(r: any) {
  if (r === "excellent") return 3;
  if (r === "good") return 2;
  return 1;
}

async function callOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You generate a realistic ideal male profile based on voting history. Do not over-optimize for extreme handsomeness. Return JSON with keys: title, description, tags (array). Japanese text.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = userRes.user.id;
  const { data: userRow, error: uErr } = await supabase
    .from("users")
    .select("gender,is_paid_user")
    .eq("id", userId)
    .maybeSingle();
  if (uErr) return NextResponse.json({ error: publicErrorMessage(uErr, "request failed") }, { status: 400 });
  if (userRow?.gender !== "female") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!userRow?.is_paid_user) {
    return NextResponse.json({ upgrade_required: true }, { status: 402 });
  }

  // gather history (votes + feature tags)
  const [{ data: votes, error: vErr }, { data: selections, error: sErr }, { data: tags, error: tErr }] =
    await Promise.all([
      supabase.from("votes").select("id,rating").eq("voter_id", userId),
      supabase.from("vote_feature_selections").select("vote_id,tag_id"),
      supabase.from("vote_feature_tags").select("id,slug,label_ja,category"),
    ]);
  if (vErr) return NextResponse.json({ error: publicErrorMessage(vErr, "request failed") }, { status: 400 });
  if (sErr) return NextResponse.json({ error: publicErrorMessage(sErr, "request failed") }, { status: 400 });
  if (tErr) return NextResponse.json({ error: publicErrorMessage(tErr, "request failed") }, { status: 400 });

  const voteRows = votes ?? [];
  if (voteRows.length < 20) {
    return NextResponse.json({ error: "評価が少なすぎます（最低20件から）" }, { status: 400 });
  }

  const ptsByVoteId = new Map<string, number>();
  for (const v of voteRows as any[]) ptsByVoteId.set(String(v.id), points(v.rating));

  const tagById = new Map<string, any>();
  for (const t of tags as any[]) tagById.set(String(t.id), t);

  const scoreBySlug = new Map<string, number>();
  for (const s of selections as any[]) {
    const t = tagById.get(String(s.tag_id));
    if (!t) continue;
    const pts = ptsByVoteId.get(String(s.vote_id)) ?? 1;
    scoreBySlug.set(t.slug, (scoreBySlug.get(t.slug) ?? 0) + pts);
  }
  const topTags = Array.from(scoreBySlug.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([slug]) => slug);

  const input = { v: 1, topTags, votes: voteRows.length };
  const inputHash = hashInput(input);

  // cache
  const { data: cached } = await supabase
    .from("ideal_male_generations")
    .select("id,created_at,result_json")
    .eq("user_id", userId)
    .eq("input_hash", inputHash)
    .maybeSingle();
  if (cached?.result_json) {
    return NextResponse.json({ ok: true, cached: true, result: cached.result_json });
  }

  // daily limit
  const day = new Date().toISOString().slice(0, 10);
  const dailyLimit = Number(process.env.AI_DAILY_LIMIT ?? "5");
  const { data: usageRow } = await supabase.from("ai_usage").select("count").eq("user_id", userId).eq("day", day).maybeSingle();
  const used = (usageRow as any)?.count ?? 0;
  if (used >= dailyLimit) {
    return NextResponse.json({ error: "本日の生成回数上限に達しました" }, { status: 429 });
  }

  const tagLabels = topTags
    .map((slug) => (tags as any[]).find((t) => t.slug === slug)?.label_ja ?? slug)
    .filter(Boolean);

  const prompt = [
    "あなたは恋愛アプリのアシスタントです。",
    "以下はユーザー（女性）の評価履歴から推定した“好みの特徴”です。",
    "これを元に、現実的な範囲で「理想男性」を生成してください（過度にイケメン化しない）。",
    "",
    `上位特徴: ${tagLabels.join(" / ")}`,
    "",
    "出力JSON例:",
    '{ "title": "...", "description": "...", "tags": ["..."] }',
  ].join("\n");

  const ai = await callOpenAI(prompt);
  const result =
    ai ??
    ({
      title: "理想男性（暫定）",
      description: `あなたの評価傾向から見ると「${tagLabels.slice(0, 5).join("・")}」あたりが刺さりやすいです。無理に盛らず、等身大で相性が良いタイプとして提案します。`,
      tags: tagLabels.slice(0, 8),
    } as any);

  // increment usage + save
  await supabase.from("ai_usage").upsert({ user_id: userId, day, count: used + 1 }, { onConflict: "user_id,day" });
  const { data: saved, error: saveErr } = await supabase
    .from("ideal_male_generations")
    .insert({ user_id: userId, input_hash: inputHash, result_json: result })
    .select("id,created_at")
    .single();
  if (saveErr) return NextResponse.json({ error: publicErrorMessage(saveErr, "request failed") }, { status: 400 });

  return NextResponse.json({ ok: true, cached: false, result, saved });
}

