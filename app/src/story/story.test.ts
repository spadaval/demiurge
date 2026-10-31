import { describe, expect, test } from "bun:test";
import type { JsonValue } from "../storage/types";
import { applyTimelineCommand } from "../time/commands";
import { emptyTimeline, parseTimeline } from "../time/timeline";
import { newStory, parseStory, type Story, serializeStory } from "./story";

const parsed = (story: Story) => parseStory(serializeStory(story));

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
      ],
    },
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
      actors: ["orphan"],
      depicts: ["discovery"],
      pressures: ["belong"],
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
      id: "why-left",
      question: "Why did he leave?",
      about: [{ kind: "actor", id: "orphan" }],
      candidates: [
        { id: "adventure", answer: "He wanted adventure", touches: [] },
        {
          id: "cargo",
          answer: "The caravans carried something",
          touches: [
            { kind: "candidate", questionId: "who-did-it", id: "jovians" },
            { kind: "fact", id: "fusion" },
          ],
        },
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
      {
        event: "exile",
        frame: "world",
        start: 10,
        end: 11,
        precision: null,
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
    expect(story.openQuestions[0]?.answer).toBe("cargo");
    expect(story.openQuestions[0]?.candidates[1]?.touches).toContainEqual({
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
      ["facts", 0, "about", 0, "kind"],
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

  test("the order things were added and the order of keys don't matter", () => {
    const shuffled: Story = {
      timeline: {
        ...fullStory.timeline,
        events: [...fullStory.timeline.events].reverse(),
      },
      openQuestions: fullStory.openQuestions,
      scenes: fullStory.scenes,
      readerQuestions: [...fullStory.readerQuestions].reverse(),
      facts: fullStory.facts,
      drives: [...fullStory.drives].reverse(),
      actors: [...fullStory.actors].reverse(),
      premise: fullStory.premise,
      version: fullStory.version,
    };
    expect(serializeStory(shuffled)).toBe(serializeStory(fullStory));
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

  /** The lines of `after` that aren't in `before`, and the reverse. */
  function changedLines(before: string, after: string) {
    const a = before.split("\n");
    const b = after.split("\n");
    return {
      added: b.filter((line) => !a.includes(line)),
      removed: a.filter((line) => !b.includes(line)),
      lengthChange: b.length - a.length,
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
      added: ['      "want": "get away",'],
      removed: ['      "want": "get out",'],
      lengthChange: 0,
    });
  });

  test("a timeline edit that reorders records changes only that record's lines", () => {
    const first = applyTimelineCommand(
      fullStory.timeline,
      {
        type: "setPosition",
        event: "adoption",
        frame: "world",
        position: { start: 1, end: 2 },
      },
      [],
    )._unsafeUnwrap();
    // setPosition moves the record it touches to the end of the list.
    const second = applyTimelineCommand(
      first,
      {
        type: "setPosition",
        event: "adoption",
        frame: "world",
        position: { start: 3, end: 4 },
      },
      [],
    )._unsafeUnwrap();
    const exile = first.positions.find(({ event }) => event === "exile");
    const adoption = first.positions.find(({ event }) => event === "adoption");
    const reordered = {
      ...first,
      positions: [exile, adoption].filter((p) => p !== undefined),
    };
    expect(serializeStory({ ...fullStory, timeline: reordered })).toBe(
      serializeStory({ ...fullStory, timeline: first }),
    );
    const { added, removed } = changedLines(
      serializeStory({ ...fullStory, timeline: first }),
      serializeStory({ ...fullStory, timeline: second }),
    );
    expect(added.map((line) => line.trim())).toEqual([
      '"end": 4,',
      '"start": 3',
    ]);
    expect(removed.map((line) => line.trim())).toEqual([
      '"end": 2,',
      '"start": 1',
    ]);
  });

  test("adding a record adds only that record's lines", () => {
    const changed: Story = {
      ...fullStory,
      facts: [...fullStory.facts, { id: "zeta", text: "New.", about: [] }],
    };
    const { removed, lengthChange } = changedLines(
      serializeStory(fullStory),
      serializeStory(changed),
    );
    expect(lengthChange).toBeGreaterThan(0);
    expect(removed).toEqual([]);
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
