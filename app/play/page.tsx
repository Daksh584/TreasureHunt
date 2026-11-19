import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CHECKPOINTS_PER_TRACK, huntConfig, type Track } from "@/hunt.config";
import { buildRow, getTrackConfig, placement, teamStart, type LeaderRow, type Team } from "@/lib/hunt";
import { formatDuration, ordinal } from "@/lib/format";
import { currentTeam } from "@/lib/teams";
import { store, StoreUnavailableError } from "@/lib/store";
import AutoRefresh from "@/components/AutoRefresh";
import Confetti from "@/components/Confetti";
import Elapsed from "@/components/Elapsed";
import InviteCard from "@/components/InviteCard";
import TeamWatcher from "@/components/TeamWatcher";
import Unavailable from "@/components/Unavailable";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Your hunt · ${huntConfig.huntName}` };

type Banner = { tone: "good" | "warn" | "bad"; emoji: string; text: string };

function banner(m: string | undefined, n: number | null, ctx: { next: number; track: Track | null }): Banner | null {
  const color = ctx.track ? ctx.track.name.split(" ")[0].toUpperCase() : "";
  switch (m) {
    case "registered":
      return { tone: "good", emoji: "🎉", text: "Team created! Get your teammates to scan the team QR below." };
    case "joined":
      return { tone: "good", emoji: "👋", text: "You’re in! You’ll see the same clues as the rest of your team." };
    case "found":
      return { tone: "good", emoji: "🎉", text: `Checkpoint ${n ?? ""} found! Here’s your next clue.` };
    case "already":
      return {
        tone: "warn",
        emoji: "👍",
        text: `Your team already found ${n ? `checkpoint ${n}` : "this one"}. Keep going with the clue below!`,
      };
    case "skip":
      return { tone: "warn", emoji: "✋", text: `Not so fast! Find checkpoint ${ctx.next} first.` };
    case "wrong-track":
      return {
        tone: "bad",
        emoji: "🙅",
        text: `This one belongs to another trail — leave it where it is!${color ? ` Look for ${color} QR codes.` : ""}`,
      };
    case "not-started":
      return { tone: "warn", emoji: "⏳", text: "Sharp eyes! But the hunt hasn’t started yet — that scan didn’t count." };
    case "invalid":
      return { tone: "bad", emoji: "🤔", text: "Hmm, that QR code isn’t part of this hunt." };
    case "no-team":
      return { tone: "warn", emoji: "📍", text: "Nice find! But this phone isn’t on a team yet — register or join one first." };
    case "slow":
      return { tone: "bad", emoji: "🐢", text: "Whoa, lots of scans from your network. Wait a minute and try again." };
    case "unavailable":
      return { tone: "bad", emoji: "📡", text: "We couldn’t save that scan. Please scan it again." };
    default:
      return null;
  }
}

function BannerView({ b }: { b: Banner | null }) {
  if (!b) return null;
  return (
    <p className={`banner banner-${b.tone}`} role="status">
      <span aria-hidden="true">{b.emoji}</span> {b.text}
    </p>
  );
}

function Segments({ done }: { done: number }) {
  return (
    <div className="segments" role="progressbar" aria-valuemin={0} aria-valuemax={CHECKPOINTS_PER_TRACK} aria-valuenow={done}>
      {Array.from({ length: CHECKPOINTS_PER_TRACK }, (_, i) => (
        <span key={i} className={i < done ? "on" : i === done ? "next" : ""} />
      ))}
    </div>
  );
}

function TeamHeader({ team, track, start, now }: { team: Team; track: Track; start: number | null; now: number }) {
  return (
    <header className="play-head">
      <div className="team-id">
        <span className="team-chip">
          <span className="dot" /> {team.name}
        </span>
        <span className="trail">{track.name}</span>
      </div>
      {start != null && (
        <span className="timer" title="Time since your team started">
          ⏱ <Elapsed since={start} serverNow={now} />
        </span>
      )}
    </header>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const m = first(sp.m);
  const nRaw = Number(first(sp.n));
  const n = Number.isInteger(nRaw) && nRaw >= 1 && nRaw <= CHECKPOINTS_PER_TRACK ? nRaw : null;

  try {
    const team = await currentTeam();
    if (team === null) return <NoTeam b={banner(m, n, { next: 1, track: null })} />;
    if (team === "gone") return <TeamGone />;

    const track = getTrackConfig(team.track)!;
    const style = { "--accent": track.color } as CSSProperties;
    const [state, cps] = await Promise.all([store.getState(), store.getProgress(team.id)]);
    const start = teamStart(team, state);
    const row = buildRow(team, start, cps);
    const now = Date.now();
    const b = banner(m, n, { next: row.progress + 1, track });

    if (row.finished) {
      // Placement needs every team's progress — only loaded once this team is done.
      const teams = await store.listTeams();
      const all = await store.getAllProgress(teams.map((t) => t.id));
      const rows = teams.map((t) => buildRow(t, teamStart(t, state), all[t.id]));
      return <Finished team={team} track={track} row={row} place={placement(team.id, rows)} style={style} />;
    }

    if (start == null) {
      return (
        <main className="shell" style={style}>
          <AutoRefresh seconds={10} clearParams={["m", "n"]} />
          <TeamHeader team={team} track={track} start={null} now={now} />
          <BannerView b={b} />
          <section className="card lobby">
            <div className="big-emoji pulse" aria-hidden="true">⏳</div>
            <h1 className="play-title">Get ready…</h1>
            <p className="lede">
              You’re on the <strong className="accent-text">{track.name}</strong>. Your clues lead to QR codes printed
              in this colour. The first clue appears here the moment the organizers start the hunt.
            </p>
          </section>
          <section className="card invite-card">
            <h2>Bring your teammates</h2>
            <InviteCard team={team} />
          </section>
          <p className="small">
            Wrong team? <a href="/leave">Leave {team.name}</a>
          </p>
        </main>
      );
    }

    const nextIndex = row.progress;
    return (
      <main className="shell" style={style}>
        <AutoRefresh seconds={15} clearParams={["m", "n"]} />
        <TeamWatcher progress={row.progress} color={track.color} />
        {m === "found" && <Confetti colors={[track.color, "#ffd166", "#ffffff", "#06d6a0"]} count={50} />}

        <TeamHeader team={team} track={track} start={start} now={now} />
        <h1 className="play-title">
          Checkpoint {nextIndex + 1} <span className="of">of {CHECKPOINTS_PER_TRACK}</span>
        </h1>
        <Segments done={row.progress} />
        <BannerView b={b} />

        <section className="card clue" key={nextIndex} aria-live="polite">
          {nextIndex === 0 && <p className="intro">{huntConfig.introText[track.id]}</p>}
          <p className="eyebrow">{nextIndex === 0 ? "Your first clue" : "Your next clue"}</p>
          <p className="clue-text">{track.checkpoints[nextIndex].clue}</p>
        </section>

        <section className="howto">
          <p>
            <strong>Found it?</strong> Make sure it’s a <strong className="accent-text">{track.name}</strong> QR, then
            point your phone’s camera at it. Your whole team’s phones update automatically.
          </p>
          <Link className="button ghost" href="/scan" prefetch={false}>
            📷 Use the in-app scanner
          </Link>
        </section>

        <details className="card invite-card">
          <summary>➕ Add a teammate</summary>
          <InviteCard team={team} />
        </details>

        {!store.persistent && <p className="small">Local demo mode: progress is kept in memory and resets on restart.</p>}
      </main>
    );
  } catch (err) {
    if (err instanceof StoreUnavailableError) return <Unavailable />;
    throw err;
  }
}

function Finished({ team, track, row, place, style }: { team: Team; track: Track; row: LeaderRow; place: number | null; style: CSSProperties }) {
  const medal = place === 1 ? "🏆" : place === 2 ? "🥈" : place === 3 ? "🥉" : "🎖️";
  return (
    <main className="shell center finish" style={style}>
      <AutoRefresh seconds={60} clearParams={["m", "n"]} />
      <Confetti colors={[track.color, "#ffd166", "#ffffff", "#06d6a0", "#ef476f"]} />
      <span className="team-chip">
        <span className="dot" /> {team.name}
      </span>
      <div className="big-emoji bounce" aria-hidden="true">
        {medal}
      </div>
      <h1>Treasure found!</h1>
      {place && <p className="place">{ordinal(place)} place</p>}
      {row.totalMs != null && (
        <p className="total">
          Total time <strong className="mono">{formatDuration(row.totalMs)}</strong>
        </p>
      )}
      <Segments done={CHECKPOINTS_PER_TRACK} />
      <section className="card clue">
        <p className="clue-text">{huntConfig.finishMessage}</p>
      </section>
      {row.start != null && (
        <ol className="splits">
          {row.cps.map((ts, i) => (
            <li key={i}>
              <span>Checkpoint {i + 1}</span>
              <span className="mono">{ts != null ? formatDuration(ts - row.start!) : "—"}</span>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}

function NoTeam({ b }: { b: Banner | null }) {
  return (
    <main className="shell center">
      <p className="eyebrow">{huntConfig.huntName}</p>
      <div className="big-emoji" aria-hidden="true">🗺️</div>
      <h1>Join a team to start.</h1>
      <BannerView b={b} />
      <p className="lede">
        Register a new team, or join a teammate’s with their team code. Switched phones or cleared cookies? Just join
        again with the code — your team’s progress is saved.
      </p>
      <div className="cta-row">
        <Link className="button" href="/register">
          Register a team
        </Link>
        <Link className="button ghost" href="/join">
          Join with a code
        </Link>
      </div>
    </main>
  );
}

function TeamGone() {
  return (
    <main className="shell center">
      <div className="big-emoji" aria-hidden="true">🫥</div>
      <h1>Your team was removed</h1>
      <p className="lede">An organizer removed this team (or reset the hunt). Register again or join another team.</p>
      <a className="button" href="/leave">
        Start over
      </a>
    </main>
  );
}
