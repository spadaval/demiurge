import { describe, expect, test } from "bun:test";
import { applyStoryCommand, type StoryCommand } from "./commands";
import { type GapKind, storyGaps } from "./gaps";
import { newStory, type Ref, type Story } from "./story";

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
    "person_without_drive",
    [{ type: "addActor", id: "c", name: "Aldric", kind: "person", notes: "" }],
    { kind: "actor", id: "c" },
  ],
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
  [
    "fact_unconnected",
    [{ type: "addFact", id: "salt", text: "Salt rusts iron.", about: [] }],
    { kind: "fact", id: "salt" },
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
    "reader_question_never_answered",
    [
      { type: "addReaderQuestion", id: "hanging", question: "" },
      {
        type: "setReaderQuestionScenes",
        id: "hanging",
        opensAt: "door",
        answeredAt: null,
      },
    ],
    { kind: "readerQuestion", id: "hanging" },
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

  test("a fact about nothing that something refers to is woven in", () => {
    const fact: StoryCommand = {
      type: "addFact",
      id: "salt",
      text: "",
      about: [],
    };
    const salt: Ref = { kind: "fact", id: "salt" };
    const unconnected = (...commands: StoryCommand[]) =>
      storyGaps(run(woven, fact, ...commands)).filter(
        (gap) => gap.kind === "fact_unconnected",
      );
    expect(unconnected()).toHaveLength(1);
    expect(
      unconnected({ type: "addFact", id: "rust", text: "", about: [salt] }),
    ).toEqual([]);
    expect(
      unconnected({
        type: "addCandidate",
        questionId: "why",
        id: "salt-did-it",
        answer: "",
        touches: [salt],
      }),
    ).toEqual([]);
  });

  test("a story with a premise and nothing else", () => {
    expect(storyGaps(newStory("A gate that remembers."))).toEqual([]);
  });

  test("names the record in the message", () => {
    const gaps = storyGaps(
      run(woven, {
        type: "addActor",
        id: "c",
        name: "Aldric",
        kind: "person",
        notes: "",
      }),
    );
    expect(gaps).toEqual([
      {
        kind: "person_without_drive",
        ref: { kind: "actor", id: "c" },
        message: "Aldric has no drive yet: what do they want?",
      },
    ]);
  });
});
