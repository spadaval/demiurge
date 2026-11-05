import { describe, expect, test } from "bun:test";
import { applyStoryCommand, type StoryCommand } from "./commands";
import { deliberateGaps, type GapKind, storyGaps } from "./gaps";
import { GAP_KINDS, newStory, type Ref, type Story } from "./story";

function run(story: Story, ...commands: StoryCommand[]): Story {
  return commands.reduce(
    (current, command) =>
      applyStoryCommand(current, command)._unsafeUnwrap().story,
    story,
  );
}

const drive = (id: string, actorId: string | null): StoryCommand => ({
  type: "addDrive",
  id,
  actorId,
  want: "",
  stakes: "",
  method: "",
});

/** A story with nothing left unwoven, which each case below adds a gap to. */
const woven = run(
  newStory("Two keepers want the gate opposite ways."),
  { type: "addActor", id: "a", name: "Ardelia", kind: "person", notes: "" },
  { type: "addActor", id: "b", name: "Kesh", kind: "person", notes: "" },
  {
    type: "addActor",
    id: "guild",
    name: "Guild",
    kind: "organization",
    notes: "",
  },
  { type: "addEvent", id: "seal", label: "The seal", summary: "" },
  { type: "addEvent", id: "crowning", label: "The crowning", summary: "" },
  {
    type: "constrain",
    id: "c",
    a: "seal",
    relation: "during",
    b: "crowning",
  },
  drive("shut", "a"),
  drive("open", "b"),
  { type: "setDriveOrigins", id: "shut", origins: ["seal"] },
  { type: "setDriveOrigins", id: "open", origins: ["seal"] },
  { type: "relateDrives", from: "shut", to: "open", relation: "opposes" },
  { type: "addScene", id: "door", title: "The door", summary: "" },
  { type: "setScenePressures", id: "door", pressures: ["shut", "open"] },
  { type: "addReaderQuestion", id: "opens", question: "Will it open?" },
  {
    type: "setReaderQuestionScenes",
    id: "opens",
    opensAt: "door",
    answeredAt: "door",
  },
  {
    type: "addFact",
    id: "ageless",
    text: "She doesn't age.",
    about: [{ kind: "actor", id: "a" }],
  },
  {
    type: "addOpenQuestion",
    id: "why",
    question: "Why seal it?",
    about: [],
    conflict: false,
  },
  {
    type: "addCandidate",
    questionId: "why",
    id: "order",
    answer: "",
    touches: [],
  },
  {
    type: "addCandidate",
    questionId: "why",
    id: "flood",
    answer: "",
    touches: [],
  },
  {
    type: "addOpenQuestion",
    id: "who",
    question: "Who ordered it?",
    about: [],
    conflict: false,
  },
  {
    type: "addCandidate",
    questionId: "who",
    id: "king",
    answer: "",
    touches: [],
  },
  { type: "answerOpenQuestion", id: "who", candidateId: "king" },
);

const unopposed = (id: string): StoryCommand[] => [
  drive(id, "a"),
  { type: "setDriveOrigins", id, origins: ["seal"] },
  { type: "setScenePressures", id: "door", pressures: ["shut", "open", id] },
];

const cases: [GapKind, StoryCommand[], Ref | null][] = [
  [
    "drive_without_actor",
    [drive("loose", null)],
    { kind: "drive", id: "loose" },
  ],
  ["drive_without_origin", [drive("whim", "a")], { kind: "drive", id: "whim" }],
  [
    // Allies don't oppose.
    "drive_unopposed",
    [
      ...unopposed("help"),
      { type: "relateDrives", from: "help", to: "shut", relation: "allies" },
    ],
    { kind: "drive", id: "help" },
  ],
  [
    "scene_without_pressure",
    [{ type: "addScene", id: "quiet", title: "", summary: "" }],
    { kind: "scene", id: "quiet" },
  ],
  [
    "drive_without_scene",
    [
      drive("idle", "a"),
      { type: "setDriveOrigins", id: "idle", origins: ["seal"] },
    ],
    { kind: "drive", id: "idle" },
  ],
  [
    "event_unreferenced",
    [{ type: "addEvent", id: "storm", label: "", summary: "" }],
    { kind: "event", id: "storm" },
  ],
  ["no_reader_question", [{ type: "removeReaderQuestion", id: "opens" }], null],
  [
    "reader_question_never_opens",
    [
      { type: "addReaderQuestion", id: "late", question: "" },
      {
        type: "setReaderQuestionScenes",
        id: "late",
        opensAt: null,
        answeredAt: "door",
      },
    ],
    { kind: "readerQuestion", id: "late" },
  ],
  [
    "open_question_without_candidates",
    [
      {
        type: "addOpenQuestion",
        id: "how",
        question: "",
        about: [],
        conflict: false,
      },
    ],
    { kind: "openQuestion", id: "how" },
  ],
  [
    "open_question_one_candidate",
    [
      {
        type: "addOpenQuestion",
        id: "when",
        question: "",
        about: [],
        conflict: false,
      },
      {
        type: "addCandidate",
        questionId: "when",
        id: "winter",
        answer: "",
        touches: [],
      },
    ],
    { kind: "openQuestion", id: "when" },
  ],
];

describe("storyGaps", () => {
  test("a woven story has none, including an organization with no drive and an answered question with one candidate", () => {
    expect(storyGaps(woven)).toEqual([]);
  });

  test.each(cases)("%s", (kind, commands, ref) => {
    const gaps = storyGaps(run(woven, ...commands));
    expect(
      gaps.filter((gap) => gap.kind === kind).map((gap) => gap.ref),
    ).toEqual([ref]);
  });

  test("a question left open for the reader, an unrevealed answer and an unanswered reader question are not gaps", () => {
    const story = run(
      woven,
      {
        type: "addOpenQuestion",
        id: "how",
        question: "",
        about: [],
        conflict: false,
      },
      { type: "leaveForReader", id: "how", reason: "The reader decides" },
      { type: "addReaderQuestion", id: "hanging", question: "" },
      {
        type: "setReaderQuestionScenes",
        id: "hanging",
        opensAt: "door",
        answeredAt: null,
      },
    );
    expect(storyGaps(story)).toEqual([]);
  });

  test("the wording says what isn't woven in yet, not that something is wrong", () => {
    const messages = cases.flatMap(([, commands]) =>
      storyGaps(run(woven, ...commands)).map(({ message }) => message),
    );
    expect(messages.length).toBeGreaterThanOrEqual(cases.length);
    for (const message of messages) {
      expect(message).toMatch(/yet|so far/);
      expect(message).not.toMatch(/error|invalid|missing|must|fail/i);
    }
  });

  test("an event referred to only by a fact, open question or candidate is woven in", () => {
    const event: StoryCommand = {
      type: "addEvent",
      id: "storm",
      label: "",
      summary: "",
    };
    const storm: Ref = { kind: "event", id: "storm" };
    const unreferenced = (...commands: StoryCommand[]) =>
      storyGaps(run(woven, event, ...commands)).filter(
        (gap) => gap.kind === "event_unreferenced",
      );
    expect(unreferenced()).toHaveLength(1);
    expect(
      unreferenced({ type: "addFact", id: "f", text: "", about: [storm] }),
    ).toEqual([]);
    expect(
      unreferenced({
        type: "addOpenQuestion",
        id: "q",
        question: "",
        about: [storm],
        conflict: false,
      }),
    ).toEqual([]);
    expect(
      unreferenced({
        type: "addCandidate",
        questionId: "why",
        id: "storm-did-it",
        answer: "",
        touches: [storm],
      }),
    ).toEqual([]);
  });

  test("an event linked to another only as a cause or an effect is woven in", () => {
    const stormy = run(
      woven,
      { type: "addEvent", id: "storm", label: "", summary: "" },
      { type: "addEvent", id: "wreck", label: "", summary: "" },
    );
    const unreferenced = (story: Story) =>
      storyGaps(story)
        .filter((gap) => gap.kind === "event_unreferenced")
        .map((gap) => gap.ref);
    expect(unreferenced(stormy)).toHaveLength(2);
    expect(
      unreferenced(
        run(stormy, { type: "addCause", cause: "storm", effect: "wreck" }),
      ),
    ).toEqual([]);
  });

  test("a fact linked to nothing is no gap", () => {
    expect(
      storyGaps(
        run(woven, {
          type: "addFact",
          id: "salt",
          text: "Salt rusts iron.",
          about: [],
        }),
      ),
    ).toEqual([]);
  });

  test("a story with a premise and nothing else", () => {
    expect(storyGaps(newStory("A gate that remembers."))).toEqual([]);
  });

  test("names the record in the message", () => {
    expect(storyGaps(run(woven, drive("idle", "a")))).toEqual([
      {
        kind: "drive_without_origin",
        ref: { kind: "drive", id: "idle" },
        message: `The drive "idle" doesn't come from any event yet.`,
      },
      {
        kind: "drive_unopposed",
        ref: { kind: "drive", id: "idle" },
        message: `Nothing opposes the drive "idle" yet.`,
      },
      {
        kind: "drive_without_scene",
        ref: { kind: "drive", id: "idle" },
        message: `No scene puts the drive "idle" under pressure yet.`,
      },
    ]);
  });

  test("a person with no drive is not a gap", () => {
    const story = run(woven, {
      type: "addActor",
      id: "c",
      name: "Aldric",
      kind: "person",
      notes: "",
    });
    expect(storyGaps(story)).toEqual([]);
  });

  test("no wording asks for a record to be cut, and loose records may stand", () => {
    const messages = cases.flatMap(([, commands]) =>
      storyGaps(run(woven, ...commands)).map(({ message }) => message),
    );
    for (const message of messages) {
      expect(message).not.toMatch(/remove|delete|cut|drop|merge/i);
    }
    expect(
      messages.filter((m) => m.includes("it can also stand on its own")),
    ).toHaveLength(1);
  });
});

describe("a gap marked deliberate", () => {
  test("every kind of gap has a case above", () => {
    expect(cases.map(([kind]) => kind).sort()).toEqual([...GAP_KINDS].sort());
  });

  test.each(
    cases,
  )("%s stops being listed, and comes back when unmarked", (gap, commands, ref) => {
    const story = run(woven, ...commands);
    const listed = (s: Story) =>
      storyGaps(s)
        .filter((g) => g.kind === gap)
        .map((g) => g.ref);
    expect(listed(story)).toEqual([ref]);
    const reason = "Judged fine";
    const marked = run(story, { type: "markGapDeliberate", gap, ref, reason });
    expect(listed(marked)).toEqual([]);
    expect(deliberateGaps(marked)).toEqual(
      storyGaps(story)
        .filter((g) => g.kind === gap)
        .map((g) => ({ gap: g, reason })),
    );
    // Other gaps are still listed.
    expect(storyGaps(marked)).toEqual(
      storyGaps(story).filter((g) => g.kind !== gap),
    );
    const unmarked = run(marked, { type: "unmarkGapDeliberate", gap, ref });
    expect(storyGaps(unmarked)).toEqual(storyGaps(story));
  });

  test("a mark on one record leaves the same gap on another listed", () => {
    const story = run(woven, drive("calm", "a"), drive("idle", "b"));
    const origins = (s: Story) =>
      storyGaps(s)
        .filter((g) => g.kind === "drive_without_origin")
        .map((g) => g.ref);
    expect(origins(story)).toEqual([
      { kind: "drive", id: "calm" },
      { kind: "drive", id: "idle" },
    ]);
    const marked = run(story, {
      type: "markGapDeliberate",
      gap: "drive_without_origin",
      ref: { kind: "drive", id: "calm" },
      reason: "Temperament",
    });
    expect(origins(marked)).toEqual([{ kind: "drive", id: "idle" }]);
  });
});
