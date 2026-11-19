import type { Metadata } from "next";
import Link from "next/link";
import { huntConfig } from "@/hunt.config";

export const metadata: Metadata = { title: `Join a team · ${huntConfig.huntName}` };

const ERRORS: Record<string, string> = {
  "bad-code": "We couldn’t find a team with that code. Double-check it with your teammate.",
  slow: "Too many wrong codes from your network. Wait a minute and try again.",
  unavailable: "We couldn’t reach the hunt. Please try again.",
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const e = (await searchParams).e;
  const error = Array.isArray(e) ? e[0] : e;
  return (
    <main className="shell center">
      <p className="eyebrow">{huntConfig.huntName}</p>
      <div className="big-emoji" aria-hidden="true">🤝</div>
      <h1>Join your team</h1>
      <p className="lede">Ask a teammate for the 6-character team code on their screen — or just scan their team QR.</p>
      {error && (
        <p className="banner banner-bad" role="alert">
          {ERRORS[error] ?? "Something went wrong. Please try again."}
        </p>
      )}
      <form action="/join/submit" method="post" className="form">
        <label htmlFor="code">Team code</label>
        <input
          id="code"
          name="code"
          required
          className="mono code-input"
          placeholder="ABC-123"
          maxLength={9}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
        />
        <button className="button wide" type="submit">
          Join team
        </button>
      </form>
      <p className="small">
        No team yet? <Link href="/register">Register a new team</Link>
      </p>
    </main>
  );
}
