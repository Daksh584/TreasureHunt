import { randomInt } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { isTrackId, progress, rebalance } from "@/lib/hunt";
import { registerTeam } from "@/lib/teams";
import { store } from "@/lib/store";
import { redirectTo } from "@/lib/request";

export const dynamic = "force-dynamic";

const originHost = (origin: string) => {
  try {
    return new URL(origin).host;
  } catch {
    return null; // e.g. "null" from sandboxed frames
  }
};

/** All organizer controls (plain HTML form posts, so they work without JS). */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });

  // Same-origin check on top of the SameSite=Lax admin cookie.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && originHost(origin) !== host) return new NextResponse("Forbidden", { status: 403 });

  const form = await req.formData();
  const field = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };
  const backRaw = field("back");
  const back = /^\/admin(\/[a-z]*)?$/.test(backRaw) ? backRaw : "/admin";
  const done = (m: string) => redirectTo(req, `${back}?m=${m}`);

  try {
    switch (field("action")) {
      case "start": {
        const state = await store.getState();
        if (state.start == null) await store.setStart(Date.now());
        return done("started");
      }
      case "reg-open":
        await store.setRegistrationOpen(true);
        return done("reg-open");
      case "reg-close":
        await store.setRegistrationOpen(false);
        return done("reg-closed");
      case "add-team": {
        const r = await registerTeam(field("name"), { byAdmin: true });
        if (!r.ok) return done(r.reason);
        await store.log({ team: r.team.id, track: r.team.track, index: null, ts: r.team.created, result: "register" });
        return done("added");
      }
      case "set-track": {
        const id = field("team");
        const track = field("track");
        if (!isTrackId(track)) return done("error");
        // Codes differ per trail, so a team that already found something can't switch.
        if (progress(await store.getProgress(id)) > 0) return done("track-locked");
        await store.setTeamTrack(id, track);
        return done("moved");
      }
      case "delete-team":
        await store.deleteTeam(field("team"));
        return done("deleted");
      case "rebalance": {
        const [state, teams] = await Promise.all([store.getState(), store.listTeams()]);
        if (state.start != null) return done("rebalance-locked");
        // Fisher–Yates shuffle, then deal round-robin across the trails.
        const ids = teams.map((t) => t.id);
        for (let i = ids.length - 1; i > 0; i--) {
          const j = randomInt(i + 1);
          [ids[i], ids[j]] = [ids[j], ids[i]];
        }
        const assignment = rebalance(ids);
        await Promise.all(teams.filter((t) => t.track !== assignment[t.id]).map((t) => store.setTeamTrack(t.id, assignment[t.id])));
        return done("rebalanced");
      }
      case "reset-progress":
        await store.resetProgress();
        return done("reset");
      case "reset-all":
        await store.resetAll();
        return done("wiped");
      default:
        return done("error");
    }
  } catch (err) {
    console.error("[hunt] admin action failed", err);
    return done("store-error");
  }
}
