import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { TRACK_IDS, configTodos, huntConfig, validateConfig, type HuntConfig, type TrackId } from "@/hunt.config";
import {
  assignTrack,
  buildRow,
  cleanTeamName,
  decideScan,
  decideWord,
  findCode,
  normalizeJoinCode,
  placement,
  progress,
  rankTeams,
  rebalance,
  teamStart,
  type LeaderRow,
} from "@/lib/hunt";
import { createMemoryStore, isRateLimited, recordHit } from "@/lib/store";
import { registerTeam } from "@/lib/teams";
import { formatDuration, ordinal } from "@/lib/format";

const T0 = 1_700_000_000_000;
const empty = () => [null, null, null, null, null, null] as (number | null)[];
const withFound = (n: number, offset = 0) => empty().map((_, i) => (i < n ? T0 + (i + 1) * 60_000 + offset : null));

describe("decideScan", () => {
  const owner = (index: number) => ({ trackId: "A" as const, index });
  const scan = (team: TrackId | null, index: number, cps: (number | null)[], started = true) =>
    decideScan({ team, owner: owner(index), cps, started });

  test("found: first checkpoint, then the next one in order", () => {
    assert.equal(scan("A", 0, empty()), "found");
    assert.equal(scan("A", 2, withFound(2)), "found");
  });
  test("already: checkpoint recorded before", () => {
    assert.equal(scan("A", 1, withFound(3)), "already");
  });
  test("skip: checkpoint 4 before 3, or 2 on a fresh team", () => {
    assert.equal(scan("A", 3, withFound(2)), "skip");
    assert.equal(scan("A", 1, empty()), "skip");
  });
  test("wrong-track: a team on trail B scanning a trail A code", () => {
    assert.equal(scan("B", 0, empty()), "wrong-track");
  });
  test("invalid: unknown code", () => {
    assert.equal(decideScan({ team: "A", owner: null, cps: empty(), started: true }), "invalid");
    assert.equal(findCode("not-a-real-code"), null);
  });
  test("no-team: no cookie never records", () => {
    assert.equal(scan(null, 0, empty()), "no-team");
  });
  test("not-started: own-trail scan before the organizer starts the hunt", () => {
    assert.equal(scan("A", 0, empty(), false), "not-started");
    assert.equal(scan("B", 0, empty(), false), "wrong-track");
  });
});

describe("decideWord", () => {
  // Red trail: CP2 = CAPPUCCINO, CP5 = VICTORY. Green trail CP2 = MONARCH.
  const red = huntConfig.tracks[0];
  const word = (w: string, cps: (number | null)[], started = true) => decideWord({ word: w, track: red, cps, started });

  test("found: current checkpoint's word, any case/spacing", () => {
    assert.deepEqual(word("cappuccino", withFound(1)), { result: "found", index: 1 });
    assert.deepEqual(word(" Cap-pu ccino ", withFound(1)), { result: "found", index: 1 });
  });
  test("already / skip / wrong / not started", () => {
    assert.deepEqual(word("CAPPUCCINO", withFound(3)), { result: "already", index: 1 });
    assert.deepEqual(word("VICTORY", withFound(2)), { result: "skip" });
    assert.deepEqual(word("MONARCH", withFound(1)), { result: "bad-word" }, "another trail's word is just wrong");
    assert.deepEqual(word("CAPPUCCINO", withFound(1), false), { result: "not-started" });
    assert.deepEqual(word("  ", withFound(1)), { result: "no-word" });
  });
});

describe("teams", () => {
  test("assignTrack fills the emptiest trail, spreading ties", () => {
    assert.equal(assignTrack([], 0), "A");
    assert.equal(assignTrack([], 1), "B");
    assert.equal(assignTrack([{ track: "A" }, { track: "B" }, { track: "D" }], 7), "C");
    const teams: { track: TrackId }[] = [];
    for (let i = 0; i < 10; i++) teams.push({ track: assignTrack(teams, i) });
    const counts = TRACK_IDS.map((id) => teams.filter((t) => t.track === id).length);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `unbalanced: ${counts}`);
  });

  test("rebalance deals teams evenly", () => {
    const a = rebalance(["t1", "t2", "t3", "t4", "t5", "t6"]);
    assert.deepEqual(Object.values(a), ["A", "B", "C", "D", "A", "B"]);
  });

  test("teamStart: organizer start, late registrants, autoStart", () => {
    const team = { created: T0 + 5_000 };
    assert.equal(teamStart(team, { start: null, registrationOpen: true }, false), null);
    assert.equal(teamStart({ created: T0 - 1 }, { start: T0, registrationOpen: true }, false), T0);
    assert.equal(teamStart(team, { start: T0, registrationOpen: true }, false), T0 + 5_000);
    assert.equal(teamStart(team, { start: null, registrationOpen: true }, true), T0 + 5_000);
  });

  test("team names and join codes are normalized", () => {
    assert.equal(cleanTeamName("  The   Stapler\tSquad "), "The Stapler Squad");
    assert.equal(cleanTeamName("x"), null);
    assert.equal(cleanTeamName("x".repeat(33)), null);
    assert.equal(normalizeJoinCode("abc-234"), "ABC234");
    assert.equal(normalizeJoinCode("ABC23O"), null); // O is not in the alphabet
    assert.equal(normalizeJoinCode("ABC"), null);
  });

  test("registration: unique names, balanced trails, closed and full", async () => {
    const s = createMemoryStore();
    const a = await registerTeam("Alpha", { s });
    assert.ok(a.ok);
    assert.deepEqual(await registerTeam(" alpha ", { s }), { ok: false, reason: "name-taken" });
    for (const n of ["Bravo", "Charlie", "Delta"]) assert.ok((await registerTeam(n, { s })).ok);
    const tracks = (await s.listTeams()).map((t) => t.track).sort();
    assert.deepEqual(tracks, ["A", "B", "C", "D"]);

    await s.setRegistrationOpen(false);
    assert.deepEqual(await registerTeam("Echo", { s }), { ok: false, reason: "closed" });
    assert.ok((await registerTeam("Echo", { s, byAdmin: true })).ok, "organizers can still add teams");
  });
});

describe("leaderboard", () => {
  const row = (name: string, cps: (number | null)[], start: number | null = T0) =>
    buildRow({ id: name, name, track: "A" }, start, cps);

  test("buildRow computes progress, status and total time", () => {
    const done = row("A", withFound(6));
    assert.equal(done.progress, 6);
    assert.equal(done.finished, true);
    assert.equal(done.status, "Finished");
    assert.equal(done.totalMs, 6 * 60_000);
    assert.equal(row("B", empty(), null).status, "Not started");
    assert.equal(row("C", empty()).status, "In progress");
    assert.equal(progress([T0, null, T0, null, null, null]), 1);
  });

  test("finished first by time, then progress desc, then last find asc, not started last", () => {
    const late = row("Late", withFound(6, 10_000));
    const early = row("Early", withFound(6));
    const three = row("Three", withFound(3, 5_000));
    const threeFirst = row("ThreeFirst", withFound(3));
    assert.deepEqual(rankTeams([late, three, threeFirst, early]).map((r) => r.id), ["Early", "Late", "ThreeFirst", "Three"]);

    const notStarted = row("Idle", empty(), null);
    const startedNoFinds = row("Ready", empty());
    const one = row("One", withFound(1));
    assert.deepEqual(rankTeams([notStarted, startedNoFinds, one]).map((r) => r.id), ["One", "Ready", "Idle"]);
  });

  test("a late-starting team is ranked by its own total time", () => {
    const onTime = row("OnTime", withFound(6, 30_000));
    const lateStart = buildRow({ id: "Late", name: "Late", track: "B" }, T0 + 60_000, withFound(6, 120_000));
    assert.deepEqual(rankTeams([onTime, lateStart]).map((r) => r.id), ["OnTime", "Late"]);
    const fast = buildRow({ id: "Fast", name: "Fast", track: "B" }, T0 + 60_000, withFound(6, 40_000));
    assert.deepEqual(rankTeams([onTime, fast]).map((r) => r.id), ["Fast", "OnTime"]);
  });

  test("placement among finished teams", () => {
    const rows: LeaderRow[] = [row("A", withFound(6, 1)), row("B", withFound(6)), row("C", withFound(2))];
    assert.equal(placement("B", rows), 1);
    assert.equal(placement("A", rows), 2);
    assert.equal(placement("C", rows), null);
  });

  test("formatting helpers", () => {
    assert.equal(formatDuration(754_000), "12:34");
    assert.equal(formatDuration(3_723_000), "1:02:03");
    assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
  });
});

describe("memory store", () => {
  test("simultaneous scans of one checkpoint record exactly once", async () => {
    const s = createMemoryStore();
    const results = await Promise.all(Array.from({ length: 5 }, (_, i) => s.markFound("t1", 0, T0 + i)));
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal((await s.getProgress("t1"))[0], T0);
  });

  test("teams on the same trail have separate progress", async () => {
    const s = createMemoryStore();
    assert.equal(await s.markFound("t1", 0, T0), true);
    assert.equal(await s.markFound("t2", 0, T0 + 1), true);
    assert.deepEqual((await s.getAllProgress(["t1", "t2"])).t2[0], T0 + 1);
  });

  test("reset progress keeps teams; delete everything removes them", async () => {
    const s = createMemoryStore();
    const r = await registerTeam("Alpha", { s });
    assert.ok(r.ok);
    await s.setStart(T0);
    await s.markFound(r.team.id, 0, T0);
    await s.log({ team: r.team.id, track: r.team.track, index: 0, ts: T0, result: "found" });

    await s.resetProgress();
    assert.equal((await s.getState()).start, null);
    assert.deepEqual(await s.getProgress(r.team.id), empty());
    assert.deepEqual(await s.recentLog(), []);
    assert.equal((await s.listTeams()).length, 1);

    await s.resetAll();
    assert.equal((await s.listTeams()).length, 0);
    assert.ok((await registerTeam("Alpha", { s })).ok, "name is free again");
  });

  test("deleting a team frees its name and progress", async () => {
    const s = createMemoryStore();
    const r = await registerTeam("Alpha", { s });
    assert.ok(r.ok);
    await s.markFound(r.team.id, 0, T0);
    await s.deleteTeam(r.team.id);
    assert.equal(await s.getTeam(r.team.id), null);
    assert.deepEqual(await s.getProgress(r.team.id), empty());
    assert.ok((await registerTeam("alpha", { s })).ok);
  });

  test("rate limit kicks in after 30 failures per IP", async () => {
    const s = createMemoryStore();
    for (let i = 0; i < 29; i++) await recordHit("1.2.3.4", "fail", s);
    assert.equal(await isRateLimited("1.2.3.4", "fail", s), false);
    await recordHit("1.2.3.4", "fail", s);
    assert.equal(await isRateLimited("1.2.3.4", "fail", s), true);
    assert.equal(await isRateLimited("1.2.3.4", "register", s), false);
    assert.equal(await isRateLimited("5.6.7.8", "fail", s), false);
  });
});

describe("config", () => {
  test("shipped config is valid, with 24 unique checkpoint codes", () => {
    assert.doesNotThrow(() => validateConfig(huntConfig));
    const codes = huntConfig.tracks.flatMap((t) => t.checkpoints.map((c) => c.code));
    assert.equal(new Set(codes).size, 24);
  });

  test("placeholders are listed; duplicate code words are rejected", () => {
    const filled: HuntConfig = structuredClone(huntConfig);
    filled.tracks[0].checkpoints[0].clue = "Go to {{zone}} and find {{person}}";
    const todos = configTodos(filled).filter((t) => t.where === "Red Trail · CP1 clue");
    assert.deepEqual(todos.map((t) => t.text), ["zone", "person"]);

    const dup: HuntConfig = structuredClone(huntConfig);
    dup.tracks[1].checkpoints[1].codeWord = "cappuccino";
    assert.throws(() => validateConfig(dup), /codeWord "cappuccino" duplicates/);
  });

  test("duplicate or short codes are rejected", () => {
    const broken: HuntConfig = structuredClone(huntConfig);
    broken.tracks[1].checkpoints[0].code = broken.tracks[0].checkpoints[0].code;
    broken.tracks[2].checkpoints[0].code = "short";
    assert.throws(() => validateConfig(broken), /duplicates[\s\S]*10\+ URL-safe/);
  });
});
