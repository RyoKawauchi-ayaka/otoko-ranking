import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 p-6 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">利用規約</h1>
        <Link className="text-sm underline text-white/80" href="/">
          戻る
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/80 backdrop-blur">
        <p className="font-semibold text-white">※ 雛形</p>
        <p className="mt-2">
          本ページは公開用の雛形です。サービス運用に合わせて、禁止事項・免責・課金・問い合わせ先等を整備してください。
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li>不正アクセス/スクレイピング/嫌がらせ行為の禁止</li>
          <li>投稿画像・プロフィール内容の責任はユーザーに帰属</li>
          <li>運営はサービス内容を予告なく変更/停止する場合があります</li>
        </ul>
      </div>
    </main>
  );
}

