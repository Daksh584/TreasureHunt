import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "🏁 Leaderboard" },
  { href: "/admin/teams", label: "👥 Teams & setup" },
  { href: "/admin/qr", label: "🖨️ QR sheet" },
  { href: "/admin/test", label: "🧪 Dry run" },
] as const;

export type AdminPath = (typeof LINKS)[number]["href"];

export default function AdminNav({ current }: { current: AdminPath }) {
  return (
    <nav className="admin-nav admin-chrome">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={l.href === current ? "active" : ""} prefetch={false}>
          {l.label}
        </Link>
      ))}
      <a href="/admin/logout" className="logout">
        Sign out
      </a>
    </nav>
  );
}

const MESSAGES: Record<string, [tone: "good" | "warn" | "bad", text: string]> = {
  started: ["good", "🚀 The hunt has started! Every team can see its first clue."],
  "reg-open": ["good", "Registration is open."],
  "reg-closed": ["good", "Registration is closed. You can still add teams by hand."],
  added: ["good", "Team added."],
  moved: ["good", "Team moved to its new trail."],
  deleted: ["good", "Team removed."],
  rebalanced: ["good", "🔀 Teams shuffled and dealt evenly across the trails."],
  reset: ["good", "♻️ Progress, start time and activity log cleared. Teams are kept."],
  wiped: ["good", "🧨 Everything cleared, including all teams."],
  "track-locked": ["warn", "That team has already found a checkpoint, so it can’t switch trails."],
  "rebalance-locked": ["warn", "The hunt has started — rebalancing is only possible before the start."],
  "invalid-name": ["bad", "Team names need 2–32 characters."],
  "name-taken": ["bad", "That team name is already taken."],
  "store-error": ["bad", "Couldn’t reach Redis. Check the server logs and try again."],
  error: ["bad", "Something went wrong."],
};

export function AdminMessage({ m }: { m: string | undefined }) {
  const msg = m ? MESSAGES[m] : undefined;
  if (!msg) return null;
  return <p className={`banner banner-${msg[0]} admin-chrome`}>{msg[1]}</p>;
}

export function AdminDenied() {
  return (
    <main className="shell center">
      <div className="big-emoji" aria-hidden="true">🔒</div>
      <h1>Organizers only</h1>
      <p className="lede">Sign in with the organizer password to continue.</p>
      <a className="button" href="/admin/login">
        Sign in
      </a>
    </main>
  );
}
