"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useState } from "react";

type RankRow = {
  rank: number;
  profile_id: string;
  nickname: string;
  score: number;
  n?: number;
  photo_url: string | null;
};

function PodiumAvatar({
  photoUrl,
  label,
  sizeClass,
  ringClass,
}: {
  photoUrl: string | null;
  label: string;
  sizeClass: string;
  ringClass?: string;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border-2 border-white/50 bg-black/40 shadow-[0_0_18px_rgba(236,72,153,0.35),inset_0_0_12px_rgba(255,255,255,0.08)] ${sizeClass} ${ringClass ?? ""}`}
    >
      {photoUrl ? (
        <Image src={photoUrl} alt={label} fill className="object-cover" sizes="96px" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/15 to-white/5 text-[10px] font-medium text-white/50">
          ?
        </div>
      )}
    </div>
  );
}

function CtaPrimary() {
  const [ripple, setRipple] = useState<null | { x: number; y: number; id: number }>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setRipple({ x: e.clientX - r.left, y: e.clientY - r.top, id: Date.now() });
    window.setTimeout(() => setRipple(null), 550);
  }, []);

  return (
    <motion.div
      className="relative"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 420, damping: 18 }}
    >
      <Link
        href="/register"
        onPointerDown={onPointerDown}
        className="relative flex min-h-[48px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 px-6 py-3 text-center text-sm font-bold text-white shadow-[0_0_28px_rgba(236,72,153,0.55)] transition-[background,box-shadow] duration-300 hover:bg-gradient-to-r hover:from-pink-400 hover:via-rose-500 hover:to-amber-400 hover:shadow-[0_0_40px_rgba(255,120,200,0.65)] md:min-w-[220px]"
      >
        <span className="relative z-10 drop-shadow-sm">アカウントを作成する 💖</span>
        {ripple ? (
          <span
            key={ripple.id}
            className="pointer-events-none absolute rounded-full bg-white/35"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 12,
              height: 12,
              transform: "translate(-50%, -50%)",
              animation: "landing-ripple 0.55s ease-out forwards",
            }}
          />
        ) : null}
      </Link>
    </motion.div>
  );
}

function CtaSecondary() {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 420, damping: 18 }}
    >
      <Link
        href="/login"
        className="flex min-h-[48px] min-w-[120px] items-center justify-center rounded-2xl border border-white/35 bg-black/45 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(59,130,246,0.2)] backdrop-blur-sm transition-[background,box-shadow,border-color] duration-300 hover:border-cyan-300/50 hover:bg-black/55 hover:shadow-[0_0_28px_rgba(34,211,238,0.25)]"
      >
        ログイン
      </Link>
    </motion.div>
  );
}

export default function HomeHero({ top3, more }: { top3: RankRow[]; more: RankRow[] }) {
  const reduceMotion = useReducedMotion();
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  const heartSlots = reduceMotion ? [] : [12, 28, 44, 58, 72, 86];

  return (
    <>
      <motion.main
        className="mx-auto w-full max-w-6xl px-4 pb-10 pt-4 md:px-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="relative mx-auto w-full overflow-hidden rounded-[28px] border border-pink-400/35 shadow-[0_0_50px_rgba(236,72,153,0.18),0_0_80px_rgba(99,102,241,0.12)]">
          <div className="relative aspect-[9/15] w-full md:aspect-[16/10] md:max-h-[min(88vh,820px)]">
            <Image
              src="/landing-hero.png"
              alt="男ランキング — 投票でモテを可視化"
              fill
              priority
              className="object-cover object-[center_0%] md:object-[center_12%]"
              sizes="(max-width: 768px) 100vw, min(1200px, 100vw)"
            />

            {!reduceMotion ? (
              <div className="landing-float-hearts" aria-hidden>
                {heartSlots.map((left, i) => (
                  <span
                    key={i}
                    style={{
                      left: `${left}%`,
                      animationDelay: `${i * 1.1}s`,
                      ["--hx" as string]: `${(i % 3) * 8 - 8}px`,
                    }}
                  >
                    ♥
                  </span>
                ))}
              </div>
            ) : null}

            {/* ランキング顔: 右側表彰台エリア（%はモックに合わせて調整） */}
            <div
              className="pointer-events-none absolute inset-y-[7%] right-0 w-[58%] max-w-[min(52vw,420px)] md:inset-y-[5%] md:right-[1%] md:w-[48%]"
              aria-hidden
            >
              {second ? (
                <div className="absolute left-[4%] top-[34%] md:left-[10%] md:top-[32%]">
                  <PodiumAvatar
                    photoUrl={second.photo_url}
                    label={second.nickname}
                    sizeClass="h-[13vw] w-[13vw] max-h-[72px] max-w-[72px] md:h-16 md:w-16"
                    ringClass="ring-2 ring-cyan-300/30"
                  />
                </div>
              ) : null}
              {first ? (
                <div className="absolute left-1/2 top-[16%] -translate-x-1/2 md:top-[14%]">
                  <PodiumAvatar
                    photoUrl={first.photo_url}
                    label={first.nickname}
                    sizeClass="h-[15vw] w-[15vw] max-h-[84px] max-w-[84px] md:h-[4.5rem] md:w-[4.5rem]"
                    ringClass="ring-2 ring-amber-300/50"
                  />
                </div>
              ) : null}
              {third ? (
                <div className="absolute right-[5%] top-[38%] md:right-[10%] md:top-[36%]">
                  <PodiumAvatar
                    photoUrl={third.photo_url}
                    label={third.nickname}
                    sizeClass="h-[12vw] w-[12vw] max-h-[64px] max-w-[64px] md:h-14 md:w-14"
                    ringClass="ring-2 ring-orange-300/35"
                  />
                </div>
              ) : null}

              {more.length ? (
                <div className="absolute bottom-[18%] left-1/2 flex max-w-full -translate-x-1/2 gap-1.5 px-1 md:bottom-[16%] md:gap-2">
                  {more.slice(0, 6).map((m) => (
                    <div
                      key={m.profile_id}
                      className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/35 shadow-[0_0_10px_rgba(236,72,153,0.25)] md:h-9 md:w-9"
                    >
                      {m.photo_url ? (
                        <Image src={m.photo_url} alt="" fill className="object-cover" sizes="36px" />
                      ) : (
                        <div className="h-full w-full bg-white/10" />
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* CTA: 画像上に重ねる（SPは下寄せ、md+は左エリア） */}
            <div className="absolute bottom-[6%] left-1/2 z-10 flex w-[92%] max-w-md -translate-x-1/2 flex-col items-stretch gap-3 sm:bottom-[7%] md:bottom-auto md:left-[5%] md:top-[54%] md:w-auto md:translate-x-0 md:flex-row md:items-start md:gap-4 lg:top-[52%]">
              <CtaPrimary />
              <CtaSecondary />
            </div>
          </div>
        </div>

        {/* 分析導線（コードでガラスカード — 画像内テキストの補完・クリック可能） */}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Link
            href="/mypage/male-analytics"
            className="group rounded-2xl border border-white/12 bg-white/5 p-4 shadow-[0_0_40px_rgba(59,130,246,0.08)] backdrop-blur transition hover:border-cyan-400/30 hover:bg-white/[0.07]"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/40 to-cyan-500/30 text-lg shadow-[0_0_20px_rgba(99,102,241,0.35)]">
                📊
              </div>
              <div>
                <div className="text-sm font-bold text-white">男性のモテ分析 ✨</div>
                <p className="mt-1 text-xs leading-relaxed text-white/65 md:text-sm">
                  あなたにいいねしてくれる女性の傾向を集計。強みやトレンドをグラフで把握できます。
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/mypage/preferences"
            className="group rounded-2xl border border-white/12 bg-white/5 p-4 shadow-[0_0_40px_rgba(236,72,153,0.08)] backdrop-blur transition hover:border-pink-400/35 hover:bg-white/[0.07]"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pink-500/45 to-fuchsia-600/30 text-lg shadow-[0_0_20px_rgba(236,72,153,0.35)]">
                💕
              </div>
              <div>
                <div className="text-sm font-bold text-white">女性の好み分析 💕</div>
                <p className="mt-1 text-xs leading-relaxed text-white/65 md:text-sm">
                  投票データから、あなたが惹かれる男性のタイプ傾向を可視化。意外な発見があるかも。
                </p>
              </div>
            </div>
          </Link>
        </div>
      </motion.main>
    </>
  );
}
