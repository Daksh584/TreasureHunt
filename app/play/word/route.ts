import type { NextRequest } from "next/server";
import { huntConfig } from "@/hunt.config";
import { decideWord, getTrackConfig, teamStart } from "@/lib/hunt";
import { TEAM_COOKIE } from "@/lib/crypto";
import { isRateLimited, recordHit, store } from "@/lib/store";
import { redirectTo } from "@/lib/request";

export const dynamic = "force-dynamic";

/** Unlock a checkpoint by typing the code word a barista / volunteer / game master gave you. */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const raw = form?.get("word");
  const word = typeof raw === "string" ? raw.slice(0, 64) : "";
  const teamId = req.cookies.get(TEAM_COOKIE)?.value;
  if (!teamId) return redirectTo(req, "/play?m=no-team");

  try {
    const team = await store.getTeam(teamId);
    const track = getTrackConfig(team?.track);
    if (!team || !track) return redirectTo(req, "/play");
    if (await isRateLimited(team.id, "word")) return redirectTo(req, "/play?m=word-slow");

    const [state, cps] = await Promise.all([store.getState(), store.getProgress(team.id)]);
    const started = teamStart(team, state, huntConfig.autoStart) != null;
    const decision = decideWord({ word, track, cps, started });
    const ts = Date.now();

    let result: string = decision.result;
    const index = "index" in decision ? decision.index : null;
    if (decision.result === "found") {
      if (!(await store.markFound(team.id, decision.index, ts))) result = "already";
    }
    if (result === "bad-word") await recordHit(team.id, "word");
    if (result !== "no-word") {
      await store.log({
        team: team.id,
        track: team.track,
        index,
        ts,
        result: result as "found" | "already" | "skip" | "bad-word" | "not-started",
        via: "word",
      });
    }
    const n = index != null && (result === "found" || result === "already") ? `&n=${index + 1}` : "";
    return redirectTo(req, `/play?m=${result}${n}`);
  } catch (err) {
    console.error("[hunt] code word failed", err);
    return redirectTo(req, "/play?m=unavailable");
  }
}
