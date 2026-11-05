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
      believes: [],
    });
    expect(
      viewpointGap(story, "mara", { kind: "fact", id: "lamp" }, "wreck"),
    ).toBeUndefined();
    expect(
      viewpointGap(story, "mara", { kind: "fact", id: "lamp" }, "later"),
    ).toEqual({ later: false, ended: "knows", believes: [] });
    // A belief given up is one no longer believed.
    expect(
      viewpointGap(story, "mara", { kind: "version", id: "fog" }, "later"),
    ).toEqual({ later: false, ended: "believes", believes: [] });
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

describe("what the story shows the viewpoint", () => {
  // Ivo knows the wreck, the fog version, and the oar; Mara has no
  // knowledge records, so what she does and sees decides.
  const story = run(
    base,
    {
      type: "addVersion",
      id: "fog",
      event: "wreck",
      text: "The fog took it",
      by: ["mara"],
    },
    { type: "addObject", id: "oar", name: "The oar", notes: "" },
    { type: "addFact", id: "lamp", text: "The lamp was out", about: [] },
    ...(["wreck", "fog", "oar", "lamp"] as const).map(
      (id, i): StoryCommand => ({
        type: "addKnowledge",
        id: `ivo-${i}`,
        actor: "ivo",
        how: "knows",
        what: {
          kind:
            id === "wreck"
              ? "event"
              : id === "fog"
                ? "version"
                : id === "oar"
                  ? "object"
                  : "fact",
          id,
        },
      }),
    ),
    {
      type: "setParticipant",
      event: "letter",
      who: { kind: "object", id: "oar" },
      role: "found",
    },
  );
  const wreck = { kind: "event", id: "wreck" } as const;
  const oar = { kind: "object", id: "oar" } as const;
  const lamp = { kind: "fact", id: "lamp" } as const;
  const fog = { kind: "version", id: "fog" } as const;
  const part = (event: string): StoryCommand => ({
    type: "setParticipant",
    event,
    who: { kind: "actor", id: "mara" },
    role: "there",
  });

  test("an event she takes part in, and the objects in it, from then on", () => {
    expect(viewpointGap(story, "mara", wreck, "letter")).toEqual({
      later: false,
      believes: [],
    });
    const there = run(story, part("wreck"), part("letter"));
    expect(viewpointGap(there, "mara", wreck, "letter")).toBeUndefined();
    expect(viewpointGap(there, "mara", wreck, "wreck")).toBeUndefined();
    expect(viewpointGap(there, "mara", oar, "letter")).toBeUndefined();
    expect(viewpointGap(there, "mara", oar, "wreck")).toEqual({
      later: true,
      believes: [],
    });
  });

  test("a version she tells, from its event", () => {
    expect(viewpointGap(story, "mara", fog, "letter")).toBeUndefined();
    expect(viewpointGap(story, "mara", fog, "signs")).toEqual({
      later: true,
      believes: [],
    });
  });

  test("what a scene through her eyes shows or reveals, after that scene's now", () => {
    // night (scene 0) is at the wreck; post (scene 1) at the confession.
    const seen = run(
      story,
      { type: "setSceneEvents", id: "night", depicts: ["wreck"] },
      { type: "setSceneLinks", id: "night", how: "reveals", refs: [lamp] },
      { type: "setSceneViewpoint", id: "night", actor: "mara" },
      { type: "setSceneEvents", id: "post", depicts: ["confession"] },
    );
    expect(viewpointGap(seen, "mara", lamp, "confession", 1)).toBeUndefined();
    expect(viewpointGap(seen, "mara", wreck, "confession", 1)).toBeUndefined();
    // Not at the scene's own time: it tells her then.
    expect(viewpointGap(seen, "mara", lamp, "wreck", 1)).toEqual({
      later: true,
      believes: [],
    });
    // The scene being written isn't counted.
    expect(viewpointGap(seen, "mara", lamp, "confession", 0)).toEqual({
      later: false,
      believes: [],
    });
    // Through someone else's eyes, it tells her nothing.
    const other = run(seen, {
      type: "setSceneViewpoint",
      id: "night",
      actor: "ivo",
    });
    expect(viewpointGap(other, "mara", lamp, "confession", 1)).toEqual({
      later: false,
      believes: [],
    });
    // With no time for the scene, a scene through her eyes told before counts.
    expect(viewpointGap(seen, "mara", lamp, undefined, 1)).toBeUndefined();
    expect(viewpointGap(seen, "mara", lamp, undefined, 0)).toEqual({
      later: false,
      believes: [],
    });
  });

  test("her own knowledge records decide over what she is shown", () => {
    const recorded = run(story, part("wreck"), {
      type: "addKnowledge",
      id: "mara-late",
      actor: "mara",
      how: "knows",
      what: wreck,
      since: "confession",
    });
    expect(viewpointGap(recorded, "mara", wreck, "letter")).toEqual({
      later: true,
      believes: [],
    });
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
