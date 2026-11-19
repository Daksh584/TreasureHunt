import type { CSSProperties } from "react";

// Deterministic pseudo-random so server and client markup always match.
const rand = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Pure-CSS confetti burst. No JS timers, no assets; hidden for prefers-reduced-motion. */
export default function Confetti({ colors, count = 70 }: { colors: string[]; count?: number }) {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          style={
            {
              "--x": `${rand(i, 1) * 100}%`,
              "--delay": `${rand(i, 2) * 0.7}s`,
              "--dur": `${2.4 + rand(i, 3) * 1.8}s`,
              "--rot": `${Math.round(rand(i, 4) * 1080 - 540)}deg`,
              "--drift": `${Math.round((rand(i, 5) - 0.5) * 40)}vw`,
              "--w": `${6 + Math.round(rand(i, 6) * 6)}px`,
              background: colors[i % colors.length],
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
