import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 p-6 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">お問い合わせ</h1>
        <Link className="text-sm underline text-white/80" href="/">
          戻る
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/80 backdrop-blur">
        <p>お問い合わせ窓口をここに記載してください。</p>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li>メール: example@example.com</li>
          <li>返信目安: 1〜3営業日</li>
        </ul>
      </div>
    </main>
  );
}

