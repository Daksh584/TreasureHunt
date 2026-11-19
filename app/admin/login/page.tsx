import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { huntConfig } from "@/hunt.config";
import { isAdmin } from "@/lib/auth";
import { safeNext } from "@/lib/crypto";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Organizer sign-in · ${huntConfig.huntName}` };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  if (await isAdmin()) redirect(next);
  const error = sp.e === "wrong" ? "Wrong password. Try again." : sp.e === "slow" ? "Too many attempts. Wait a minute and try again." : null;

  return (
    <main className="shell center">
      <p className="eyebrow">{huntConfig.huntName}</p>
      <div className="big-emoji" aria-hidden="true">🔐</div>
      <h1>Organizer sign-in</h1>
      {error && (
        <p className="banner banner-bad" role="alert">
          {error}
        </p>
      )}
      <form action="/admin/login/submit" method="post" className="form">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" autoFocus />
        <button className="button wide" type="submit">
          Sign in
        </button>
      </form>
    </main>
  );
}
