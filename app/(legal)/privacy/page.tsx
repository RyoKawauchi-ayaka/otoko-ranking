import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 p-6 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">プライバシーポリシー</h1>
        <Link className="text-sm underline text-white/80" href="/">
          戻る
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/80 backdrop-blur">
        <p className="font-semibold text-white">※ 雛形</p>
        <p className="mt-2">
          本ページは公開用の雛形です。収集する情報（メール、投票履歴、画像等）・利用目的・第三者提供・保管期間などを運用に合わせて整備してください。
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li>認証（Supabase Auth）とデータ保存（Supabase）を利用します</li>
          <li>機能改善のために利用状況を分析する場合があります</li>
        </ul>
      </div>
    </main>
  );
}

