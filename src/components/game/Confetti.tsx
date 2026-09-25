"use client";

import { useMemo } from "react";

const COLORS = ["#c23a22", "#2e2118", "#b7791f", "#5f7a3a", "#e0d2b4"];
const COUNT = 26;

function particlesFor(seed: number) {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: COUNT }, (_, i) => ({
    id: i,
    left: 10 + rnd() * 80,
    dx: (rnd() - 0.5) * 220,
    rot: 360 + rnd() * 720,
    delay: rnd() * 0.35,
    color: COLORS[i % COLORS.length],
    size: 6 + rnd() * 7,
  }));
}

/** Restrained burst: a few dozen CSS-animated squares, no canvas, no loop. */
export function Confetti({ seed }: { seed: number }) {
  const particles = useMemo(() => particlesFor(seed), [seed]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="animate-confetti absolute top-0 block rounded-[3px]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.7,
            background: p.color,
            animationDelay: `${p.delay}s`,
            ["--dx" as string]: `${p.dx}px`,
            ["--rot" as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}
