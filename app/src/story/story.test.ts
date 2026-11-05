import { describe, expect, test } from "bun:test";
import type { JsonValue } from "../storage/types";
import { applyTimelineCommand } from "../time/commands";
import { emptyTimeline, parseTimeline, type Timeline } from "../time/timeline";
import {
  newStory,
  parseStory,
  type Ref,
  type Story,
  serializeStory,
} from "./story";

const parsed = (story: Story) => parseStory(serializeStory(story));

const asserted = (start: number, end: number) => ({
  start,
  end,
  precision: null,
  authority: { level: "asserted" } as const,
});

const fullStory: Story = {
  ...newStory("An orphan leaves the tribe."),
  actors: [
    { id: "orphan", name: "The orphan", kind: "person", notes: "" },
    { id: "jovians", name: "The Jovians", kind: "organization", notes: "Why?" },
  ],
  drives: [
    {
      id: "belong",
      actorId: "orphan",
      want: "somewhere to belong",
      stakes: "",
      method: "",
      origins: ["exile", "adoption"],
      relations: [
        { to: "stay", type: "opposes" },
        { to: "leave", type: "competes" },
        { to: "leave", type: "allies" },
      ],
    },
    {
      id: "leave",
      actorId: null,
      want: "get out",
      stakes: "",
      method: "",
      origins: [],
      relations: [],
    },
  ],
  facts: [
    {
      id: "fusion",
      text: "A pilot can be fused into a Titan.",
      about: [
        { kind: "scene", id: "found" },
        { kind: "actor", id: "jovians" },
        { kind: "fact", id: "x" },
        { kind: "actor", id: "x" },
        { kind: "candidate", questionId: "q2", id: "x" },
        { kind: "candidate", questionId: "q1", id: "x" },
      ],
    },
    { id: "ansible", text: "Ansibles exist.", about: [] },
  ],
  readerQuestions: [
    {
      id: "alive",
      question: "Is she alive?",
      opensAt: "bar",
      answeredAt: "found",
    },
    { id: "who", question: "Who did it?" },
  ],
  scenes: [
    {
      id: "found",
      title: "Found",
      summary: "They find the Titan.",
      actors: ["orphan", "jovians"],
      depicts: ["exile", "adoption"],
      pressures: ["leave", "belong"],
    },
    {
      id: "bar",
      title: "The bar",
      summary: "",
      actors: [],
      depicts: [],
      pressures: [],
    },
  ],
  openQuestions: [
    {
      id: "zulu",
      question: "Who's next?",
      about: [],
      candidates: [],
      conflict: true,
    },
    {
      id: "why-left",
      question: "Why did he leave?",
      about: [
        { kind: "scene", id: "found" },
        { kind: "actor", id: "orphan" },
      ],
      candidates: [
        {
          id: "cargo",
          answer: "The caravans carried something",
          touches: [
            { kind: "candidate", questionId: "who-did-it", id: "jovians" },
            { kind: "fact", id: "fusion" },
          ],
        },
        { id: "adventure", answer: "He wanted adventure", touches: [] },
      ],
      answer: "cargo",
      conflict: false,
    },
  ],
  timeline: {
    ...emptyTimeline,
    events: [
      { id: "exile", label: "Exile", summary: "He is cast out." },
      { id: "adoption", label: "Adoption", summary: "" },
    ],
    positions: [
      { event: "exile", frame: "world", ...asserted(10, 11) },
      { event: "adoption", frame: "world", ...asserted(1, 2) },
      { event: "adoption", frame: "dream", ...asserted(5, 6) },
    ],
    constraints: [
      {
        id: "c2",
        a: "exile",
        relation: "after",
        b: "adoption",
        duration: null,
        authority: { level: "asserted" },
      },
      {
        id: "c1",
        a: "adoption",
        relation: "before",
        b: "exile",
        duration: { tolerance: 1, amount: 10, frame: "world" },
        authority: { level: "asserted" },
      },
    ],
    placements: [
      {
        scene: "found",
        constraints: [
          {
            relation: "after",
            event: "exile",
            duration: { amount: 2, frame: "world" },
          },
          { relation: "after", event: "exile", duration: null },
          { relation: "after", event: "adoption", duration: null },
        ],
        continues: true,
        authority: { level: "asserted" },
      },
      {
        scene: "bar",
        constraints: [],
        continues: false,
        authority: { level: "asserted" },
      },
    ],
    frames: [
      { id: "z", label: "Z", unit: "day", reference: "world", rate: 1 },
      {
        id: "dream",
        label: "Dream",
        unit: "day",
        reference: "world",
        rate: null,
      },
    ],
    correspondences: [
      {
        id: "k2",
        frame: "z",
        from: "exile",
        to: "adoption",
        rate: 0,
        authority: { level: "asserted" },
      },
      {
        id: "k1",
        frame: "dream",
        from: "adoption",
        to: "exile",
        rate: 2,
        authority: { level: "asserted" },
      },
    ],
    follows: [
      { entity: "orphan", frame: "z" },
      { entity: "jovians", frame: "dream" },
    ],
    reveals: [
      {
        id: "r2",
        scene: "found",
        entry: "orphan",
        fact: { kind: "field", name: "x" },
        since: null,
        authority: { level: "asserted" },
      },
      {
        id: "r1",
        scene: "bar",
        entry: "orphan",
        fact: { kind: "field", name: "y" },
        since: "exile",
        authority: { level: "asserted" },
      },
    ],
  },
};

describe("parseStory", () => {
  test("reads back everything a story holds", () => {
    const text = serializeStory(fullStory);
    const story = parseStory(text)._unsafeUnwrap();
    expect(story.actors.map(({ id }) => id)).toEqual(["jovians", "orphan"]);
    expect(story.scenes.map(({ id }) => id)).toEqual(["found", "bar"]);
    expect(story.drives[0]?.actorId).toBe("orphan");
    expect(story.drives[1]?.actorId).toBeNull();
    expect(story.readerQuestions[0]?.opensAt).toBe("bar");
    expect(
      story.openQuestions.find(({ id }) => id === "why-left")?.answer,
    ).toBe("cargo");
    expect(
      story.openQuestions
        .find(({ id }) => id === "why-left")
        ?.candidates.find(({ id }) => id === "cargo")?.touches,
    ).toContainEqual({
      kind: "candidate",
      questionId: "who-did-it",
      id: "jovians",
    });
    expect(story.timeline.events[0]?.id).toBe("adoption");
  });

  test.each<[string, (story: Story) => Story]>([
    ["a premise and nothing else", (story) => story],
    [
      "an actor with no drive",
      (story) => ({
        ...story,
        actors: [{ id: "a", name: "A", kind: "person", notes: "" }],
      }),
    ],
    [
      "a drive with no actor",
      (story) => ({
        ...story,
        drives: [
          {
            id: "d",
            actorId: null,
            want: "",
            stakes: "",
            method: "",
            origins: [],
            relations: [],
          },
        ],
      }),
    ],
    [
      "an event nothing refers to",
      (story) => ({
        ...story,
        timeline: {
          ...emptyTimeline,
          events: [{ id: "e", label: "E", summary: "" }],
        },
      }),
    ],
    [
      "a scene with no actors",
      (story) => ({
        ...story,
        scenes: [
          {
            id: "s",
            title: "",
            summary: "",
            actors: [],
            depicts: [],
            pressures: [],
          },
        ],
      }),
    ],
    [
      "a fact about nothing",
      (story) => ({ ...story, facts: [{ id: "f", text: "T", about: [] }] }),
    ],
    [
      "a reader question no scene opens",
      (story) => ({
        ...story,
        readerQuestions: [{ id: "r", question: "Q?" }],
      }),
    ],
    [
      "an open question with no candidates",
      (story) => ({
        ...story,
        openQuestions: [
          {
            id: "o",
            question: "Q?",
            about: [],
            candidates: [],
            conflict: false,
          },
        ],
      }),
    ],
    [
      "a reference to something that doesn't exist",
      (story) => ({
        ...story,
        facts: [{ id: "f", text: "T", about: [{ kind: "actor", id: "gone" }] }],
      }),
    ],
  ])("accepts %s", (_name, build) => {
    const story = build(newStory("A premise."));
    expect(parsed(story)._unsafeUnwrap()).toEqual(story);
  });

  test("rejects text that isn't JSON", () => {
    expect(parseStory("{ not json")._unsafeUnwrapErr().kind).toBe("not_json");
  });

  /** The story file as JSON, with the value at `path` replaced or removed. */
  function mangled(path: (string | number)[], value: JsonValue | undefined) {
    const root: JsonValue = JSON.parse(serializeStory(fullStory));
    let parent: JsonValue = root;
    for (const key of path.slice(0, -1)) {
      parent = (parent as { [key: string]: JsonValue })[key] as JsonValue;
    }
    const last = path[path.length - 1] as string;
    const record = parent as { [key: string]: JsonValue | undefined };
    record[last] = value;
    return JSON.stringify(root);
  }

  test.each<[string, (string | number)[], JsonValue | undefined, string]>([
    ["a wrong version", ["version"], 2, "version"],
    ["a missing premise", ["premise"], undefined, "premise"],
    ["a list that isn't one", ["actors"], {}, "actors must be a list"],
    ["a missing timeline", ["timeline"], undefined, "timeline"],
    [
      "a malformed timeline",
      ["timeline"],
      { version: 1, worldUnit: "year" },
      "timeline: events",
    ],
    ["an unknown actor kind", ["actors", 0, "kind"], "ghost", "actors[0].kind"],
    [
      "a drive with a numeric actor",
      ["drives", 0, "actorId"],
      3,
      "drives[0].actorId",
    ],
    [
      "an unknown relation type",
      ["drives", 0, "relations", 0, "type"],
      "loves",
      "relations[0].type",
    ],
    [
      "origins that aren't strings",
      ["drives", 0, "origins"],
      [1],
      "drives[0].origins",
    ],
    [
      "an unknown ref kind",
      ["facts", 1, "about", 0, "kind"],
      "vibe",
      "about[0].kind",
    ],
    [
      "a candidate ref with no question",
      ["openQuestions", 0, "candidates", 0, "touches"],
      [{ kind: "candidate", id: "x" }],
      "questionId",
    ],
    [
      "a null answer",
      ["openQuestions", 0, "answer"],
      null,
      "openQuestions[0].answer",
    ],
    [
      "a conflict that isn't a boolean",
      ["openQuestions", 0, "conflict"],
      "yes",
      "conflict",
    ],
    [
      "a null opensAt",
      ["readerQuestions", 0, "opensAt"],
      null,
      "readerQuestions[0].opensAt",
    ],
    [
      "duplicate actor IDs",
      ["actors", 1, "id"],
      "jovians",
      "actors has duplicate id",
    ],
    [
      "duplicate scene IDs",
      ["scenes", 1, "id"],
      "found",
      "scenes has duplicate id",
    ],
    ["an unknown top-level key", ["extra"], 1, "story.extra is not a known"],
    [
      "an unknown key on an actor",
      ["actors", 0, "extra"],
      1,
      "actors[0].extra is not a known",
    ],
    [
      "an unknown key on a drive relation",
      ["drives", 0, "relations", 0, "extra"],
      1,
      "relations[0].extra is not a known",
    ],
    [
      "an unknown key on a fact",
      ["facts", 0, "extra"],
      1,
      "facts[0].extra is not a known",
    ],
    [
      "an unknown key on a scene",
      ["scenes", 0, "extra"],
      1,
      "scenes[0].extra is not a known",
    ],
    [
      "a misspelled key on an event",
      ["timeline", "events", 0, "summry"],
      "lost",
      "timeline.events[0].summry is not a known",
    ],
    [
      "a misspelled optional key",
      ["readerQuestions", 0, "opensat"],
      "bar",
      "readerQuestions[0].opensat is not a known",
    ],
    [
      "an unknown key on a drive",
      ["drives", 0, "extra"],
      1,
      "drives[0].extra is not a known",
    ],
    [
      "an unknown key on an open question",
      ["openQuestions", 0, "extra"],
      1,
      "openQuestions[0].extra is not a known",
    ],
    [
      "an unknown key on a candidate",
      ["openQuestions", 0, "candidates", 0, "extra"],
      1,
      "candidates[0].extra is not a known",
    ],
    [
      "an unknown key on a ref",
      ["facts", 1, "about", 0, "extra"],
      1,
      "about[0].extra is not a known",
    ],
    [
      "duplicate timeline event IDs",
      ["timeline", "events", 1, "id"],
      "adoption",
      "timeline.events has duplicate",
    ],
    [
      "duplicate positions for an event and frame",
      ["timeline", "positions", 1, "frame"],
      "dream",
      "timeline.positions has duplicate",
    ],
    [
      "duplicate constraint IDs",
      ["timeline", "constraints", 1, "id"],
      "c1",
      "timeline.constraints has duplicate",
    ],
    [
      "duplicate placements of a scene",
      ["timeline", "placements", 1, "scene"],
      "bar",
      "timeline.placements has duplicate",
    ],
    [
      "duplicate frame IDs",
      ["timeline", "frames", 1, "id"],
      "dream",
      "timeline.frames has duplicate",
    ],
    [
      "duplicate correspondence IDs",
      ["timeline", "correspondences", 1, "id"],
      "k1",
      "timeline.correspondences has duplicate",
    ],
    [
      "duplicate followings of an entity",
      ["timeline", "follows", 1, "entity"],
      "jovians",
      "timeline.follows has duplicate",
    ],
    [
      "duplicate reveal IDs",
      ["timeline", "reveals", 1, "id"],
      "r1",
      "timeline.reveals has duplicate",
    ],
    [
      "duplicate candidate IDs",
      ["openQuestions", 0, "candidates", 1, "id"],
      "adventure",
      "candidates has duplicate id",
    ],
  ])("rejects %s", (_name, path, value, message) => {
    const error = parseStory(mangled(path, value))._unsafeUnwrapErr();
    expect(error.kind).toBe("invalid_story");
    expect(error.message).toContain(message);
  });

  test("a candidate ID can repeat across questions", () => {
    const candidate = { id: "c", answer: "A", touches: [] };
    const story: Story = {
      ...newStory("P"),
      openQuestions: [
        {
          id: "a",
          question: "A?",
          about: [],
          candidates: [candidate],
          conflict: false,
        },
        {
          id: "b",
          question: "B?",
          about: [],
          candidates: [candidate],
          conflict: false,
        },
      ],
    };
    expect(parsed(story).isOk()).toBe(true);
  });
});

describe("serializeStory", () => {
  test("parsing and writing leaves a file byte for byte the same", () => {
    const text = serializeStory(fullStory);
    expect(serializeStory(parseStory(text)._unsafeUnwrap())).toBe(text);
  });

  test("scenes keep their telling order, and other lists are sorted", () => {
    const value = JSON.parse(serializeStory(fullStory));
    expect(value.scenes.map((s: { id: string }) => s.id)).toEqual([
      "found",
      "bar",
    ]);
    expect(value.actors.map((a: { id: string }) => a.id)).toEqual([
      "jovians",
      "orphan",
    ]);
    expect(value.timeline.events.map((e: { id: string }) => e.id)).toEqual([
      "adoption",
      "exile",
    ]);
    expect(value.drives[0].origins).toEqual(["adoption", "exile"]);
  });

  /** Reverses every list but the telling order, and every object's keys. */
  function reversed(value: JsonValue, key?: string): JsonValue {
    if (Array.isArray(value)) {
      const items = value.map((item) => reversed(item));
      return key === "scenes" ? items : items.reverse();
    }
    if (typeof value !== "object" || value === null) return value;
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([k, v]) => [k, reversed(v, k)]),
    );
  }

  test("the order things were added and the order of keys don't matter", () => {
    const text = serializeStory(fullStory);
    const shuffled = JSON.stringify(reversed(JSON.parse(text)));
    expect(shuffled).not.toBe(JSON.stringify(JSON.parse(text)));
    expect(serializeStory(parseStory(shuffled)._unsafeUnwrap())).toBe(text);
  });

  test("sort keys don't collide across fields", () => {
    const touches = (questionId: string, id: string): Ref => ({
      kind: "candidate",
      questionId,
      id,
    });
    const refs = [touches("a\0b", "c"), touches("a", "b\0c")];
    const withTouches = (about: Ref[]): Story => ({
      ...newStory("P"),
      facts: [{ id: "f", text: "", about }],
    });
    expect(serializeStory(withTouches(refs))).toBe(
      serializeStory(withTouches([...refs].reverse())),
    );
  });

  test("the keys of a record read in a sensible order", () => {
    const value = JSON.parse(serializeStory(fullStory));
    expect(Object.keys(value)).toEqual([
      "version",
      "premise",
      "actors",
      "drives",
      "facts",
      "readerQuestions",
      "scenes",
      "openQuestions",
      "timeline",
    ]);
    expect(Object.keys(value.drives[0])).toEqual([
      "id",
      "actorId",
      "want",
      "stakes",
      "method",
      "origins",
      "relations",
    ]);
  });

  /** The lines between what two texts share at their start and end. */
  function changedLines(before: string, after: string) {
    const a = before.split("\n");
    const b = after.split("\n");
    let start = 0;
    while (start < a.length && a[start] === b[start]) start++;
    let end = 0;
    while (
      end < a.length - start &&
      end < b.length - start &&
      a[a.length - 1 - end] === b[b.length - 1 - end]
    ) {
      end++;
    }
    return {
      removed: a.slice(start, a.length - end).map((line) => line.trim()),
      added: b.slice(start, b.length - end).map((line) => line.trim()),
    };
  }

  test("changing one record changes only that record's lines", () => {
    const changed: Story = {
      ...fullStory,
      drives: fullStory.drives.map((drive) =>
        drive.id === "leave" ? { ...drive, want: "get away" } : drive,
      ),
    };
    expect(
      changedLines(serializeStory(fullStory), serializeStory(changed)),
    ).toEqual({
      removed: ['"want": "get out",'],
      added: ['"want": "get away",'],
    });
  });

  test("a timeline edit that moves a record changes only that record's lines", () => {
    const before: Timeline = {
      ...emptyTimeline,
      events: fullStory.timeline.events,
      positions: [
        { event: "exile", frame: "world", ...asserted(10, 11) },
        { event: "adoption", frame: "world", ...asserted(1, 2) },
      ],
    };
    const story = { ...fullStory, timeline: before };
    const after = applyTimelineCommand(
      before,
      {
        type: "setPosition",
        event: "exile",
        frame: "world",
        position: { start: 20, end: 21 },
      },
      [],
    )._unsafeUnwrap();
    // setPosition moves the record it touches, so this edit reorders the list.
    expect(after.positions.map(({ event }) => event)).not.toEqual(
      before.positions.map(({ event }) => event),
    );
    expect(
      changedLines(
        serializeStory(story),
        serializeStory({ ...story, timeline: after }),
      ),
    ).toEqual({
      removed: [
        '"end": 11,',
        '"event": "exile",',
        '"frame": "world",',
        '"precision": null,',
        '"start": 10',
      ],
      added: [
        '"end": 21,',
        '"event": "exile",',
        '"frame": "world",',
        '"precision": null,',
        '"start": 20',
      ],
    });
  });

  test("adding a record adds only that record's lines", () => {
    const changed: Story = {
      ...fullStory,
      facts: [...fullStory.facts, { id: "zeta", text: "New.", about: [] }],
    };
    const { removed, added } = changedLines(
      serializeStory(fullStory),
      serializeStory(changed),
    );
    expect(removed).toEqual([]);
    expect(added.some((line) => line.includes("zeta"))).toBe(true);
    expect(added).toHaveLength(5);
  });
});

describe("timeline events have summaries", () => {
  test("a timeline saved before summaries existed parses with an empty one", () => {
    const old = {
      ...emptyTimeline,
      events: [{ id: "e", label: "The coronation" }],
    };
    expect(parseTimeline(old)._unsafeUnwrap().events).toEqual([
      { id: "e", label: "The coronation", summary: "" },
    ]);
  });

  test("a summary is kept, and a malformed one is rejected", () => {
    const events = (summary: JsonValue) => ({
      ...emptyTimeline,
      events: [{ id: "e", label: "E", summary }],
    });
    const parse = (summary: JsonValue) => parseTimeline(events(summary));
    expect(parse("It happened.")._unsafeUnwrap().events[0]?.summary).toBe(
      "It happened.",
    );
    expect(parse(3)._unsafeUnwrapErr()).toContain("events[0].summary");
  });

  test("adding an event gives it an empty summary", () => {
    const timeline = applyTimelineCommand(
      emptyTimeline,
      { type: "addEvent", id: "e", label: "E" },
      [],
    )._unsafeUnwrap();
    expect(timeline.events).toEqual([{ id: "e", label: "E", summary: "" }]);
  });
});

describe("open questions can be marked as working", () => {
  const file = (working?: JsonValue) =>
    JSON.stringify({
      version: 1,
      premise: "P",
      actors: [],
      drives: [],
      facts: [],
      readerQuestions: [],
      scenes: [],
      openQuestions: [
        {
          id: "q",
          question: "Why?",
          about: [],
          candidates: [],
          conflict: false,
          ...(working === undefined ? {} : { working }),
        },
      ],
      timeline: emptyTimeline,
    });

  test("a file written before the mark existed parses, and writes back unchanged", () => {
    const old = file();
    const story = parseStory(old)._unsafeUnwrap();
    expect(story.openQuestions[0]?.working).toBeUndefined();
    expect(serializeStory(story)).not.toContain("working");
    expect(JSON.parse(serializeStory(story))).toEqual(JSON.parse(old));
  });

  test("the mark is kept, false is the same as no mark, and a malformed one is rejected", () => {
    expect(
      parseStory(file(true))._unsafeUnwrap().openQuestions[0]?.working,
    ).toBe(true);
    expect(
      serializeStory(parseStory(file(false))._unsafeUnwrap()),
    ).not.toContain("working");
    expect(parseStory(file("yes"))._unsafeUnwrapErr().message).toContain(
      "openQuestions[0].working",
    );
  });
});

describe("causes in the file", () => {
  const caused: Story = {
    ...fullStory,
    causes: [
      { cause: "exile", effect: "adoption" },
      { cause: "adoption", effect: "exile" },
    ],
  };

  test("a file written before causes existed reads and writes back the same", () => {
    const text = serializeStory(fullStory);
    expect(text).not.toContain("causes");
    expect(serializeStory(parseStory(text)._unsafeUnwrap())).toBe(text);
    expect(parseStory(text)._unsafeUnwrap().causes).toEqual([]);
  });

  test("are kept, sorted, before the timeline", () => {
    const text = serializeStory(caused);
    const story = parseStory(text)._unsafeUnwrap();
    expect(story.causes).toEqual([
      { cause: "adoption", effect: "exile" },
      { cause: "exile", effect: "adoption" },
    ]);
    expect(serializeStory(story)).toBe(text);
    expect(Object.keys(JSON.parse(text)).slice(-2)).toEqual([
      "causes",
      "timeline",
    ]);
  });

  test.each<[string, JsonValue, string]>([
    ["a list that isn't one", {}, "causes must be a list"],
    [
      "an unknown key",
      [{ cause: "a", effect: "b", because: "c" }],
      "causes[0].because is not a known field",
    ],
    ["a missing effect", [{ cause: "a" }], "causes[0].effect must be a string"],
    [
      "a repeated cause",
      [
        { cause: "a", effect: "b" },
        { cause: "a", effect: "b" },
      ],
      'causes has duplicate ["a","b"]',
    ],
  ])("rejects %s", (_name, causes, message) => {
    const text = JSON.stringify({
      ...JSON.parse(serializeStory(fullStory)),
      causes,
    });
    const error = parseStory(text)._unsafeUnwrapErr();
    expect(error.kind).toBe("invalid_story");
    expect(error.message).toContain(message);
  });

  test("a cause between events that don't exist still loads", () => {
    const text = serializeStory({
      ...fullStory,
      causes: [{ cause: "gone", effect: "gone" }],
    });
    expect(parseStory(text).isOk()).toBe(true);
  });
});
