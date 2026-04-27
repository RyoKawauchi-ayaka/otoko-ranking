export function publicVoteError(err: unknown): { status: number; message: string } {
  const raw = err && typeof err === "object" && "message" in err ? String((err as any).message ?? "") : "";
  const m = raw.toLowerCase();

  // RPC exceptions (see cast_vote)
  if (m.includes("daily vote limit exceeded")) {
    return { status: 429, message: "本日の投票上限に達しました。明日また投票できます。" };
  }
  if (m.includes("only female users can vote")) {
    return { status: 403, message: "投票は女性ユーザーのみ可能です。" };
  }
  if (m.includes("not authenticated") || m.includes("jwt")) {
    return { status: 401, message: "ログインしてください。" };
  }

  // Generic: keep it safe in production
  if (process.env.NODE_ENV === "production") {
    return { status: 400, message: "投票に失敗しました。時間をおいて再度お試しください。" };
  }
  return { status: 400, message: raw || "vote failed" };
}

