import { describe, expect, test } from "bun:test";
import { applyStoryCommand, type StoryCommand } from "./commands";
import { renderStory, wordCount } from "./render";
import { newStory, type Story } from "./story";

const run = (story: Story, ...commands: StoryCommand[]): Story =>
  commands.reduce(
    (current, command) =>
      applyStoryCommand(current, command)._unsafeUnwrap().story,
    story,
  );

const sketch = run(
  newStory("A keeper finds a letter."),
  { type: "addActor", id: "a1", name: "Mara", kind: "person", notes: "" },
  {
    type: "addDrive",
    id: "d-find",
    actorId: "a1",
    want: "Learn who wrote it",
    stakes: "",
    method: "",
  },
  {
    type: "addDrive",
    id: "d-hide",
    actorId: null,
    want: "Keep the wreck quiet",
    stakes: "",
    method: "",
  },
  { type: "relateDrives", from: "d-hide", to: "d-find", relation: "opposes" },
  { type: "addEvent", id: "z-wreck", label: "The wreck", summary: "" },
  { type: "addEvent", id: "a-letter", label: "The letter", summary: "" },
  // Ordered only by a constraint, against the order of their IDs.
  {
    type: "constrain",
    id: "c",
    a: "z-wreck",
    relation: "before",
    b: "a-letter",
  },
  { type: "setDriveOrigins", id: "d-find", origins: ["a-letter"] },
  { type: "addScene", id: "s1", title: "Storm", summary: "The light fails" },
  { type: "setScenePressures", id: "s1", pressures: ["d-find"] },
  {
    type: "addOpenQuestion",
    id: "who",
    question: "Who wrote it?",
    about: [],
    conflict: false,
  },
  {
    type: "addCandidate",
    questionId: "who",
    id: "ferry",
    answer: "The ferryman",
    touches: [{ kind: "drive", id: "d-hide" }],
  },
);

describe("renderStory", () => {
  test("names records by their words, never their IDs", () => {
    const text = renderStory(sketch);
    for (const id of ["a1", "d-find", "d-hide", "z-wreck", "a-letter", "s1"]) {
      expect(text).not.toContain(id);
    }
    expect(text).toContain("- **Mara**.\n  Wants: Learn who wrote it.");
    expect(text).toContain("Comes from: The letter.");
    expect(text).toContain(
      '## Wants nobody holds yet\n\n- Wants: Keep the wreck quiet.\n    Opposes Mara: "Learn who wrote it".\n',
    );
    expect(text).toContain('Pressure on Mara: "Learn who wrote it".');
  });

  test("prints a relation once, under the drive that holds it", () => {
    const text = renderStory(sketch);
    expect(text.match(/Oppos/g)).toHaveLength(1);
    expect(text.match(/Keep the wreck quiet/g)).toHaveLength(1);
  });

  test("prints each want once, and names it elsewhere by its actor and first words", () => {
    const story = run(
      sketch,
      {
        type: "addDrive",
        id: "d-long",
        actorId: "a1",
        want: "Find out what her father saw the night the light failed",
        stakes: "",
        method: "",
      },
      {
        type: "addDrive",
        id: "d-long-2",
        actorId: "a1",
        want: "Find out what her father hid from the harbour office",
        stakes: "",
        method: "",
      },
      {
        type: "relateDrives",
        from: "d-hide",
        to: "d-long",
        relation: "opposes",
      },
      {
        type: "setScenePressures",
        id: "s1",
        pressures: ["d-find", "d-long", "d-long-2"],
      },
    );
    const text = renderStory(story);
    expect(text.match(/Find out what her father saw the night/g)).toHaveLength(
      1,
    );
    // Five words would tell the two wants apart only as "Find out what her
    // father", so the reference grows until it does.
    expect(text).toContain(
      'Pressure on Mara: "Learn who wrote it"; Mara: "Find out what her father saw…"; Mara: "Find out what her father hid…".',
    );
    expect(text).toContain('Opposes Mara: "Find out what her father saw…".');
  });

  test("gives an answered question its chosen answer only", () => {
    const answered = run(
      sketch,
      {
        type: "addCandidate",
        questionId: "who",
        id: "keeper",
        answer: "The old keeper",
        touches: [],
      },
      { type: "answerOpenQuestion", id: "who", candidateId: "keeper" },
      {
        type: "addOpenQuestion",
        id: "why",
        question: "Why now?",
        about: [],
        conflict: false,
      },
    );
    const text = renderStory(answered);
    expect(text).toContain(
      "## Open questions: decided, not revealed yet\n\n- Who wrote it? The old keeper.\n",
    );
    expect(text).toContain("## Open questions: undecided\n\n- Why now?\n");
    expect(text).not.toContain("The ferryman");
    expect(text).not.toContain("chosen");
  });

  test("leaves out superseded answers, which stay in the file", () => {
    const reworked = run(
      sketch,
      {
        type: "addCandidate",
        questionId: "who",
        id: "keeper",
        answer: "The old keeper",
        touches: [],
      },
      { type: "answerOpenQuestion", id: "who", candidateId: "ferry" },
      {
        type: "updateCandidate",
        questionId: "who",
        id: "ferry",
        answer: "The ferryman's son",
      },
      { type: "answerOpenQuestion", id: "who", candidateId: "keeper" },
    );
    expect(reworked.openQuestions[0]?.superseded).toHaveLength(1);
    const text = renderStory(reworked);
    expect(text).toContain(
      "## Open questions: decided, not revealed yet\n\n- Who wrote it? The old keeper.\n",
    );
    expect(text).not.toContain("ferryman");
    expect(text).not.toMatch(/supersed|replaced/i);
    const withoutHistory = {
      ...reworked,
      openQuestions: reworked.openQuestions.map(({ superseded: _, ...q }) => q),
    };
    expect(text).toBe(renderStory(withoutHistory));
  });

  test("lists events in story order", () => {
    const text = renderStory(sketch);
    expect(text.indexOf("The wreck")).toBeLessThan(
      text.indexOf("**The letter**"),
    );
    expect(text).toContain("[before The letter]");
  });

  test("describes a timeline contradiction in words", () => {
    const contradicted = run(sketch, {
      type: "constrain",
      id: "d",
      a: "a-letter",
      relation: "before",
      b: "z-wreck",
    });
    expect(renderStory(contradicted)).toContain(
      "can't all happen in the order given",
    );
  });

  test("says what happened because of what", () => {
    const caused = run(sketch, {
      type: "addCause",
      cause: "z-wreck",
      effect: "a-letter",
    });
    expect(renderStory(caused)).toContain(
      "- **The wreck** [before The letter]\n- **The letter**, because of The wreck.\n",
    );
    const described = run(caused, {
      type: "describeEvent",
      id: "a-letter",
      summary: "It names her brother",
    });
    expect(renderStory(described)).toContain(
      "- **The letter**: It names her brother. Because of The wreck.\n",
    );
    expect(renderStory(sketch)).not.toContain("ecause");
    const long = run(caused, {
      type: "describeEvent",
      id: "z-wreck",
      label: "The wreck of the Alba on the reef in the storm",
    });
    expect(renderStory(long)).toContain(
      "- **The letter**, because of The wreck of the Alba on…\n",
    );
  });

  test("puts a cause before its effects when story time doesn't order them", () => {
    const at = (event: string): StoryCommand => ({
      type: "setPosition",
      event,
      frame: "world",
      position: { start: 5, end: 5 },
    });
    // IDs and labels both sort the effects first.
    const story = run(
      newStory("P"),
      { type: "addEvent", id: "a", label: "A flood", summary: "" },
      { type: "addEvent", id: "b", label: "B famine", summary: "" },
      { type: "addEvent", id: "c", label: "C storm", summary: "" },
      at("a"),
      at("b"),
      at("c"),
      { type: "addCause", cause: "c", effect: "a" },
      { type: "addCause", cause: "a", effect: "b" },
    );
    const text = renderStory(story);
    const order = ["C storm", "A flood", "B famine"].map((label) =>
      text.indexOf(`**${label}**`),
    );
    expect(order[0]).toBeLessThan(order[1] ?? 0);
    expect(order[1]).toBeLessThan(order[2] ?? 0);
    // Without the causes, labels decide.
    const plain = renderStory(
      run(
        story,
        { type: "removeCause", cause: "c", effect: "a" },
        { type: "removeCause", cause: "a", effect: "b" },
      ),
    );
    expect(plain.indexOf("**A flood**")).toBeLessThan(
      plain.indexOf("**C storm**"),
    );
  });

  test("describes an effect placed before its cause, and a circle of causes, in words", () => {
    const backwards = run(sketch, {
      type: "addCause",
      cause: "a-letter",
      effect: "z-wreck",
    });
    expect(renderStory(backwards)).toContain(
      "## Where the story pulls against itself\n\n- The wreck happens before The letter, though it happens because of it.\n",
    );
    const circle = run(backwards, {
      type: "addCause",
      cause: "z-wreck",
      effect: "a-letter",
    });
    expect(renderStory(circle)).toContain(
      "- These events cause each other in a circle: The letter; The wreck.",
    );
  });

  test("prints an open question's candidates in a line each, without what they touch", () => {
    const text = renderStory(sketch);
    expect(text).toContain(
      "## Open questions: undecided\n\n- Who wrote it?\n  - The ferryman.\n",
    );
    expect(text).not.toContain("Would touch");
  });

  test("groups questions by where they stand, with what was ruled out and why", () => {
    const story = run(
      sketch,
      {
        type: "addCandidate",
        questionId: "who",
        id: "keeper",
        answer: "The old keeper",
        touches: [],
      },
      {
        type: "rejectCandidate",
        questionId: "who",
        id: "keeper",
        reason: "He died before the wreck",
      },
    );
    expect(renderStory(story)).toContain(
      "## Open questions: undecided\n\n- Who wrote it?\n  - The ferryman.\n  - Ruled out: The old keeper. He died before the wreck.\n",
    );
    const decided = run(story, {
      type: "answerOpenQuestion",
      id: "who",
      candidateId: "ferry",
    });
    expect(renderStory(decided)).toContain(
      "## Open questions: decided, not revealed yet\n\n- Who wrote it? The ferryman.\n  - Ruled out: The old keeper. He died before the wreck.\n",
    );
    const scene = decided.scenes[0]?.id ?? "";
    const revealed = run(decided, {
      type: "setSceneLinks",
      id: scene,
      how: "reveals",
      refs: [{ kind: "openQuestion", id: "who" }],
    });
    expect(renderStory(revealed)).toMatch(
      /- Who wrote it\? The ferryman\. Revealed in "[^"]+"\.\n/,
    );
    const left = run(decided, {
      type: "leaveForReader",
      id: "who",
      reason: "The reader should never be sure",
    });
    const text = renderStory(left);
    expect(text).toContain(
      "## Open questions: left open for the reader\n\n- Who wrote it? The author's answer: The ferryman. The reader should never be sure.\n",
    );
    expect(text).not.toContain("## Open questions: decided");
  });

  test("a decided question leaves out the candidates not chosen, unless ruled out, and what it concerns", () => {
    const decided = run(
      sketch,
      {
        type: "updateOpenQuestion",
        id: "who",
        about: [{ kind: "drive", id: "d-hide" }],
      },
      {
        type: "addCandidate",
        questionId: "who",
        id: "keeper",
        answer: "The old keeper",
        touches: [{ kind: "event", id: "z-wreck" }],
      },
      { type: "answerOpenQuestion", id: "who", candidateId: "keeper" },
    );
    const text = renderStory(decided);
    expect(text).toContain("- Who wrote it? The old keeper.\n");
    expect(text).not.toContain("ferryman");
    expect(text).not.toContain("Concerns");
    expect(text.match(/Keep the wreck quiet/g)).toHaveLength(1);
  });

  test("leaves out empty sections", () => {
    expect(renderStory(newStory("Just a premise."))).toBe(
      "## Premise\n\nJust a premise.\n",
    );
  });
});

const at = (event: string, start: number, end = start): StoryCommand => ({
  type: "setPosition",
  event,
  frame: "world",
  position: { start, end },
});

describe("constraints in the render", () => {
  const events = run(
    newStory("P"),
    { type: "addEvent", id: "a", label: "The flood", summary: "" },
    { type: "addEvent", id: "b", label: "The famine", summary: "" },
  );
  /** What the render says about the flood's order, if anything. */
  const stated = (...commands: StoryCommand[]) =>
    renderStory(run(events, ...commands)).match(
      /\*\*The flood\*\*[^\n]*\[([^\]]*)\]/,
    )?.[1];
  const ten = { amount: 10, frame: "world" };

  test("leaves out a constraint the positions already satisfy", () => {
    const before: StoryCommand = {
      type: "constrain",
      id: "c",
      a: "a",
      relation: "before",
      b: "b",
    };
    expect(
      stated(at("a", 1203, 1204), at("b", 1213, 1214), before),
    ).toBeUndefined();
    expect(stated(at("a", 3), at("b", 4), before)).toBeUndefined();
    // Two whole years are as far apart as their starts.
    expect(
      stated(at("a", 1203, 1204), at("b", 1213, 1214), {
        ...before,
        duration: ten,
      }),
    ).toBeUndefined();
    expect(
      stated(at("a", 3), at("b", 3), {
        type: "constrain",
        id: "c",
        a: "a",
        relation: "during",
        b: "b",
      }),
    ).toBeUndefined();
    expect(
      stated(at("a", 3), at("b", 3), {
        type: "constrain",
        id: "c",
        a: "a",
        relation: "simultaneous",
        b: "b",
      }),
    ).toBeUndefined();
    expect(
      stated(at("a", 9), at("b", 3), {
        type: "constrain",
        id: "c",
        a: "a",
        relation: "after",
        b: "b",
      }),
    ).toBeUndefined();
  });

  test("prints one the positions don't settle", () => {
    const before: StoryCommand = {
      type: "constrain",
      id: "c",
      a: "a",
      relation: "before",
      b: "b",
    };
    expect(stated(before)).toBe("before The famine");
    expect(stated(at("a", 1203), before)).toBe("before The famine");
    // The same years, but positions as wide as a decade don't settle the gap.
    expect(
      stated(at("a", 1200, 1210), at("b", 1213, 1214), {
        ...before,
        duration: ten,
      }),
    ).toBe("10 years before The famine");
    // Two decades as long as each other: the gap runs from the end of the
    // war to the start of the rebuilding, anything from 10 to 30 years.
    const wide = (amount: number): StoryCommand => ({
      type: "constrain",
      id: "c",
      a: "b",
      relation: "after",
      b: "a",
      duration: { amount, frame: "world" },
    });
    const decades = [at("a", 1200, 1210), at("b", 1220, 1230)];
    expect(renderStory(run(events, ...decades, wide(20)))).toContain(
      "[20 years after The flood]",
    );
    expect(renderStory(run(events, ...decades, wide(10)))).toContain(
      "[10 years after The flood]",
    );
    // A position is somewhere within its span, so a year inside a decade
    // isn't known to fall during an event placed in that decade.
    expect(
      stated(at("a", 3, 5), at("b", 1, 10), {
        type: "constrain",
        id: "c",
        a: "a",
        relation: "during",
        b: "b",
      }),
    ).toBe("during The famine");
    // Overlapping years don't settle the order.
    expect(stated(at("a", 1203, 1205), at("b", 1204, 1206), before)).toBe(
      "before The famine",
    );
  });

  test("prints a violated constraint", () => {
    const before: StoryCommand = {
      type: "constrain",
      id: "c",
      a: "a",
      relation: "before",
      b: "b",
    };
    const text = renderStory(run(events, at("a", 1213), at("b", 1203), before));
    expect(text).toContain("- **The flood** (year 1213) [before The famine]");
    expect(text).toContain("can't all happen in the order given");
    // The order holds but the gap doesn't.
    expect(
      stated(at("a", 1203, 1204), at("b", 1206, 1207), {
        ...before,
        duration: ten,
      }),
    ).toBe("10 years before The famine");
    expect(
      stated(at("a", 3), at("b", 4), {
        type: "constrain",
        id: "c",
        a: "a",
        relation: "simultaneous",
        b: "b",
      }),
    ).toBe("at the same time as The famine");
  });
});

/**
 * A sketch with no links at all, then the links a comparison session made:
 * origins, relations, scenes' actors, events and pressures, questions'
 * concerns, and ordering constraints the positions already satisfy.
 */
const people = ["Ruth", "Ines", "Dee", "Noreen", "Dani", "Velan"];
const WANTS = [
  "Keep the light burning through the winter so the boats come home",
  "Bring her sister back from the Titan program before the fusion takes",
  "Prove to the tribe that he can belong without paying for it",
  "Hide what the caravans carried for the Titan program from everyone",
  "Find the man who sank the ferry and make him say it aloud",
  "Leave the island without anyone learning why she was sent there",
];
const LABELS = [
  "The wreck",
  "Ruth's light goes out",
  "The caravan burns",
  "Ines leaves home",
  "The fusion",
  "The ferry sinks",
  "Dee's father calls",
  "The winter storm",
];
const bare = run(
  newStory("A keeper holds a light through a winter that won't end."),
  ...people.flatMap((name, i): StoryCommand[] => [
    { type: "addActor", id: `p${i}`, name, kind: "person", notes: "" },
    {
      type: "addDrive",
      id: `d${i}`,
      actorId: `p${i}`,
      want: WANTS[i] ?? "",
      stakes: "",
      method: "",
    },
  ]),
  ...LABELS.flatMap((label, i): StoryCommand[] => [
    { type: "addEvent", id: `e${i}`, label, summary: "" },
    at(`e${i}`, 1200 + 3 * i, 1201 + 3 * i),
  ]),
  ...[0, 1, 2, 3, 4].map(
    (i): StoryCommand => ({
      type: "addScene",
      id: `s${i}`,
      title: `Scene ${i + 1}`,
      summary: "Something happens",
    }),
  ),
  {
    type: "addOpenQuestion",
    id: "q",
    question: "Who sank the ferry?",
    about: [],
    conflict: false,
  },
);

/** Each link as a command that adds just that one link to what came before. */
function linkCommands(): StoryCommand[] {
  const growing = <T>(items: T[], make: (sofar: T[]) => StoryCommand) =>
    items.map((_, i) => make(items.slice(0, i + 1)));
  return [
    ...[0, 1, 2, 3, 4, 5].flatMap((d) =>
      growing([`e${d}`, `e${d + 2}`], (origins) => ({
        type: "setDriveOrigins",
        id: `d${d}`,
        origins,
      })),
    ),
    ...(
      [
        [0, 3, "opposes"],
        [1, 3, "opposes"],
        [2, 4, "allies"],
        [5, 0, "competes"],
        [4, 3, "opposes"],
        [1, 2, "allies"],
      ] as const
    ).map(
      ([from, to, relation]): StoryCommand => ({
        type: "relateDrives",
        from: `d${from}`,
        to: `d${to}`,
        relation,
      }),
    ),
    ...[0, 1, 2, 3, 4].flatMap((s) => [
      ...growing([`p${s}`, `p${s + 1}`], (actors) => ({
        type: "setSceneActors",
        id: `s${s}`,
        actors,
      })),
      ...growing([`e${s}`, `e${s + 1}`], (depicts) => ({
        type: "setSceneEvents",
        id: `s${s}`,
        depicts,
      })),
      ...growing([`d${s}`, `d${s + 1}`], (pressures) => ({
        type: "setScenePressures",
        id: `s${s}`,
        pressures,
      })),
    ]),
    ...(
      [
        [0, 1],
        [2, 3],
        [1, 3],
        [4, 7],
      ] as const
    ).map(
      ([cause, effect]): StoryCommand => ({
        type: "addCause",
        cause: `e${cause}`,
        effect: `e${effect}`,
      }),
    ),
    ...growing(
      [
        { kind: "drive", id: "d4" },
        { kind: "event", id: "e5" },
        { kind: "actor", id: "p3" },
      ] as const,
      (about) => ({ type: "updateOpenQuestion", id: "q", about: [...about] }),
    ),
  ];
}

/** Constraints the positions above already satisfy, some with gaps. */
const satisfiedConstraints: StoryCommand[] = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
  type: "constrain",
  id: `c${i}`,
  a: `e${i}`,
  relation: "before",
  b: `e${i + 1}`,
  ...(i % 2 === 0 ? { duration: { amount: 3, frame: "world" } } : {}),
}));

describe("the render names a linked record briefly and says each thing once", () => {
  test("each link adds at most eight words, and a satisfied constraint none", () => {
    let story = bare;
    let words = wordCount(renderStory(story));
    const added: { command: string; words: number }[] = [];
    for (const command of linkCommands()) {
      story = run(story, command);
      const now = wordCount(renderStory(story));
      added.push({ command: JSON.stringify(command), words: now - words });
      words = now;
    }
    expect(added.filter(({ words }) => words > 8)).toEqual([]);
    expect(added.length).toBeGreaterThan(50);
    for (const command of satisfiedConstraints) {
      const next = run(story, command);
      expect(renderStory(next)).toBe(renderStory(story));
      story = next;
    }
    expect(wordCount(renderStory(story))).toBe(words);
  });
});

test("wordCount counts runs of non-space characters", () => {
  expect(wordCount("  Two words\n\n- and more ")).toBe(5);
  expect(wordCount("")).toBe(0);
});
