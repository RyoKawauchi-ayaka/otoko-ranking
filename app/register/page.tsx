"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { toJapaneseAuthError } from "@/lib/auth-error-ja";

type Gender = "male" | "female";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [gender, setGender] = useState<Gender>("female");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onRegister() {
    setBusy(true);
    setError(null);
    try {
      if (!supabase) throw new Error("Supabase設定が未完了です（.env.local を確認してください）");
      const origin = window.location.origin;
      const { data, error: e } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
        },
      });
      if (e) throw e;

      // 初回導線: オンボーディングで gender を確定させる
      localStorage.setItem("pending_gender", gender);

      if (data.session) {
        router.replace("/onboarding");
        return;
      }

      setDone(true);
    } catch (e) {
      setError(toJapaneseAuthError(e, "登録に失敗しました。"));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    setError(null);
    try {
      if (!supabase) throw new Error("Supabase設定が未完了です（.env.local を確認してください）");
      localStorage.setItem("pending_gender", gender);
      const origin = window.location.origin;
      const { error: e } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=/onboarding`,
        },
      });
      if (e) throw e;
    } catch (e) {
      setError(toJapaneseAuthError(e, "Google登録に失敗しました。"));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-6 px-6 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur md:p-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">新規登録</h1>
          <Link className="text-sm text-white/70 underline decoration-white/30 hover:text-white" href="/">
            トップへ
          </Link>
        </div>

        {!supabase ? (
          <p className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-100">
            Supabase の環境変数が未設定です。`README.md` の `.env.local` を設定してから再読み込みしてください。
          </p>
        ) : null}

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-semibold text-white/90">性別（オンボーディングで確定）</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGender("male")}
              className={`rounded-xl px-3 py-3 text-sm font-semibold ${
                gender === "male"
                  ? "bg-white text-black"
                  : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
              }`}
              disabled={busy}
            >
              男性
            </button>
            <button
              type="button"
              onClick={() => setGender("female")}
              className={`rounded-xl px-3 py-3 text-sm font-semibold ${
                gender === "female"
                  ? "bg-white text-black"
                  : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
              }`}
              disabled={busy}
            >
              女性
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <button
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
            onClick={onGoogle}
            disabled={busy || !supabase}
            type="button"
          >
            Googleで登録
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
            パスワード（8文字以上推奨）
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
          {done ? (
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
              登録確認メールを送信しました。メール内リンクからログインを完了してください。
            </p>
          ) : null}

          <button
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black shadow-sm disabled:opacity-50"
            onClick={onRegister}
            disabled={busy || !supabase || !email || password.length < 6}
            type="button"
          >
            登録
          </button>

          <p className="text-sm text-white/70">
            すでにアカウントがある場合は{" "}
            <Link className="text-white underline decoration-white/30 hover:decoration-white" href="/login">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

