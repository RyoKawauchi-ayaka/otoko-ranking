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
              <motion.span
                className="inline-block bg-gradient-to-r from-white via-white to-white/70 bg-[length:220%_100%] bg-clip-text text-transparent"
                animate={{ backgroundPositionX: ["0%", "100%", "0%"] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              >
                表彰台に立つのは誰？
              </motion.span>
              <br />
              <motion.span
                className="inline-block text-white"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              >
                投票で“モテ”を可視化。
              </motion.span>
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
                    className="group rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10"
                    aria-label={`ランキング上位のプロフィールを見る`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white/10">
                      {p.photo_url ? (
                        <Image
                          src={p.photo_url}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 33vw, 140px"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(236,72,153,0.25),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(59,130,246,0.22),transparent_55%),linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
                      )}
                      <div
                        className={`pointer-events-none absolute inset-0 ring-2 ${
                          p.rank === 1
                            ? "ring-yellow-300/60"
                            : p.rank === 2
                              ? "ring-slate-200/50"
                              : "ring-orange-300/50"
                        }`}
                      />
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

