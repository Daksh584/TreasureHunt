/**
 * Treasure hunt configuration — the single source of truth.
 *
 * Edit names, colours, clues and location labels freely.
 * Teams are NOT configured here: any number of teams register at /register and are each
 * assigned to one of the 4 tracks (least-loaded first; organizers can move or rebalance them).
 * Several teams can share a track — they follow the same 6 QR codes, with separate progress.
 *
 * Checkpoint `code` values are printed into the QR codes: if you change them AFTER printing,
 * the printed QRs stop working. Run `npm run gen-codes` for fresh values.
 *
 * Two layouts are supported with no code changes:
 *  (a) every track uses its own locations — write each checkpoint inline:
 *        { code: "…", locationLabel: "Pantry fridge", clue: "…" }
 *  (b) all tracks share the same 6 locations in a different order — reuse the
 *      `SPOT` entries below via `at(code, SPOT.x)` (this is the default setup).
 *
 * A clue always leads TO the checkpoint it belongs to: checkpoint 1's clue is
 * shown right after joining, checkpoint 2's clue right after finding checkpoint 1, etc.
 */

export const TRACK_IDS = ["A", "B", "C", "D"] as const;
export type TrackId = (typeof TRACK_IDS)[number];

export const CHECKPOINTS_PER_TRACK = 6;

export type Checkpoint = {
  /** Random, URL-safe, 10+ characters. Encoded in the QR as /s/<code>. */
  code: string;
  /** Where organizers hide it. Printed on the QR card, never shown in the app. */
  locationLabel: string;
  /** Shown to players; it leads to THIS checkpoint. */
  clue: string;
};

export type Track = {
  id: TrackId;
  name: string;
  /** Accent colour (hex). Used in the app and printed on every QR card. */
  color: string;
  checkpoints: Checkpoint[];
};

export type HuntConfig = {
  huntName: string;
  tracks: Track[];
  introText: Record<TrackId, string>;
  finishMessage: string;
  /** Registration closes automatically at this many teams. */
  maxTeams: number;
  /**
   * false (default): teams wait in a lobby until an organizer presses "Start hunt"; everyone
   *   starts together (late registrants start the moment they register).
   * true: each team's clock starts the moment it registers — no start button needed.
   */
  autoStart: boolean;
};

/** Shared locations for layout (b). Each clue leads to the spot itself. */
const SPOT = {
  pantry: {
    locationLabel: "Pantry fridge",
    clue: "Cold comfort lives here: milk, leftovers and someone's very old yoghurt. Look where things are kept chilled.",
  },
  library: {
    locationLabel: "Library bookshelf",
    clue: "Manuals, novels and the occasional cookbook. Search the shelf where the words wait quietly.",
  },
  reception: {
    locationLabel: "Reception desk",
    clue: "Every visitor's journey starts with a hello. Head to where guests are greeted.",
  },
  meeting: {
    locationLabel: "North meeting room",
    clue: "Big ideas, long agendas, a whiteboard that's never fully erased. Find the room that points north.",
  },
  plant: {
    locationLabel: "Big plant by the windows",
    clue: "I drink water, love sunlight and never come to meetings. Find the tallest green colleague.",
  },
  printer: {
    locationLabel: "Printer corner",
    clue: "I jam when you're in a hurry and whir when you're not. Check where the paper comes out warm.",
  },
} satisfies Record<string, Omit<Checkpoint, "code">>;

const at = (code: string, spot: Omit<Checkpoint, "code">): Checkpoint => ({ code, ...spot });

export const huntConfig: HuntConfig = {
  huntName: "The Great Office Treasure Hunt",
  tracks: [
    {
      id: "A",
      name: "Red Trail",
      color: "#d62839",
      checkpoints: [
        at("8YnFqT7vIiCW", SPOT.pantry),
        at("SX2MV5GflJxJ", SPOT.library),
        at("D-VV_IhMoyeK", SPOT.reception),
        at("lJLJHP93AUJi", SPOT.meeting),
        at("O6lri_qhjre5", SPOT.plant),
        at("Ut52KUyjgfKe", SPOT.printer),
      ],
    },
    {
      id: "B",
      name: "Blue Trail",
      color: "#1d70b8",
      checkpoints: [
        at("NqQHtYa8Q5wj", SPOT.library),
        at("xl1QbcBhN41E", SPOT.reception),
        at("LFFR1ArPGAi_", SPOT.meeting),
        at("2dbnS36LW8Yd", SPOT.plant),
        at("4f9TmhMAv1XM", SPOT.printer),
        at("Gl3O7YuM1Hlm", SPOT.pantry),
      ],
    },
    {
      id: "C",
      name: "Green Trail",
      color: "#1e8449",
      checkpoints: [
        at("SZKPWj1U_W5h", SPOT.reception),
        at("7u1TqAAwie44", SPOT.meeting),
        at("3ude227PgLUf", SPOT.plant),
        at("VXZWqJ8w3sU2", SPOT.printer),
        at("n3yyxUHUn8Pl", SPOT.pantry),
        at("mwg7pZumlD0i", SPOT.library),
      ],
    },
    {
      id: "D",
      name: "Orange Trail",
      color: "#c25400",
      checkpoints: [
        at("NB0qRUd7WKo2", SPOT.meeting),
        at("WzKW86CU7usY", SPOT.plant),
        at("ch8Dm7MJNdsN", SPOT.printer),
        at("GizBvfhkLaom", SPOT.pantry),
        at("209YIpNl3-tm", SPOT.library),
        at("m5uuj7_yB_bY", SPOT.reception),
      ],
    },
  ],
  introText: {
    A: "You're on the Red Trail! Six checkpoints stand between you and glory. Read each clue, find the RED QR, scan it with your phone camera. Stick together and go!",
    B: "You're on the Blue Trail! Six checkpoints stand between you and glory. Read each clue, find the BLUE QR, scan it with your phone camera. Stick together and go!",
    C: "You're on the Green Trail! Six checkpoints stand between you and glory. Read each clue, find the GREEN QR, scan it with your phone camera. Stick together and go!",
    D: "You're on the Orange Trail! Six checkpoints stand between you and glory. Read each clue, find the ORANGE QR, scan it with your phone camera. Stick together and go!",
  },
  finishMessage: "You found all six checkpoints. Head back to the organizers to claim your treasure!",
  maxTeams: 60,
  autoStart: false,
};

const URL_SAFE = /^[A-Za-z0-9_-]+$/;

/** Throws on a misconfigured hunt so mistakes surface at build time, not on event day. */
export function validateConfig(config: HuntConfig): void {
  const problems: string[] = [];
  const ids = config.tracks.map((t) => t.id);
  if (ids.length !== TRACK_IDS.length || TRACK_IDS.some((id) => !ids.includes(id))) {
    problems.push(`tracks must be exactly ${TRACK_IDS.join(", ")} (got ${ids.join(", ")})`);
  }
  const seen = new Map<string, string>();
  const claim = (value: string, where: string) => {
    if (value.length < 10 || !URL_SAFE.test(value)) {
      problems.push(`${where}: "${value}" must be 10+ URL-safe characters (A-Z a-z 0-9 _ -)`);
    }
    const prev = seen.get(value);
    if (prev) problems.push(`${where}: duplicates ${prev}`);
    seen.set(value, where);
  };
  for (const track of config.tracks) {
    if (!/^#[0-9a-fA-F]{3,8}$/.test(track.color)) problems.push(`track ${track.id}: color must be hex`);
    if (track.checkpoints.length !== CHECKPOINTS_PER_TRACK) {
      problems.push(`track ${track.id}: needs exactly ${CHECKPOINTS_PER_TRACK} checkpoints`);
    }
    track.checkpoints.forEach((cp, i) => {
      claim(cp.code, `track ${track.id} checkpoint ${i + 1}`);
      if (!cp.clue.trim()) problems.push(`track ${track.id} checkpoint ${i + 1}: empty clue`);
    });
  }
  if (!Number.isInteger(config.maxTeams) || config.maxTeams < 1) problems.push("maxTeams must be a positive integer");
  if (problems.length) throw new Error(`Invalid hunt.config.ts:\n - ${problems.join("\n - ")}`);
}

validateConfig(huntConfig);
