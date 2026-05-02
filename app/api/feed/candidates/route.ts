import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isFemaleRankingPreferencesUnlocked } from "@/lib/female-unlock";
import { tokyoTodayYmd } from "@/lib/tokyo";
import { publicSupabaseQueryError } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

const MIN_POOL = 80;

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export async function GET() {
  const json = (body: any, init?: { status?: number }) =>
    NextResponse.json(body, {
      status: init?.status,
      headers: { "cache-control": "no-store" },
    });

  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return json({ error: "unauthorized" }, { status: 401 });

  const userId = userRes.user.id;
  const { data: userRow, error: uErr } = await supabase.from("users").select("gender").eq("id", userId).maybeSingle();
  if (uErr) return json({ error: publicSupabaseQueryError(uErr) }, { status: 400 });
  if (userRow?.gender !== "female") return json({ error: "forbidden" }, { status: 403 });

  const day = tokyoTodayYmd();

  const [
    { data: allProfiles, error: pErr },
    { data: allVotes, error: avErr },
    { data: viewsToday, error: vErr },
  ] = await Promise.all([
    supabase.from("male_profiles").select("id"),
    supabase.from("votes").select("target_id,vote_day").eq("voter_id", userId),
    supabase.from("female_male_daily_views").select("profile_id,view_count").eq("viewer_id", userId).eq("day", day),
  ]);

  if (pErr) return json({ error: publicSupabaseQueryError(pErr) }, { status: 400 });
  if (avErr) return json({ error: publicSupabaseQueryError(avErr) }, { status: 400 });
  if (vErr) return json({ error: publicSupabaseQueryError(vErr) }, { status: 400 });

  const votedEver = new Set((allVotes ?? []).map((v: any) => String(v.target_id)));
  const votedToday = new Set(
    (allVotes ?? [])
      .filter((v: any) => String(v.vote_day ?? "") === day)
      .map((v: any) => String(v.target_id)),
  );
  const viewMap = new Map<string, number>();
  for (const row of (viewsToday ?? []) as any[]) {
    viewMap.set(String(row.profile_id), Number(row.view_count ?? 0));
  }

  const idsAll = (allProfiles ?? []).map((x: any) => String(x.id));
  const maleTotal = idsAll.length;
  const uniqueVotedEver = votedEver.size;
  const featuresUnlocked = isFemaleRankingPreferencesUnlocked(maleTotal, uniqueVotedEver);

  const meta = {
    male_total: maleTotal,
    unique_voted_ever: uniqueVotedEver,
    voted_today_unique: votedToday.size,
    features_unlocked: featuresUnlocked,
    exhausted_today: false,
  };

  if (!idsAll.length) return json({ profile_ids: [], meta });

  // 当日まだ評価していない男性を候補にする（翌日は同じ男性に再評価可能）
  const ids = idsAll.filter((id) => !votedToday.has(id));
  if (!ids.length) {
    return json({
      profile_ids: [],
      meta: { ...meta, exhausted_today: true },
    });
  }
  const pool = ids;

  const minGuarantee = Number(process.env.FEED_MIN_VIEWS_PER_PROFILE ?? "3");
  const randomFraction = Number(process.env.FEED_RANDOM_FRACTION ?? "0.15");
  const cap = Math.min(pool.length, Math.max(MIN_POOL, pool.length));

  type Scored = { id: string; score: number; tie: number };
  const scored: Scored[] = pool.map((id, idx) => {
    const views = viewMap.get(id) ?? 0;
    const neverRated = votedEver.has(id) ? 0 : 1;
    const underMin = views < minGuarantee ? 1 : 0;
    const score = underMin * 1_000_000 + neverRated * 100_000 - views * 1_000 + Math.random() * (randomFraction * 1000);
    return { id, score, tie: idx };
  });

  scored.sort((a, b) => b.score - a.score || a.tie - b.tie);
  const ordered = scored.slice(0, cap).map((s) => s.id);

  // small random shuffle window at tail for variety
  if (ordered.length > 12) {
    const tail = ordered.splice(Math.floor(ordered.length * 0.75));
    shuffleInPlace(tail);
    ordered.push(...tail);
  }

  return json({ profile_ids: ordered, meta });
}
