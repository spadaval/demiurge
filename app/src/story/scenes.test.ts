import { describe, expect, test } from "bun:test";
import { applyStoryCommand, type StoryCommand } from "./commands";
import { renderStory, wordCount } from "./render";
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

const scene = (id: string, title: string): StoryCommand => ({
  type: "addScene",
  id,
  title,
  summary: "",
});

const base = run(
  newStory("A keeper finds a letter."),
  { type: "addActor", id: "mara", name: "Mara", kind: "person", notes: "" },
  { type: "addEvent", id: "wreck", label: "The wreck", summary: "" },
  {
    type: "addFact",
    id: "lamp",
    text: "The lamp was out that night",
    about: [],
  },
  {
    type: "addOpenQuestion",
    id: "who",
    question: "Who wrote the letter?",
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
  scene("storm", "The storm"),
  scene("docks", "The docks"),
);

const linked = run(
  base,
  {
    type: "setSceneLinks",
    id: "docks",
    how: "reveals",
    refs: [
      { kind: "fact", id: "lamp" },
      { kind: "candidate", questionId: "who", id: "ferry" },
    ],
  },
  {
    type: "setSceneLinks",
    id: "storm",
    how: "withholds",
    refs: [{ kind: "fact", id: "lamp" }],
  },
  {
    type: "setSceneLinks",
    id: "storm",
    how: "implies",
    refs: [{ kind: "event", id: "wreck" }],
  },
  { type: "setSceneActors", id: "storm", actors: ["mara"] },
);

describe("scene links", () => {
  test("are kept on the scene and survive the file", () => {
    const storm = linked.scenes.find((s) => s.id === "storm");
    expect(storm?.withholds).toEqual([{ kind: "fact", id: "lamp" }]);
    expect(storm?.implies).toEqual([{ kind: "event", id: "wreck" }]);
    const text = serializeStory(linked);
    expect(serializeStory(parseStory(text)._unsafeUnwrap())).toBe(text);
    expect(text).toContain('"withholds": [');
  });

  test("are left out of the file when empty, and a file without them loads", () => {
    const text = serializeStory(base);
    const scenes = JSON.parse(text).scenes;
    expect(scenes.map(Object.keys)).toEqual([
      ["actors", "id", "title", "summary", "depicts", "pressures"],
      ["actors", "id", "title", "summary", "depicts", "pressures"],
    ]);
    expect(parseStory(text)._unsafeUnwrap()).toEqual(base);
  });

  test("refuse a record that doesn't exist, and setting none clears them", () => {
    const refused = applyStoryCommand(linked, {
      type: "setSceneLinks",
      id: "storm",
      how: "reveals",
      refs: [{ kind: "fact", id: "nowhere" }],
    });
    expect(refused._unsafeUnwrapErr().message).toBe(
      "fact nowhere does not exist",
    );
    const cleared = run(linked, {
      type: "setSceneLinks",
      id: "storm",
      how: "withholds",
      refs: [],
    });
    expect(cleared.scenes.find((s) => s.id === "storm")?.withholds).toEqual([]);
  });

  test("go when the record they link goes", () => {
    const gone = run(
      linked,
      { type: "removeFact", id: "lamp" },
      { type: "removeCandidate", questionId: "who", id: "ferry" },
    );
    expect(gone.scenes.find((s) => s.id === "docks")?.reveals).toEqual([]);
    expect(gone.scenes.find((s) => s.id === "storm")?.withholds).toEqual([]);
  });

  test("a scene ID must be able to name its prose file", () => {
    for (const id of ["a/b", "..", "a\\b"]) {
      expect(
        applyStoryCommand(base, scene(id, "Bad"))._unsafeUnwrapErr().kind,
      ).toBe("invalid_command");
    }
  });
});

describe("scenesTouching", () => {
  test("lists the scenes that touch a record, in telling order, and how", () => {
    const touching = (ref: Parameters<typeof scenesTouching>[1]) =>
      scenesTouching(linked, ref)
        ._unsafeUnwrap()
        .map(({ scene, index, how }) => [scene.id, index, how]);
    expect(touching({ kind: "fact", id: "lamp" })).toEqual([
      ["storm", 0, ["withholds it"]],
      ["docks", 1, ["reveals it"]],
    ]);
    expect(touching({ kind: "actor", id: "mara" })).toEqual([
      ["storm", 0, ["is in it"]],
    ]);
    expect(touching({ kind: "openQuestion", id: "who" })).toEqual([
      ["docks", 1, ["reveals its candidate ferry"]],
    ]);
    expect(
      touching({ kind: "candidate", questionId: "who", id: "ferry" }),
    ).toEqual([["docks", 1, ["reveals it"]]]);
    expect(touching({ kind: "scene", id: "docks" })).toEqual([]);
  });

  test("refuses a record that doesn't exist", () => {
    expect(
      scenesTouching(linked, { kind: "fact", id: "x" })._unsafeUnwrapErr(),
    ).toEqual({ kind: "unknown_ref", message: "fact x does not exist" });
  });
});

test("touches follows scene links both ways", () => {
  const fromFact = whatThisTouches(linked, {
    kind: "fact",
    id: "lamp",
  })._unsafeUnwrap();
  expect(fromFact.direct.scene.map((t) => [t.ref.id, t.how])).toEqual([
    ["storm", ["a scene that withholds it"]],
    ["docks", ["a scene that reveals it"]],
  ]);
  const fromScene = whatThisTouches(linked, {
    kind: "scene",
    id: "storm",
  })._unsafeUnwrap();
  expect(fromScene.direct.fact.map((t) => t.how)).toEqual([
    ["what it withholds"],
  ]);
});

test("render names a scene's links after it, with no word count", () => {
  const long = run(
    linked,
    {
      type: "addFact",
      id: "tithe",
      text: "Each patron takes a sliver of her luck as tithe",
      about: [],
    },
    {
      type: "setSceneLinks",
      id: "docks",
      how: "implies",
      refs: [{ kind: "fact", id: "tithe" }],
    },
  );
  expect(renderStory(long)).toContain(
    "The ferryman. Implies: Each patron takes a sliver of her luck…\n",
  );
  const text = renderStory(linked);
  expect(text).toContain(
    "1. **The storm**.\n   With Mara. Implies: The wreck. Withholds: The lamp was out that night.\n",
  );
  expect(text).toContain(
    "2. **The docks**.\n   Reveals: The lamp was out that night; The ferryman.\n",
  );
  expect(text).not.toMatch(/\d+ words/);
  expect(wordCount(text)).toBeGreaterThan(0);
});
