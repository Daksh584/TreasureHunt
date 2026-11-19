import type { NextRequest } from "next/server";
import { huntConfig } from "@/hunt.config";
import { decideScan, findCode, teamStart, type ScanResult } from "@/lib/hunt";
import { TEAM_COOKIE } from "@/lib/crypto";
import { isRateLimited, recordHit, store } from "@/lib/store";
import { clientIp, redirectTo } from "@/lib/request";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ip = clientIp(req);
  const teamId = req.cookies.get(TEAM_COOKIE)?.value ?? null;

  try {
    if (await isRateLimited(ip)) {
      await store.log({ team: teamId, track: null, index: null, ts: Date.now(), result: "rate-limited" });
      return redirectTo(req, "/play?m=slow");
    }

    const owner = findCode(code);
    if (!owner) {
      await recordHit(ip);
      await store.log({ team: teamId, track: null, index: null, ts: Date.now(), result: "invalid" });
      return redirectTo(req, "/play?m=invalid");
    }

    const team = teamId ? await store.getTeam(teamId) : null;
    const sameTrack = team?.track === owner.track.id;
    // Only load progress/state when they can matter for the decision.
    const [cps, state] = sameTrack
      ? await Promise.all([store.getProgress(team.id), store.getState()])
      : [[], null];
    const started = team && state ? teamStart(team, state, huntConfig.autoStart) != null : false;

    let result: ScanResult = decideScan({
      team: team?.track ?? null,
      owner: { trackId: owner.track.id, index: owner.index },
      cps,
      started,
    });

    const ts = Date.now();
    if (result === "found" && team) {
      // HSETNX: if a teammate's scan landed first, this one becomes "already".
      if (!(await store.markFound(team.id, owner.index, ts))) result = "already";
    }

    await store.log({ team: team?.id ?? null, track: team?.track ?? null, index: owner.index, ts, result, codeTrack: owner.track.id });

    const n = result === "found" || result === "already" ? `&n=${owner.index + 1}` : "";
    return redirectTo(req, `/play?m=${result}${n}`);
  } catch (err) {
    console.error("[hunt] scan failed", err);
    return redirectTo(req, "/play?m=unavailable");
  }
}
