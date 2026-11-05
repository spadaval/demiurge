import { describe, expect, test } from "bun:test";
import { applyStoryCommand, type StoryCommand } from "./commands";
import { storyContradictions } from "./contradictions";
import { knowledgeAlways, tellingOrder, trueOrder } from "./learning";
import { renderStory } from "./render";
import { scenesTouching } from "./scenes";
import { newStory, parseStory, type Story, serializeStory } from "./story";
import { whatThisTouches } from "./touches";

function run(story: Story, ...commands: StoryCommand[]): Story {
  return commands.reduce(
    (current, command) =>
      applyStoryCommand(current, command)._unsafeUnwrap().story,
    story,
  );
}

const refusal = (story: Story, command: StoryCommand) =>
  applyStoryCommand(story, command)._unsafeUnwrapErr();

const position = (event: string, start: number): StoryCommand => ({
  type: "setPosition",
  event,
  frame: "world",
  position: { start, end: start },
});

const base = run(
  newStory("A keeper finds a letter."),
  { type: "addActor", id: "mara", name: "Mara", kind: "person", notes: "" },
  { type: "addActor", id: "ivo", name: "Ivo", kind: "person", notes: "" },
  { type: "addEvent", id: "wreck", label: "The wreck", summary: "Ivo sank it" },
  { type: "addEvent", id: "letter", label: "The letter", summary: "" },
  position("wreck", 1),
  position("letter", 20),
  { type: "addFact", id: "lamp", text: "The lamp was out", about: [] },
  {
    type: "addVersion",
    id: "fog",
    event: "wreck",
    text: "The fog took it",
    by: ["ivo", "ivo"],
  },
  {
    type: "addKnowledge",
    id: "mara-fog",
    actor: "mara",
    how: "believes",
    what: { kind: "version", id: "fog" },
    since: "wreck",
    until: "letter",
  },
  {
    type: "addKnowledge",
    id: "ivo-lamp",
    actor: "ivo",
    how: "knows",
    what: { kind: "fact", id: "lamp" },
  },
  { type: "addScene", id: "docks", title: "The docks", summary: "" },
  { type: "addScene", id: "storm", title: "The storm", summary: "" },
  {
    type: "setSceneLinks",
    id: "docks",
    how: "reveals",
    refs: [{ kind: "knowledge", id: "mara-fog" }],
  },
  { type: "setSceneEvents", id: "storm", depicts: ["wreck"] },
);

describe("versions and knowledge", () => {
  test("are kept, written only when present, and survive the file", () => {
    expect(base.versions).toEqual([
      { id: "fog", event: "wreck", text: "The fog took it", by: ["ivo"] },
    ]);
    const text = serializeStory(base);
    expect(serializeStory(parseStory(text)._unsafeUnwrap())).toBe(text);
    const empty = serializeStory(newStory("P"));
    expect(empty).not.toContain("versions");
    expect(empty).not.toContain("knowledge");
  });

  test("refuse what doesn't exist, and knowledge of itself", () => {
    expect(
      refusal(base, {
        type: "addVersion",
        id: "x",
        event: "nowhere",
        text: "",
        by: [],
      }).message,
    ).toBe("event nowhere does not exist");
    expect(
      refusal(base, {
        type: "addKnowledge",
        id: "x",
        actor: "mara",
        how: "knows",
        what: { kind: "fact", id: "lamp" },
        since: "never",
      }).message,
    ).toBe("event never does not exist");
    expect(
      refusal(base, {
        type: "updateKnowledge",
        id: "ivo-lamp",
        what: { kind: "knowledge", id: "ivo-lamp" },
      }).kind,
    ).toBe("self_relation");
  });

  test("update changes only what it is given, and null clears a time", () => {
    const story = run(base, {
      type: "updateKnowledge",
      id: "mara-fog",
      how: "knows",
      until: null,
    });
    expect(story.knowledge.find((k) => k.id === "mara-fog")).toEqual({
      id: "mara-fog",
      actor: "mara",
      how: "knows",
      what: { kind: "version", id: "fog" },
      since: "wreck",
    });
  });

  test("removing an event removes its versions, knowledge of them, and links to that", () => {
    const story = run(base, { type: "removeEvent", id: "wreck" });
    expect(story.versions).toEqual([]);
    expect(story.knowledge.map((k) => k.id)).toEqual(["ivo-lamp"]);
    expect(story.scenes.find((s) => s.id === "docks")?.reveals).toEqual([]);
  });

  test("removing an actor removes what they know and them as a teller; removing a time clears it", () => {
    const noIvo = run(base, { type: "removeActor", id: "ivo" });
    expect(noIvo.knowledge.map((k) => k.id)).toEqual(["mara-fog"]);
    expect(noIvo.versions[0]?.by).toEqual([]);
    const noLetter = run(base, { type: "removeEvent", id: "letter" });
    expect(
      noLetter.knowledge.find((k) => k.id === "mara-fog")?.until,
    ).toBeUndefined();
  });

  test("knowledge that ends before it starts is a contradiction, kept", () => {
    expect(storyContradictions(base)).toEqual([]);
    const backwards = run(base, {
      type: "updateKnowledge",
      id: "mara-fog",
      since: "letter",
      until: "wreck",
    });
    expect(storyContradictions(backwards)).toEqual([
      {
        source: "knowledge",
        ref: { kind: "knowledge", id: "mara-fog" },
        message:
          '"Mara believes: The fog took it" is held until "The wreck", which happens before "The letter", when it starts.',
      },
    ]);
    expect(renderStory(backwards)).toContain(
      "- Mara believes: Ivo's account of The wreck ends with The wreck, which happens before The letter, when it starts.\n",
    );
  });

  test("touches and scenes follow them", () => {
    const touched = whatThisTouches(base, {
      kind: "event",
      id: "wreck",
    })._unsafeUnwrap();
    expect(touched.direct.version.map((t) => t.how)).toEqual([
      ["a version of it"],
    ]);
    expect(touched.direct.knowledge.map((t) => t.how)).toEqual([
      ["knowledge held from then"],
    ]);
    expect(
      scenesTouching(base, { kind: "actor", id: "mara" })
        ._unsafeUnwrap()
        .map(({ scene, how }) => [scene.id, how]),
    ).toEqual([["docks", ["reveals what they believe (mara-fog)"]]]);
  });

  test("render lists versions under their event and who knows what", () => {
    const text = renderStory(base);
    expect(text).toContain(
      "- **The wreck** (the start of 1): Ivo sank it.\n  - As Ivo tells it: The fog took it.\n",
    );
    expect(text).toContain(
      "## Who knows or believes what\n\n- Ivo knows: The lamp was out.\n- Mara believes: Ivo's account of The wreck, from The wreck until The letter.\n",
    );
    expect(text).toContain(
      "Reveals: Mara believes: Ivo's account of The wreck.",
    );
  });
});

describe("the reader's order and the true order", () => {
  test("telling order lists each scene with what it puts before the reader", () => {
    expect(
      tellingOrder(base).map(({ scene, told }) => [
        scene.id,
        told.map(({ how, ref }) => `${how} ${ref.kind}:${ref.id}`),
      ]),
    ).toEqual([
      ["docks", ["reveals knowledge:mara-fog"]],
      ["storm", ["shows event:wreck"]],
    ]);
  });

  test("true order lists events in story time with the first scene that tells of each", () => {
    const steps = trueOrder(base);
    expect(steps.map(({ event }) => event.id)).toEqual(["wreck", "letter"]);
    // Knowledge of a version of the wreck tells of the wreck before the
    // scene that shows it.
    expect(steps[0]?.first).toMatchObject({
      index: 0,
      how: "reveals",
      via: { kind: "knowledge", id: "mara-fog" },
    });
    expect(steps[0]?.knowledgeFrom.map((k) => k.knowledge.id)).toEqual([
      "mara-fog",
    ]);
    expect(steps[1]?.first).toBeUndefined();
    expect(knowledgeAlways(base).map((k) => [k.knowledge.id, k.first])).toEqual(
      [["ivo-lamp", undefined]],
    );
  });

  test("withholding doesn't count as telling", () => {
    const story = run(
      base,
      { type: "setSceneLinks", id: "docks", how: "reveals", refs: [] },
      {
        type: "setSceneLinks",
        id: "docks",
        how: "withholds",
        refs: [{ kind: "event", id: "wreck" }],
      },
    );
    expect(trueOrder(story)[0]?.first?.scene.id).toBe("storm");
  });
});
