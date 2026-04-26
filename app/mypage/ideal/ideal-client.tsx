"use client";

import { useState } from "react";

type Generation = {
  id: string;
  created_at: string;
  result_json: any;
};

export default function IdealClient({
  isPaid,
  remainingToday,
  initialHistory,
}: {
  isPaid: boolean;
  remainingToday: number | null;
  initialHistory: Generation[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<any | null>(initialHistory[0]?.result_json ?? null);
  const [history, setHistory] = useState<Generation[]>(initialHistory);

  async function onGenerate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ideal/generate", { method: "POST" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        if (json?.upgrade_required) {
          setError("有料ユーザー限定です。アップグレードしてください。");
          return;
        }
        throw new Error(json?.error ?? "生成に失敗しました");
      }
      setLatest(json.result);
      if (json.saved) {
        setHistory((prev) => [{ id: json.saved.id, created_at: json.saved.created_at, result_json: json.result }, ...prev]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!isPaid ? (
        <div className="rounded-2xl border bg-yellow-50 p-4 text-sm text-yellow-900">
          この機能は有料ユーザー限定です。生成ボタンを押してもAI処理は実行されません。
        </div>
      ) : null}

      {remainingToday != null ? (
        <div className="text-xs text-neutral-600">今日の残り生成回数: {remainingToday}</div>
      ) : null}

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <button
        type="button"
        onClick={onGenerate}
        disabled={busy}
        className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        理想男性を生成（押した時のみ課金対象）
      </button>

      {latest ? (
        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold">今回の結果</div>
          <div className="mt-2 text-sm text-neutral-800">
            {latest.title ? <div className="text-base font-semibold">{latest.title}</div> : null}
            {latest.description ? <p className="mt-2 whitespace-pre-wrap">{latest.description}</p> : null}
          </div>
          {Array.isArray(latest.tags) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {latest.tags.map((t: string) => (
                <span key={t} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {history.length ? (
        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold">生成履歴</div>
          <div className="mt-3 grid gap-2">
            {history.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setLatest(h.result_json)}
                className="rounded-xl border px-3 py-3 text-left text-sm hover:bg-neutral-50"
              >
                <div className="text-xs text-neutral-600">{new Date(h.created_at).toLocaleString()}</div>
                <div className="mt-1 font-semibold">{h.result_json?.title ?? "（タイトルなし）"}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

