import type { Metadata } from "next";
import Link from "next/link";
import { huntConfig } from "@/hunt.config";
import { TEAM_NAME_MAX, TEAM_NAME_MIN } from "@/lib/hunt";
import { currentTeam } from "@/lib/teams";
import { store, StoreUnavailableError } from "@/lib/store";
import Unavailable from "@/components/Unavailable";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Register your team · ${huntConfig.huntName}` };

const ERRORS: Record<string, string> = {
  "invalid-name": `Pick a team name between ${TEAM_NAME_MIN} and ${TEAM_NAME_MAX} characters.`,
  "name-taken": "That name is already taken — try another one!",
  closed: "Registration is closed. Ask an organizer to add your team.",
  full: "The hunt is full. Ask an organizer if there’s room for one more team.",
  slow: "Lots of sign-ups from your network right now. Wait a minute and try again.",
  unavailable: "We couldn’t save your team. Please try again.",
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = first(sp.e);
  const name = first(sp.name) ?? "";

  let open: boolean, existing;
  try {
    [open, existing] = await Promise.all([store.getState().then((s) => s.registrationOpen), currentTeam()]);
  } catch (err) {
    if (err instanceof StoreUnavailableError) return <Unavailable retryHref="/register" />;
    throw err;
  }

  return (
    <main className="shell center">
      <p className="eyebrow">{huntConfig.huntName}</p>
      <div className="big-emoji" aria-hidden="true">🏴‍☠️</div>
      <h1>Register your team</h1>

      {existing && existing !== "gone" ? (
        <>
          <p className="lede">
            This phone is already on <strong>{existing.name}</strong>.
          </p>
          <Link className="button" href="/play">
            Go to my team →
          </Link>
          <p className="small">
            Starting a different team? <a href="/leave">Leave {existing.name}</a> first.
          </p>
        </>
      ) : !open ? (
        <>
          <p className="banner banner-warn">Registration is closed right now.</p>
          <p className="lede">Already have a team? Join it with your team code.</p>
          <Link className="button" href="/join">
            Join a team
          </Link>
        </>
      ) : (
        <>
          <p className="lede">One person registers; everyone else joins with the team code you’ll get next.</p>
          {error && (
            <p className="banner banner-bad" role="alert">
              {ERRORS[error] ?? "Something went wrong. Please try again."}
            </p>
          )}
          <form action="/register/submit" method="post" className="form">
            <label htmlFor="name">Team name</label>
            <input
              id="name"
              name="name"
              defaultValue={name}
              required
              minLength={TEAM_NAME_MIN}
              maxLength={TEAM_NAME_MAX}
              autoComplete="off"
              autoCapitalize="words"
              placeholder="e.g. The Stapler Squad"
              autoFocus
            />
            <button className="button wide" type="submit">
              Create team 🚀
            </button>
          </form>
          <p className="small">
            Teammate already registered? <Link href="/join">Join with a code</Link>
          </p>
        </>
      )}
    </main>
  );
}
