"use client";

import { useEffect, useRef, useState } from "react";
import Confetti from "@/components/Confetti";

/** Celebrates on this phone when a teammate's scan (seen via auto-refresh) advances the team. */
export default function TeamWatcher({ progress, color }: { progress: number; color: string }) {
  const previous = useRef(progress);
  const [found, setFound] = useState<number | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = progress;
    if (progress <= before) return;
    setFound(progress);
    navigator.vibrate?.([80, 60, 80]);
    const t = window.setTimeout(() => setFound(null), 7000);
    return () => window.clearTimeout(t);
  }, [progress]);

  if (found === null) return null;
  return (
    <>
      <Confetti colors={[color, "#ffd166", "#ffffff", "#06d6a0"]} count={40} />
      <div className="toast" role="status">
        🎉 Your team found checkpoint {found}! {found < 6 ? "New clue below." : ""}
      </div>
    </>
  );
}
