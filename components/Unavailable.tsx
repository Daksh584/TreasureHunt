import Link from "next/link";

/** Shown when Redis can't be reached. The server log has the details. */
export default function Unavailable({ retryHref = "/play" }: { retryHref?: string }) {
  return (
    <main className="shell center">
      <div className="big-emoji" aria-hidden="true">🛰️</div>
      <h1>We can&apos;t reach the hunt right now</h1>
      <p className="lede">
        Your team&apos;s progress is safe — the scoreboard is just taking a breather. Wait a few seconds and try
        again. If it keeps happening, find an organizer.
      </p>
      <a className="button" href={retryHref}>
        Try again
      </a>
      <p className="small">
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
