"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type MaleProfile = {
  id: string;
  nickname: string;
  age: number;
  prefecture: string;
  job: string;
  income_range: string | null;
  height: number | null;
  hobbies: string[];
  appeal: string | null;
};

export default function EditClient({
  gender,
  initialProfile,
}: {
  gender: string | null;
  initialProfile: MaleProfile | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [nickname, setNickname] = useState(initialProfile?.nickname ?? "");
  const [age, setAge] = useState(initialProfile?.age?.toString() ?? "");
  const [prefecture, setPrefecture] = useState(initialProfile?.prefecture ?? "");
  const [job, setJob] = useState(initialProfile?.job ?? "");
  const [incomeRange, setIncomeRange] = useState(initialProfile?.income_range ?? "");
  const [height, setHeight] = useState(initialProfile?.height?.toString() ?? "");
  const [hobbies, setHobbies] = useState((initialProfile?.hobbies ?? []).join(", "));
  const [appeal, setAppeal] = useState(initialProfile?.appeal ?? "");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      if (!supabase) throw new Error("Supabase設定が未完了です（.env.local を確認してください）");
      if (gender !== "male") throw new Error("男性ユーザーのみ編集できます");

      const { data: userRes, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      const user = userRes.user;
      if (!user) throw new Error("未ログインです");

      const payload = {
        user_id: user.id,
        nickname: nickname.trim(),
        age: Number(age),
        prefecture: prefecture.trim(),
        job: job.trim(),
        income_range: incomeRange || null,
        height: height ? Number(height) : null,
        hobbies: hobbies
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        appeal: appeal.trim() || null,
      };

      if (!payload.nickname || payload.nickname.length > 20) throw new Error("ニックネームは1〜20文字です");
      if (!Number.isFinite(payload.age) || payload.age < 18 || payload.age > 60) throw new Error("年齢は18〜60です");
      if (!payload.prefecture) throw new Error("居住地（都道府県）は必須です");
      if (!payload.job) throw new Error("職業は必須です");
      if (payload.appeal && payload.appeal.length > 200) throw new Error("一言アピールは最大200文字です");

      if (initialProfile?.id) {
        const { error: upErr } = await supabase
          .from("male_profiles")
          .update(payload)
          .eq("id", initialProfile.id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from("male_profiles").insert(payload);
        if (insErr) throw insErr;
      }

      router.replace("/mypage");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">プロフィール編集</h1>
        <Link className="text-sm underline" href="/mypage">
          戻る
        </Link>
      </div>

      <label className="text-sm font-medium">
        ニックネーム（必須）
        <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={nickname} onChange={(e) => setNickname(e.target.value)} />
      </label>

      <label className="text-sm font-medium">
        年齢（必須）
        <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" />
      </label>

      <label className="text-sm font-medium">
        居住地（都道府県）（必須）
        <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={prefecture} onChange={(e) => setPrefecture(e.target.value)} />
      </label>

      <label className="text-sm font-medium">
        職業（必須）
        <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={job} onChange={(e) => setJob(e.target.value)} />
      </label>

      <label className="text-sm font-medium">
        年収（万円）
        <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={incomeRange} onChange={(e) => setIncomeRange(e.target.value)}>
          <option value="">未設定</option>
          <option value="〜300">〜300</option>
          <option value="300〜500">300〜500</option>
          <option value="500〜700">500〜700</option>
          <option value="700〜1000">700〜1000</option>
          <option value="1000〜">1000〜</option>
        </select>
      </label>

      <label className="text-sm font-medium">
        身長（cm）
        <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={height} onChange={(e) => setHeight(e.target.value)} inputMode="numeric" />
      </label>

      <label className="text-sm font-medium">
        趣味（カンマ区切り）
        <input className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={hobbies} onChange={(e) => setHobbies(e.target.value)} />
      </label>

      <label className="text-sm font-medium">
        一言アピール（最大200文字）
        <textarea className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={appeal} onChange={(e) => setAppeal(e.target.value)} rows={4} />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        onClick={onSave}
        disabled={busy}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        保存
      </button>
    </main>
  );
}

