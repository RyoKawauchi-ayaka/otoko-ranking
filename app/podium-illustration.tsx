"use client";

import { motion } from "framer-motion";

function Mascot({
  x,
  y,
  scale = 1,
  fill = "rgba(255,255,255,0.9)",
  variant = "winner",
}: {
  x: number;
  y: number;
  scale?: number;
  fill?: string;
  variant?: "winner" | "audience";
}) {
  const floatY = variant === "winner" ? [0, -2, 0] : [0, -1.2, 0];
  const duration = variant === "winner" ? 2.6 : 2.9;

  return (
    <motion.g
      transform={`translate(${x} ${y}) scale(${scale})`}
      animate={{ y: floatY }}
      transition={{ repeat: Infinity, duration, ease: "easeInOut" }}
    >
      {/* soft glow */}
      <ellipse cx="0" cy="52" rx="22" ry="8" fill="rgba(0,0,0,0.18)" />

      {/* body (rounded blob) */}
      <path
        d="M 0 0
           C 18 -2, 26 12, 22 28
           C 19 40, 10 48, 0 50
           C -10 48, -19 40, -22 28
           C -26 12, -18 -2, 0 0 Z"
        fill={fill}
        opacity={0.92}
      />

      {/* face */}
      <circle cx="-6" cy="20" r="2.2" fill="rgba(0,0,0,0.35)" />
      <circle cx="6" cy="20" r="2.2" fill="rgba(0,0,0,0.35)" />
      <path d="M -6 28 C -2 32, 2 32, 6 28" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="2" strokeLinecap="round" />

      {/* crown for winners */}
      {variant === "winner" ? (
        <path
          d="M -12 6 L -6 -6 L 0 4 L 6 -6 L 12 6 Z"
          fill="rgba(255,255,255,0.65)"
          opacity={0.9}
        />
      ) : null}
    </motion.g>
  );
}

export default function PodiumIllustration() {
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
          </defs>

          {/* floor */}
          <path d="M40 224 C 160 200, 400 200, 520 224" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />

          {/* podium blocks */}
          <g filter="url(#glow)">
            <rect x="232" y="110" width="96" height="114" rx="16" fill="url(#p)" stroke="rgba(255,255,255,0.12)" />
            <rect x="132" y="140" width="92" height="84" rx="16" fill="url(#p)" stroke="rgba(255,255,255,0.12)" />
            <rect x="336" y="156" width="92" height="68" rx="16" fill="url(#p)" stroke="rgba(255,255,255,0.12)" />

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

          {/* winners (male) */}
          <Mascot x={280} y={86} scale={1.08} fill="url(#gold)" variant="winner" />
          <Mascot x={178} y={118} scale={1.0} fill="url(#silver)" variant="winner" />
          <Mascot x={382} y={134} scale={0.96} fill="url(#bronze)" variant="winner" />

          {/* audience (female) clapping */}
          <Mascot x={92} y={156} scale={0.8} fill="rgba(255,255,255,0.75)" variant="audience" />
          <Mascot x={60} y={170} scale={0.72} fill="rgba(255,255,255,0.6)" variant="audience" />
          <Mascot x={468} y={164} scale={0.78} fill="rgba(255,255,255,0.7)" variant="audience" />
          <Mascot x={500} y={176} scale={0.7} fill="rgba(255,255,255,0.55)" variant="audience" />

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

