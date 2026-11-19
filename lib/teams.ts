import { randomBytes, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { huntConfig } from "@/hunt.config";
import { TEAM_COOKIE } from "@/lib/crypto";
import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH, assignTrack, cleanTeamName, type Team } from "@/lib/hunt";
import { store, type HuntStore } from "@/lib/store";

export type RegisterResult =
  | { ok: true; team: Team }
  | { ok: false; reason: "invalid-name" | "name-taken" | "closed" | "full" };

const newTeamId = () => `t_${randomBytes(12).toString("base64url")}`;
const newJoinCode = () => Array.from({ length: JOIN_CODE_LENGTH }, () => JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)]).join("");

/** Shared by public registration and the organizer's "Add team" form. */
export async function registerTeam(
  rawName: unknown,
  opts: { byAdmin?: boolean; now?: number; s?: HuntStore } = {},
): Promise<RegisterResult> {
  const s = opts.s ?? store;
  const name = cleanTeamName(rawName);
  if (!name) return { ok: false, reason: "invalid-name" };

  const [state, teams] = await Promise.all([s.getState(), s.listTeams()]);
  if (!opts.byAdmin && !state.registrationOpen) return { ok: false, reason: "closed" };
  if (!opts.byAdmin && teams.length >= huntConfig.maxTeams) return { ok: false, reason: "full" };

  const used = new Set(teams.map((t) => t.joinCode));
  let joinCode = newJoinCode();
  while (used.has(joinCode)) joinCode = newJoinCode();

  const team: Team = {
    id: newTeamId(),
    name,
    track: assignTrack(teams, await s.nextTiebreak()),
    joinCode,
    created: opts.now ?? Date.now(),
  };
  const result = await s.createTeam(team);
  return result === "ok" ? { ok: true, team } : { ok: false, reason: "name-taken" };
}

export async function findTeamByJoinCode(code: string, s: HuntStore = store): Promise<Team | null> {
  return (await s.listTeams()).find((t) => t.joinCode === code) ?? null;
}

/** The team this browser belongs to, from its cookie. Returns "gone" if the team was deleted. */
export async function currentTeam(): Promise<Team | "gone" | null> {
  const id = (await cookies()).get(TEAM_COOKIE)?.value;
  if (!id) return null;
  return (await store.getTeam(id)) ?? "gone";
}
