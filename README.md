# 男ランキング（Next.js + Supabase）

## セットアップ

### 1) Supabase 側（DB / Storage）

- `supabase/migrations/20260421_0001_init.sql` を Supabase の SQL Editor で実行
- Storage bucket `profile-photos` が作成されます

### 2) 環境変数

`.env.local` を作成して設定します。

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # 管理系APIで使用（サーバーのみ）
VOTE_DAILY_LIMIT=10
```

### 3) 開発起動

```bash
npm run dev
```

