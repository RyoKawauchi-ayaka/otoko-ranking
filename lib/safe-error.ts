export function publicErrorMessage(err: unknown, fallback = "request failed") {
  if (process.env.NODE_ENV === "production") return fallback;
  return err instanceof Error ? err.message : fallback;
}

/** 本番でも、スキーマ不整合など利用者・運用が直せる内容は分かるように返す */
export function publicSupabaseQueryError(err: unknown, fallback = "request failed"): string {
  const any = err as { message?: string; details?: string; hint?: string };
  const parts = [any?.message, any?.details, any?.hint].filter(Boolean).join(" ");
  const low = parts.toLowerCase();

  if (
    low.includes("vote_day") ||
    (low.includes("column") && low.includes("does not exist")) ||
    low.includes("schema cache")
  ) {
    return "データベースが最新ではありません。Supabase の SQL Editor で `20260502_0011_vote_daily_unique.sql`（vote_day 列と cast_vote 更新）を実行してください。";
  }

  if (process.env.NODE_ENV !== "production" && parts.trim()) {
    return parts.length > 400 ? `${parts.slice(0, 400)}…` : parts;
  }
  return fallback;
}

