import Image from "next/image";
import Link from "next/link";
import { requireServerUser } from "@/lib/auth";
import { isFemaleRankingPreferencesUnlocked } from "@/lib/female-unlock";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RankingRow = {
  profile_id: string;
  nickname: string;
  age: number;
  job: string;
  income_range: string | null;
  vote_count: number;
  bayes_score: number;
};

type PhotoRow = {
  profile_id: string;
  storage_path: string;
  is_main: boolean;
  order_index: number;
};

export default async function RankingPage() {
  const authUser = await requireServerUser();
  const supabase = await createSupabaseServerClient();

  const [{ data: userRow }, { data: myVotes, error: vErr }, { count: maleTotal, error: cErr }] = await Promise.all([
    supabase.from("users").select("gender").eq("id", authUser.id).maybeSingle(),
    supabase.from("votes").select("target_id").eq("voter_id", authUser.id),
    supabase.from("male_profiles").select("id", { count: "exact", head: true }),
  ]);

  if (vErr || cErr) {
    const msg = vErr?.message ?? cErr?.message ?? "error";
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 p-6">
        <p className="text-sm text-red-600">{msg}</p>
        <Link className="text-sm underline" href="/feed">
          フィードへ戻る
        </Link>
      </main>
    );
  }

  const uniqueRatedCount = new Set((myVotes ?? []).map((v: any) => String(v.target_id))).size;
  const maleProfileTotal = maleTotal ?? 0;
  const unlocked = isFemaleRankingPreferencesUnlocked(maleProfileTotal, uniqueRatedCount);

  if (userRow?.gender === "female" && maleProfileTotal > 0 && !unlocked) {
    const need = maleProfileTotal;
    const remaining = Math.max(0, need - uniqueRatedCount);
    const pct = Math.min(100, Math.round((uniqueRatedCount / need) * 100));
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">ランキング</h1>
          <Link className="text-sm underline" href="/feed">
            男性評価
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-white backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),transparent_40%)]" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg">🔒</span>
              ランキングはロック中
            </div>
            <div className="mt-2 text-sm text-white/75">
              登録されている全男性（<strong className="text-white">{maleProfileTotal}人</strong>）を、それぞれ
              <strong className="text-white"> 累計1回以上</strong>評価すると解放されます。
            </div>
            <div className="mt-3 text-sm text-white/90">
              進捗（ユニーク）: <span className="font-semibold">{uniqueRatedCount}</span> / {need}{" "}
              <span className="text-white/60">（あと {remaining} 人）</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-emerald-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-4">
              <Link
                className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"
                href="/feed"
              >
                男性評価へ
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const { data: ranking, error: rErr } = await supabase
    .from("male_ranking")
    .select("profile_id,nickname,age,job,income_range,vote_count,bayes_score")
    .order("bayes_score", { ascending: false })
    .limit(100);
  if (rErr) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 p-6">
        <p className="text-sm text-red-600">{rErr.message}</p>
        <Link className="text-sm underline" href="/feed">
          フィードへ戻る
        </Link>
      </main>
    );
  }

  const rows = (ranking ?? []) as RankingRow[];
  const ids = rows.map((r) => r.profile_id);
  const { data: photos } = await supabase
    .from("photos")
    .select("profile_id,storage_path,is_main,order_index")
    .in("profile_id", ids)
    .order("is_main", { ascending: false })
    .order("order_index", { ascending: true });

  const mainPhotoPathByProfile = new Map<string, string>();
  for (const p of (photos ?? []) as PhotoRow[]) {
    if (!mainPhotoPathByProfile.has(p.profile_id)) mainPhotoPathByProfile.set(p.profile_id, p.storage_path);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">🏆 モテランキング</h1>
        <Link className="text-sm underline" href="/feed">
          男性評価
        </Link>
      </div>

      <ol className="flex flex-col gap-2">
        {rows.map((r, idx) => {
          const path = mainPhotoPathByProfile.get(r.profile_id) ?? null;
          const url = path ? supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl : null;
          return (
            <li key={r.profile_id}>
              <Link
                href={`/profile/${r.profile_id}`}
                className="flex items-center gap-3 rounded-xl border p-3 hover:bg-neutral-50"
              >
                <div className="w-8 text-center text-sm font-semibold">
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                </div>
                <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-neutral-100">
                  {url ? (
                    <Image src={url} alt={r.nickname} fill className="object-cover" sizes="48px" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {r.nickname} / {r.age}歳
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-neutral-600">
                    <span>{r.job}</span>
                    {r.income_range ? <span>{r.income_range}</span> : null}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-neutral-600">Bayes</div>
                  <div className="text-base font-semibold">{Number(r.bayes_score).toFixed(2)}</div>
                  <div className="text-[11px] text-neutral-500">n={r.vote_count}</div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </main>
  );
}

