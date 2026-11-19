import type { CSSProperties } from "react";
import { getTrackConfig } from "@/lib/hunt";

export default function TrailChip({ id, label }: { id: string | null | undefined; label?: string }) {
  const t = getTrackConfig(id);
  if (!t) return <span className="chip muted">{label ?? "No team"}</span>;
  return (
    <span className="chip" style={{ "--accent": t.color } as CSSProperties}>
      <span className="dot" /> {label ?? t.name}
    </span>
  );
}
