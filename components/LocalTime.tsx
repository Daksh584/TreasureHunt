"use client";

import { useEffect, useState } from "react";

/** Wall-clock time in the viewer's own timezone (servers run in UTC). */
export default function LocalTime({ ts }: { ts: number }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    setText(new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, [ts]);
  return <time dateTime={new Date(ts).toISOString()}>{text ?? "\u00a0"}</time>;
}
