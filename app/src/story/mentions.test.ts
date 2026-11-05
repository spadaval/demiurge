import { describe, expect, test } from "bun:test";
import { applyStoryCommand, type StoryCommand } from "./commands";
import { type Mention, whatMentions } from "./mentions";
import { newStory, type Ref, type Story } from "./story";

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

/**
 * Mara's brother drowned in the wreck of 1203; twenty years on, a letter
 * comes. Ivo's market scene has a season too, but nothing links it to the
 * wreck, and it doesn't name Mara.
 */
const story = run(
  newStory("A keeper finds a letter from her drowned brother."),
  { type: "addActor", id: "mara", name: "Mara", kind: "person", notes: "" },
  { type: "addActor", id: "ivo", name: "Ivo", kind: "person", notes: "" },
  { type: "addEvent", id: "wreck", label: "The wreck", summary: "" },
  { type: "addEvent", id: "letter", label: "The letter", summary: "" },
  at("wreck", 1203),
  at("letter", 1223),
  {
    type: "addDrive",
    id: "avenge",
    actorId: "mara",
    want: "Avenge her brother",
    stakes: "Twenty years of grief",
    method: "",
  },
  { type: "setDriveOrigins", id: "avenge", origins: ["wreck"] },
  {
    type: "addScene",
    id: "harbour",
    title: "The harbour",
    summary:
      "Twenty years ago the boat went down; Mara still watches the reef.",
  },
  { type: "setSceneEvents", id: "harbour", depicts: ["wreck"] },
  {
    type: "addScene",
    id: "market",
    title: "Market day",
    summary: "Ivo sells fish in spring, as he has for twenty years.",
  },
  {
    type: "addFact",
    id: "charted",
    text: "The reef has been charted since 1203, and rebuilt in 12030.",
    about: [],
  },
  {
    type: "addOpenQuestion",
    id: "why",
    question: "Why does she stay?",
    about: [],
    conflict: false,
  },
  {
    type: "addCandidate",
    questionId: "why",
    id: "vow",
    answer: "She swore to avenge her brother after the wreck",
    touches: [],
  },
);

const mentions = (ref: Ref, was?: Story): Mention[] =>
  whatMentions(story, ref, was)._unsafeUnwrap();

/** `kind:id field: "text" (how)`, for comparing. */
const lines = (found: Mention[]) =>
  found.map(
    (m) =>
      `${m.ref.kind}:${m.ref.kind === "candidate" ? `${m.ref.questionId}/` : ""}${m.ref.id} ${m.field}: "${m.text}" (${m.how})`,
  );

describe("whatMentions", () => {
  test("an event: its label, its year as written, and spans in connected text", () => {
    expect(lines(mentions({ kind: "event", id: "wreck" }))).toEqual([
      'drive:avenge stakes: "Twenty years" (may state when this happened)',
      'scene:harbour summary: "Twenty years ago" (may state when this happened)',
      'fact:charted text: "1203" (states its year 1203)',
      'candidate:why/vow answer: "the wreck" (names it)',
    ]);
  });

  test("a moved event is found by its old year and the text near it", () => {
    const moved = run(story, at("wreck", 1213));
    const found = lines(
      whatMentions(
        moved,
        { kind: "event", id: "wreck" },
        story,
      )._unsafeUnwrap(),
    );
    expect(found).toContain('fact:charted text: "1203" (states its year 1203)');
    expect(found).toContain(
      'scene:harbour summary: "Twenty years ago" (may state when this happened)',
    );
    // Without the story before the move, it looks for the new year.
    expect(
      lines(
        whatMentions(moved, { kind: "event", id: "wreck" })._unsafeUnwrap(),
      ).filter((line) => line.includes("states its year")),
    ).toEqual([]);
  });

  test("a changed motive is found by its old want and its holder's name", () => {
    const changed = run(story, {
      type: "updateDrive",
      id: "avenge",
      want: "Forgive the ferryman",
    });
    expect(
      lines(
        whatMentions(
          changed,
          { kind: "drive", id: "avenge" },
          story,
        )._unsafeUnwrap(),
      ),
    ).toEqual([
      'scene:harbour summary: "Mara" (names its holder Mara)',
      'candidate:why/vow answer: "avenge her brother" (names it)',
    ]);
  });

  test("an unrelated record isn't listed", () => {
    for (const ref of [
      { kind: "event", id: "wreck" },
      { kind: "drive", id: "avenge" },
      { kind: "actor", id: "mara" },
    ] as const) {
      expect(mentions(ref).map((m) => m.ref.id)).not.toContain("market");
    }
    expect(lines(mentions({ kind: "actor", id: "ivo" }))).toEqual([
      'scene:market summary: "Ivo" (names it)',
    ]);
  });

  test("matching is case-insensitive and whole words only", () => {
    const named = run(
      story,
      { type: "addActor", id: "al", name: "Al", kind: "person", notes: "" },
      {
        type: "updateActor",
        id: "ivo",
        notes: "Also AL's cousin, always late",
      },
    );
    expect(
      lines(whatMentions(named, { kind: "actor", id: "al" })._unsafeUnwrap()),
    ).toEqual(['actor:ivo notes: "AL" (names it)']);
  });

  test("a year is matched as a whole number", () => {
    const other = run(story, {
      type: "updateFact",
      id: "charted",
      text: "Rebuilt in 12030, and again in 11203 and 1203.5.",
    });
    expect(
      lines(
        whatMentions(other, { kind: "event", id: "wreck" })._unsafeUnwrap(),
      ).filter((line) => line.startsWith("fact:")),
    ).toEqual([]);
  });

  test("never edits text", () => {
    const before = JSON.stringify(story);
    mentions({ kind: "event", id: "wreck" });
    mentions({ kind: "drive", id: "avenge" });
    expect(JSON.stringify(story)).toBe(before);
  });

  test("an unknown record is refused", () => {
    expect(
      whatMentions(story, { kind: "event", id: "nope" })._unsafeUnwrapErr()
        .kind,
    ).toBe("unknown_ref");
  });

  test.each([
    "twenty years ago",
    "three years dead",
    "months",
    "spring",
    "the following winter",
    "a few weeks later",
    "twenty-two years",
  ])("finds %p as a span or season", (phrase) => {
    const timed = run(story, {
      type: "updateScene",
      id: "harbour",
      summary: `It was ${phrase}, she says.`,
    });
    expect(
      whatMentions(timed, { kind: "event", id: "wreck" })
        ._unsafeUnwrap()
        .filter((m) => m.ref.id === "harbour")
        .map((m) => m.text.toLowerCase()),
    ).toContain(phrase);
  });
});
