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
    expect(text).toContain('Opposed by the want "Keep the wreck quiet".');
    expect(text).toContain("## Wants nobody holds yet");
    expect(text).toContain('Puts pressure on Mara: "Learn who wrote it".');
    expect(text).toContain(
      '  - The ferryman. Would touch the want "Keep the wreck quiet".',
    );
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

  test("leaves out empty sections", () => {
    expect(renderStory(newStory("Just a premise."))).toBe(
      "## Premise\n\nJust a premise.\n",
    );
  });
});

test("wordCount counts runs of non-space characters", () => {
  expect(wordCount("  Two words\n\n- and more ")).toBe(5);
  expect(wordCount("")).toBe(0);
});
