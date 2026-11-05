import { describe, expect, test } from "bun:test";
import { applyStoryCommand, type StoryCommand } from "./commands";
import { storyContradictions } from "./contradictions";
import { newStory, type Story } from "./story";

function run(story: Story, ...commands: StoryCommand[]): Story {
  return commands.reduce(
    (current, command) =>
      applyStoryCommand(current, command)._unsafeUnwrap().story,
    story,
  );
}

const events = run(
  newStory("The gate was sealed before and after the crowning."),
  { type: "addEvent", id: "seal", label: "", summary: "" },
  { type: "addEvent", id: "crowning", label: "", summary: "" },
  {
    type: "constrain",
    id: "first",
    a: "seal",
    relation: "before",
    b: "crowning",
  },
);

describe("storyContradictions", () => {
  test("a story with none", () => {
    expect(storyContradictions(events)).toEqual([]);
  });

  test("keeps a conflicting move and lists the timeline's problem", () => {
    const move: StoryCommand = {
      type: "constrain",
      id: "second",
      a: "crowning",
      relation: "before",
      b: "seal",
    };
    const change = applyStoryCommand(events, move)._unsafeUnwrap();
    expect(change.problems).not.toEqual([]);
    const listed = storyContradictions(change.story);
    expect(listed.map((c) => c.source)).toEqual(["timeline"]);
    expect(listed[0]).toMatchObject({
      source: "timeline",
      problem: { kind: "contradiction" },
    });
    expect(listed.map((c) => c.message)).toEqual(
      change.problems.map((p) => p.message),
    );
  });

  test("an open conflict is listed until it is answered", () => {
    const story = run(
      events,
      {
        type: "addOpenQuestion",
        id: "age",
        question: "Is Kesh's three hundred years compatible with 902?",
        about: [{ kind: "event", id: "seal" }],
        conflict: true,
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
        questionId: "age",
        id: "loose",
        answer: "",
        touches: [],
      },
    );
    expect(storyContradictions(story)).toEqual([
      {
        source: "openQuestion",
        ref: { kind: "openQuestion", id: "age" },
        message:
          "Not settled yet: Is Kesh's three hundred years compatible with 902?",
      },
    ]);
    const answered = run(story, {
      type: "answerOpenQuestion",
      id: "age",
      candidateId: "loose",
    });
    expect(storyContradictions(answered)).toEqual([]);
  });
});

describe("causes", () => {
  const at = (event: string, start: number): StoryCommand => ({
    type: "setPosition",
    event,
    frame: "world",
    position: { start, end: start },
  });
  const placed = run(
    newStory("A storm, then a wreck."),
    { type: "addEvent", id: "storm", label: "The storm", summary: "" },
    { type: "addEvent", id: "wreck", label: "The wreck", summary: "" },
    at("storm", 10),
    at("wreck", 12),
    { type: "addCause", cause: "storm", effect: "wreck" },
  );

  test("a cause before its effect is no contradiction", () => {
    expect(storyContradictions(placed)).toEqual([]);
  });

  test("moving a cause after its effect is kept and listed, and moving it back clears it", () => {
    const moved = applyStoryCommand(placed, at("storm", 14))._unsafeUnwrap();
    expect(moved.problems).toEqual([]);
    expect(storyContradictions(moved.story)).toEqual([
      {
        source: "cause",
        kind: "effect_first",
        cause: "storm",
        effect: "wreck",
        message:
          '"The wreck" happens before "The storm", which is recorded as its cause.',
      },
    ]);
    const back = run(moved.story, at("storm", 10));
    expect(storyContradictions(back)).toEqual([]);
  });

  test("a cause and effect at the same position aren't listed", () => {
    expect(storyContradictions(run(placed, at("storm", 12)))).toEqual([]);
  });

  test("a cause ordered after its effect by a constraint is listed", () => {
    const story = run(
      newStory("P"),
      { type: "addEvent", id: "a", label: "A", summary: "" },
      { type: "addEvent", id: "b", label: "B", summary: "" },
      { type: "constrain", id: "c", a: "b", relation: "before", b: "a" },
      { type: "addCause", cause: "a", effect: "b" },
    );
    expect(storyContradictions(story).map((c) => c.source)).toEqual(["cause"]);
  });

  test("a circle of causes is kept and listed once", () => {
    const story = run(
      newStory("P"),
      { type: "addEvent", id: "c", label: "C", summary: "" },
      { type: "addEvent", id: "a", label: "A", summary: "" },
      { type: "addEvent", id: "b", label: "B", summary: "" },
      { type: "addEvent", id: "d", label: "D", summary: "" },
      { type: "addCause", cause: "a", effect: "b" },
      { type: "addCause", cause: "b", effect: "c" },
      { type: "addCause", cause: "c", effect: "a" },
      { type: "addCause", cause: "c", effect: "d" },
    );
    expect(storyContradictions(story)).toEqual([
      {
        source: "cause",
        kind: "cycle",
        events: ["a", "b", "c"],
        message:
          'These events are recorded as causing each other, in a circle: "A"; "B"; "C".',
      },
    ]);
    const broken = run(story, { type: "removeCause", cause: "c", effect: "a" });
    expect(storyContradictions(broken)).toEqual([]);
  });
});
