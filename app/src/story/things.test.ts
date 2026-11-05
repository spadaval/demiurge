import { describe, expect, test } from "bun:test";
import { applyStoryCommand, type StoryCommand } from "./commands";
import { tellingOrder } from "./learning";
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

const drive = (id: string, want: string): StoryCommand => ({
  type: "addDrive",
  id,
  actorId: "lew",
  want,
  stakes: "",
  method: "",
});

const base = run(
  newStory("A son comes home for a funeral."),
  { type: "addActor", id: "lew", name: "Lew", kind: "person", notes: "" },
  { type: "addActor", id: "ada", name: "Ada", kind: "person", notes: "" },
  { type: "addEvent", id: "death", label: "Dale dies", summary: "" },
  { type: "addEvent", id: "truth", label: "Lew learns", summary: "" },
  { type: "addEvent", id: "bus", label: "The morning bus", summary: "" },
  { type: "addObject", id: "hook", name: "The sack hook", notes: "Rusted" },
  { type: "addScene", id: "dock", title: "The dock", summary: "" },
  { type: "addScene", id: "barn", title: "The barn", summary: "" },
  {
    type: "setSceneLinks",
    id: "dock",
    how: "plants",
    refs: [{ kind: "object", id: "hook" }],
  },
  {
    type: "setSceneLinks",
    id: "barn",
    how: "paysOff",
    refs: [{ kind: "object", id: "hook" }],
  },
  {
    type: "setParticipant",
    event: "death",
    who: { kind: "actor", id: "ada" },
    role: "did it",
  },
  {
    type: "setParticipant",
    event: "death",
    who: { kind: "object", id: "hook" },
    role: "the weapon",
  },
  drive("truth-want", "Learn the truth"),
  drive("bury", "Bury it"),
  {
    type: "addDriveTurn",
    drive: "truth-want",
    how: "satisfied",
    at: "truth",
    note: "",
  },
  {
    type: "addDriveTurn",
    drive: "truth-want",
    how: "flipped",
    at: "bus",
    into: "bury",
    note: "to protect Ada",
  },
);

describe("objects, planted and paid off", () => {
  test("scenes plant and pay off an object, and both count as telling", () => {
    expect(
      scenesTouching(base, { kind: "object", id: "hook" })
        ._unsafeUnwrap()
        .map(({ scene, how }) => [scene.id, how]),
    ).toEqual([
      ["dock", ["plants it"]],
      ["barn", ["pays off it"]],
    ]);
    expect(tellingOrder(base)[1]?.told).toEqual([
      { how: "paysOff", ref: { kind: "object", id: "hook" } },
    ]);
  });

  test("render lists it with where it is planted and paid off", () => {
    const text = renderStory(base);
    expect(text).toContain(
      '## Things\n\n- **The sack hook**. Rusted. Planted in "The dock". Paid off in "The barn". In Dale dies (the weapon).\n',
    );
    expect(text).toContain("1. **The dock**.\n   Plants: The sack hook.\n");
  });

  test("removing it removes its links and parts", () => {
    const story = run(base, { type: "removeObject", id: "hook" });
    expect(story.scenes.flatMap((s) => [...s.plants, ...s.paysOff])).toEqual(
      [],
    );
    expect(story.participants.map((p) => p.who.id)).toEqual(["ada"]);
  });
});

describe("event participants", () => {
  test("are actors or objects with a role, one per event and participant", () => {
    const again = run(base, {
      type: "setParticipant",
      event: "death",
      who: { kind: "actor", id: "ada" },
      role: "found him",
    });
    expect(
      again.participants.filter((p) => p.who.id === "ada").map((p) => p.role),
    ).toEqual(["found him"]);
    expect(
      refusal(base, {
        type: "setParticipant",
        event: "death",
        who: { kind: "event", id: "bus" },
        role: "",
      }).message,
    ).toBe("a participant is an actor or an object");
    expect(
      refusal(base, {
        type: "removeParticipant",
        event: "bus",
        who: { kind: "actor", id: "lew" },
      }).kind,
    ).toBe("unknown_id");
  });

  test("go with their event or actor, and touches follows them", () => {
    expect(
      run(base, { type: "removeEvent", id: "death" }).participants,
    ).toEqual([]);
    expect(
      run(base, { type: "removeActor", id: "ada" }).participants.map(
        (p) => p.who.id,
      ),
    ).toEqual(["hook"]);
    const touched = whatThisTouches(base, {
      kind: "actor",
      id: "ada",
    })._unsafeUnwrap();
    expect(touched.direct.event.map((t) => t.how)).toEqual([
      ["an event it takes part in (did it)"],
    ]);
  });

  test("render names them after the event", () => {
    expect(renderStory(base)).toContain(
      "- **Dale dies** With Ada (did it), The sack hook (the weapon).\n",
    );
  });
});

describe("a drive's life", () => {
  test("turns are kept in order, and render and the file hold them", () => {
    expect(base.drives.find((d) => d.id === "truth-want")?.turns).toEqual([
      { how: "satisfied", at: "truth", note: "" },
      { how: "flipped", at: "bus", into: "bury", note: "to protect Ada" },
    ]);
    const text = renderStory(base);
    expect(text).toContain(
      '  Wants: Learn the truth.\n    Satisfied at Lew learns.\n    Flipped into Lew: "Bury it" at The morning bus: to protect Ada.\n',
    );
    expect(text).toContain(
      '  Wants: Bury it.\n    Flipped from Lew: "Learn the truth".\n',
    );
    const file = serializeStory(base);
    expect(serializeStory(parseStory(file)._unsafeUnwrap())).toBe(file);
    expect(serializeStory(newStory("P"))).not.toContain("turns");
  });

  test("refuse a turn into a drive for satisfied or renounced, or into itself", () => {
    expect(
      refusal(base, {
        type: "addDriveTurn",
        drive: "bury",
        how: "satisfied",
        into: "truth-want",
        note: "",
      }).kind,
    ).toBe("invalid_command");
    expect(
      refusal(base, {
        type: "addDriveTurn",
        drive: "bury",
        how: "replaced",
        into: "bury",
        note: "",
      }).kind,
    ).toBe("self_relation");
    expect(
      refusal(base, { type: "removeDriveTurn", drive: "bury", index: 0 })
        .message,
    ).toBe("drive bury has no turns");
  });

  test("removing a turn, its event or its drive keeps the rest", () => {
    const removed = run(base, {
      type: "removeDriveTurn",
      drive: "truth-want",
      index: 0,
    });
    expect(removed.drives.find((d) => d.id === "truth-want")?.turns).toEqual([
      { how: "flipped", at: "bus", into: "bury", note: "to protect Ada" },
    ]);
    const noBus = run(
      base,
      { type: "removeEvent", id: "bus" },
      { type: "removeDrive", id: "bury" },
    );
    expect(noBus.drives.find((d) => d.id === "truth-want")?.turns[1]).toEqual({
      how: "flipped",
      note: "to protect Ada",
    });
  });
});

describe("time finer than a year", () => {
  test("a day and a minute in it can be ordered, and render says them as dates", () => {
    const at = (event: string, start: number, end: number): StoryCommand => ({
      type: "setPosition",
      event,
      frame: "world",
      position: { start, end },
    });
    // 12 October 1954, and 21:00 that day, as `parseWhen` gives them.
    const day = { start: 1954.7780821917809, end: 1954.7808219178082 };
    const evening = { start: 1954.7804794520548, end: 1954.7804813546422 };
    const result = applyStoryCommand(
      run(base, at("death", day.start, day.end)),
      at("truth", evening.start, evening.end),
    )._unsafeUnwrap();
    const ordered = applyStoryCommand(result.story, {
      type: "constrain",
      id: "c",
      a: "death",
      relation: "before",
      b: "truth",
    })._unsafeUnwrap();
    expect(ordered.problems).toEqual([]);
    const text = renderStory(ordered.story);
    expect(text).toContain(
      "- **Dale dies** (12 October 1954) [before Lew learns]",
    );
    expect(text).toContain("- **Lew learns** (12 October 1954, 21:00)");
  });
});
