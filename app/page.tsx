import Link from "next/link";
import { huntConfig } from "@/hunt.config";
import { getTrackConfig } from "@/lib/hunt";
import { currentTeam } from "@/lib/teams";

export const dynamic = "force-dynamic";

export default async function Home() {
  const team = await currentTeam().catch(() => null);
  const mine = team && team !== "gone" ? team : null;
  const track = getTrackConfig(mine?.track);
  return (
    <main className="shell center">
      <p className="eyebrow">A little office adventure</p>
      <div className="big-emoji" aria-hidden="true">🗺️</div>
      <h1>{huntConfig.huntName}</h1>
      <p className="lede">Form a team. Follow your trail of six hidden QR codes. Claim the treasure.</p>

      {mine ? (
        <Link className="button" href="/play" style={{ background: track?.color }}>
          Continue as {mine.name} →
        </Link>
      ) : (
        <>
          <ol className="steps">
            <li>
              <strong>Register.</strong> One person creates the team and gets a team code.
            </li>
            <li>
              <strong>Join.</strong> Teammates scan the team QR on that phone or type the code.
            </li>
            <li>
              <strong>Hunt.</strong> Solve each clue, find your trail’s QR, scan it — the next clue appears.
            </li>
          </ol>
          <div className="cta-row">
            <Link className="button" href="/register">
              Register a team
            </Link>
            <Link className="button ghost" href="/join">
              Join a team
            </Link>
          </div>
        </>
      )}
      <p className="small">No app needed — your phone’s camera does the work.</p>
    </main>
  );
}
