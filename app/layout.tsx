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
          <div className="relative">{children}</div>
        </div>
      </body>
    </html>
  );
}

