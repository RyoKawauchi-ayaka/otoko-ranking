"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import { motion, AnimatePresence } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getProfilePhotoPublicUrl } from "@/lib/supabase/public-url";
import { tokyoDayStartIso } from "@/lib/tokyo";

type FeatureTag = { id: string; slug: string; label_ja: string; category: string };

type RankingRow = {
  profile_id: string;
  nickname: string;
  age: number;
  prefecture: string;
  job: string;
  income_range: string | null;
  height: number | null;
  hobbies: string[] | null;
  appeal: string | null;
  /** 評価件数（旧カラム名互換: male_ranking.vote_count） */
  vote_count: number;
  bayes_score: number;
};

type PhotoRow = {
  id: string;
  profile_id: string;
  storage_path: string;
  is_main: boolean;
  order_index: number;
};

export default function FeedClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  const [cards, setCards] = useState<RankingRow[]>([]);
  const [photosByProfile, setPhotosByProfile] = useState<Record<string, PhotoRow[]>>({});
  const [votedTargetIds, setVotedTargetIds] = useState<Set<string>>(new Set());
  const [todayVotes, setTodayVotes] = useState(0);
  const [rankUnlockCount, setRankUnlockCount] = useState(0);
  const [rankLockedPopupOpen, setRankLockedPopupOpen] = useState(false);
  const [totalUniqueVotes, setTotalUniqueVotes] = useState(0);
  const [meId, setMeId] = useState<string | null>(null);
  const [unlockModal, setUnlockModal] = useState<null | { title: string; body: string; kind: "rank" | "pref"; nonce: number }>(
    null,
  );

  const [cardIndex, setCardIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [likeBurst, setLikeBurst] = useState(false);
  const [lastVote, setLastVote] = useState<null | { targetId: string; rating: "normal" | "good" | "excellent" }>(
    null,
  );
  const [voteFx, setVoteFx] = useState<null | { rating: "normal" | "good" | "excellent"; nonce: number }>(null);
  const [featureTags, setFeatureTags] = useState<FeatureTag[]>([]);
  const [featurePickerOpen, setFeaturePickerOpen] = useState(false);
  const [selectedFeatureSlugs, setSelectedFeatureSlugs] = useState<Set<string>>(new Set());
  const [savingFeatures, setSavingFeatures] = useState(false);
  const lastImpressionRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (!supabase) throw new Error("Supabase設定が未完了です（.env.local を確認してください）");

        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        if (!user) throw new Error("unauthorized");

        const candRes = await fetch("/api/feed/candidates", { cache: "no-store" });
        const candJson = (await candRes.json().catch(() => null)) as { profile_ids?: string[]; error?: string } | null;
        if (!candRes.ok) throw new Error(candJson?.error ?? "候補の取得に失敗しました");
        const profileIds = (candJson?.profile_ids ?? []) as string[];
        if (!profileIds.length) {
          throw new Error("評価できる男性がいません（全員評価済みの可能性があります）");
        }

        const [{ data: votes, error: vErr }, { data: rankingRows, error: rErr }, { data: details, error: dErr }] =
          await Promise.all([
            supabase
              .from("votes")
              .select("target_id,created_at")
              .eq("voter_id", user.id)
              // UIの「再投票 no-op」を避けるため、累計で持つ
              ,
            supabase
              .from("male_ranking")
              .select("profile_id,nickname,age,prefecture,job,income_range,vote_count,bayes_score")
              .in("profile_id", profileIds),
            supabase.from("male_profiles").select("id,height,hobbies,appeal").in("id", profileIds),
          ]);

        if (rErr) throw rErr;
        if (vErr) throw vErr;
        const rankingById = new Map<string, RankingRow>();
        for (const row of (rankingRows ?? []) as RankingRow[]) {
          rankingById.set(row.profile_id, row);
        }

        const voteRows = (votes ?? []) as any[];
        const voted = new Set<string>(voteRows.map((v: any) => String(v.target_id)));
        const todayUnique = new Set(
          voteRows
            .filter((v: any) => typeof v?.created_at === "string" && v.created_at >= tokyoDayStartIso())
            .map((v: any) => String(v.target_id)),
        ).size;

        const detailById = new Map<string, { height: number | null; hobbies: string[] | null; appeal: string | null }>();
        for (const row of (details ?? []) as any[]) {
          detailById.set(String(row.id), {
            height: row.height ?? null,
            hobbies: (row.hobbies ?? null) as string[] | null,
            appeal: row.appeal ?? null,
          });
        }
        const merged = profileIds.map((id) => {
          const r = rankingById.get(id);
          const d = detailById.get(id);
          if (!r) {
            throw new Error("プロフィール情報の取得に失敗しました");
          }
          return {
            ...r,
            height: d?.height ?? null,
            hobbies: d?.hobbies ?? null,
            appeal: d?.appeal ?? null,
            bayes_score: Number(r.bayes_score ?? 0),
          };
        });

        const { data: tags, error: tagErr } = await supabase
          .from("vote_feature_tags")
          .select("id,slug,label_ja,category")
          .order("category", { ascending: true })
          .order("label_ja", { ascending: true });
        if (tagErr) throw tagErr;

        const { data: photos, error: pErr } = await supabase
          .from("photos")
          .select("id,profile_id,storage_path,is_main,order_index")
          .in("profile_id", profileIds)
          .order("is_main", { ascending: false })
          .order("order_index", { ascending: true });
        if (pErr) throw pErr;

        const grouped: Record<string, PhotoRow[]> = {};
        for (const p of (photos ?? []) as PhotoRow[]) {
          (grouped[p.profile_id] ??= []).push(p);
        }

        if (cancelled) return;
        setCards(merged);
        setPhotosByProfile(grouped);
        setVotedTargetIds(voted);
        setTodayVotes(todayUnique);
        setRankUnlockCount(todayUnique);
        setTotalUniqueVotes(voted.size);
        setMeId(user.id);
        setCardIndex(0);
        setPhotoIndex(0);
        setLastVote(null);
        setVoteFx(null);
        setFeatureTags((tags ?? []) as FeatureTag[]);
        setFeaturePickerOpen(false);
        setSelectedFeatureSlugs(new Set());
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const current = cards[cardIndex];
  const currentPhotos = current ? photosByProfile[current.profile_id] ?? [] : [];
  const currentPhoto = currentPhotos[photoIndex];
  const currentPhotoUrl =
    supabase && currentPhoto ? getProfilePhotoPublicUrl(supabase as any, currentPhoto.storage_path) : null;

  const canGoPrevPhoto = photoIndex > 0;
  const canGoNextPhoto = photoIndex + 1 < currentPhotos.length;
  const liked = votedTargetIds.has(current?.profile_id ?? "");
  const votedThisCard = !!current && (liked || lastVote?.targetId === current.profile_id);

  const currentPhotoUrls =
    supabase && currentPhotos.length
      ? currentPhotos.map((p) => getProfilePhotoPublicUrl(supabase as any, p.storage_path))
      : [];

  useEffect(() => {
    if (loading || !current) return;
    if (lastImpressionRef.current === current.profile_id) return;
    lastImpressionRef.current = current.profile_id;
    void fetch("/api/feed/impression", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profileId: current.profile_id }),
    }).catch(() => {});
  }, [loading, current]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (canGoNextPhoto) setPhotoIndex((i) => i + 1);
    },
    onSwipedRight: () => {
      if (canGoPrevPhoto) setPhotoIndex((i) => i - 1);
    },
    onSwipedUp: () => {
      if (!votedThisCard) return;
      if (cardIndex + 1 < cards.length) {
        setCardIndex((i) => i + 1);
        setPhotoIndex(0);
      }
    },
    trackMouse: true,
  });

  function goNextCard() {
    setVoteFx(null);
    setLikeBurst(false);
    setFeaturePickerOpen(false);
    setSelectedFeatureSlugs(new Set());
    setLastVote(null);
    if (cardIndex + 1 < cards.length) {
      setCardIndex((i) => i + 1);
      setPhotoIndex(0);
    }
  }

  async function onVote(rating: "normal" | "good" | "excellent") {
    if (!current) return;
    if (voting) return;
    if (votedTargetIds.has(current.profile_id)) return;
    try {
      setVoting(true);
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetId: current.profile_id, rating }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; noop?: boolean; error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "投票に失敗しました");

      if (rating !== "normal") {
        setLikeBurst(true);
        setTimeout(() => setLikeBurst(false), 450);
      }

      setVotedTargetIds((prev) => {
        const next = new Set(prev);
        next.add(current.profile_id);
        return next;
      });
      if (!json?.noop) {
        setTodayVotes((n) => n + 1);
        setRankUnlockCount((n) => n + 1);
        setTotalUniqueVotes((n) => n + 1);

        // unlock popups (first time only; localStorage)
        const uid = meId;
        if (uid) {
          const nextToday = rankUnlockCount + 1;
          const nextTotal = totalUniqueVotes + 1;

          if (nextToday === 10) {
            const key = `unlock_shown_rank_${uid}_${tokyoDayStartIso().slice(0, 10)}`;
            if (!localStorage.getItem(key)) {
              localStorage.setItem(key, "1");
              setUnlockModal({
                kind: "rank",
                nonce: Date.now(),
                title: "ランキングが解放されました！",
                body: "今日の評価が10人に到達しました。さっそくランキングをチェックしよう。",
              });
            }
          }

          if (nextTotal === 20) {
            const key = `unlock_shown_pref_${uid}`;
            if (!localStorage.getItem(key)) {
              localStorage.setItem(key, "1");
              setUnlockModal({
                kind: "pref",
                nonce: Date.now(),
                title: "あなたの好み分析が利用可能になりました！",
                body: "累計20人の評価に到達しました。あなたの傾向を見てみよう。",
              });
            }
          }
        }
      }

      setLastVote({ targetId: current.profile_id, rating });
      setVoteFx({ rating, nonce: Date.now() });
      // feature picking is optional; keep available for now but default closed
      setFeaturePickerOpen(false);
      setSelectedFeatureSlugs(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "投票に失敗しました");
    } finally {
      setVoting(false);
    }
  }

  async function saveFeatures() {
    if (!current) return;
    if (!lastVote || lastVote.targetId !== current.profile_id) return;
    if (!selectedFeatureSlugs.size) {
      setFeaturePickerOpen(false);
      return;
    }
    try {
      setSavingFeatures(true);
      const res = await fetch("/api/vote/features", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetId: current.profile_id, tagSlugs: Array.from(selectedFeatureSlugs) }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "特徴の保存に失敗しました");
      setFeaturePickerOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "特徴の保存に失敗しました");
    } finally {
      setSavingFeatures(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center p-6">
        <p className="text-sm text-neutral-300">読み込み中…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 p-6">
        <p className="text-sm text-red-300">{error}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            className="underline text-white/80"
            onClick={() => window.location.reload()}
          >
            再読み込み
          </button>
          <Link className="underline text-white/80" href="/ranking">
            ランキングを見る
          </Link>
          <Link className="underline text-white/80" href="/mypage">
            マイページ
          </Link>
        </div>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center p-6">
        <p className="text-sm text-neutral-300">表示できるユーザーがいません。</p>
      </main>
    );
  }

  const voteFxStyle =
    voteFx?.rating === "excellent"
      ? { label: "EXCELLENT +3", bg: "bg-pink-600/30", border: "border-pink-400/60", text: "text-pink-50" }
      : voteFx?.rating === "good"
        ? { label: "GOOD +2", bg: "bg-emerald-600/30", border: "border-emerald-400/60", text: "text-emerald-50" }
        : voteFx?.rating === "normal"
          ? { label: "NORMAL +1", bg: "bg-neutral-900/25", border: "border-white/40", text: "text-white" }
          : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-4 p-3 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">男性評価</h1>
        <div className="flex items-center gap-3">
          {(() => {
            const locked = rankUnlockCount < 10;
            return (
              <button
                type="button"
                className="text-sm underline text-white/80"
                onClick={() => {
                  if (locked) setRankLockedPopupOpen(true);
                  else router.push("/ranking");
                }}
              >
                ランキング{locked ? "（🔒）" : ""}
              </button>
            );
          })()}
        </div>
      </div>

      <AnimatePresence>
        {rankLockedPopupOpen ? (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRankLockedPopupOpen(false)}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950/90 p-5 text-white shadow-xl backdrop-blur"
              initial={{ scale: 0.98, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const need = 10;
                const cnt = rankUnlockCount;
                const remain = Math.max(0, need - cnt);
                const pct = Math.min(100, Math.round((cnt / need) * 100));
                return (
                  <>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg">🔒</span>
                      ランキングはロック中
                    </div>
                    <div className="mt-2 text-sm text-white/75">
                      今日、ユニークな男性を<strong className="text-white"> {need}人</strong>評価すると解放されます。
                    </div>
                    <div className="mt-3 text-sm text-white/90">
                      進捗: <span className="font-semibold">{cnt}</span> / {need}{" "}
                      <span className="text-white/60">（あと {remain} 人）</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-emerald-400" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
                        onClick={() => setRankLockedPopupOpen(false)}
                      >
                        閉じる
                      </button>
                      <Link
                        className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"
                        href="/feed"
                        onClick={() => setRankLockedPopupOpen(false)}
                      >
                        評価を続ける
                      </Link>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* unlock gauge */}
      <div className="mx-auto w-full max-w-md md:max-w-3xl">
        {(() => {
          const rankNeed = 10;
          const prefNeed = 20;
          const rankCnt = rankUnlockCount;
          const prefCnt = totalUniqueVotes;
          const nextTarget =
            rankCnt < rankNeed
              ? { label: "ランキング解放", need: rankNeed, cnt: rankCnt, suffix: "（今日）" }
              : prefCnt < prefNeed
                ? { label: "好み分析解放", need: prefNeed, cnt: prefCnt, suffix: "（累計）" }
                : null;
          const pct = nextTarget ? Math.min(100, Math.round((nextTarget.cnt / nextTarget.need) * 100)) : 100;
          const remain = nextTarget ? Math.max(0, nextTarget.need - nextTarget.cnt) : 0;
          return (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/85 backdrop-blur">
              <div className="text-sm font-semibold text-white">解放ゲージ</div>
              {nextTarget ? (
                <div className="mt-2 text-sm text-white/75">
                  次: <span className="font-semibold text-white">{nextTarget.label}</span> {nextTarget.suffix}{" "}
                  <span className="text-white/60">（あと {remain} 人）</span>
                </div>
              ) : (
                <div className="mt-2 text-sm text-emerald-200">すべて解放済み！</div>
              )}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-pink-400 via-purple-400 to-sky-400" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/70">
                <span>
                  ランキング: <span className="font-semibold text-white">{Math.min(rankNeed, rankCnt)}</span>/{rankNeed}（今日）
                </span>
                <span>
                  好み分析: <span className="font-semibold text-white">{Math.min(prefNeed, prefCnt)}</span>/{prefNeed}（累計）
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* unlock modal */}
      <AnimatePresence>
        {unlockModal ? (
          <motion.div
            key={unlockModal.nonce}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setUnlockModal(null)}
          >
            <motion.div
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/90 p-6 text-white shadow-xl backdrop-blur"
              initial={{ scale: 0.95, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-0 opacity-70">
                {Array.from({ length: 18 }).map((_, i) => {
                  const x = 10 + (i * 80) % 360;
                  const y = 120 + (i % 6) * 18;
                  const rot = (i % 2 ? 35 : -25) + i * 3;
                  return (
                    <motion.span
                      key={i}
                      className="absolute text-sm"
                      style={{
                        left: `${(x / 360) * 100}%`,
                        top: `${(y / 220) * 100}%`,
                        color:
                          i % 3 === 0
                            ? "rgba(236,72,153,0.95)"
                            : i % 3 === 1
                              ? "rgba(168,85,247,0.9)"
                              : "rgba(59,130,246,0.9)",
                        filter: "drop-shadow(0 0 14px rgba(236,72,153,0.18))",
                      }}
                      initial={{ opacity: 0, y: 12, rotate: rot, scale: 0.7 }}
                      animate={{
                        opacity: [0, 1, 0],
                        y: [12, -18, -42],
                        rotate: [rot, rot + 20, rot + 30],
                        scale: [0.7, 1.05, 0.9],
                      }}
                      transition={{
                        duration: 1.6 + (i % 5) * 0.1,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: (i % 6) * 0.08,
                      }}
                    >
                      {i % 4 === 0 ? "✦" : "♥"}
                    </motion.span>
                  );
                })}
              </div>

              <div className="relative">
                <div className="text-sm font-semibold text-white/80">UNLOCK!</div>
                <div className="mt-2 text-xl font-extrabold tracking-tight">{unlockModal.title}</div>
                <div className="mt-2 text-sm text-white/75">{unlockModal.body}</div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                    onClick={() => setUnlockModal(null)}
                  >
                    閉じる
                  </button>
                  {unlockModal.kind === "rank" ? (
                    <button
                      type="button"
                      className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"
                      onClick={() => router.push("/ranking")}
                    >
                      ランキングへ
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"
                      onClick={() => router.push("/mypage/preferences")}
                    >
                      好み分析へ
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mx-auto w-full max-w-md md:max-w-3xl">
        <div
          {...swipeHandlers}
          className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-neutral-100 shadow-sm"
        >
          {currentPhotoUrl ? (
            <Image
              src={currentPhotoUrl}
              alt={current.nickname}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
              写真がありません
            </div>
          )}

          {/* photo dots */}
          {currentPhotos.length > 1 ? (
            <div className="absolute left-0 right-0 top-3 flex justify-center gap-1">
              {currentPhotos.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${
                    i === photoIndex ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          ) : null}

          {/* vote effect (full overlay) */}
          <AnimatePresence>
            {voteFxStyle ? (
              <motion.div
                key={voteFx?.nonce}
                className={`pointer-events-none absolute inset-0 grid place-items-center ${voteFxStyle.bg}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <motion.div
                  className={`rounded-2xl border px-6 py-4 text-center ${voteFxStyle.border} ${voteFxStyle.text} backdrop-blur-sm`}
                  initial={{ scale: 0.92, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.98, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="text-3xl font-extrabold tracking-wide">{voteFxStyle.label}</div>
                  <div className="mt-2 text-sm font-semibold opacity-90">Swipe up or tap Next</div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* overlay bottom */}
          <div className="absolute inset-x-0 bottom-0">
            <div className="pointer-events-none h-52 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-semibold">
                    {current.nickname} <span className="text-sm font-normal">{current.age}歳</span>
                  </div>
                  {liked ? (
                    <div className="mt-1 inline-flex items-center gap-2 text-xs font-semibold text-white/90">
                      <span className="rounded-full bg-white/15 px-2 py-1">評価済み</span>
                      <span className="text-white/60">※ 既に投票済みのため再評価できません</span>
                    </div>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white/15 px-2 py-1">{current.prefecture}</span>
                    <span className="rounded-full bg-white/15 px-2 py-1">{current.job}</span>
                    {current.income_range ? (
                      <span className="rounded-full bg-white/15 px-2 py-1">{current.income_range}</span>
                    ) : null}
                    {typeof current.height === "number" ? (
                      <span className="rounded-full bg-white/15 px-2 py-1">{current.height}cm</span>
                    ) : null}
                  </div>
                  {current.hobbies?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {current.hobbies.slice(0, 6).map((h) => (
                        <span key={h} className="rounded-full bg-white/10 px-2 py-1">
                          {h}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {current.appeal ? (
                    <div className="mt-2 line-clamp-2 text-xs text-white/90">{current.appeal}</div>
                  ) : null}
                </div>
                <div className="text-right">
                  <Link className="mt-2 inline-block text-xs underline text-white/90" href={`/profile/${current.profile_id}`}>
                    詳細を見る
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* burst */}
          <AnimatePresence>
            {likeBurst ? (
              <motion.span
                className="pointer-events-none absolute bottom-20 right-6 text-5xl text-red-500 drop-shadow"
                initial={{ scale: 0.5, opacity: 0.2 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
              >
                ♥
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>

        {/* sub photos */}
        {currentPhotoUrls.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {currentPhotoUrls.map((url, i) => (
              <button
                key={currentPhotos[i]?.id ?? i}
                type="button"
                onClick={() => setPhotoIndex(i)}
                className={`relative h-16 w-12 flex-none overflow-hidden rounded-lg ring-2 ${
                  i === photoIndex ? "ring-black" : "ring-transparent"
                }`}
                aria-label={`写真 ${i + 1}`}
              >
                <Image src={url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        {/* rating buttons */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onVote("normal")}
            disabled={liked || voting || votedThisCard}
            className={`rounded-xl border px-3 py-3 text-sm font-extrabold disabled:opacity-60 ${
              lastVote?.targetId === current.profile_id && lastVote.rating === "normal"
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white text-neutral-900"
            }`}
          >
            Normal +1
          </button>
          <button
            type="button"
            onClick={() => onVote("good")}
            disabled={liked || voting || votedThisCard}
            className={`rounded-xl px-3 py-3 text-sm font-extrabold disabled:opacity-60 ${
              lastVote?.targetId === current.profile_id && lastVote.rating === "good"
                ? "bg-emerald-700 text-white ring-2 ring-white/70"
                : "bg-emerald-600 text-white"
            }`}
          >
            Good +2
          </button>
          <button
            type="button"
            onClick={() => onVote("excellent")}
            disabled={liked || voting || votedThisCard}
            className={`rounded-xl px-3 py-3 text-sm font-extrabold disabled:opacity-60 ${
              lastVote?.targetId === current.profile_id && lastVote.rating === "excellent"
                ? "bg-pink-700 text-white ring-2 ring-white/70"
                : "bg-pink-600 text-white"
            }`}
          >
            Excellent +3
          </button>
        </div>

        {featurePickerOpen ? (
          <div className="mt-3 rounded-2xl border bg-white p-4">
            <div className="text-sm font-semibold">どこが良かった？（任意）</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {featureTags.map((t) => {
                const on = selectedFeatureSlugs.has(t.slug);
                return (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() =>
                      setSelectedFeatureSlugs((prev) => {
                        const next = new Set(prev);
                        if (next.has(t.slug)) next.delete(t.slug);
                        else next.add(t.slug);
                        return next;
                      })
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
                      on ? "bg-black text-white ring-black" : "bg-white text-neutral-900 ring-neutral-300 hover:bg-neutral-50"
                    }`}
                  >
                    {t.label_ja}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setFeaturePickerOpen(false)}
                disabled={savingFeatures}
                className="flex-1 rounded-xl border px-3 py-3 text-sm font-semibold disabled:opacity-60"
              >
                スキップ
              </button>
              <button
                type="button"
                onClick={saveFeatures}
                disabled={savingFeatures}
                className="flex-1 rounded-xl bg-black px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                保存
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-3">
          <button
            type="button"
            onClick={goNextCard}
            disabled={!votedThisCard || voting}
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-neutral-600">
          <span>
            {cardIndex + 1}/{cards.length}
          </span>
          <span>左右スワイプ: 写真 / 上スワイプ: 次へ（投票後）</span>
        </div>
      </div>
    </main>
  );
}

