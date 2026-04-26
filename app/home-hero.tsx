"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import PodiumIllustration from "./podium-illustration";

export default function HomeHero({
  top3,
}: {
  top3: {
    rank: number;
    profile_id: string;
    nickname: string;
    score: number;
    n?: number;
    photo_url: string | null;
  }[];
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col justify-center gap-6 px-6 py-10">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur md:p-10">
        <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -top-28 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="grid gap-6 md:grid-cols-2 md:items-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              投票でランキングが動く
            </div>

            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-5xl">
              表彰台に立つのは誰？
              <br />
              投票で“モテ”を可視化。
            </h1>

            <p className="mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-white/75 md:text-base">
              男性はプロフィールを公開。女性はフィードで投票。
              ランキングがリアルタイムに変化する“遊べる”投票アプリです。
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.05, ease: "easeOut" }}
            className="rounded-2xl border border-white/10 bg-black/20 p-3"
          >
            <PodiumIllustration />
            {top3?.length ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {top3.map((p) => (
                  <Link
                    key={p.profile_id}
                    href={`/profile/${p.profile_id}`}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 text-center text-sm font-semibold text-white/90">
                        {p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : "🥉"}
                      </div>
                      <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/10">
                        {p.photo_url ? <Image src={p.photo_url} alt={p.nickname} fill className="object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-white">{p.nickname}</div>
                        <div className="text-[11px] text-white/70">
                          Bayes {p.score.toFixed(2)}
                          {typeof p.n === "number" ? <span className="text-white/55"> · n={p.n}</span> : null}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </motion.div>
        </div>

        <motion.div
          className="mt-6 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          <Link
            className="group relative overflow-hidden rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-sm"
            href="/login"
          >
            <span className="relative z-10">ログイン</span>
            <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="absolute -left-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-pink-500/25 blur-2xl" />
              <span className="absolute -right-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-blue-500/25 blur-2xl" />
            </span>
          </Link>

          <Link
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            href="/register"
          >
            新規登録
          </Link>

          <Link className="px-2 py-3 text-sm text-white/70 underline decoration-white/30 hover:text-white" href="/ranking">
            ランキングを見る
          </Link>
        </motion.div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { title: "スワイプで快適", body: "左右で写真、上で次のユーザー。テンポよく見られます。" },
          { title: "1日N票制限", body: "投票は日次制限つき。熱量の“質”を保ちます。" },
          { title: "通報・管理", body: "不適切なユーザーは通報、管理画面で対応できます。" },
        ].map((x) => (
          <div key={x.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80 backdrop-blur">
            <div className="text-sm font-semibold text-white">{x.title}</div>
            <div className="mt-1 text-sm leading-relaxed text-white/70">{x.body}</div>
          </div>
        ))}
      </div>
    </main>
  );
}

