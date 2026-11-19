import { Redis } from "@upstash/redis";
import { CHECKPOINTS_PER_TRACK, TRACK_IDS, type TrackId } from "@/hunt.config";
import { isTrackId, teamNameKey, type HuntState, type Team } from "@/lib/hunt";

export type LogResult =
  | "found"
  | "already"
  | "skip"
  | "wrong-track"
  | "invalid"
  | "no-team"
  | "not-started"
  | "register"
  | "join"
  | "bad-join"
  | "rate-limited";

export type LogEvent = {
  /** Team id of the scanning/joining phone, if any. */
  team: string | null;
  /** That team's track. */
  track: TrackId | null;
  /** 0-based checkpoint index, or null for joins / unknown codes. */
  index: number | null;
  ts: number;
  result: LogResult;
  /** Track the scanned checkpoint belongs to (shows up for wrong-track scans). */
  codeTrack?: TrackId | null;
};

export type CreateTeamResult = "ok" | "name-taken";

export interface HuntStore {
  readonly persistent: boolean;
  getState(): Promise<HuntState>;
  setStart(ts: number | null): Promise<void>;
  setRegistrationOpen(open: boolean): Promise<void>;

  listTeams(): Promise<Team[]>;
  getTeam(id: string): Promise<Team | null>;
  /** Atomically claims the (case-insensitive) team name, then saves the team. */
  createTeam(team: Team): Promise<CreateTeamResult>;
  setTeamTrack(id: string, track: TrackId): Promise<void>;
  deleteTeam(id: string): Promise<void>;
  /** Rotating counter used to break ties when auto-assigning tracks. */
  nextTiebreak(): Promise<number>;

  getProgress(teamId: string): Promise<(number | null)[]>;
  getAllProgress(teamIds: string[]): Promise<Record<string, (number | null)[]>>;
  /** HSETNX on cp<index+1>. Returns true only for the single call that recorded the find. */
  markFound(teamId: string, index: number, ts: number): Promise<boolean>;

  /** Clears finds, hunt start and the activity log; keeps registered teams. */
  resetProgress(): Promise<void>;
  /** Clears everything, including teams. */
  resetAll(): Promise<void>;

  log(event: LogEvent): Promise<void>;
  recentLog(limit?: number): Promise<LogEvent[]>;
  getCounter(key: string): Promise<number>;
  incrCounter(key: string, ttlSeconds: number): Promise<number>;
}

export class StoreUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Hunt store unavailable", { cause });
    this.name = "StoreUnavailableError";
  }
}

const K = {
  state: "hunt:state",
  teams: "hunt:teams",
  names: "hunt:names",
  tiebreak: "hunt:tiebreak",
  log: "hunt:log",
  progress: (teamId: string) => `hunt:progress:${teamId}`,
};
const LOG_MAX = 200;

const toNum = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const parseCps = (h: Record<string, unknown> | null | undefined) =>
  Array.from({ length: CHECKPOINTS_PER_TRACK }, (_, i) => toNum(h?.[`cp${i + 1}`]));

const parseState = (h: Record<string, unknown> | null | undefined): HuntState => ({
  start: toNum(h?.start),
  registrationOpen: String(h?.regClosed ?? "") !== "1",
});

// Upstash auto-deserializes JSON values, so accept both strings and objects.
function parseJson<T>(raw: unknown): T | null {
  try {
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as T;
  } catch {
    return null;
  }
}

function parseTeam(raw: unknown): Team | null {
  const t = parseJson<Team>(raw);
  return t && typeof t.id === "string" && isTrackId(t.track) ? { ...t, joinCode: String(t.joinCode) } : null;
}

function parseEvent(raw: unknown): LogEvent | null {
  const e = parseJson<LogEvent>(raw);
  return e && typeof e.ts === "number" ? e : null;
}

const byCreated = (a: Team, b: Team) => a.created - b.created;

export function createMemoryStore(): HuntStore {
  // Every method body runs without awaiting between check and set, so each operation is
  // atomic in single-threaded JS — the same guarantees as HSETNX.
  let state: { start: number | null; regClosed: boolean } = { start: null, regClosed: false };
  const teams = new Map<string, Team>();
  const names = new Map<string, string>();
  const progress = new Map<string, Record<string, number>>();
  const events: LogEvent[] = [];
  const counters = new Map<string, { n: number; expires: number }>();
  let tiebreak = 0;

  const live = (key: string) => {
    const c = counters.get(key);
    if (c && c.expires <= Date.now()) counters.delete(key);
    return counters.get(key);
  };

  return {
    persistent: false,
    async getState() {
      return { start: state.start, registrationOpen: !state.regClosed };
    },
    async setStart(ts) {
      state = { ...state, start: ts };
    },
    async setRegistrationOpen(open) {
      state = { ...state, regClosed: !open };
    },
    async listTeams() {
      return [...teams.values()].sort(byCreated);
    },
    async getTeam(id) {
      return teams.get(id) ?? null;
    },
    async createTeam(team) {
      const key = teamNameKey(team.name);
      if (names.has(key)) return "name-taken";
      names.set(key, team.id);
      teams.set(team.id, team);
      return "ok";
    },
    async setTeamTrack(id, track) {
      const t = teams.get(id);
      if (t) teams.set(id, { ...t, track });
    },
    async deleteTeam(id) {
      const t = teams.get(id);
      if (!t) return;
      teams.delete(id);
      names.delete(teamNameKey(t.name));
      progress.delete(id);
    },
    async nextTiebreak() {
      return tiebreak++;
    },
    async getProgress(teamId) {
      return parseCps(progress.get(teamId));
    },
    async getAllProgress(ids) {
      return Object.fromEntries(ids.map((id) => [id, parseCps(progress.get(id))]));
    },
    async markFound(teamId, index, ts) {
      const h = progress.get(teamId) ?? {};
      progress.set(teamId, h);
      const field = `cp${index + 1}`;
      if (h[field] != null) return false;
      h[field] = ts;
      return true;
    },
    async resetProgress() {
      progress.clear();
      events.length = 0;
      state = { ...state, start: null };
    },
    async resetAll() {
      progress.clear();
      events.length = 0;
      teams.clear();
      names.clear();
      state = { start: null, regClosed: false };
      tiebreak = 0;
    },
    async log(event) {
      events.unshift(event);
      events.length = Math.min(events.length, LOG_MAX);
    },
    async recentLog(limit = 20) {
      return events.slice(0, limit);
    },
    async getCounter(key) {
      return live(key)?.n ?? 0;
    },
    async incrCounter(key, ttlSeconds) {
      const c = live(key) ?? { n: 0, expires: Date.now() + ttlSeconds * 1000 };
      c.n++;
      counters.set(key, c);
      return c.n;
    },
  };
}

export function createRedisStore(redis: Redis): HuntStore {
  const run = async <T>(op: string, fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      console.error(`[hunt] Redis ${op} failed — is Upstash Redis connected and reachable?`, err);
      throw new StoreUnavailableError(err);
    }
  };

  const listTeams = async () => {
    const all = (await redis.hgetall<Record<string, unknown>>(K.teams)) ?? {};
    return Object.values(all)
      .map(parseTeam)
      .filter((t): t is Team => t !== null)
      .sort(byCreated);
  };
  const getTeam = async (id: string) => parseTeam(await redis.hget(K.teams, id));

  return {
    persistent: true,
    getState: () => run("getState", async () => parseState(await redis.hgetall(K.state))),
    setStart: (ts) =>
      run("setStart", async () => {
        if (ts == null) await redis.hdel(K.state, "start");
        else await redis.hset(K.state, { start: ts });
      }),
    setRegistrationOpen: (open) =>
      run("setRegistrationOpen", async () => {
        await redis.hset(K.state, { regClosed: open ? "0" : "1" });
      }),

    listTeams: () => run("listTeams", listTeams),
    getTeam: (id) => run("getTeam", () => getTeam(id)),
    createTeam: (team) =>
      run("createTeam", async () => {
        const claimed = await redis.hsetnx(K.names, teamNameKey(team.name), team.id);
        if (claimed !== 1) return "name-taken";
        await redis.hset(K.teams, { [team.id]: JSON.stringify(team) });
        return "ok";
      }),
    setTeamTrack: (id, track) =>
      run("setTeamTrack", async () => {
        const t = await getTeam(id);
        if (t) await redis.hset(K.teams, { [id]: JSON.stringify({ ...t, track }) });
      }),
    deleteTeam: (id) =>
      run("deleteTeam", async () => {
        const t = await getTeam(id);
        if (!t) return;
        const p = redis.pipeline();
        p.hdel(K.teams, id);
        p.hdel(K.names, teamNameKey(t.name));
        p.del(K.progress(id));
        await p.exec();
      }),
    nextTiebreak: () => run("nextTiebreak", () => redis.incr(K.tiebreak)),

    getProgress: (teamId) => run("getProgress", async () => parseCps(await redis.hgetall(K.progress(teamId)))),
    getAllProgress: (ids) =>
      run("getAllProgress", async () => {
        if (ids.length === 0) return {};
        const p = redis.pipeline();
        for (const id of ids) p.hgetall(K.progress(id));
        const results = await p.exec<(Record<string, unknown> | null)[]>();
        return Object.fromEntries(ids.map((id, i) => [id, parseCps(results[i])]));
      }),
    markFound: (teamId, index, ts) =>
      run("markFound", async () => (await redis.hsetnx(K.progress(teamId), `cp${index + 1}`, ts)) === 1),

    resetProgress: () =>
      run("resetProgress", async () => {
        const ids = Object.keys((await redis.hgetall(K.teams)) ?? {});
        const p = redis.pipeline();
        for (const id of ids) p.del(K.progress(id));
        p.del(K.log);
        p.hdel(K.state, "start");
        await p.exec();
      }),
    resetAll: () =>
      run("resetAll", async () => {
        const ids = Object.keys((await redis.hgetall(K.teams)) ?? {});
        await redis.del(K.state, K.teams, K.names, K.tiebreak, K.log, ...ids.map(K.progress));
      }),

    log: (event) =>
      run("log", async () => {
        const p = redis.pipeline();
        p.lpush(K.log, JSON.stringify(event));
        p.ltrim(K.log, 0, LOG_MAX - 1);
        await p.exec();
      }),
    recentLog: (limit = 20) =>
      run("recentLog", async () => {
        const raw = await redis.lrange<unknown>(K.log, 0, limit - 1);
        return raw.map(parseEvent).filter((e): e is LogEvent => e !== null);
      }),
    getCounter: (key) => run("getCounter", async () => toNum(await redis.get(key)) ?? 0),
    incrCounter: (key, ttlSeconds) =>
      run("incrCounter", async () => {
        const p = redis.pipeline();
        p.incr(key);
        p.expire(key, ttlSeconds);
        const [n] = await p.exec<[number, number]>();
        return n;
      }),
  };
}

function createStore(): HuntStore {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return createRedisStore(new Redis({ url, token, cache: "no-store" }));
  if (process.env.VERCEL_ENV === "production") {
    console.error("[hunt] No Redis env vars found in production — progress will NOT persist. Connect Upstash Redis.");
  }
  return createMemoryStore();
}

// Kept on globalThis so dev hot-reloads and separate route bundles share one in-memory store.
const g = globalThis as typeof globalThis & { __huntStore?: HuntStore };
export const store: HuntStore = (g.__huntStore ??= createStore());

/* ---------- Light per-IP rate limiting ---------- */

export type RateBucket = "fail" | "register";

const LIMITS: Record<RateBucket, number> = {
  // Unknown checkpoint codes and bad join codes: stops brute-forcing.
  fail: Number(process.env.RATE_LIMIT_PER_MINUTE) || 30,
  // New team registrations: generous enough for a whole office behind one NAT IP.
  register: Number(process.env.REGISTER_LIMIT_PER_MINUTE) || 20,
};
const windowKey = (bucket: RateBucket, ip: string) => `hunt:rl:${bucket}:${ip}:${Math.floor(Date.now() / 60_000)}`;

export async function isRateLimited(ip: string, bucket: RateBucket = "fail", s: HuntStore = store): Promise<boolean> {
  return (await s.getCounter(windowKey(bucket, ip))) >= LIMITS[bucket];
}

export async function recordHit(ip: string, bucket: RateBucket = "fail", s: HuntStore = store): Promise<void> {
  await s.incrCounter(windowKey(bucket, ip), 120);
}
