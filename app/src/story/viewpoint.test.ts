import { describe, expect, test } from "bun:test";
import { applyStoryCommand, type StoryCommand } from "./commands";
import { storyContradictions } from "./contradictions";
import { viewpointGap } from "./learning";
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
  {
    type: "addActor",
    id: "crew",
    name: "The crew",
    kind: "organization",
    notes: "",
  },
  { type: "addEvent", id: "signs", label: "Ivo signs on", summary: "" },
  { type: "addEvent", id: "wreck", label: "The wreck", summary: "" },
  { type: "addEvent", id: "letter", label: "The letter", summary: "" },
  { type: "addEvent", id: "confession", label: "The confession", summary: "" },
  position("signs", 1),
  position("wreck", 5),
  position("letter", 6),
  position("confession", 8),
  { type: "addScene", id: "night", title: "The night", summary: "" },
  { type: "addScene", id: "post", title: "The post", summary: "" },
);

describe("scene viewpoint", () => {
  test("is set, cleared, saved and refused for an unknown actor", () => {
    const set = run(base, {
      type: "setSceneViewpoint",
      id: "post",
      actor: "mara",
    });
    expect(set.scenes[1]?.viewpoint).toBe("mara");
    const text = serializeStory(set);
    expect(text).toContain('"viewpoint": "mara"');
    expect(serializeStory(parseStory(text)._unsafeUnwrap())).toBe(text);

    const cleared = run(set, {
      type: "setSceneViewpoint",
      id: "post",
      actor: null,
    });
    expect(cleared.scenes[1]).not.toHaveProperty("viewpoint");
    expect(serializeStory(cleared)).toBe(serializeStory(base));

    expect(
      refusal(base, { type: "setSceneViewpoint", id: "post", actor: "nobody" })
        .kind,
    ).toBe("unknown_id");
  });

  test("goes with its actor, and is a link both ways", () => {
    const set = run(base, {
      type: "setSceneViewpoint",
      id: "post",
      actor: "mara",
    });
    const touches = whatThisTouches(set, { kind: "actor", id: "mara" })
      ._unsafeUnwrap()
      .direct.scene.map((t) => [t.ref.id, t.how]);
    expect(touches).toEqual([["post", ["a scene told through its eyes"]]]);
    expect(
      scenesTouching(set, { kind: "actor", id: "mara" })
        ._unsafeUnwrap()
        .map((s) => [s.scene.id, s.how]),
    ).toEqual([["post", ["is told through their eyes"]]]);
    expect(renderStory(set)).toContain("Through the eyes of Mara.");

    const gone = run(set, { type: "removeActor", id: "mara" });
    expect(gone.scenes[1]).not.toHaveProperty("viewpoint");
  });
});

describe("what the viewpoint doesn't know", () => {
  const story = run(
    base,
    { type: "addEvent", id: "later", label: "Later", summary: "" },
    position("later", 10),
    {
      type: "addVersion",
      id: "fog",
      event: "wreck",
      text: "The fog took it",
      by: ["ivo"],
    },
    { type: "addFact", id: "lamp", text: "The lamp was out", about: [] },
    { type: "addFact", id: "sea", text: "The sea is cold", about: [] },
    {
      type: "addKnowledge",
      id: "ivo-wreck",
      actor: "ivo",
      how: "knows",
      what: { kind: "event", id: "wreck" },
    },
    {
      type: "addKnowledge",
      id: "mara-fog",
      actor: "mara",
      how: "believes",
      what: { kind: "version", id: "fog" },
      since: "wreck",
      until: "confession",
    },
    {
      type: "addKnowledge",
      id: "mara-truth",
      actor: "mara",
      how: "knows",
      what: { kind: "event", id: "wreck" },
      since: "confession",
    },
    {
      type: "addKnowledge",
      id: "mara-lamp",
      actor: "mara",
      how: "knows",
      what: { kind: "fact", id: "lamp" },
      until: "letter",
    },
  );
  const wreck = { kind: "event", id: "wreck" } as const;

  test("marks a told record someone else knows, with what she believes instead", () => {
    expect(viewpointGap(story, "mara", wreck, "letter")).toEqual({
      later: true,
      ended: false,
      believes: [{ kind: "version", id: "fog" }],
    });
    expect(viewpointGap(story, "ivo", wreck, "letter")).toBeUndefined();
  });

  test("follows knowledge in story time", () => {
    // Once she learns it, nothing is marked.
    expect(viewpointGap(story, "mara", wreck, "later")).toBeUndefined();
    // Knowledge from an event holds after it, not at it.
    expect(viewpointGap(story, "mara", wreck, "wreck")).toEqual({
      later: true,
      ended: false,
      believes: [],
    });
    expect(
      viewpointGap(story, "mara", { kind: "fact", id: "lamp" }, "wreck"),
    ).toBeUndefined();
    expect(
      viewpointGap(story, "mara", { kind: "fact", id: "lamp" }, "later"),
    ).toEqual({ later: false, ended: true, believes: [] });
    // With no time for the scene, any knowledge of it counts.
    expect(viewpointGap(story, "mara", wreck, undefined)).toBeUndefined();
  });

  test("marks nothing the knowledge records don't track", () => {
    expect(
      viewpointGap(story, "mara", { kind: "fact", id: "sea" }, "letter"),
    ).toBeUndefined();
    // Her own knowledge, told to the reader, is hers.
    expect(
      viewpointGap(
        story,
        "mara",
        { kind: "knowledge", id: "mara-fog" },
        "letter",
      ),
    ).toBeUndefined();
  });
});

describe("group membership", () => {
  const joined = run(
    base,
    {
      type: "addMembership",
      id: "ivo-crew",
      member: "ivo",
      group: "crew",
      since: "signs",
      until: "wreck",
    },
    {
      type: "addMembership",
      id: "ivo-back",
      member: "ivo",
      group: "crew",
      since: "confession",
    },
    { type: "addMembership", id: "mara-crew", member: "mara", group: "crew" },
  );

  test("is saved, and an older file without it reads the same", () => {
    const text = serializeStory(joined);
    expect(serializeStory(parseStory(text)._unsafeUnwrap())).toBe(text);
    expect(text).toContain('"member": "ivo"');
    expect(serializeStory(base)).not.toContain("memberships");
  });

  test("is refused for an unknown actor or event, a duplicate ID or itself", () => {
    const add = (
      over: Partial<Extract<StoryCommand, { type: "addMembership" }>>,
    ) =>
      refusal(joined, {
        type: "addMembership",
        id: "new",
        member: "mara",
        group: "crew",
        ...over,
      }).kind;
    expect(add({ group: "nobody" })).toBe("unknown_id");
    expect(add({ since: "never" })).toBe("unknown_id");
    expect(add({ id: "ivo-crew" })).toBe("duplicate_id");
    expect(add({ group: "mara" })).toBe("self_relation");
  });

  test("is updated, with none clearing a time, and removed", () => {
    const updated = run(joined, {
      type: "updateMembership",
      id: "ivo-crew",
      since: null,
      until: "letter",
    });
    expect(updated.memberships.find((m) => m.id === "ivo-crew")).toEqual({
      id: "ivo-crew",
      member: "ivo",
      group: "crew",
      until: "letter",
    });
    const removed = run(joined, { type: "removeMembership", id: "ivo-back" });
    expect(removed.memberships.map((m) => m.id)).toEqual([
      "ivo-crew",
      "mara-crew",
    ]);
    expect(refusal(joined, { type: "removeMembership", id: "nope" }).kind).toBe(
      "unknown_id",
    );
  });

  test("goes with its member or group, and loses a removed event", () => {
    expect(
      run(joined, { type: "removeActor", id: "ivo" }).memberships.map(
        (m) => m.id,
      ),
    ).toEqual(["mara-crew"]);
    expect(
      run(joined, { type: "removeActor", id: "crew" }).memberships,
    ).toEqual([]);
    expect(
      run(joined, { type: "removeEvent", id: "wreck" }).memberships.find(
        (m) => m.id === "ivo-crew",
      ),
    ).toEqual({ id: "ivo-crew", member: "ivo", group: "crew", since: "signs" });
  });

  test("is rendered for member and group in story order, and linked", () => {
    const text = renderStory(joined);
    expect(text).toContain(
      "**The crew** (a group). Members: Mara; Ivo (from Ivo signs on until The wreck); Ivo (from The confession).",
    );
    expect(text).toContain(
      "**Ivo**. Member of The crew (from Ivo signs on until The wreck); The crew (from The confession).",
    );
    const direct = whatThisTouches(joined, { kind: "event", id: "wreck" })
      ._unsafeUnwrap()
      .direct.actor.map((t) => [t.ref.id, t.how]);
    expect(direct).toEqual([["ivo", ["leaves The crew then"]]]);
  });

  test("ending before it starts is a contradiction", () => {
    const backwards = run(joined, {
      type: "updateMembership",
      id: "ivo-back",
      until: "signs",
    });
    expect(storyContradictions(backwards).map((c) => c.message)).toEqual([
      '"Ivo" belongs to "The crew" until "Ivo signs on", which happens before "The confession", when it starts.',
    ]);
  });
});
