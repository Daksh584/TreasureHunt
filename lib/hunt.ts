import {
  CHECKPOINTS_PER_TRACK,
  TRACK_IDS,
  huntConfig,
  normalizeWord,
  type HuntConfig,
  type Track,
  type TrackId,
} from "@/hunt.config";

/** A registered team. Many teams can share one track. */
export type Team = {
  /** Long random id. Stored in the player's cookie — never shown to other players. */
  id: string;
  name: string;
  track: TrackId;
  /** Short code teammates use to join (also encoded in the team's invite QR as /t/<code>). */
  joinCode: string;
  /** Registration time (ms epoch). */
  created: number;
};

export type HuntState = {
  /** When the organizer pressed "Start hunt" (ms epoch), or null. */
  start: number | null;
  registrationOpen: boolean;
};

export type ScanResult = "found" | "already" | "skip" | "wrong-track" | "invalid" | "no-team" | "not-started";

export function isTrackId(value: unknown): value is TrackId {
  return typeof value === "string" && (TRACK_IDS as readonly string[]).includes(value);
}

export function getTrackConfig(id: string | null | undefined, config: HuntConfig = huntConfig): Track | null {
  return config.tracks.find((t) => t.id === id) ?? null;
}

export function findCode(code: string, config: HuntConfig = huntConfig): { track: Track; index: number } | null {
  for (const track of config.tracks) {
    const index = track.checkpoints.findIndex((c) => c.code === code);
    if (index >= 0) return { track, index };
  }
  return null;
}

/* ---------- Teams ---------- */

export const TEAM_NAME_MIN = 2;
export const TEAM_NAME_MAX = 32;

/** Trims, collapses whitespace and strips control characters. Returns null if unusable. */
export function cleanTeamName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return name.length >= TEAM_NAME_MIN && name.length <= TEAM_NAME_MAX ? name : null;
}

/** Key used to keep team names unique regardless of case/spacing. */
export const teamNameKey = (name: string) => name.toLowerCase().replace(/\s+/g, " ").trim();

// No 0/O/1/I/L — easy to read aloud and type.
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 6;

export function normalizeJoinCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length === JOIN_CODE_LENGTH && [...code].every((c) => JOIN_CODE_ALPHABET.includes(c)) ? code : null;
}

/** "K7QX2M" → "K7Q-X2M" for display. */
export const formatJoinCode = (code: string) => `${code.slice(0, 3)}-${code.slice(3)}`;

/**
 * Picks the track with the fewest teams. Ties are broken by `tiebreak` (a rotating counter),
 * so consecutive registrations spread across tracks instead of all landing on A.
 */
export function assignTrack(teams: Pick<Team, "track">[], tiebreak: number): TrackId {
  const counts = Object.fromEntries(TRACK_IDS.map((id) => [id, 0])) as Record<TrackId, number>;
  for (const t of teams) counts[t.track]++;
  const min = Math.min(...TRACK_IDS.map((id) => counts[id]));
  const tied = TRACK_IDS.filter((id) => counts[id] === min);
  return tied[((tiebreak % tied.length) + tied.length) % tied.length];
}

/** Evenly re-deals teams across tracks in the given (pre-shuffled) order. */
export function rebalance(teamIds: string[]): Record<string, TrackId> {
  return Object.fromEntries(teamIds.map((id, i) => [id, TRACK_IDS[i % TRACK_IDS.length]]));
}

/** When a team's clock starts: hunt start, or registration time for late joiners / autoStart. */
export function teamStart(team: Pick<Team, "created">, state: HuntState, autoStart = huntConfig.autoStart): number | null {
  if (autoStart) return team.created;
  return state.start == null ? null : Math.max(state.start, team.created);
}

/* ---------- Progress & scanning ---------- */

/** Number of consecutive checkpoints found, starting at checkpoint 1. */
export function progress(cps: (number | null)[]): number {
  let n = 0;
  while (n < CHECKPOINTS_PER_TRACK && cps[n] != null) n++;
  return n;
}

/**
 * Pure decision for a checkpoint scan. The caller only writes to the store when this
 * returns "found" (and the write itself is HSETNX, so concurrent scans can't double-count).
 */
export function decideScan(input: {
  /** The scanning team's track (from its cookie), or null when the phone has no team. */
  team: TrackId | null;
  owner: { trackId: TrackId; index: number } | null;
  cps: (number | null)[];
  started: boolean;
}): ScanResult {
  const { team, owner, cps, started } = input;
  if (!owner) return "invalid";
  if (!team) return "no-team";
  if (team !== owner.trackId) return "wrong-track";
  if (!started) return "not-started";
  if (cps[owner.index] != null) return "already";
  if (progress(cps) < owner.index) return "skip";
  return "found";
}

/* ---------- Leaderboard ---------- */

export type TeamStatus = "Not started" | "In progress" | "Finished";

export type LeaderRow = {
  id: string;
  name: string;
  track: TrackId;
  start: number | null;
  cps: (number | null)[];
  progress: number;
  finished: boolean;
  /** cp6 time when finished. */
  finish: number | null;
  /** Time of the most recent consecutive find. */
  last: number | null;
  /** finish - start for finished teams. */
  totalMs: number | null;
  status: TeamStatus;
};

export function buildRow(team: Pick<Team, "id" | "name" | "track">, start: number | null, cps: (number | null)[]): LeaderRow {
  const n = progress(cps);
  const finished = n === CHECKPOINTS_PER_TRACK;
  const finish = finished ? cps[CHECKPOINTS_PER_TRACK - 1] : null;
  return {
    id: team.id,
    name: team.name,
    track: team.track,
    start,
    cps,
    progress: n,
    finished,
    finish,
    last: n > 0 ? cps[n - 1] : null,
    totalMs: finish != null && start != null ? Math.max(0, finish - start) : null,
    status: finished ? "Finished" : start != null ? "In progress" : "Not started",
  };
}

/**
 * Finished teams first, fastest total time wins (= earliest finish when everyone starts
 * together), then by progress (desc), then by who reached that progress first (last-find
 * time asc). Remaining ties: started before not-started, then name.
 */
export function rankTeams<T extends Pick<LeaderRow, "name" | "finished" | "finish" | "totalMs" | "progress" | "last" | "start">>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    if (a.finished) {
      return (a.totalMs ?? Infinity) - (b.totalMs ?? Infinity) || (a.finish ?? 0) - (b.finish ?? 0) || a.name.localeCompare(b.name);
    }
    if (a.progress !== b.progress) return b.progress - a.progress;
    if (a.last !== b.last) return (a.last ?? Infinity) - (b.last ?? Infinity);
    if ((a.start != null) !== (b.start != null)) return a.start != null ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** 1-based placement among finished teams, or null if this team hasn't finished. */
export function placement(id: string, rows: LeaderRow[]): number | null {
  const i = rankTeams(rows.filter((r) => r.finished)).findIndex((r) => r.id === id);
  return i < 0 ? null : i + 1;
}

/* ---------- Code words ---------- */

export type WordResult =
  | { result: "found"; index: number }
  | { result: "already"; index: number }
  | { result: "skip" | "bad-word" | "not-started" | "no-word" };

/**
 * Decides a typed code word against the team's OWN trail only. A word from another trail is
 * simply wrong (we never reveal that it belongs to someone else).
 */
export function decideWord(input: { word: string; track: Track; cps: (number | null)[]; started: boolean }): WordResult {
  const word = normalizeWord(input.word);
  if (!word) return { result: "no-word" };
  if (!input.started) return { result: "not-started" };
  const index = input.track.checkpoints.findIndex((cp) => cp.codeWord && normalizeWord(cp.codeWord) === word);
  if (index < 0) return { result: "bad-word" };
  if (input.cps[index] != null) return { result: "already", index };
  if (progress(input.cps) < index) return { result: "skip" };
  return { result: "found", index };
}
