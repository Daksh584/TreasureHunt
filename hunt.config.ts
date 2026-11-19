/**
 * Treasure hunt configuration — the single source of truth.
 *
 * EVENT PLAN (4 trails × 6 checkpoints, up to 12 teams of 2–4, start in BGL 15):
 *   1. A zone in BGL 15 (different per trail) → a colleague's name tag carries the QR
 *   2. A cafeteria in another building → staff code word / volunteer / QR under a table
 *   3. Outside → a tree or a parking-lot pillar carries the QR
 *   4. A break room (riddle) → QR stuck somewhere inside
 *   5. A meeting room → beat the game master's challenge to get the QR / code word
 *   6. Final meeting place: the Box Office (shared by all trails, one QR per trail colour)
 *
 * Anything written {{like this}} is a placeholder you still need to fill in. The admin pages
 * list every remaining placeholder, so nothing slips through on event day.
 *
 * Per checkpoint:
 *   code          random, printed into the QR as /s/<code>. Don't change after printing.
 *   locationLabel where organizers put it — printed on the QR card, never shown to players.
 *   clue          shown to players; it leads TO this checkpoint (checkpoint 1's clue is shown
 *                 at the start, checkpoint 2's clue right after finding checkpoint 1, …).
 *   codeWord      optional: players can type this word on their phone instead of scanning.
 *                 Use it for baristas, volunteers and game masters.
 *   setup         optional organizer notes, shown on the run sheet (/admin/test) only.
 */

export const TRACK_IDS = ["A", "B", "C", "D"] as const;
export type TrackId = (typeof TRACK_IDS)[number];

export const CHECKPOINTS_PER_TRACK = 6;

export type Checkpoint = {
  code: string;
  locationLabel: string;
  clue: string;
  codeWord?: string;
  setup?: string;
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
  /** Shown on the registration page (not enforced — teams are counted, not people). */
  teamSize: { min: number; max: number };
  /**
   * false: teams wait in a lobby until an organizer presses "Start hunt"; everyone starts
   *   together (late registrants start the moment they register).
   * true: each team's clock starts the moment it registers.
   */
  autoStart: boolean;
};

const FINAL_CLUE =
  "Final stretch! Lights, camera… treasure! 🎬 Head to the place where tickets are sold and stars are made — the BOX OFFICE. " +
  "Find the board with your trail’s colour and scan it to stop your clock.";

export const huntConfig: HuntConfig = {
  huntName: "The Great BGL Treasure Hunt",
  maxTeams: 12,
  teamSize: { min: 2, max: 4 },
  autoStart: false,
  tracks: [
    /* ------------------------------ RED ------------------------------ */
    {
      id: "A",
      name: "Red Trail",
      color: "#d62839",
      checkpoints: [
        {
          code: "8YnFqT7vIiCW",
          locationLabel: "BGL 15 · {{Red zone}} · name tag of {{person}}",
          clue:
            "Your first stop is right here in BGL 15: head to {{Red zone, e.g. 'Zone 2, 3rd floor'}}. " +
            "Somewhere in that zone sits a colleague who {{2–3 fun hints, e.g. 'has a cactus called Kevin and three monitors'}}. " +
            "Their first name starts with “{{letter}}”. Find their name tag — your QR is on it. Leave it there for the next team!",
          setup: "Stick the Red QR on the name tag (ask the person first!). Brief them so they don’t remove it.",
        },
        {
          code: "SX2MV5GflJxJ",
          locationLabel: "Costa Coffee · barista counter (code word)",
          codeWord: "CAPPUCCINO",
          clue:
            "Time to leave BGL 15! ☕ Find the café with the red cups and a serious coffee-bean obsession. " +
            "No need to order — walk up to the counter and ask the barista: “Is the treasure hot or iced?” " +
            "Type the word they give you below.",
          setup:
            "Brief the Costa staff: when a team asks “Is the treasure hot or iced?”, reply with the code word CAPPUCCINO. " +
            "Print this QR as a backup and give it to the staff too.",
        },
        {
          code: "D-VV_IhMoyeK",
          locationLabel: "Outside · tree at {{spot}}",
          clue:
            "Fresh air time! 🌳 I have bark but never bite, rings but never call, and leaves but never go home. " +
            "Find me {{where, e.g. 'beside the BGL 16 entrance, the biggest one'}} — your QR is hugging my trunk.",
          setup: "Tape the QR (in a plastic sleeve) to the tree trunk at eye level.",
        },
        {
          code: "lJLJHP93AUJi",
          locationLabel: "Break room · {{building/floor}} · {{exact spot}}",
          clue:
            "Riddle time 🧩 I’m where mugs go missing, the microwave always has a queue and the best gossip is shared over chai. " +
            "Find me on {{building + floor}}. Your QR is {{where, e.g. 'next to the coffee machine'}}.",
          setup: "Stick the QR somewhere visible but not obvious in the break room.",
        },
        {
          code: "O6lri_qhjre5",
          locationLabel: "Meeting room {{name}} · game master",
          codeWord: "VICTORY",
          clue:
            "Meeting time — but this one’s fun! 🎲 Head to meeting room {{room name}}. A game master is waiting. " +
            "Beat their challenge and they’ll show you your next QR (or whisper a code word to type below).",
          setup:
            "Game master holds the QR card and/or says the code word VICTORY after the team wins. " +
            "Suggested game: build a paper-cup tower 10 cups high in 60 seconds.",
        },
        {
          code: "Ut52KUyjgfKe",
          locationLabel: "FINAL · Box Office · Red board",
          clue: FINAL_CLUE,
          setup: "Put the Red QR on a red board at the Box Office. Organizers wait here with prizes.",
        },
      ],
    },

    /* ------------------------------ BLUE ------------------------------ */
    {
      id: "B",
      name: "Blue Trail",
      color: "#1d70b8",
      checkpoints: [
        {
          code: "NqQHtYa8Q5wj",
          locationLabel: "BGL 15 · {{Blue zone}} · name tag of {{person}}",
          clue:
            "Your first stop is right here in BGL 15: head to {{Blue zone}}. " +
            "Hunt down a colleague who {{2–3 fun hints}}. Their name has {{number}} letters and ends with “{{letter}}”. " +
            "Find their name tag — your QR is on it. Leave it there for the next team!",
          setup: "Stick the Blue QR on the name tag (ask the person first!).",
        },
        {
          code: "xl1QbcBhN41E",
          locationLabel: "Baskin Robbins · under a table/chair",
          clue:
            "Time to leave BGL 15! 🍦 Thirty-one flavours and not one of them is boring. Head to the scoop shop… " +
            "then think LOW. Your QR is hiding under a table or a chair. Look, don’t lick — and stick it back for the next team!",
          setup: "Tape the QR under a table or chair near the counter. Tell the staff it’s there so they don’t remove it.",
        },
        {
          code: "LFFR1ArPGAi_",
          locationLabel: "Outside · parking · pillar {{number}}",
          clue:
            "Fresh air time! 🚗 Where cars take a nap while their owners are in meetings… " +
            "Head to {{parking area}} and find pillar {{number}}. Your QR is on it.",
          setup: "Tape the QR to the pillar at eye level (plastic sleeve if it might rain).",
        },
        {
          code: "2dbnS36LW8Yd",
          locationLabel: "Break room · {{building/floor}} · {{exact spot}}",
          clue:
            "Riddle time 🧩 I have a fridge full of lunches that aren’t yours, a sink full of cups nobody washed, " +
            "and a kettle that never gets a break. Find me on {{building + floor}}. Your QR is {{where}}.",
          setup: "Stick the QR somewhere visible but not obvious in the break room.",
        },
        {
          code: "4f9TmhMAv1XM",
          locationLabel: "Meeting room {{name}} · game master",
          codeWord: "TROPHY",
          clue:
            "Meeting time — but this one’s fun! 🎲 Head to meeting room {{room name}}. A game master is waiting. " +
            "Win their challenge to unlock your next QR (or a code word to type below).",
          setup:
            "Game master holds the QR card and/or says the code word TROPHY after the team wins. " +
            "Suggested game: Pictionary — guess 3 office words in 90 seconds.",
        },
        {
          code: "Gl3O7YuM1Hlm",
          locationLabel: "FINAL · Box Office · Blue board",
          clue: FINAL_CLUE,
          setup: "Put the Blue QR on a blue board at the Box Office.",
        },
      ],
    },

    /* ------------------------------ GREEN ------------------------------ */
    {
      id: "C",
      name: "Green Trail",
      color: "#1e8449",
      checkpoints: [
        {
          code: "SZKPWj1U_W5h",
          locationLabel: "BGL 15 · {{Green zone}} · name tag of {{person}}",
          clue:
            "Your first stop is right here in BGL 15: head to {{Green zone}}. " +
            "Look for a colleague who {{2–3 fun hints}}. Unscramble this to get their name: “{{scrambled name}}”. " +
            "Find their name tag — your QR is on it. Leave it there for the next team!",
          setup: "Stick the Green QR on the name tag (ask the person first!).",
        },
        {
          code: "7u1TqAAwie44",
          locationLabel: "Butterfly cafeteria · volunteer (code word)",
          codeWord: "MONARCH",
          clue:
            "Time to leave BGL 15! 🦋 I start life as a caterpillar and end up with wings — and a menu. Go to the café named after me. " +
            "Somewhere inside sits {{volunteer description, e.g. 'someone in a yellow cap reading a newspaper'}}. " +
            "Ask them: “Seen any butterflies today?” and type the word they give you below.",
          setup:
            "Volunteer sits in Butterfly cafeteria dressed as described in the clue. When asked “Seen any butterflies today?”, " +
            "they reply with the code word MONARCH. Give them this QR card as a backup.",
        },
        {
          code: "3ude227PgLUf",
          locationLabel: "Outside · tree at {{spot}}",
          clue:
            "Fresh air time! 🌿 I stand all day, never sit, give shade for free and have never once joined a stand-up. " +
            "Find me {{where}} — your QR is on my trunk.",
          setup: "Tape the QR (in a plastic sleeve) to the tree trunk at eye level.",
        },
        {
          code: "VXZWqJ8w3sU2",
          locationLabel: "Break room · {{building/floor}} · {{exact spot}}",
          clue:
            "Riddle time 🧩 I’m where a “five-minute coffee break” goes to become twenty. " +
            "I have cups, a kettle and a sign saying “please wash your mug”. Find me on {{building + floor}}. Your QR is {{where}}.",
          setup: "Stick the QR somewhere visible but not obvious in the break room.",
        },
        {
          code: "n3yyxUHUn8Pl",
          locationLabel: "Meeting room {{name}} · game master",
          codeWord: "MEDAL",
          clue:
            "Meeting time — but this one’s fun! 🎲 Head to meeting room {{room name}}. A game master is waiting. " +
            "Beat their challenge and they’ll hand over your next QR (or a code word to type below).",
          setup:
            "Game master holds the QR card and/or says the code word MEDAL after the team wins. " +
            "Suggested game: rapid quiz — 4 of 5 questions about the company right.",
        },
        {
          code: "mwg7pZumlD0i",
          locationLabel: "FINAL · Box Office · Green board",
          clue: FINAL_CLUE,
          setup: "Put the Green QR on a green board at the Box Office.",
        },
      ],
    },

    /* ------------------------------ ORANGE ------------------------------ */
    {
      id: "D",
      name: "Orange Trail",
      color: "#c25400",
      checkpoints: [
        {
          code: "NB0qRUd7WKo2",
          locationLabel: "BGL 15 · {{Orange zone}} · name tag of {{person}}",
          clue:
            "Your first stop is right here in BGL 15: head to {{Orange zone}}. " +
            "Find a colleague who {{2–3 fun hints}}. Their initials are “{{initials}}”. " +
            "Find their name tag — your QR is on it. Leave it there for the next team!",
          setup: "Stick the Orange QR on the name tag (ask the person first!).",
        },
        {
          code: "WzKW86CU7usY",
          locationLabel: "BGL 16/17 cafeteria · volunteer holding QR",
          clue:
            "Time to leave BGL 15! 🍛 Cross over to the big cafeteria shared by BGL 16 and 17. " +
            "Look for {{volunteer description}} and say the magic words: “Treasure, please!” They’ll show you your QR.",
          setup: "Volunteer sits in the BGL 16/17 cafeteria as described in the clue and holds this QR card.",
        },
        {
          code: "ch8Dm7MJNdsN",
          locationLabel: "Outside · parking · pillar {{number}}",
          clue:
            "Fresh air time! 🅿️ I’m full in the morning, empty at night and nobody ever says thank you. " +
            "Head to {{parking area}} and find pillar {{number}}. Your QR is on it.",
          setup: "Tape the QR to the pillar at eye level (plastic sleeve if it might rain).",
        },
        {
          code: "GizBvfhkLaom",
          locationLabel: "Break room · {{building/floor}} · {{exact spot}}",
          clue:
            "Riddle time 🧩 I’m home to a snack drawer, an always-busy microwave and the fridge nobody dares to clean. " +
            "Find me on {{building + floor}}. Your QR is {{where}}.",
          setup: "Stick the QR somewhere visible but not obvious in the break room.",
        },
        {
          code: "209YIpNl3-tm",
          locationLabel: "Meeting room {{name}} · game master",
          codeWord: "PODIUM",
          clue:
            "Meeting time — but this one’s fun! 🎲 Head to meeting room {{room name}}. A game master is waiting. " +
            "Win their challenge to unlock your next QR (or a code word to type below).",
          setup:
            "Game master holds the QR card and/or says the code word PODIUM after the team wins. " +
            "Suggested game: rock-paper-scissors, best of 5 against the game master.",
        },
        {
          code: "m5uuj7_yB_bY",
          locationLabel: "FINAL · Box Office · Orange board",
          clue: FINAL_CLUE,
          setup: "Put the Orange QR on an orange board at the Box Office.",
        },
      ],
    },
  ],
  introText: {
    A: "Welcome to the Red Trail! 🔴 Solve each clue, find the RED QR code and scan it with your phone camera. Some stops give you a code word instead — type it in below the clue. Stay together, be kind to the people you meet, and go!",
    B: "Welcome to the Blue Trail! 🔵 Solve each clue, find the BLUE QR code and scan it with your phone camera. Some stops give you a code word instead — type it in below the clue. Stay together, be kind to the people you meet, and go!",
    C: "Welcome to the Green Trail! 🟢 Solve each clue, find the GREEN QR code and scan it with your phone camera. Some stops give you a code word instead — type it in below the clue. Stay together, be kind to the people you meet, and go!",
    D: "Welcome to the Orange Trail! 🟠 Solve each clue, find the ORANGE QR code and scan it with your phone camera. Some stops give you a code word instead — type it in below the clue. Stay together, be kind to the people you meet, and go!",
  },
  finishMessage: "You made it to the Box Office! 🎉 Show this screen to the organizers and wait for the results.",
};

const URL_SAFE = /^[A-Za-z0-9_-]+$/;
const PLACEHOLDER = /\{\{([^}]*)\}\}/g;

/** Normalizes a typed code word: case, spaces and punctuation don't matter. */
export const normalizeWord = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Every unfilled {{placeholder}} in the config, for the admin "still to do" list. */
export function configTodos(config: HuntConfig = huntConfig): { where: string; text: string }[] {
  const todos: { where: string; text: string }[] = [];
  const scan = (where: string, value: string | undefined) => {
    for (const m of value?.matchAll(PLACEHOLDER) ?? []) todos.push({ where, text: m[1].trim() });
  };
  scan("Hunt name", config.huntName);
  scan("Finish message", config.finishMessage);
  for (const t of config.tracks) {
    scan(`${t.name} intro`, config.introText[t.id]);
    t.checkpoints.forEach((cp, i) => {
      scan(`${t.name} · CP${i + 1} clue`, cp.clue);
      scan(`${t.name} · CP${i + 1} location`, cp.locationLabel);
      scan(`${t.name} · CP${i + 1} setup`, cp.setup);
    });
  }
  return todos;
}

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
  const words = new Map<string, string>();
  for (const track of config.tracks) {
    if (!/^#[0-9a-fA-F]{3,8}$/.test(track.color)) problems.push(`track ${track.id}: color must be hex`);
    if (track.checkpoints.length !== CHECKPOINTS_PER_TRACK) {
      problems.push(`track ${track.id}: needs exactly ${CHECKPOINTS_PER_TRACK} checkpoints`);
    }
    track.checkpoints.forEach((cp, i) => {
      const where = `track ${track.id} checkpoint ${i + 1}`;
      claim(cp.code, where);
      if (!cp.clue.trim()) problems.push(`${where}: empty clue`);
      if (cp.codeWord !== undefined) {
        const w = normalizeWord(cp.codeWord);
        if (w.length < 3 || w.length > 24) problems.push(`${where}: codeWord must be 3–24 letters/digits`);
        const prev = words.get(w);
        if (prev) problems.push(`${where}: codeWord "${cp.codeWord}" duplicates ${prev}`);
        words.set(w, where);
      }
    });
  }
  if (!Number.isInteger(config.maxTeams) || config.maxTeams < 1) problems.push("maxTeams must be a positive integer");
  if (config.teamSize.min < 1 || config.teamSize.max < config.teamSize.min) problems.push("teamSize is invalid");
  if (problems.length) throw new Error(`Invalid hunt.config.ts:\n - ${problems.join("\n - ")}`);
}

validateConfig(huntConfig);
