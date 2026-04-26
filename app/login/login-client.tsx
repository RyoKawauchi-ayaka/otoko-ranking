"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/feed";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function demoLogin(kind: "female" | "male") {
    setBusy(true);
    setError(null);
    try {
      if (!supabase) throw new Error("Supabase設定が未完了です（.env.local を確認してください）");

      // Ensure demo accounts exist (server creates + email_confirm)
      const boot = await fetch("/api/dev/bootstrap", { method: "POST" });
      const bootJson = (await boot.json().catch(() => null)) as
        | { ok?: boolean; error?: string; demo?: { female?: { email: string; password: string }; male?: { email: string; password: string } } }
        | null;
      if (!boot.ok) throw new Error(bootJson?.error ?? "デモ初期化に失敗しました");

      const creds = kind === "female" ? bootJson?.demo?.female : bootJson?.demo?.male;
      if (!creds?.email || !creds?.password) throw new Error("デモ認証情報が取得できません");

      const { error: e } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });
      if (e) throw e;

      router.replace(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "デモログインに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function onLogin() {
    setBusy(true);
    setError(null);
    try {
      if (!supabase) throw new Error("Supabase設定が未完了です（.env.local を確認してください）");
      const { error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) throw e;
      router.replace(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    setError(null);
    try {
      if (!supabase) throw new Error("Supabase設定が未完了です（.env.local を確認してください）");
      const origin = window.location.origin;
      const { error: e } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (e) throw e;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Googleログインに失敗しました");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-6 px-6 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur md:p-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">ログイン</h1>
          <Link className="text-sm text-white/70 underline decoration-white/30 hover:text-white" href="/">
            トップへ
          </Link>
        </div>

        {!supabase ? (
          <p className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-100">
            Supabase の環境変数が未設定です。`README.md` の `.env.local` を設定してから再読み込みしてください。
          </p>
        ) : null}

        <div className="mt-6 grid gap-3">
          <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-xs font-semibold text-white/80">メールが来ない/認証が面倒なとき</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-xl bg-white px-3 py-3 text-sm font-semibold text-black shadow-sm disabled:opacity-50"
                type="button"
                disabled={busy || !supabase}
                onClick={() => void demoLogin("female")}
              >
                デモ（女性）で入る
              </button>
              <button
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                type="button"
                disabled={busy || !supabase}
                onClick={() => void demoLogin("male")}
              >
                デモ（男性）で入る
              </button>
            </div>
          </div>

          <button
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
            onClick={onGoogle}
            disabled={busy || !supabase}
            type="button"
          >
            Googleでログイン
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-white/10" />
            <div className="text-xs text-white/60">または</div>
            <div className="h-px flex-1 bg-white/10" />
          </div>

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

          <label className="text-sm font-medium text-white/90">
            パスワード
            <input
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-sm text-white placeholder:text-white/40"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>

          {error ? <p className="text-sm text-red-200">{error}</p> : null}

          <button
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black shadow-sm disabled:opacity-50"
            onClick={onLogin}
            disabled={busy || !supabase || !email || !password}
            type="button"
          >
            ログイン
          </button>

          <p className="text-sm text-white/70">
            アカウントがない場合は{" "}
            <Link className="text-white underline decoration-white/30 hover:decoration-white" href="/register">
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

