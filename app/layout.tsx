import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "男ランキング",
  description: "投票でモテランキングを可視化するSNS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={notoSansJp.className}>
        <div className="min-h-dvh">
          {/* CSS-only dynamic wallpaper */}
          <div className="app-wallpaper" aria-hidden="true" />
          <div className="relative flex min-h-dvh flex-col">
            <div className="flex-1">{children}</div>
            <footer className="mx-auto w-full max-w-5xl px-6 pb-8 pt-10 text-xs text-white/70">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                <div className="text-white/60">© {new Date().getFullYear()} otoko-ranking</div>
                <div className="flex flex-wrap gap-4">
                  <a className="underline decoration-white/25 hover:text-white" href="/terms">
                    利用規約
                  </a>
                  <a className="underline decoration-white/25 hover:text-white" href="/privacy">
                    プライバシー
                  </a>
                  <a className="underline decoration-white/25 hover:text-white" href="/contact">
                    お問い合わせ
                  </a>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}

