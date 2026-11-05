import { describe, expect, test } from "bun:test";
import { applyStoryCommand, type StoryCommand } from "./commands";
import { whatMentions } from "./mentions";
import { newStory, type Ref, type Story } from "./story";
import { contentStems, type Suspect, traceDependents } from "./trace";

function run(story: Story, ...commands: StoryCommand[]): Story {
  return commands.reduce(
    (current, command) =>
      applyStoryCommand(current, command)._unsafeUnwrap().story,
    story,
  );
}

const at = (event: string, start: number): StoryCommand => ({
  type: "setPosition",
  event,
  frame: "world",
  position: { start, end: start },
});

/** The fixed example: a wreck, what follows from it, and a scene's prose. */
const story = run(
  newStory("A keeper finds a letter addressed to her drowned brother."),
  { type: "addActor", id: "mara", name: "Mara", kind: "person", notes: "" },
  { type: "addActor", id: "ivo", name: "Ivo", kind: "person", notes: "" },
  {
    type: "addEvent",
    id: "wreck",
    label: "The wreck",
    summary: "The Alba sank in a winter storm off the northern reef",
  },
  at("wreck", 1203),
  { type: "addEvent", id: "letter", label: "The letter arrives", summary: "" },
  at("letter", 1213),
  { type: "addCause", cause: "wreck", effect: "letter" },
  {
    type: "addFact",
    id: "reef",
    text: "Nobody fishes the northern reef since the Alba sank",
    about: [],
  },
  {
    type: "addVersion",
    id: "fog",
    event: "wreck",
    text: "Fog, not a storm, took her",
    by: ["ivo"],
  },
  {
    type: "addKnowledge",
    id: "mara-fog",
    actor: "mara",
    how: "believes",
    what: { kind: "version", id: "fog" },
  },
  { type: "addScene", id: "harbour", title: "The harbour", summary: "" },
  { type: "setSceneEvents", id: "harbour", depicts: ["wreck"] },
  { type: "addScene", id: "market", title: "Market day", summary: "" },
);

const prose = [
  {
    scene: "harbour",
    text: "The gulls were loud that morning.\n\nTen years since the boat went down, and Mara still kept a lamp for him.\n\nNobody had fished the northern reef since.\n",
  },
  {
    scene: "market",
    text: "Fish, salt, and a storm of prices off the reef.\n",
  },
];

const key = ({ target }: Suspect) =>
  target.kind === "record"
    ? `${target.ref.kind}:${target.ref.id}`
    : `${target.scene}.md:${target.line}`;

const wreck: Ref = { kind: "event", id: "wreck" };

describe("traceDependents on the fixed example", () => {
  const found = traceDependents(story, wreck, { prose })._unsafeUnwrap();
  const reasons = (k: string) => found.find((s) => key(s) === k)?.reasons;

  test("mentions finds none of these", () => {
    const mentioned = whatMentions(story, wreck)
      ._unsafeUnwrap()
      .map((m) => `${m.ref.kind}:${m.ref.id}`);
    for (const k of ["fact:reef", "event:letter", "knowledge:mara-fog"]) {
      expect(mentioned).not.toContain(k);
    }
  });

  test("finds a paraphrase, a consequence, a belief in a version, and prose", () => {
    expect(reasons("fact:reef")).toEqual([
      "text shares words: alba, northern, reef, sank",
    ]);
    expect(reasons("event:letter")).toEqual(["linked: an event it caused"]);
    expect(reasons("knowledge:mara-fog")).toEqual([
      "knowledge of its version fog",
    ]);
    expect(reasons("version:fog")).toEqual(["linked: a version of it"]);
    expect(reasons("harbour.md:0")).toEqual(["the scene depicts it"]);
    expect(reasons("harbour.md:3")).toEqual([
      '"Ten years since" matches the 10 years between The wreck and The letter arrives',
      "in a scene that depicts it",
    ]);
    expect(reasons("harbour.md:5")).toEqual([
      "prose shares words: northern, reef",
      "in a scene that depicts it",
    ]);
  });

  test("leaves out prose that shares too little, and ranks text cues first", () => {
    expect(found.some((s) => key(s) === "harbour.md:1")).toBe(false);
    // "storm" and "reef" in a scene that doesn't touch it still count.
    expect(reasons("market.md:1")).toEqual(["prose shares words: reef, storm"]);
    const rank = (k: string) => found.findIndex((s) => key(s) === k);
    expect(rank("harbour.md:3")).toBe(0);
    expect(rank("fact:reef")).toBeLessThan(rank("event:letter"));
  });

  test("after a change, looks only for what the change took away", () => {
    const reworded = run(story, {
      type: "describeEvent",
      id: "wreck",
      summary: "The Alba sank in a winter storm off the southern cape",
    });
    const after = traceDependents(reworded, wreck, {
      was: story,
      prose,
    })._unsafeUnwrap();
    const texts = after.filter((s) => s.inText).map(key);
    // The old words gone: northern, reef. Text with only "alba" or "storm" isn't stale.
    expect(texts).toContain("fact:reef");
    expect(texts).toContain("harbour.md:5");
    expect(texts).not.toContain("harbour.md:3");
    expect(after.find((s) => key(s) === "fact:reef")?.reasons).toEqual([
      "text shares words: northern, reef",
    ]);
  });

  test("a moved event is looked for in all its words, and its old year", () => {
    const moved = run(story, at("wreck", 1190));
    const after = traceDependents(moved, wreck, {
      was: story,
      prose,
    })._unsafeUnwrap();
    expect(after.find((s) => key(s) === "harbour.md:3")?.reasons).toEqual([
      '"Ten years since" matches the 10 years between The wreck and The letter arrives',
      "in a scene that depicts it",
    ]);
    expect(after.some((s) => key(s) === "fact:reef")).toBe(true);
    // Shared words say a text is about it, not that it states the old time.
    expect(after.find((s) => key(s) === "fact:reef")?.inText).toBe(false);
  });

  test("a span the move leaves true isn't evidence", () => {
    const nudged = run(story, at("wreck", 1203.3));
    const after = traceDependents(nudged, wreck, {
      was: story,
      prose,
    })._unsafeUnwrap();
    expect(after.filter((s) => s.inText).map(key)).toEqual([]);
  });

  test("shared words count in a text only as a part of what the change took away", () => {
    const long = run(story, {
      type: "describeEvent",
      id: "wreck",
      summary:
        "The Alba sank in a winter storm off the northern reef, with the bosun, the cook, eleven passengers, a cargo of salted herring, wool bales, copper pans, the parish bell, two oxen, a harpsichord and the mayor's portrait",
    });
    const withFact = run(long, {
      type: "addFact",
      id: "herring",
      text: "Nobody fishes the northern reef where the bosun, the herring and the copper went down",
      about: [],
    });
    const reworded = run(withFact, {
      type: "describeEvent",
      id: "wreck",
      summary: "The Alba sank in a winter storm",
    });
    const found = traceDependents(reworded, wreck, {
      was: withFact,
      prose,
    })._unsafeUnwrap();
    // Four of the many words taken away: kept for trace, but not as
    // evidence in its text.
    const herring = found.find((s) => key(s) === "fact:herring");
    expect(herring?.reasons).toEqual([
      "text shares words: bosun, copper, herr, northern",
    ]);
    expect(herring?.inText).toBe(false);
  });
});

test("a re-answered question lists the scenes that reveal the replaced answer", () => {
  const q = run(
    story,
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
      touches: [],
    },
    {
      type: "addCandidate",
      questionId: "who",
      id: "keeper",
      answer: "The old keeper",
      touches: [],
    },
    { type: "answerOpenQuestion", id: "who", candidateId: "ferry" },
    {
      type: "setSceneLinks",
      id: "market",
      how: "reveals",
      refs: [{ kind: "candidate", questionId: "who", id: "ferry" }],
    },
  );
  const reanswered = run(q, {
    type: "answerOpenQuestion",
    id: "who",
    candidateId: "keeper",
  });
  const found = traceDependents(
    reanswered,
    { kind: "openQuestion", id: "who" },
    { was: q, prose },
  )._unsafeUnwrap();
  expect(found.find((s) => key(s) === "scene:market")?.reasons).toContain(
    "reveals ferry, an answer since replaced",
  );
  expect(found.find((s) => key(s) === "market.md:0")?.reasons).toContain(
    "the scene reveals ferry, an answer since replaced",
  );
});

describe("after an edit", () => {
  const withMara = run(
    story,
    { type: "addScene", id: "kitchen", title: "The kitchen", summary: "" },
    { type: "setSceneActors", id: "kitchen", actors: ["mara"] },
    {
      type: "updateActor",
      id: "mara",
      notes: "Keeps the lamp lit for her brother",
    },
  );
  const kitchen = {
    scene: "kitchen",
    text: "Bread on the table.\n\nMara would not look at the lamp.\n",
  };

  test("a scene file is no evidence on its own: a change with nothing stale in its text flags nothing", () => {
    const edited = run(withMara, {
      type: "updateActor",
      id: "mara",
      notes: "Keeps the lamp lit, and the door locked",
    });
    const found = traceDependents(
      edited,
      { kind: "actor", id: "mara" },
      { was: withMara, prose: [...prose, kitchen] },
    )._unsafeUnwrap();
    expect(found.filter((s) => s.inText)).toEqual([]);
    // The whole file is still a suspect, for trace on demand.
    expect(found.some((s) => key(s) === "kitchen.md:0" && !s.inText)).toBe(
      true,
    );
  });

  test("after a rename, prose using the old name comes before records only linked", () => {
    const renamed = run(withMara, {
      type: "updateActor",
      id: "mara",
      name: "Maren",
    });
    const found = traceDependents(
      renamed,
      { kind: "actor", id: "mara" },
      { was: withMara, prose: [...prose, kitchen] },
    )._unsafeUnwrap();
    expect(found.slice(0, 2).map(key)).toEqual([
      "kitchen.md:3",
      "harbour.md:3",
    ]);
    const rank = (k: string) => found.findIndex((s) => key(s) === k);
    expect(rank("scene:kitchen")).toBeGreaterThan(rank("harbour.md:3"));
    expect(found[0]?.reasons).toEqual([
      '"Mara" names it',
      "in a scene that is in it",
    ]);
  });
});

test("common words don't count as shared", () => {
  const common = run(story, {
    type: "addFact",
    id: "call",
    text: "Mara would call and then stop, turn away, as if by accident",
    about: [],
  });
  const found = traceDependents(
    run(common, {
      type: "describeEvent",
      id: "wreck",
      summary: "They call it an accident; turn away and stop asking",
    }),
    wreck,
  )._unsafeUnwrap();
  expect(found.find((s) => key(s) === "fact:call")?.reasons ?? []).toEqual([]);
});

test("contentStems keeps distinctive words, stemmed", () => {
  expect([
    ...contentStems("The Alba's sinking sank; they were burning, burned"),
  ]).toEqual(["alba", "sink", "sank", "burn"]);
});
