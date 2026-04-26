"use client";

import { motion } from "framer-motion";

function StickPerson({
  x,
  y,
  scale = 1,
  color = "rgba(255,255,255,0.9)",
  pose = "stand",
}: {
  x: number;
  y: number;
  scale?: number;
  color?: string;
  pose?: "stand" | "clap";
}) {
  const armRotate = pose === "clap" ? [-12, 12, -12] : [0, 0, 0];
  const armDuration = pose === "clap" ? 0.6 : 1;

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={color} strokeWidth={3} strokeLinecap="round">
      {/* head */}
      <circle cx={0} cy={-18} r={10} fill="none" />
      {/* body */}
      <line x1={0} y1={-8} x2={0} y2={22} />

      {/* left arm */}
      <motion.g
        style={{ transformOrigin: "0px -2px" }}
        animate={{ rotate: armRotate }}
        transition={{ repeat: Infinity, duration: armDuration, ease: "easeInOut" }}
      >
        <line x1={0} y1={0} x2={-16} y2={10} />
        {pose === "clap" ? <line x1={-16} y1={10} x2={-6} y2={16} /> : null}
      </motion.g>

      {/* right arm */}
      <motion.g
        style={{ transformOrigin: "0px -2px" }}
        animate={{ rotate: armRotate.map((v) => -v) }}
        transition={{ repeat: Infinity, duration: armDuration, ease: "easeInOut" }}
      >
        <line x1={0} y1={0} x2={16} y2={10} />
        {pose === "clap" ? <line x1={16} y1={10} x2={6} y2={16} /> : null}
      </motion.g>

      {/* legs */}
      <line x1={0} y1={22} x2={-12} y2={46} />
      <line x1={0} y1={22} x2={12} y2={46} />
    </g>
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
          <motion.g animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}>
            <StickPerson x={280} y={110} scale={1.05} color="url(#gold)" />
          </motion.g>
          <motion.g animate={{ y: [0, -1.5, 0] }} transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}>
            <StickPerson x={178} y={140} scale={0.98} color="url(#silver)" />
          </motion.g>
          <motion.g animate={{ y: [0, -1.2, 0] }} transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}>
            <StickPerson x={382} y={156} scale={0.95} color="url(#bronze)" />
          </motion.g>

          {/* audience (female) clapping */}
          <StickPerson x={92} y={174} scale={0.85} color="rgba(255,255,255,0.75)" pose="clap" />
          <StickPerson x={60} y={188} scale={0.78} color="rgba(255,255,255,0.6)" pose="clap" />
          <StickPerson x={468} y={182} scale={0.82} color="rgba(255,255,255,0.7)" pose="clap" />
          <StickPerson x={500} y={194} scale={0.74} color="rgba(255,255,255,0.55)" pose="clap" />

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

