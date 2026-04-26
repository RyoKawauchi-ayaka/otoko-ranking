import Link from "next/link";
import { requireServerUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MaleAnalyticsPage({ searchParams }: { searchParams: Promise<{ profile?: string }> }) {
  const user = await requireServerUser();
  const { profile } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: userRow } = await supabase.from("users").select("gender").eq("id", user.id).maybeSingle();
  if (userRow?.gender !== "male") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">評価分析</h1>
          <Link className="text-sm underline" href="/mypage">
            戻る
          </Link>
        </div>
        <p className="text-sm text-neutral-700">このページは男性ユーザー向けです。</p>
      </main>
    );
  }

  const { data: mp } = await supabase.from("male_profiles").select("id,nickname").eq("user_id", user.id).maybeSingle();
  const profileId = profile ?? mp?.id ?? null;
  if (!profileId) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">評価分析</h1>
          <Link className="text-sm underline" href="/mypage">
            戻る
          </Link>
        </div>
        <p className="text-sm text-neutral-700">先に男性プロフィールを作成してください。</p>
      </main>
    );
  }

  const { data: stats, error } = await supabase.rpc("get_my_male_vote_stats", { p_profile_id: profileId });
  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">評価分析</h1>
          <Link className="text-sm underline" href="/mypage">
            戻る
          </Link>
        </div>
        <p className="text-sm text-red-600">{error.message}</p>
      </main>
    );
  }

  const s = stats as any;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">評価分析</h1>
        <Link className="text-sm underline" href="/mypage">
          戻る
        </Link>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-sm font-semibold">概要</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-neutral-50 p-3">
            <div className="text-xs text-neutral-600">評価数</div>
            <div className="text-lg font-semibold">{s.total ?? 0}</div>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3">
            <div className="text-xs text-neutral-600">平均スコア</div>
            <div className="text-lg font-semibold">{Number(s.avg_score ?? 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-sm font-semibold">内訳</div>
        <div className="mt-2 grid gap-2 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3">
            <span>Normal</span>
            <span className="font-semibold">{s.normal ?? 0}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3">
            <span>Good</span>
            <span className="font-semibold">{s.good ?? 0}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3">
            <span>Excellent</span>
            <span className="font-semibold">{s.excellent ?? 0}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-sm font-semibold">女性年齢帯（任意入力分のみ）</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          {(["20s", "30s", "40s", "50s"] as const).map((k) => (
            <div key={k} className="rounded-xl bg-neutral-50 p-3">
              <div className="text-xs text-neutral-600">{k}</div>
              <div className="text-lg font-semibold">{s.female_age?.[k] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

