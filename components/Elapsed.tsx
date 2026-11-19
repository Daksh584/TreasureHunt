"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";

/** Live ticking stopwatch. Anchored to server time so a wrong phone clock doesn't matter. */
export default function Elapsed({ since, serverNow }: { since: number; serverNow: number }) {
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const offset = serverNow - Date.now();
    const tick = () => setNow(Date.now() + offset);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [serverNow]);

  return <span className="mono">{formatDuration(now - since)}</span>;
}
