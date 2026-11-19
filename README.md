# 🗺️ Office Treasure Hunt

A mobile-first QR-code treasure hunt. **Any number of teams** register on their phones and are each assigned to one of **4 trails** (A–D). Every trail has 6 hidden QR codes found in a fixed order. Several teams can share a trail — they follow the same QR codes, but each team's progress is tracked separately. Players scan with their normal phone camera — no app install. Organizers watch a live leaderboard. Runs on Vercel's free tier with Upstash Redis.

## How a game works

1. **Register** — one player per team scans the *registration poster* QR (→ `/register`) and picks a team name. The team is put on the trail with the fewest teams.
2. **Join** — teammates scan the *team QR* shown on that phone (→ `/t/<code>`) or type the 6-character team code at `/join`. Everyone shares the team's progress.
3. **Lobby** — teams see their trail colour and wait. Organizers can shuffle/rebalance or move teams, then press **🚀 Start hunt**: every team's first clue appears at the same moment.
4. **Hunt** — solve the clue, find your trail's QR, scan it, get the next clue. Teams that register after the start begin the moment they register.
5. **Finish** — after checkpoint 6 the team sees its total time and placement. Ranking is by total time (= finish order when everyone starts together).

## Routes

| URL | What it does |
| --- | --- |
| `/register` | Create a team (name → trail auto-assigned → join cookie). |
| `/join`, `/t/<code>` | Join an existing team by code / invite QR. |
| `/play` | Lobby → clue → finish screen. Auto-refreshes so all teammates' phones stay in sync. Shows an invite QR for adding teammates. |
| `/s/<code>` | Checkpoint QR. Server-side decision: `found` / `already` / `skip` / `wrong-track` / `not-started` / `invalid` / `no-team`. Finds use `HSETNX` per team, so simultaneous scans never double-count. |
| `/scan` | Optional in-app scanner (live camera on https, photo capture on any origin). |
| `/leave` | Forget this phone's team (the team's progress is kept). |
| `/admin` | Live leaderboard + activity feed (10s refresh). `?tv=1` projector mode, `?track=A` trail filter. Start button. |
| `/admin/teams` | Teams & setup: open/close registration, shuffle & rebalance, move/remove/add teams, start, reset. |
| `/admin/qr` | Printable A4 sheet: registration poster + 6 checkpoint cards per trail (25 QRs). |
| `/admin/test` | Dry-run page: every scan link and team join link, clickable. |

## Run locally

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local      # optional: only needed for Redis
npm run dev                     # http://localhost:3000
npm test                        # unit tests
npm run build                   # production build + type check
```

Without Redis env vars the app uses an **in-memory store** (zero setup; resets on restart). The leaderboard shows which store is active. `next dev` writes to `.next-dev` and `next build` to `.next`, so building never breaks a running dev server.

Sign in as organizer at `http://localhost:3000/admin` with the password **`Daksh`** (hardcoded as `ADMIN_PASSWORD` in [`lib/crypto.ts`](./lib/crypto.ts) — change it there).

### Testing with real phones on your Wi-Fi

```bash
npm run dev:lan      # http://<your-LAN-IP>:3000 — plain http
npm run dev:https    # https://<your-LAN-IP>:3000 — self-signed cert (accept the warning once)
```

Native camera scanning works on both. The in-app `/scan` page uses the **live camera** on https/localhost; on plain http (where browsers block live camera) it switches to **“Take a photo of the QR”**, which works everywhere. Print the QR sheet from the same address the phones will use.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project → Import** the repo (framework auto-detected as Next.js).
3. Open the project → **Storage** (or **Marketplace**) → add **Upstash Redis** → **Connect to project**. This sets `KV_REST_API_URL` / `KV_REST_API_TOKEN` (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` also work).
4. **Deployments → Redeploy** so the Redis env vars are picked up.
5. Visit `https://<your-domain>/admin`, sign in with the organizer password — the header should say **● Redis connected**.

Optional env vars: `RATE_LIMIT_PER_MINUTE` (failed scans / wrong team codes per IP per minute, default 30), `REGISTER_LIMIT_PER_MINUTE` (team registrations per IP per minute, default 20), `HUNT_BASE_URL` (pin the domain printed in QR codes).

**Redis usage:** a phone showing a clue costs ~3 Redis commands per refresh (every 15s, only while the screen is on); the leaderboard costs ~3 + one per team every 10s. A 2-hour hunt with ~40 teams fits comfortably in Upstash's free tier, but check your plan's monthly command limit for very large events.

## Configuring the hunt

Everything lives in [`hunt.config.ts`](./hunt.config.ts): hunt name, trail names/colours, intro texts, finish message, `maxTeams`, `autoStart`, and per-checkpoint `{ code, locationLabel, clue }`. Teams are **not** configured here — they register themselves.

- **A clue leads TO its own checkpoint.** Checkpoint 1's clue is shown at the start; checkpoint 2's clue after finding checkpoint 1, and so on.
- `locationLabel` is only printed on the QR card (for whoever hides it) — players never see it.
- **Shared locations** (default): define each spot once in `SPOT` and reference it per trail in a different order with `at(code, SPOT.x)`. Every card is printed with the trail name and colour, so stickers at the same spot can't be confused.
- **Separate locations**: write checkpoints inline: `{ code: "…", locationLabel: "Server room door", clue: "…" }`.
- `autoStart: true` skips the lobby: each team's clock starts the moment it registers.
- **Fresh codes:** `npm run gen-codes` prints new random checkpoint codes — paste them over the old ones. The config is validated at build time (4 trails × 6 checkpoints, codes 10+ URL-safe chars, all unique).

⚠️ Changing a checkpoint code invalidates any QR already printed with it. Re-print after changing.

### Trail assignment

- New teams go to the trail with the **fewest teams** (ties rotate), so trails stay balanced automatically.
- **Move** a team on `/admin/teams` any time before it finds its first checkpoint (codes differ per trail, so it's locked after that).
- **Shuffle & rebalance** (before the start) randomly re-deals all teams evenly across trails — useful if friends registered back-to-back and you want to mix things up. Phones pick up the new trail automatically.

## Pre-event checklist

1. **Deploy** to Vercel with Redis connected (`/admin` shows “Redis connected”).
2. **Dry run** via `/admin/test`: register a test team, press Start, click through its trail, try a skip and another trail's code; watch `/admin`. Test one real QR with a phone too.
3. **Reset**: `/admin/teams` → **🧨 Delete everything** (removes test teams). Every trail shows 0 teams.
4. **Print** `/admin/qr` from the **production domain** (A4, 100% scale, background graphics on): 1 registration poster + 24 checkpoint cards.
5. **Hide** the checkpoint QRs at their `📍` locations.
6. **Put up the registration poster**, let teams register, (optionally) rebalance, close registration, put `/admin?tv=1` on a big screen and press **🚀 Start hunt**.

## Security / anti-cheat notes

- Checkpoint codes are random (72 bits). The client never receives any code other than the one it scanned; clues are only rendered server-side for the team's current checkpoint, and nothing before the start.
- A team is identified by a random 96-bit id in an httpOnly cookie. Team join codes are 6 characters from a 31-letter alphabet (~890M combinations) and wrong guesses are rate-limited per IP.
- Scans without a team are no-ops (link previews and strangers can't record finds). Scans before the start don't count.
- Organizers sign in at `/admin/login` with a password (hardcoded in `lib/crypto.ts`, server-only — never in the client bundle). It's compared in constant time, wrong attempts are rate-limited per IP, and the 7-day cookie stores an HMAC token rather than the password. Anyone with access to the source code can see the password, so change it before sharing the repo. `/admin/*` is gated by middleware **and** checked again in every page/route; admin form posts also get a same-origin check.
- If Redis is unreachable, players see a friendly “can't reach the hunt” page and the server logs `[hunt] Redis … failed`.

## Data model (Redis)

| Key | Contents |
| --- | --- |
| `hunt:state` | hash: `start` (ms), `regClosed` |
| `hunt:teams` | hash: team id → `{ id, name, track, joinCode, created }` |
| `hunt:names` | hash: lower-case name → team id (`HSETNX` keeps names unique) |
| `hunt:progress:<teamId>` | hash: `cp1`…`cp6` (ms, each set with `HSETNX`) |
| `hunt:log` | list: last 200 scan/join events |
| `hunt:tiebreak`, `hunt:rl:*` | assignment tie-break counter, rate-limit counters |

## Project layout

```
hunt.config.ts             trails, checkpoints, clues (+ build-time validation)
middleware.ts              admin gate for /admin/*
lib/hunt.ts                pure logic: scan decision, progress, trail assignment, ranking (unit-tested)
lib/store.ts               Redis + in-memory store behind one interface, rate limiting
lib/teams.ts, lib/join.ts  registration and joining
lib/auth.ts, lib/crypto.ts admin auth, constant-time compare
app/register, app/join, app/t/[code], app/leave    team sign-up and joining
app/play, app/s/[code], app/scan                   playing
app/admin                  leaderboard, teams, qr, test, action
tests/hunt.test.ts         unit tests (node:test)
scripts/gen-codes.ts       npm run gen-codes
```
