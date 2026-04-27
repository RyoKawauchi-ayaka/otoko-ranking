"use client";

import { motion } from "framer-motion";

export default function PodiumIllustration({
  top3,
}: {
  top3?: Array<{ rank: number; photo_url: string | null }>;
}) {
  const byRank = new Map<number, string | null>();
  for (const p of top3 ?? []) byRank.set(p.rank, p.photo_url ?? null);
  const p1 = byRank.get(1) ?? null;
  const p2 = byRank.get(2) ?? null;
  const p3 = byRank.get(3) ?? null;

  return (
    <div className="relative h-[260px] w-full">
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <svg viewBox="0 0 560 260" className="h-full w-full">
          <defs>
            <linearGradient id="p" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgba(255,255,255,0.22)" />
              <stop offset="1" stopColor="rgba(255,255,255,0.06)" />
            </linearGradient>
            <linearGradient id="neon" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgba(236,72,153,0.75)" />
              <stop offset="0.5" stopColor="rgba(168,85,247,0.55)" />
              <stop offset="1" stopColor="rgba(59,130,246,0.65)" />
            </linearGradient>
            <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgba(255,215,0,0.95)" />
              <stop offset="1" stopColor="rgba(255,105,180,0.75)" />
            </linearGradient>
            <linearGradient id="silver" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgba(220,220,255,0.9)" />
              <stop offset="1" stopColor="rgba(120,180,255,0.7)" />
            </linearGradient>
            <linearGradient id="bronze" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgba(255,170,90,0.9)" />
              <stop offset="1" stopColor="rgba(255,105,180,0.55)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="strongGlow">
              <feGaussianBlur stdDeviation="10" result="b" />
              <feColorMatrix
                in="b"
                type="matrix"
                values="
                  1 0 0 0 0
                  0 1 0 0 0
                  0 0 1 0 0
                  0 0 0 12 -3"
                result="c"
              />
              <feMerge>
                <feMergeNode in="c" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <clipPath id="clip1">
              <circle cx="280" cy="98" r="40" />
            </clipPath>
            <clipPath id="clip2">
              <circle cx="178" cy="128" r="32" />
            </clipPath>
            <clipPath id="clip3">
              <circle cx="382" cy="142" r="30" />
            </clipPath>
          </defs>

          {/* floor */}
          <path d="M40 224 C 160 200, 400 200, 520 224" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />

          {/* podium blocks */}
          <g filter="url(#glow)">
            <rect x="232" y="110" width="96" height="114" rx="18" fill="url(#p)" stroke="rgba(255,255,255,0.14)" />
            <rect x="132" y="140" width="92" height="84" rx="18" fill="url(#p)" stroke="rgba(255,255,255,0.12)" />
            <rect x="336" y="156" width="92" height="68" rx="18" fill="url(#p)" stroke="rgba(255,255,255,0.12)" />

            <text x="280" y="150" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="28" fontWeight="700">
              1
            </text>
            <text x="178" y="176" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="22" fontWeight="700">
              2
            </text>
            <text x="382" y="190" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="22" fontWeight="700">
              3
            </text>
          </g>

          {/* neon halo */}
          <motion.circle
            cx="280"
            cy="98"
            r="48"
            fill="none"
            stroke="url(#gold)"
            strokeWidth="4"
            filter="url(#strongGlow)"
            animate={{ opacity: [0.45, 0.95, 0.45], r: [46, 50, 46] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <circle cx="178" cy="128" r="38" fill="none" stroke="url(#silver)" strokeWidth="3" opacity="0.75" filter="url(#glow)" />
          <circle cx="382" cy="142" r="36" fill="none" stroke="url(#bronze)" strokeWidth="3" opacity="0.75" filter="url(#glow)" />

          {/* faces */}
          {p1 ? (
            <image href={p1} x="240" y="58" width="80" height="80" preserveAspectRatio="xMidYMid slice" clipPath="url(#clip1)" />
          ) : (
            <circle cx="280" cy="98" r="40" fill="rgba(255,255,255,0.08)" />
          )}
          {p2 ? (
            <image href={p2} x="146" y="96" width="64" height="64" preserveAspectRatio="xMidYMid slice" clipPath="url(#clip2)" />
          ) : (
            <circle cx="178" cy="128" r="32" fill="rgba(255,255,255,0.06)" />
          )}
          {p3 ? (
            <image href={p3} x="352" y="112" width="60" height="60" preserveAspectRatio="xMidYMid slice" clipPath="url(#clip3)" />
          ) : (
            <circle cx="382" cy="142" r="30" fill="rgba(255,255,255,0.06)" />
          )}

          {/* crown for #1 */}
          <motion.g
            animate={{ y: [0, -2, 0], rotate: [-2, 2, -2] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <path
              d="M 260 48 L 268 34 L 280 46 L 292 34 L 300 48 L 294 56 L 266 56 Z"
              fill="url(#gold)"
              filter="url(#strongGlow)"
            />
          </motion.g>

          {/* weekly ranking label */}
          <text x="280" y="26" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="14" fontWeight="800" letterSpacing="2">
            WEEKLY RANKING
          </text>
          <path d="M236 30 L324 30" stroke="url(#neon)" strokeWidth="2" opacity="0.6" />

          {/* confetti */}
          {Array.from({ length: 16 }).map((_, i) => {
            const x = 120 + i * 20;
            const y = 46 + (i % 4) * 10;
            const rot = (i % 2 ? 35 : -25) + i * 2;
            return (
              <motion.rect
                key={i}
                x={x}
                y={y}
                width="6"
                height="10"
                rx="2"
                fill={i % 3 === 0 ? "rgba(236,72,153,0.8)" : i % 3 === 1 ? "rgba(59,130,246,0.75)" : "rgba(34,197,94,0.7)"}
                animate={{ y: [y, y + 22, y], opacity: [0.9, 0.55, 0.9], rotate: [rot, rot + 18, rot] }}
                transition={{ repeat: Infinity, duration: 2.4 + (i % 5) * 0.25, ease: "easeInOut" }}
              />
            );
          })}
        </svg>
      </motion.div>
    </div>
  );
}

