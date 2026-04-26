"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LikeButton({ targetId }: { targetId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState(false);

  async function onLike() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "投票に失敗しました");
      setBurst(true);
      setTimeout(() => setBurst(false), 450);
    } catch (e) {
      setError(e instanceof Error ? e.message : "投票に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        onClick={onLike}
        disabled={busy}
        className="relative flex items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        いいね（投票）
        <AnimatePresence>
          {burst ? (
            <motion.span
              className="absolute text-3xl text-red-500"
              initial={{ scale: 0.4, opacity: 0.2 }}
              animate={{ scale: 1.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
            >
              ♥
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>
    </div>
  );
}

