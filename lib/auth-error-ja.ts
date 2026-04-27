const COMMON: Array<{ match: (msg: string) => boolean; ja: string }> = [
  {
    match: (m) => m.toLowerCase().includes("invalid login credentials"),
    ja: "メールアドレスまたはパスワードが違います。",
  },
  {
    match: (m) => m.toLowerCase().includes("email not confirmed"),
    ja: "メール認証が完了していません。届いた確認メールのリンクを開いてからログインしてください。",
  },
  {
    match: (m) => m.toLowerCase().includes("user not found"),
    ja: "アカウントが見つかりませんでした（メールアドレスをご確認ください）。",
  },
  {
    match: (m) => m.toLowerCase().includes("password should be at least"),
    ja: "パスワードが短すぎます。",
  },
  {
    match: (m) => m.toLowerCase().includes("rate limit") || m.toLowerCase().includes("too many requests"),
    ja: "試行回数が多すぎます。しばらく待ってからもう一度お試しください。",
  },
];

export function toJapaneseAuthError(err: unknown, fallback = "ログインに失敗しました。") {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!msg) return fallback;
  for (const r of COMMON) {
    if (r.match(msg)) return r.ja;
  }
  // 本番は詳細を出さない
  if (process.env.NODE_ENV === "production") return fallback;
  return msg;
}

