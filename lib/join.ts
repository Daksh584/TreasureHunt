import type { NextRequest } from "next/server";
import { TEAM_COOKIE } from "@/lib/crypto";
import { normalizeJoinCode } from "@/lib/hunt";
import { findTeamByJoinCode } from "@/lib/teams";
import { isRateLimited, recordHit, store } from "@/lib/store";
import { clientIp, redirectTo, teamCookieOptions } from "@/lib/request";

/** Joins this browser to the team with `rawCode` (from the invite QR or the /join form). */
export async function joinWithCode(req: NextRequest, rawCode: unknown) {
  const ip = clientIp(req);
  const now = Date.now();
  try {
    if (await isRateLimited(ip)) {
      await store.log({ team: null, track: null, index: null, ts: now, result: "rate-limited" });
      return redirectTo(req, "/join?e=slow");
    }
    const code = normalizeJoinCode(rawCode);
    const team = code ? await findTeamByJoinCode(code) : null;
    if (!team) {
      await recordHit(ip);
      await store.log({ team: null, track: null, index: null, ts: now, result: "bad-join" });
      return redirectTo(req, "/join?e=bad-code");
    }
    await store.log({ team: team.id, track: team.track, index: null, ts: now, result: "join" });
    const res = redirectTo(req, "/play?m=joined");
    res.cookies.set(TEAM_COOKIE, team.id, teamCookieOptions(req));
    return res;
  } catch (err) {
    console.error("[hunt] join failed", err);
    return redirectTo(req, "/join?e=unavailable");
  }
}
