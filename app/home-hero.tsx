"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import PodiumIllustration from "./podium-illustration";
import { useState } from "react";
import HeartField from "./heart-field";

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
  const [registerBurst, setRegisterBurst] = useState<null | number>(null);
  const [registerParticles, setRegisterParticles] = useState<null | { id: number; x: number; y: number }>(null);

  return (
    <motion.main
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-10 pt-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="neon-card relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_100px_rgba(236,72,153,0.10)] backdrop-blur md:p-10">
        {/* floating hearts */}
        <HeartField />
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
              <span className="neon-title inline-block">表彰台に立つのは誰？</span>
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
            className="relative rounded-2xl border border-white/10 bg-black/20 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_60px_rgba(168,85,247,0.18)]"
          >
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              animate={{ boxShadow: ["0 0 0 rgba(0,0,0,0)", "0 0 40px rgba(236,72,153,0.16)", "0 0 0 rgba(0,0,0,0)"] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <PodiumIllustration top3={top3} />
          </motion.div>
        </div>

        <motion.div
          className="mt-6 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          {/* Login: gentle hover float + sheen */}
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
            <Link
              className="group relative inline-flex overflow-hidden rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-sm"
              href="/login"
            >
              <span className="relative z-10">ログイン</span>
              {/* sheen */}
              <span className="pointer-events-none absolute inset-0">
                <motion.span
                  className="absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/55 to-transparent opacity-0 group-hover:opacity-100"
                  animate={{ x: ["0%", "220%"] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                />
              </span>
            </Link>
          </motion.div>

          {/* Register: click burst */}
          <div className="relative">
            <Link
              className="relative inline-flex overflow-hidden rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              href="/register"
              onPointerDown={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setRegisterBurst(Date.now());
                setRegisterParticles({ id: Date.now(), x: e.clientX - rect.left, y: e.clientY - rect.top });
                setTimeout(() => setRegisterBurst(null), 450);
                setTimeout(() => setRegisterParticles(null), 650);
              }}
            >
              新規登録
            </Link>
            <AnimatePresence>
              {registerBurst ? (
                <motion.span
                  key={registerBurst}
                  className="pointer-events-none absolute left-1/2 top-1/2 block h-2 w-2"
                  initial={{ opacity: 0.9, scale: 0.2, x: "-50%", y: "-50%" }}
                  animate={{ opacity: 0, scale: 16 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  style={{
                    background:
                      "radial-gradient(circle, rgba(236,72,153,0.45), rgba(59,130,246,0.18) 45%, transparent 70%)",
                    filter: "blur(0.2px)",
                  }}
                />
              ) : null}
            </AnimatePresence>
            <AnimatePresence>
              {registerParticles ? (
                <motion.div
                  key={registerParticles.id}
                  className="pointer-events-none absolute inset-0"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.65 }}
                >
                  {Array.from({ length: 7 }).map((_, i) => {
                    const a = (Math.PI * 2 * i) / 7;
                    const dx = Math.cos(a) * (18 + i * 2);
                    const dy = Math.sin(a) * (18 + i * 2);
                    return (
                      <motion.span
                        key={i}
                        className="absolute text-[12px]"
                        style={{
                          left: registerParticles.x,
                          top: registerParticles.y,
                          color: i % 2 ? "rgba(236,72,153,0.9)" : "rgba(59,130,246,0.85)",
                          filter: "drop-shadow(0 0 10px rgba(236,72,153,0.25))",
                        }}
                        initial={{ x: 0, y: 0, scale: 0.7, opacity: 0.95 }}
                        animate={{ x: dx, y: dy, scale: 1.15, opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      >
                        ♥
                      </motion.span>
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* トップからランキング導線は出さない */}
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
    </motion.main>
  );
}

