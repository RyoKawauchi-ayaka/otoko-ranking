import Link from "next/link";
import { requireServerUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type VoteRow = { id: string; target_id: string; rating: "normal" | "good" | "excellent" | null };
type SelectionRow = { vote_id: string; tag_id: string };
type TagRow = { id: string; slug: string; label_ja: string; category: string };

function points(rating: VoteRow["rating"]) {
  if (rating === "excellent") return 3;
  if (rating === "good") return 2;
  return 1;
}

export default async function PreferencesPage() {
  const user = await requireServerUser();
  const supabase = await createSupabaseServerClient();

  const [{ data: userRow }, { data: votes }, { data: tags }] = await Promise.all([
    supabase.from("users").select("gender").eq("id", user.id).maybeSingle(),
    supabase.from("votes").select("id,target_id,rating").eq("voter_id", user.id),
    supabase.from("vote_feature_tags").select("id,slug,label_ja,category"),
  ]);

  if (userRow?.gender !== "female") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">好み分析</h1>
          <Link className="text-sm underline" href="/mypage">
            戻る
          </Link>
        </div>
        <p className="text-sm text-neutral-700">この機能は女性ユーザー向けです。</p>
      </main>
    );
  }

  const voteRows = (votes ?? []) as VoteRow[];
  const uniqueTargets = new Set(voteRows.map((v) => v.target_id)).size;
  const unlockThreshold = 20;
  if (uniqueTargets < unlockThreshold) {
    const remain = unlockThreshold - uniqueTargets;
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">好み分析</h1>
          <Link className="text-sm underline" href="/mypage">
            戻る
          </Link>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-white backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_40%)]" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg">🔒</span>
              好み分析はロック中
            </div>
            <div className="mt-2 text-sm text-white/75">
              累計でユニークな男性を<strong className="text-white"> {unlockThreshold}人</strong>評価すると解放されます。
            </div>
            <div className="mt-3 text-sm text-white/90">
              進捗: <span className="font-semibold">{uniqueTargets}</span> / {unlockThreshold}{" "}
              <span className="text-white/60">（あと {remain} 人）</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-400"
                style={{ width: `${Math.min(100, Math.round((uniqueTargets / unlockThreshold) * 100))}%` }}
              />
            </div>
            <div className="mt-4">
              <Link className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black" href="/feed">
                男性評価へ
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const voteIds = voteRows.map((v) => v.id);
  const { data: selections } = await supabase.from("vote_feature_selections").select("vote_id,tag_id").in("vote_id", voteIds);

  const tagById = new Map<string, TagRow>();
  for (const t of (tags ?? []) as TagRow[]) tagById.set(t.id, t);

  const ptsByVoteId = new Map<string, number>();
  for (const v of voteRows) ptsByVoteId.set(v.id, points(v.rating));

  const scoreBySlug = new Map<string, number>();
  const countBySlug = new Map<string, number>();
  for (const s of (selections ?? []) as SelectionRow[]) {
    const t = tagById.get(s.tag_id);
    if (!t) continue;
    const pts = ptsByVoteId.get(s.vote_id) ?? 1;
    scoreBySlug.set(t.slug, (scoreBySlug.get(t.slug) ?? 0) + pts);
    countBySlug.set(t.slug, (countBySlug.get(t.slug) ?? 0) + 1);
  }

  const ranked = Array.from(scoreBySlug.entries())
    .map(([slug, score]) => ({ slug, score, count: countBySlug.get(slug) ?? 0, tag: Array.from(tagById.values()).find((t) => t.slug === slug) }))
    .filter((x) => x.tag)
    .sort((a, b) => b.score - a.score);

  const top = ranked.slice(0, 5).map((x) => x.tag!.label_ja);
  const muscular = (scoreBySlug.get("muscular") ?? 0) + (scoreBySlug.get("fit") ?? 0);
  const smart = scoreBySlug.get("smart") ?? 0;
  const salt = scoreBySlug.get("salt_face") ?? 0;
  const strong = scoreBySlug.get("strong_face") ?? 0;

  const bullets: string[] = [];
  if (muscular > 20) bullets.push("筋肉質・引き締まった体型が好み");
  if (smart > 15) bullets.push("知的な雰囲気が好み");
  if (salt > strong && salt > 10) bullets.push("顔タイプは塩顔寄りが好み");
  if (strong > salt && strong > 10) bullets.push("顔タイプは濃い顔寄りが好み");
  if (!bullets.length) bullets.push("いろいろなタイプをバランスよく評価する傾向");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">好み分析</h1>
        <Link className="text-sm underline" href="/mypage">
          戻る
        </Link>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-sm font-semibold">あなたは…</div>
        <div className="mt-2 space-y-2">
          {bullets.map((b) => (
            <div key={b} className="rounded-xl bg-neutral-50 p-3 text-sm font-semibold">
              {b}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-sm font-semibold">よく出てくる特徴（上位）</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {top.length ? (
            top.map((t) => (
              <span key={t} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800">
                {t}
              </span>
            ))
          ) : (
            <span className="text-sm text-neutral-600">まだデータが少ないです。</span>
          )}
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        ※ 初期実装はルールベースです。将来的にAIで精度を上げます。
      </p>
    </main>
  );
}

