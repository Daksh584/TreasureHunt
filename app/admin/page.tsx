import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CHECKPOINTS_PER_TRACK, huntConfig } from "@/hunt.config";
import { buildRow, getTrackConfig, isTrackId, rankTeams, teamStart, type LeaderRow, type Team } from "@/lib/hunt";
import { formatDuration } from "@/lib/format";
import { isAdmin } from "@/lib/auth";
import { store, StoreUnavailableError, type LogEvent } from "@/lib/store";
import AdminForm from "@/components/AdminForm";
import AdminNav, { AdminDenied, AdminMessage } from "@/components/AdminNav";
import AutoRefresh from "@/components/AutoRefresh";
import ConfigTodos from "@/components/ConfigTodos";
import Elapsed from "@/components/Elapsed";
import LocalTime from "@/components/LocalTime";
import TrailChip from "@/components/TrailChip";
import Unavailable from "@/components/Unavailable";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Leaderboard · ${huntConfig.huntName}` };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const RESULT_STYLE: Record<LogEvent["result"], { icon: string; tone: string }> = {
  found: { icon: "✅", tone: "good" },
  already: { icon: "🔁", tone: "muted" },
  register: { icon: "🆕", tone: "muted" },
  join: { icon: "👋", tone: "muted" },
  skip: { icon: "✋", tone: "warn" },
  "wrong-track": { icon: "🙅", tone: "warn" },
  "no-team": { icon: "❔", tone: "warn" },
  "not-started": { icon: "⏳", tone: "warn" },
  invalid: { icon: "🚫", tone: "bad" },
  "bad-join": { icon: "🔑", tone: "bad" },
  "bad-word": { icon: "🔐", tone: "bad" },
  "rate-limited": { icon: "🐢", tone: "bad" },
};

function describe(e: LogEvent): string {
  const cp = e.index != null ? `checkpoint ${e.index + 1}` : "";
  const owner = getTrackConfig(e.codeTrack)?.name;
  switch (e.result) {
    case "found":
      return `found ${cp}${e.via === "word" ? " (code word)" : ""}`;
    case "already":
      return `re-scanned ${cp} (already found)`;
    case "register":
      return "registered";
    case "join":
      return "a teammate joined";
    case "skip":
      return `tried to skip ahead${cp ? ` to ${cp}` : ""}`;
    case "wrong-track":
      return `scanned ${owner ?? "another trail"}’s ${cp}`;
    case "not-started":
      return `scanned ${cp} before the start`;
    case "no-team":
      return `${owner ?? ""} ${cp} scanned by a phone with no team`;
    case "invalid":
      return "scanned an unknown code";
    case "bad-join":
      return "tried a wrong team code";
    case "bad-word":
      return "typed a wrong code word";
    case "rate-limited":
      return "rate-limited (too many bad codes)";
  }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) return <AdminDenied />;
  const sp = await searchParams;
  const tv = first(sp.tv) === "1";
  const trackFilter = first(sp.track);
  const filter = isTrackId(trackFilter) ? trackFilter : null;

  let rows: LeaderRow[], logs: LogEvent[], teams: Team[], state;
  try {
    [teams, state, logs] = await Promise.all([store.listTeams(), store.getState(), store.recentLog(20)]);
    const all = await store.getAllProgress(teams.map((t) => t.id));
    rows = rankTeams(teams.map((t) => buildRow(t, teamStart(t, state!), all[t.id])));
  } catch (err) {
    if (err instanceof StoreUnavailableError) return <Unavailable retryHref="/admin" />;
    throw err;
  }
  const names = new Map(teams.map((t) => [t.id, t.name]));
  const shown = filter ? rows.filter((r) => r.track === filter) : rows;
  const now = Date.now();
  const counts = {
    finished: rows.filter((r) => r.finished).length,
    live: rows.filter((r) => r.status === "In progress").length,
  };
  const started = huntConfig.autoStart || state.start != null;
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(tv ? { tv: "1" } : {}), ...(filter ? { track: filter } : {}), ...extra });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    const s = p.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  return (
    <main className={`admin ${tv ? "tv" : ""}`}>
      <AutoRefresh seconds={10} clearParams={["m"]} />
      <header className="admin-head">
        <div>
          <p className="eyebrow">Organizer · live</p>
          <h1>{huntConfig.huntName}</h1>
          <p className="admin-meta">
            {teams.length} team{teams.length === 1 ? "" : "s"} · {counts.finished} finished · {counts.live} in progress
            {state.start != null && (
              <span>
                · running <Elapsed since={state.start} serverNow={now} />
              </span>
            )}
            {!tv && (
              <span className={`storage ${store.persistent ? "ok" : "warn"}`}>
                {store.persistent ? "● Redis connected" : "● In-memory (dev only — not persisted)"}
              </span>
            )}
          </p>
        </div>
        <Link className="button ghost admin-chrome" href={qs({ tv: tv ? "" : "1" })} prefetch={false}>
          {tv ? "Exit TV mode" : "📺 TV mode"}
        </Link>
      </header>
      {!tv && <AdminNav current="/admin" />}
      <AdminMessage m={first(sp.m)} />
      {!tv && <ConfigTodos />}

      {!started && !tv && (
        <section className="control-strip admin-chrome">
          <div>
            <strong>Lobby open.</strong> {teams.length} team{teams.length === 1 ? " is" : "s are"} waiting. Registration is{" "}
            {state.registrationOpen ? "open" : "closed"}.
          </div>
          <AdminForm
            action="start"
            back="/admin"
            label="🚀 Start hunt"
            className="button go"
            confirm={`Start the hunt now? All ${teams.length} teams will see their first clue and their clocks start.`}
          />
        </section>
      )}
      {!started && tv && (
        <p className="tv-waiting">
          {teams.length} team{teams.length === 1 ? "" : "s"} registered · waiting for the start…
        </p>
      )}

      <p className="filters admin-chrome">
        Trail:{" "}
        <Link href={qs({ track: "" })} className={!filter ? "active" : ""} prefetch={false}>
          All
        </Link>
        {huntConfig.tracks.map((t) => (
          <Link key={t.id} href={qs({ track: t.id })} className={filter === t.id ? "active" : ""} prefetch={false}>
            {t.name} ({rows.filter((r) => r.track === t.id).length})
          </Link>
        ))}
      </p>

      <div className="board-wrap">
        <table className="board">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>Found</th>
              {Array.from({ length: CHECKPOINTS_PER_TRACK }, (_, i) => (
                <th key={i} className="cp-col">
                  CP{i + 1}
                </th>
              ))}
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={5 + CHECKPOINTS_PER_TRACK} className="empty">
                  No teams yet. Put the registration QR from the <Link href="/admin/qr">QR sheet</Link> where people can
                  see it.
                </td>
              </tr>
            )}
            {shown.map((r) => {
              const rank = rows.indexOf(r);
              const color = getTrackConfig(r.track)?.color;
              return (
                <tr key={r.id} className={r.finished ? "finished" : ""} style={{ "--accent": color } as CSSProperties}>
                  <td className="rank">{r.finished && rank < 3 ? ["🥇", "🥈", "🥉"][rank] : rank + 1}</td>
                  <td>
                    <div className="team-cell">
                      <strong>{r.name}</strong>
                      <TrailChip id={r.track} />
                    </div>
                  </td>
                  <td>
                    <div className="found">
                      <strong>
                        {r.progress}/{CHECKPOINTS_PER_TRACK}
                      </strong>
                      <span className="mini-bar">
                        <span style={{ width: `${(r.progress / CHECKPOINTS_PER_TRACK) * 100}%` }} />
                      </span>
                    </div>
                  </td>
                  {r.cps.map((ts, j) => (
                    <td key={j} className="cp-col">
                      {ts != null ? (
                        <span className="cp-time">
                          <span className="mono">{r.start != null ? `+${formatDuration(ts - r.start)}` : "✓"}</span>
                          <small>
                            <LocalTime ts={ts} />
                          </small>
                        </span>
                      ) : (
                        <span className="muted">·</span>
                      )}
                    </td>
                  ))}
                  <td className="time">
                    {r.totalMs != null ? (
                      <strong className="mono">{formatDuration(r.totalMs)}</strong>
                    ) : r.start != null ? (
                      <Elapsed since={r.start} serverNow={now} />
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`pill ${r.finished ? "done" : r.status === "In progress" ? "live" : "idle"}`}>{r.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="feed">
        <h2>Recent activity</h2>
        {logs.length === 0 ? (
          <p className="muted">Nothing yet. Waiting for the first team…</p>
        ) : (
          <ul>
            {logs.map((e, i) => (
              <li key={`${e.ts}-${i}`} className={`feed-${RESULT_STYLE[e.result]?.tone ?? "muted"}`}>
                <span className="feed-time mono">
                  <LocalTime ts={e.ts} />
                </span>
                <span aria-hidden="true">{RESULT_STYLE[e.result]?.icon ?? "•"}</span>
                <TrailChip id={e.track} label={e.team ? (names.get(e.team) ?? "removed team") : "No team"} />
                <span>{describe(e)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
