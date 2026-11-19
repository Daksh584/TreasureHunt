import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { CHECKPOINTS_PER_TRACK, huntConfig } from "@/hunt.config";
import { TEAM_NAME_MAX, TEAM_NAME_MIN, formatJoinCode, progress } from "@/lib/hunt";
import { isAdmin } from "@/lib/auth";
import { store, StoreUnavailableError } from "@/lib/store";
import AdminForm from "@/components/AdminForm";
import AdminNav, { AdminDenied, AdminMessage } from "@/components/AdminNav";
import LocalTime from "@/components/LocalTime";
import Unavailable from "@/components/Unavailable";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Teams · ${huntConfig.huntName}` };

const BACK = "/admin/teams";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) return <AdminDenied />;
  const m = (await searchParams).m;

  let teams, state, all;
  try {
    [teams, state] = await Promise.all([store.listTeams(), store.getState()]);
    all = await store.getAllProgress(teams.map((t) => t.id));
  } catch (err) {
    if (err instanceof StoreUnavailableError) return <Unavailable retryHref={BACK} />;
    throw err;
  }
  const started = huntConfig.autoStart || state.start != null;

  return (
    <main className="admin">
      <header className="admin-head">
        <div>
          <p className="eyebrow">Organizer</p>
          <h1>Teams &amp; setup</h1>
          <p className="admin-meta">
            {teams.length} / {huntConfig.maxTeams} teams · registration {state.registrationOpen ? "open" : "closed"} ·{" "}
            {huntConfig.autoStart ? "clocks start on registration" : started ? "hunt running" : "hunt not started"}
          </p>
        </div>
      </header>
      <AdminNav current="/admin/teams" />
      <AdminMessage m={Array.isArray(m) ? m[0] : m} />

      <section className="trail-summary">
        {huntConfig.tracks.map((t) => {
          const n = teams.filter((x) => x.track === t.id).length;
          return (
            <div key={t.id} className="trail-box" style={{ "--accent": t.color } as CSSProperties}>
              <span className="dot" /> <strong>{t.name}</strong>
              <span className="trail-count">{n}</span>
              <small>team{n === 1 ? "" : "s"}</small>
            </div>
          );
        })}
      </section>

      <section className="controls">
        <div className="card control">
          <h2>1 · Registration</h2>
          <p>
            Players register at <code>/register</code> (print the poster QR from the QR sheet). New teams go to the trail
            with the fewest teams.
          </p>
          {state.registrationOpen ? (
            <AdminForm action="reg-close" back={BACK} label="🔒 Close registration" className="button ghost" />
          ) : (
            <AdminForm action="reg-open" back={BACK} label="🔓 Open registration" className="button ghost" />
          )}
        </div>

        <div className="card control">
          <h2>2 · Balance the trails</h2>
          <p>Shuffle all teams randomly and deal them evenly across the {huntConfig.tracks.length} trails. Only before the start.</p>
          {started ? (
            <p className="muted">🔒 Locked — the hunt has started. You can still move teams that haven’t found anything yet.</p>
          ) : (
            <AdminForm
              action="rebalance"
              back={BACK}
              label="🔀 Shuffle & rebalance"
              className="button ghost"
              confirm="Shuffle every team onto a random trail (evenly balanced)? Teams’ phones update automatically."
            />
          )}
        </div>

        <div className="card control">
          <h2>3 · Start</h2>
          {huntConfig.autoStart ? (
            <p>
              <code>autoStart</code> is on: each team’s clock starts when it registers.
            </p>
          ) : started ? (
            <p>
              Started at <LocalTime ts={state.start!} />. Teams registering now start immediately.
            </p>
          ) : (
            <>
              <p>Teams wait in a lobby. Pressing start reveals every team’s first clue at once.</p>
              <AdminForm
                action="start"
                back={BACK}
                label="🚀 Start hunt"
                className="button go"
                confirm={`Start the hunt now for all ${teams.length} teams?`}
              />
            </>
          )}
        </div>

        <div className="card control danger-zone">
          <h2>Reset</h2>
          <p>After a dry run: clear progress (keep teams), or wipe everything.</p>
          <div className="btn-row">
            <AdminForm
              action="reset-progress"
              back={BACK}
              label="♻️ Reset progress"
              className="danger"
              confirm="Clear ALL finds, the start time and the activity log? Teams stay registered. This cannot be undone."
            />
            <AdminForm
              action="reset-all"
              back={BACK}
              label="🧨 Delete everything"
              className="danger"
              confirm="Delete ALL teams, progress and logs? Everyone will have to register again. This cannot be undone."
            />
          </div>
        </div>
      </section>

      <section className="card add-team">
        <h2>Add a team by hand</h2>
        <form action="/admin/action" method="post" className="row-form">
          <input type="hidden" name="action" value="add-team" />
          <input type="hidden" name="back" value={BACK} />
          <input name="name" required minLength={TEAM_NAME_MIN} maxLength={TEAM_NAME_MAX} placeholder="Team name" autoComplete="off" />
          <button className="button" type="submit">
            Add team
          </button>
        </form>
        <p className="small">Works even when registration is closed or full. Share the team code shown below with the team.</p>
      </section>

      <div className="board-wrap">
        <table className="board teams-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Code</th>
              <th>Found</th>
              <th>Registered</th>
              <th>Trail</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No teams registered yet.
                </td>
              </tr>
            )}
            {teams.map((t) => {
              const found = progress(all[t.id]);
              const color = huntConfig.tracks.find((x) => x.id === t.track)?.color;
              return (
                <tr key={t.id} style={{ "--accent": color } as CSSProperties}>
                  <td>
                    <strong>{t.name}</strong>
                  </td>
                  <td className="mono">{formatJoinCode(t.joinCode)}</td>
                  <td>
                    {found}/{CHECKPOINTS_PER_TRACK}
                  </td>
                  <td>
                    <LocalTime ts={t.created} />
                  </td>
                  <td>
                    {found > 0 ? (
                      <span title="Teams can’t switch trails after their first find">
                        {huntConfig.tracks.find((x) => x.id === t.track)?.name} 🔒
                      </span>
                    ) : (
                      <form action="/admin/action" method="post" className="row-form compact">
                        <input type="hidden" name="action" value="set-track" />
                        <input type="hidden" name="back" value={BACK} />
                        <input type="hidden" name="team" value={t.id} />
                        <select name="track" defaultValue={t.track} aria-label={`Trail for ${t.name}`}>
                          {huntConfig.tracks.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="small-btn">
                          Move
                        </button>
                      </form>
                    )}
                  </td>
                  <td>
                    <AdminForm
                      action="delete-team"
                      back={BACK}
                      fields={{ team: t.id }}
                      label="Remove"
                      className="danger small-btn"
                      confirm={`Remove “${t.name}” and all its progress?`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
