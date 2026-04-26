import Link from "next/link";
import { requireServerUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import IdealClient from "./ideal-client";

export default async function IdealPage() {
  const user = await requireServerUser();
  const supabase = await createSupabaseServerClient();

  const [{ data: userRow }, { data: usageRow }, { data: history }] = await Promise.all([
    supabase.from("users").select("gender,is_paid_user").eq("id", user.id).maybeSingle(),
    supabase.from("ai_usage").select("count").eq("user_id", user.id).eq("day", new Date().toISOString().slice(0, 10)).maybeSingle(),
    supabase
      .from("ideal_male_generations")
      .select("id,created_at,result_json")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const isPaid = !!userRow?.is_paid_user;
  const dailyLimit = 5;
  const used = (usageRow as any)?.count ?? 0;
  const remainingToday = isPaid ? Math.max(0, dailyLimit - used) : null;

  if (userRow?.gender !== "female") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">理想男性生成</h1>
          <Link className="text-sm underline" href="/mypage">
            戻る
          </Link>
        </div>
        <p className="text-sm text-neutral-700">この機能は女性ユーザー向けです。</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">理想男性生成</h1>
        <Link className="text-sm underline" href="/mypage">
          戻る
        </Link>
      </div>

      <IdealClient isPaid={isPaid} remainingToday={remainingToday} initialHistory={(history ?? []) as any[]} />
      <p className="text-xs text-neutral-500">
        ※ コスト対策のため、AIは「生成ボタン押下時のみ」実行します。同じ入力はDBキャッシュを返します。
      </p>
    </main>
  );
}

