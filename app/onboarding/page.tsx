"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Gender = "male" | "female";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [gender, setGender] = useState<Gender>("female");
  const [age, setAge] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [job, setJob] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pending = localStorage.getItem("pending_gender");
    if (pending === "male" || pending === "female") setGender(pending);
  }, []);

  async function onContinue() {
    setBusy(true);
    setError(null);
    try {
      if (!supabase) throw new Error("Supabase設定が未完了です（.env.local を確認してください）");
      const { data: userRes, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      const user = userRes.user;
      if (!user) throw new Error("未ログインです");

      const { error: upsertErr } = await supabase
        .from("users")
        .upsert(
          {
            id: user.id,
            email: user.email ?? null,
            gender,
            age: gender === "female" && age ? Number(age) : null,
            height: gender === "female" && height ? Number(height) : null,
            job: gender === "female" && job ? job : null,
          },
          { onConflict: "id" },
        );
      if (upsertErr) throw upsertErr;

      localStorage.removeItem("pending_gender");
      router.replace("/feed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "初期設定に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-6 px-6 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur md:p-10">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">初期設定</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          アカウント種別（性別）を確定します。後から変更はできません。
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-semibold text-white/90">性別</p>
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

        {gender === "female" ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold text-white/90">年齢（任意）</p>
            <p className="mt-1 text-xs text-white/60">男性側の「評価傾向（20代/30代…）」の集計に使います。</p>
            <input
              className="mt-3 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-sm text-white placeholder:text-white/40"
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
              inputMode="numeric"
              placeholder="例: 27"
              disabled={busy}
            />

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold text-white/80">
                身長（任意）
                <input
                  className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-sm text-white placeholder:text-white/40"
                  value={height}
                  onChange={(e) => setHeight(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                  inputMode="numeric"
                  placeholder="例: 160"
                  disabled={busy}
                />
              </label>
              <label className="text-xs font-semibold text-white/80">
                職業（任意）
                <input
                  className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-3 text-sm text-white placeholder:text-white/40"
                  value={job}
                  onChange={(e) => setJob(e.target.value.slice(0, 40))}
                  placeholder="例: 会社員"
                  disabled={busy}
                />
              </label>
            </div>
          </div>
        ) : null}

        {!supabase ? (
          <p className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-100">
            Supabase の環境変数が未設定です。`README.md` の `.env.local` を設定してから再読み込みしてください。
          </p>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-200">{error}</p> : null}

        <button
          className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black shadow-sm disabled:opacity-50"
          onClick={onContinue}
          disabled={busy || !supabase}
          type="button"
        >
          続ける
        </button>
      </div>
    </main>
  );
}

