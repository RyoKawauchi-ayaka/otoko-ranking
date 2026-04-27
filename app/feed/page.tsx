import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireServerUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import FeedClient from "./feed-client";

export default async function FeedPage() {
  const authUser = await requireServerUser();
  const supabase = await createSupabaseServerClient();
  const { data: userRow } = await supabase.from("users").select("gender").eq("id", authUser.id).maybeSingle();

  // 初期設定（性別確定）が未完了ならオンボーディングへ戻す
  if (!userRow?.gender) {
    redirect("/onboarding");
  }
  if (userRow?.gender !== "female") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-6 text-white">
        <h1 className="text-lg font-semibold">男性評価</h1>
        <p className="text-sm text-white/75">このページは女性ユーザー向けです。</p>
        <a className="text-sm underline text-white/80" href="/mypage">
          マイページへ
        </a>
      </main>
    );
  }
  return (
    <Suspense>
      <FeedClient />
    </Suspense>
  );
}

