"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { toJapaneseAuthError } from "@/lib/auth-error-ja";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // resetPasswordForEmail のリンクから来ると、セッションが確立される想定
    // （確立されていない場合は更新失敗→エラーメッセージで誘導）
    setReady(true);
  }, []);

  async function onUpdate() {
    setBusy(true);
    setError(null);
    try {
      if (!supabase) throw new Error("Supabase設定が未完了です。");
      const { error: e } = await supabase.auth.updateUser({ password });
      if (e) throw e;
      router.replace("/login");
    } catch (e) {
      setError(toJapaneseAuthError(e, "再設定に失敗しました。リンクが期限切れの可能性があります。"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-6 px-6 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur md:p-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">パスワード再設定</h1>
          <Link className="text-sm text-white/70 underline decoration-white/30 hover:text-white" href="/login">
            ログインへ
          </Link>
        </div>

        <div className="mt-6 grid gap-3">
          <label className="text-sm font-medium text-white/90">
            新しいパスワード
            <input
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-sm text-white placeholder:text-white/40"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
            />
          </label>

          {error ? <p className="text-sm text-red-200">{error}</p> : null}

          <button
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black shadow-sm disabled:opacity-50"
            onClick={onUpdate}
            disabled={!ready || busy || !supabase || password.length < 6}
            type="button"
          >
            変更する
          </button>

          <p className="text-xs text-white/60">
            ※ リンクが期限切れの場合は、もう一度{" "}
            <Link className="underline" href="/forgot-password">
              再設定メールを送信
            </Link>{" "}
            してください。
          </p>
        </div>
      </div>
    </main>
  );
}

