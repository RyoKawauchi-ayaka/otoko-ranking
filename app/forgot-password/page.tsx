"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { toJapaneseAuthError } from "@/lib/auth-error-ja";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      if (!supabase) throw new Error("Supabase設定が未完了です。");
      const origin = window.location.origin;
      const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });
      if (e) throw e;
      setDone(true);
    } catch (e) {
      setError(toJapaneseAuthError(e, "送信に失敗しました。"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-6 px-6 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur md:p-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">パスワードを忘れた</h1>
          <Link className="text-sm text-white/70 underline decoration-white/30 hover:text-white" href="/login">
            ログインへ
          </Link>
        </div>

        <p className="mt-4 text-sm text-white/75">
          登録したメールアドレス宛に、パスワード再設定リンクを送信します。
        </p>

        <div className="mt-6 grid gap-3">
          <label className="text-sm font-medium text-white/90">
            メール
            <input
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-sm text-white placeholder:text-white/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>

          {error ? <p className="text-sm text-red-200">{error}</p> : null}
          {done ? (
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              送信しました。メール内リンクから再設定を続けてください。
            </p>
          ) : null}

          <button
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black shadow-sm disabled:opacity-50"
            onClick={onSubmit}
            disabled={busy || !supabase || !email}
            type="button"
          >
            送信
          </button>
        </div>
      </div>
    </main>
  );
}

