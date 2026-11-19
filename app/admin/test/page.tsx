import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { huntConfig } from "@/hunt.config";
import { formatJoinCode, getTrackConfig } from "@/lib/hunt";
import { isAdmin } from "@/lib/auth";
import { currentTeam } from "@/lib/teams";
import { store, StoreUnavailableError } from "@/lib/store";
import AdminNav, { AdminDenied } from "@/components/AdminNav";
import TrailChip from "@/components/TrailChip";
import ConfigTodos, { Marked } from "@/components/ConfigTodos";
import PrintButton from "@/components/PrintButton";
import Unavailable from "@/components/Unavailable";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Dry run · ${huntConfig.huntName}` };

// Plain <a> tags on purpose: Next <Link> prefetching would hit the scan/join routes.
export default async function DryRun({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) return <AdminDenied />;
  const left = (await searchParams).m === "left";

  let me, teams;
  try {
    [me, teams] = await Promise.all([currentTeam(), store.listTeams()]);
  } catch (err) {
    if (err instanceof StoreUnavailableError) return <Unavailable retryHref="/admin/test" />;
    throw err;
  }
  const current = me && me !== "gone" ? me : null;

  return (
    <main className="admin">
      <header className="admin-head">
        <div>
          <p className="eyebrow">Organizer</p>
          <h1>Dry run &amp; run sheet</h1>
          <p className="admin-meta">
            This browser is playing as:{" "}
            {current ? (
              <>
                <TrailChip id={current.track} label={current.name} /> · <a href="/leave?to=test">leave team</a>
              </>
            ) : (
              <strong>no team</strong>
            )}
          </p>
        </div>
        <div className="btn-row admin-chrome">
          <a className="button ghost" href="/play" target="_blank" rel="noreferrer">
            Open /play ↗
          </a>
          <PrintButton />
        </div>
      </header>
      <AdminNav current="/admin/test" />
      {left && <p className="banner banner-good">This browser has left its team.</p>}
      <ConfigTodos open />

      <ol className="howto-list">
        <li>
          <a href="/register">Register a test team</a> (or join an existing one below). Note which trail it lands on.
        </li>
        <li>
          Press <strong>🚀 Start hunt</strong> on the leaderboard, then click that trail’s checkpoints in order (or type
          the code word on /play where a stop has one). Try skipping one, or another trail’s link too.
        </li>
        <li>
          When you’re done, go to <a href="/admin/teams">Teams &amp; setup</a> → <strong>Delete everything</strong> so the real
          event starts clean.
        </li>
      </ol>

      {teams.length > 0 && (
        <section className="card join-list">
          <h2>Join an existing team</h2>
          <ul>
            {teams.map((t) => (
              <li key={t.id}>
                <a href={`/t/${t.joinCode}`} rel="nofollow">
                  <TrailChip id={t.track} label={t.name} />
                </a>{" "}
                <span className="mono muted">{formatJoinCode(t.joinCode)}</span>
                {current?.id === t.id && <strong> ← you</strong>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="test-grid">
        {huntConfig.tracks.map((t) => (
          <section key={t.id} className="card test-track" style={{ "--accent": t.color } as CSSProperties}>
            <h2>
              <span className="dot" /> {t.name}
              {current && getTrackConfig(current.track)?.id === t.id && <small className="you-tag">your trail</small>}
            </h2>
            <ol>
              {t.checkpoints.map((cp, i) => (
                <li key={cp.code}>
                  <a href={`/s/${cp.code}`} rel="nofollow">
                    Checkpoint {i + 1} — <Marked text={cp.locationLabel} />
                  </a>
                  <small>
                    <Marked text={cp.clue} />
                  </small>
                  {cp.codeWord && <span className="run-word">CODE WORD: {cp.codeWord}</span>}
                  {cp.setup && (
                    <span className="run-setup">
                      🛠 <Marked text={cp.setup} />
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </main>
  );
}
