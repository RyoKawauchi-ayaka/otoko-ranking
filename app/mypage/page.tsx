import Link from "next/link";
import { requireServerUser } from "@/lib/auth";
import { isFemaleRankingPreferencesUnlocked } from "@/lib/female-unlock";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tokyoTodayYmd } from "@/lib/tokyo";

export default async function MyPage() {
  const authUser = await requireServerUser();
  const supabase = await createSupabaseServerClient();

  const [
    { data: userRow },
    { data: maleProfile },
    { data: myVotesTodayRows },
    { data: myVotesAllRows },
    { count: maleProfileTotal },
  ] = await Promise.all([
    supabase.from("users").select("id,gender,role,is_paid_user").eq("id", authUser.id).maybeSingle(),
    supabase.from("male_profiles").select("id,nickname,age").eq("user_id", authUser.id).maybeSingle(),
    supabase
      .from("votes")
      .select("target_id")
      .eq("voter_id", authUser.id)
      .eq("vote_day", tokyoTodayYmd()),
    supabase.from("votes").select("target_id").eq("voter_id", authUser.id),
    supabase.from("male_profiles").select("id", { count: "exact", head: true }),
  ]);

  const myVotesTodayUnique = new Set((myVotesTodayRows ?? []).map((v: any) => String(v.target_id))).size;
  const myVotesTotalUnique = new Set((myVotesAllRows ?? []).map((v: any) => String(v.target_id))).size;
  const maleTotal = maleProfileTotal ?? 0;
  const featuresUnlocked = isFemaleRankingPreferencesUnlocked(maleTotal, myVotesTotalUnique);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">マイページ</h1>

      <div className="rounded-xl border p-4">
        <div className="text-sm text-neutral-600">ログイン</div>
        <div className="mt-1 truncate text-sm font-medium">{authUser.email ?? authUser.id}</div>
        <div className="mt-2 flex gap-2 text-xs text-neutral-600">
          <span className="rounded-full bg-neutral-100 px-2 py-1">gender: {userRow?.gender ?? "-"}</span>
          <span className="rounded-full bg-neutral-100 px-2 py-1">role: {userRow?.role ?? "-"}</span>
        </div>
      </div>

      {userRow?.gender === "male" ? (
        <div className="rounded-xl border p-4">
          <div className="text-sm font-medium">男性プロフィール</div>
          <div className="mt-1 text-sm text-neutral-600">
            {maleProfile ? (
              <>
                {maleProfile.nickname} / {maleProfile.age}歳
              </>
            ) : (
              "未作成"
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Link className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white" href="/mypage/edit">
              編集
            </Link>
            <Link className="rounded-md border px-3 py-2 text-sm font-medium" href="/mypage/photos">
              写真管理
            </Link>
            {maleProfile ? (
              <Link className="rounded-md border px-3 py-2 text-sm font-medium" href={`/mypage/male-analytics?profile=${maleProfile.id}`}>
                評価分析
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border p-4">
          <div className="text-sm font-medium">投票状況</div>
          <div className="mt-1 text-sm text-neutral-600">今日の評価（ユニーク男性）: {myVotesTodayUnique}</div>
          <div className="mt-3">
            <Link className="text-sm underline" href="/feed">
              男性評価へ
            </Link>
          </div>

          <div className="mt-4 grid gap-3">
            {(() => {
              const need = Math.max(1, maleTotal);
              const prefTotal = myVotesTotalUnique;
              const prefPct = maleTotal > 0 ? Math.min(100, Math.round((prefTotal / need) * 100)) : 0;
              const remain = maleTotal > 0 ? Math.max(0, need - prefTotal) : 0;
              return (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                    <span>{featuresUnlocked ? "✓" : "🔒"}</span> ランキング・好み分析
                  </div>
                  <div className="mt-2 text-xs text-neutral-600">
                    {maleTotal === 0 ? (
                      "評価対象の男性がまだいません。"
                    ) : featuresUnlocked ? (
                      <span className="font-medium text-emerald-700">すべての男性を評価済み — 利用可能です</span>
                    ) : (
                      <>
                        累計ユニーク <strong>{prefTotal}</strong> / {need}{" "}
                        <span className="text-neutral-500">（あと {remain} 人の男性を初評価）</span>
                      </>
                    )}
                  </div>
                  {maleTotal > 0 ? (
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"
                        style={{ width: `${prefPct}%` }}
                      />
                    </div>
                  ) : null}
                  <div className="mt-2 text-xs text-neutral-500">本日のユニーク評価: {myVotesTodayUnique} 人</div>
                </div>
              );
            })()}
          </div>

          <div className="mt-4 grid gap-2">
            <Link className="rounded-md border px-3 py-2 text-sm font-medium" href="/mypage/preferences">
              好み分析
            </Link>
            <Link className="rounded-md border px-3 py-2 text-sm font-medium" href="/mypage/ideal">
              理想男性生成 {userRow?.is_paid_user ? "" : "（有料）"}
            </Link>
          </div>
        </div>
      )}

      <form action="/logout" method="post">
        <button className="rounded-md border px-3 py-2 text-sm font-medium" type="submit">
          ログアウト
        </button>
      </form>
    </main>
  );
}

