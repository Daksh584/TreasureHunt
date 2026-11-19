import type { NextRequest } from "next/server";
import { TEAM_COOKIE } from "@/lib/crypto";
import { registerTeam } from "@/lib/teams";
import { isRateLimited, recordHit, store } from "@/lib/store";
import { clientIp, redirectTo, teamCookieOptions } from "@/lib/request";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const rawName = form?.get("name");
  const back = (e: string) =>
    redirectTo(req, `/register?e=${e}${typeof rawName === "string" ? `&name=${encodeURIComponent(rawName.slice(0, 64))}` : ""}`);
  const ip = clientIp(req);

  try {
    if (await isRateLimited(ip, "register")) return back("slow");
    await recordHit(ip, "register");

    const result = await registerTeam(rawName);
    if (!result.ok) return back(result.reason);

    const { team } = result;
    await store.log({ team: team.id, track: team.track, index: null, ts: team.created, result: "register" });
    const res = redirectTo(req, "/play?m=registered");
    res.cookies.set(TEAM_COOKIE, team.id, teamCookieOptions(req));
    return res;
  } catch (err) {
    console.error("[hunt] registration failed", err);
    return back("unavailable");
  }
}
