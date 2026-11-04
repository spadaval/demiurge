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
