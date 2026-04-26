"use client";

import { useState } from "react";

export default function ReportButton({ targetProfileId }: { targetProfileId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetProfileId, reason }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "通報に失敗しました");
      setDone(true);
      setOpen(false);
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "通報に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {done ? <p className="text-sm text-neutral-700">通報を送信しました。</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        className="rounded-md border px-3 py-2 text-sm font-medium text-red-600"
        onClick={() => setOpen((v) => !v)}
      >
        不適切として通報
      </button>
      {open ? (
        <div className="rounded-xl border p-3">
          <p className="text-sm font-medium">理由</p>
          <textarea
            className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例: なりすまし、露出が過度、誹謗中傷など"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={onSubmit}
              disabled={busy || reason.trim().length < 3}
            >
              送信
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm font-medium"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

