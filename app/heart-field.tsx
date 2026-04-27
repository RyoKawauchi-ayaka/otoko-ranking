"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

function Heart({ size = 20, color = "rgba(236,72,153,0.12)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s-7.2-4.3-9.6-8.6C.6 9 .9 5.9 3.5 4.2 6.1 2.5 9 3.6 10.7 5.7L12 7.3l1.3-1.6C15 3.6 17.9 2.5 20.5 4.2c2.6 1.7 2.9 4.8 1.1 8.2C19.2 16.7 12 21 12 21Z"
        fill={color}
      />
    </svg>
  );
}

export default function HeartField({ count = 14 }: { count?: number }) {
  const items = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 8;
      const dur = 18 + Math.random() * 14;
      const size = 14 + Math.random() * 18;
      const opacity = 0.06 + Math.random() * 0.08;
      const hue = i % 3 === 0 ? "rgba(236,72,153," : i % 3 === 1 ? "rgba(168,85,247," : "rgba(59,130,246,";
      return { left, delay, dur, size, opacity, hue };
    });
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((it, idx) => (
        <motion.div
          key={idx}
          className="absolute -bottom-16"
          style={{ left: `${it.left}%` }}
          initial={{ y: 0, x: 0, rotate: -8 }}
          animate={{ y: [-20, -420], x: [0, (idx % 2 ? 1 : -1) * 40], rotate: [-8, 8] }}
          transition={{ duration: it.dur, delay: it.delay, repeat: Infinity, ease: "linear" }}
        >
          <div style={{ opacity: it.opacity }}>
            <Heart size={it.size} color={`${it.hue}${Math.min(0.18, it.opacity + 0.08)})`} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

