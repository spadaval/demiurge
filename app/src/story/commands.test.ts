import { describe, expect, test } from "bun:test";
import {
  applyTimelineCommand,
  applyTimelineCommandKeepingProblems,
} from "../time/commands";
import { applyStoryCommand, type StoryCommand } from "./commands";
import {
  newStory,
  parseStory,
  type Ref,
  type Story,
  serializeStory,
} from "./story";

/** Applies each command in turn; a refusal fails the test. */
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
  position: { start, end: start + 1 },
});

/** A story with one of everything, every link set, built only by commands. */
const sketch = run(
  newStory("An orphan leaves the tribe."),
  {
    type: "addActor",
    id: "orphan",
    name: "The orphan",
    kind: "person",
    notes: "",
  },
  {
    type: "addActor",
    id: "jovians",
    name: "Jovians",
    kind: "organization",
    notes: "",
  },
  { type: "addEvent", id: "exile", label: "Exile", summary: "He is cast out." },
  { type: "addEvent", id: "war", label: "War", summary: "" },
  {
    type: "addDrive",
    id: "belong",
    actorId: "orphan",
    want: "somewhere to belong",
    stakes: "",
    method: "",
  },
  {
    type: "addDrive",
    id: "leave",
    actorId: "orphan",
    want: "get out",
    stakes: "",
    method: "",
  },
  { type: "setDriveOrigins", id: "belong", origins: ["exile"] },
  { type: "relateDrives", from: "belong", to: "leave", relation: "opposes" },
  { type: "addScene", id: "bar", title: "The bar", summary: "" },
  { type: "addScene", id: "found", title: "Found", summary: "" },
  { type: "setSceneActors", id: "found", actors: ["orphan", "jovians"] },
  { type: "setSceneEvents", id: "found", depicts: ["exile", "war"] },
  { type: "setScenePressures", id: "found", pressures: ["belong", "leave"] },
  { type: "addReaderQuestion", id: "alive", question: "Is she alive?" },
  {
    type: "setReaderQuestionScenes",
    id: "alive",
    opensAt: "bar",
    answeredAt: "found",
  },
  { type: "addFact", id: "fusion", text: "Pilots fuse.", about: [] },
  {
    type: "addOpenQuestion",
    id: "why",
    question: "Why did he leave?",
    about: [],
    conflict: false,
  },
  {
    type: "addCandidate",
    questionId: "why",
    id: "cargo",
    answer: "The caravans",
    touches: [],
  },
  {
    type: "addCandidate",
    questionId: "why",
    id: "bored",
    answer: "Adventure",
    touches: [],
  },
  {
    type: "setPosition",
    event: "war",
    frame: "world",
    position: { start: 1, end: 2 },
  },
  {
    type: "setPosition",
    event: "exile",
    frame: "world",
    position: { start: 5, end: 6 },
  },
  {
    type: "constrain",
    id: "war-exile",
    a: "war",
    relation: "before",
    b: "exile",
  },
);

/** A ref to each record in `sketch`. */
const everyRef: Ref[] = [
  { kind: "actor", id: "orphan" },
  { kind: "drive", id: "belong" },
  { kind: "fact", id: "fusion" },
  { kind: "readerQuestion", id: "alive" },
  { kind: "event", id: "exile" },
  { kind: "scene", id: "found" },
  { kind: "openQuestion", id: "why" },
  { kind: "candidate", questionId: "why", id: "cargo" },
];

/** `sketch`, with every ref list pointing at every record. */
const linked = run(
  sketch,
  { type: "addFact", id: "titans", text: "Titans exist.", about: everyRef },
  {
    type: "addOpenQuestion",
    id: "how",
    question: "How?",
    about: everyRef,
    conflict: true,
  },
  {
    type: "addCandidate",
    questionId: "how",
    id: "c",
    answer: "Somehow",
    touches: everyRef,
  },
);

/** Every ref list in the story, by where it is. */
function refLists(story: Story): Ref[][] {
  return [
    ...story.facts.map((fact) => fact.about),
    ...story.openQuestions.flatMap((q) => [
      q.about,
      ...q.candidates.map((c) => c.touches),
    ]),
  ];
}

describe("applyStoryCommand", () => {
  test("builds a story that holds what each command set", () => {
    expect(sketch.premise).toBe("An orphan leaves the tribe.");
    expect(sketch.actors.map(({ id }) => id)).toEqual(["orphan", "jovians"]);
    expect(sketch.drives.find(({ id }) => id === "belong")).toEqual({
      id: "belong",
      actorId: "orphan",
      want: "somewhere to belong",
      stakes: "",
      method: "",
      origins: ["exile"],
      relations: [{ to: "leave", type: "opposes" }],
    });
    expect(sketch.scenes.map(({ id }) => id)).toEqual(["bar", "found"]);
    expect(sketch.scenes[1]).toMatchObject({
      actors: ["orphan", "jovians"],
      depicts: ["exile", "war"],
      pressures: ["belong", "leave"],
    });
    expect(sketch.readerQuestions).toEqual([
      {
        id: "alive",
        question: "Is she alive?",
        opensAt: "bar",
        answeredAt: "found",
      },
    ]);
    expect(sketch.openQuestions[0]?.candidates.map(({ id }) => id)).toEqual([
      "cargo",
      "bored",
    ]);
    expect(sketch.timeline.events).toEqual([
      { id: "exile", label: "Exile", summary: "He is cast out." },
      { id: "war", label: "War", summary: "" },
    ]);
    expect(sketch.timeline.positions).toHaveLength(2);
    expect(sketch.timeline.constraints.map(({ id }) => id)).toEqual([
      "war-exile",
    ]);
    expect(linked.facts[1]?.about).toEqual(everyRef);
  });

  test("updates change only the fields given", () => {
    const story = run(
      sketch,
      { type: "setPremise", premise: "A girl is fused into a Titan." },
      { type: "updateActor", id: "jovians", notes: "Why?" },
      {
        type: "updateDrive",
        id: "leave",
        actorId: null,
        method: "steal a ship",
      },
      {
        type: "updateFact",
        id: "fusion",
        about: [{ kind: "actor", id: "jovians" }],
      },
      { type: "updateReaderQuestion", id: "alive", question: "Does she live?" },
      { type: "updateScene", id: "bar", summary: "Drinks." },
      { type: "updateOpenQuestion", id: "why", conflict: true },
      {
        type: "updateCandidate",
        questionId: "why",
        id: "bored",
        answer: "Boredom",
      },
      { type: "describeEvent", id: "war", summary: "The Jovian war." },
    );
    expect(story.premise).toBe("A girl is fused into a Titan.");
    expect(story.actors[1]).toEqual({
      id: "jovians",
      name: "Jovians",
      kind: "organization",
      notes: "Why?",
    });
    expect(story.drives[1]).toMatchObject({
      actorId: null,
      want: "get out",
      method: "steal a ship",
    });
    expect(story.facts[0]).toEqual({
      id: "fusion",
      text: "Pilots fuse.",
      about: [{ kind: "actor", id: "jovians" }],
    });
    expect(story.readerQuestions[0]).toMatchObject({
      question: "Does she live?",
      opensAt: "bar",
    });
    expect(story.scenes[0]).toMatchObject({
      title: "The bar",
      summary: "Drinks.",
    });
    expect(story.openQuestions[0]).toMatchObject({
      question: "Why did he leave?",
      conflict: true,
    });
    expect(story.openQuestions[0]?.candidates[1]).toEqual({
      id: "bored",
      answer: "Boredom",
      touches: [],
    });
    expect(story.timeline.events[1]).toEqual({
      id: "war",
      label: "War",
      summary: "The Jovian war.",
    });
  });

  test("moves a scene in the telling order", () => {
    const story = run(sketch, {
      type: "addScene",
      id: "end",
      title: "End",
      summary: "",
    });
    const order = (index: number) =>
      run(story, { type: "moveScene", id: "end", index }).scenes.map(
        ({ id }) => id,
      );
    expect(order(0)).toEqual(["end", "bar", "found"]);
    expect(order(1)).toEqual(["bar", "end", "found"]);
    expect(order(2)).toEqual(["bar", "found", "end"]);
    expect(
      refusal(story, { type: "moveScene", id: "end", index: 3 }).kind,
    ).toBe("invalid_command");
    expect(
      refusal(story, { type: "moveScene", id: "end", index: -1 }).kind,
    ).toBe("invalid_command");
  });

  test("clears where a reader question opens and is answered", () => {
    const story = run(sketch, {
      type: "setReaderQuestionScenes",
      id: "alive",
      opensAt: null,
      answeredAt: "bar",
    });
    expect(story.readerQuestions).toEqual([
      { id: "alive", question: "Is she alive?", answeredAt: "bar" },
    ]);
  });

  test("unrelates two drives whichever holds the relation", () => {
    for (const [a, b] of [
      ["belong", "leave"],
      ["leave", "belong"],
    ] as const) {
      const story = run(sketch, { type: "unrelateDrives", a, b });
      expect(story.drives.flatMap(({ relations }) => relations)).toEqual([]);
    }
    const story = run(sketch, {
      type: "unrelateDrives",
      a: "belong",
      b: "leave",
    });
    expect(
      refusal(story, { type: "unrelateDrives", a: "belong", b: "leave" }).kind,
    ).toBe("invalid_command");
  });

  test("two drives of one actor can oppose or compete", () => {
    for (const relation of ["opposes", "competes"] as const) {
      const story = run(
        sketch,
        {
          type: "addDrive",
          id: "stay",
          actorId: "orphan",
          want: "stay",
          stakes: "",
          method: "",
        },
        { type: "relateDrives", from: "stay", to: "belong", relation },
      );
      const stay = story.drives.find(({ id }) => id === "stay");
      expect(stay?.actorId).toBe("orphan");
      expect(stay?.relations).toEqual([{ to: "belong", type: relation }]);
      // The sketch's two drives of the orphan already oppose each other.
      expect(story.drives.find(({ id }) => id === "belong")?.actorId).toBe(
        "orphan",
      );
    }
  });

  test("never changes the story it is given", () => {
    const before = serializeStory(linked);
    run(
      linked,
      { type: "removeActor", id: "orphan" },
      { type: "removeEvent", id: "exile" },
      { type: "moveScene", id: "found", index: 0 },
      { type: "answerOpenQuestion", id: "why", candidateId: "cargo" },
    );
    expect(serializeStory(linked)).toBe(before);
  });
});

describe("applyStoryCommand refuses", () => {
  const unknownTargets: StoryCommand[] = [
    { type: "updateActor", id: "x", name: "" },
    { type: "removeActor", id: "x" },
    { type: "updateDrive", id: "x", want: "" },
    { type: "removeDrive", id: "x" },
    { type: "setDriveOrigins", id: "x", origins: [] },
    { type: "relateDrives", from: "x", to: "belong", relation: "allies" },
    { type: "relateDrives", from: "belong", to: "x", relation: "allies" },
    { type: "unrelateDrives", a: "belong", b: "x" },
    { type: "updateFact", id: "x", text: "" },
    { type: "removeFact", id: "x" },
    { type: "updateReaderQuestion", id: "x", question: "" },
    { type: "removeReaderQuestion", id: "x" },
    {
      type: "setReaderQuestionScenes",
      id: "x",
      opensAt: null,
      answeredAt: null,
    },
    { type: "updateScene", id: "x", title: "" },
    { type: "removeScene", id: "x" },
    { type: "moveScene", id: "x", index: 0 },
    { type: "setSceneActors", id: "x", actors: [] },
    { type: "setSceneEvents", id: "x", depicts: [] },
    { type: "setScenePressures", id: "x", pressures: [] },
    { type: "updateOpenQuestion", id: "x", question: "" },
    { type: "removeOpenQuestion", id: "x" },
    { type: "addCandidate", questionId: "x", id: "c", answer: "", touches: [] },
    { type: "updateCandidate", questionId: "why", id: "x", answer: "" },
    { type: "updateCandidate", questionId: "x", id: "cargo", answer: "" },
    { type: "removeCandidate", questionId: "why", id: "x" },
    { type: "answerOpenQuestion", id: "x", candidateId: "cargo" },
    { type: "answerOpenQuestion", id: "why", candidateId: "x" },
    { type: "unanswerOpenQuestion", id: "x" },
    { type: "setOpenQuestionWorking", id: "x", working: true },
    { type: "describeEvent", id: "x", label: "" },
    { type: "removeEvent", id: "x" },
    position("x", 0),
    { type: "removeConstraint", id: "x" },
  ];

  test.each(
    unknownTargets.map((command) => [command.type, command] as const),
  )("%s with an unknown target", (type, command) => {
    expect(refusal(sketch, command)).toMatchObject({
      kind: "unknown_id",
      command: type,
    });
  });

  const unknownRef: Ref = { kind: "scene", id: "x" };
  const unknownLinks: StoryCommand[] = [
    {
      type: "addDrive",
      id: "d",
      actorId: "x",
      want: "",
      stakes: "",
      method: "",
    },
    { type: "updateDrive", id: "leave", actorId: "x" },
    { type: "setDriveOrigins", id: "belong", origins: ["exile", "x"] },
    { type: "addFact", id: "f", text: "", about: [unknownRef] },
    { type: "updateFact", id: "fusion", about: [unknownRef] },
    {
      type: "setReaderQuestionScenes",
      id: "alive",
      opensAt: "x",
      answeredAt: null,
    },
    {
      type: "setReaderQuestionScenes",
      id: "alive",
      opensAt: null,
      answeredAt: "x",
    },
    { type: "setSceneActors", id: "bar", actors: ["x"] },
    { type: "setSceneEvents", id: "bar", depicts: ["x"] },
    { type: "setScenePressures", id: "bar", pressures: ["x"] },
    {
      type: "addOpenQuestion",
      id: "q",
      question: "",
      about: [unknownRef],
      conflict: false,
    },
    { type: "updateOpenQuestion", id: "why", about: [unknownRef] },
    {
      type: "addCandidate",
      questionId: "why",
      id: "c",
      answer: "",
      touches: [unknownRef],
    },
    {
      type: "updateCandidate",
      questionId: "why",
      id: "cargo",
      touches: [unknownRef],
    },
    { type: "constrain", id: "k", a: "war", relation: "before", b: "x" },
  ];

  test.each(
    unknownLinks.map((command) => [command.type, command] as const),
  )("%s with a link to an unknown ID", (type, command) => {
    expect(refusal(sketch, command)).toMatchObject({
      kind: "unknown_id",
      command: type,
    });
  });

  test.each([
    { kind: "actor", id: "x" },
    { kind: "drive", id: "x" },
    { kind: "fact", id: "x" },
    { kind: "readerQuestion", id: "x" },
    { kind: "event", id: "x" },
    { kind: "scene", id: "x" },
    { kind: "openQuestion", id: "x" },
    { kind: "candidate", questionId: "why", id: "x" },
    { kind: "candidate", questionId: "x", id: "cargo" },
  ] satisfies Ref[])("a ref to an unknown %o", (ref) => {
    expect(
      refusal(sketch, { type: "addFact", id: "f", text: "", about: [ref] })
        .kind,
    ).toBe("unknown_id");
  });

  test("a link to a record works once the record is added", () => {
    const story = run(
      sketch,
      {
        type: "addActor",
        id: "girl",
        name: "The girl",
        kind: "person",
        notes: "",
      },
      { type: "setSceneActors", id: "bar", actors: ["girl"] },
    );
    expect(story.scenes[0]?.actors).toEqual(["girl"]);
  });

  const duplicates: StoryCommand[] = [
    { type: "addActor", id: "orphan", name: "", kind: "person", notes: "" },
    {
      type: "addDrive",
      id: "belong",
      actorId: null,
      want: "",
      stakes: "",
      method: "",
    },
    { type: "addFact", id: "fusion", text: "", about: [] },
    { type: "addReaderQuestion", id: "alive", question: "" },
    { type: "addScene", id: "bar", title: "", summary: "" },
    {
      type: "addOpenQuestion",
      id: "why",
      question: "",
      about: [],
      conflict: false,
    },
    {
      type: "addCandidate",
      questionId: "why",
      id: "cargo",
      answer: "",
      touches: [],
    },
    { type: "addEvent", id: "war", label: "", summary: "" },
    {
      type: "constrain",
      id: "war-exile",
      a: "exile",
      relation: "after",
      b: "war",
    },
  ];

  test.each(
    duplicates.map((command) => [command.type, command] as const),
  )("%s with a duplicate ID", (type, command) => {
    expect(refusal(sketch, command)).toMatchObject({
      kind: "duplicate_id",
      command: type,
    });
  });

  test.each(
    duplicates.map(
      (command) => [command.type, { ...command, id: " " }] as const,
    ),
  )("%s with a blank ID", (type, command) => {
    expect(refusal(sketch, command)).toMatchObject({
      kind: "invalid_command",
      command: type,
    });
  });

  test("a candidate ID used in another question is not a duplicate", () => {
    const story = run(
      sketch,
      {
        type: "addOpenQuestion",
        id: "who",
        question: "",
        about: [],
        conflict: false,
      },
      {
        type: "addCandidate",
        questionId: "who",
        id: "cargo",
        answer: "",
        touches: [],
      },
    );
    expect(story.openQuestions[1]?.candidates.map(({ id }) => id)).toEqual([
      "cargo",
    ]);
  });

  test("a drive related to itself", () => {
    expect(
      refusal(sketch, {
        type: "relateDrives",
        from: "belong",
        to: "belong",
        relation: "opposes",
      }).kind,
    ).toBe("self_relation");
  });

  test("a relation that already exists, in either direction", () => {
    for (const [from, to] of [
      ["belong", "leave"],
      ["leave", "belong"],
    ] as const) {
      expect(
        refusal(sketch, { type: "relateDrives", from, to, relation: "allies" })
          .kind,
      ).toBe("relation_exists");
    }
  });

  test("a malformed timeline command", () => {
    expect(
      refusal(sketch, {
        type: "setPosition",
        event: "war",
        frame: "ship",
        position: { start: 0, end: 1 },
      }),
    ).toMatchObject({ kind: "invalid_command", command: "setPosition" });
    expect(
      refusal(sketch, {
        type: "setPosition",
        event: "war",
        frame: "world",
        position: { start: 2, end: 1 },
      }).kind,
    ).toBe("invalid_command");
    expect(
      refusal(sketch, {
        type: "addEvent",
        id: "scene:bar",
        label: "",
        summary: "",
      }).kind,
    ).toBe("invalid_command");
  });
});

describe("removing a record", () => {
  /** Whether any ref list or link in `story` still names `id`. */
  const refsTo = (story: Story, matches: (ref: Ref) => boolean) =>
    refLists(story).flatMap((refs) => refs.filter(matches));

  test("an actor: drives keep going with no actor", () => {
    const story = run(linked, { type: "removeActor", id: "orphan" });
    expect(story.actors.map(({ id }) => id)).toEqual(["jovians"]);
    expect(story.drives.map(({ id, actorId }) => [id, actorId])).toEqual([
      ["belong", null],
      ["leave", null],
    ]);
    expect(story.scenes[1]?.actors).toEqual(["jovians"]);
    expect(refsTo(story, (ref) => ref.kind === "actor")).toEqual([]);
  });

  test("a drive", () => {
    const story = run(linked, { type: "removeDrive", id: "leave" });
    expect(story.drives.map(({ id }) => id)).toEqual(["belong"]);
    expect(story.drives[0]?.relations).toEqual([]);
    expect(story.scenes[1]?.pressures).toEqual(["belong"]);
    const without = run(linked, { type: "removeDrive", id: "belong" });
    expect(without.scenes[1]?.pressures).toEqual(["leave"]);
    expect(refsTo(without, (ref) => ref.kind === "drive")).toEqual([]);
  });

  test("a fact", () => {
    const story = run(linked, { type: "removeFact", id: "fusion" });
    expect(story.facts.map(({ id }) => id)).toEqual(["titans"]);
    expect(refsTo(story, (ref) => ref.kind === "fact")).toEqual([]);
  });

  test("a reader question", () => {
    const story = run(linked, { type: "removeReaderQuestion", id: "alive" });
    expect(story.readerQuestions).toEqual([]);
    expect(refsTo(story, (ref) => ref.kind === "readerQuestion")).toEqual([]);
  });

  test("a scene", () => {
    const story = run(linked, { type: "removeScene", id: "found" });
    expect(story.scenes.map(({ id }) => id)).toEqual(["bar"]);
    expect(story.readerQuestions).toEqual([
      { id: "alive", question: "Is she alive?", opensAt: "bar" },
    ]);
    expect(refsTo(story, (ref) => ref.kind === "scene")).toEqual([]);
    const opening = run(linked, { type: "removeScene", id: "bar" });
    expect(opening.readerQuestions).toEqual([
      { id: "alive", question: "Is she alive?", answeredAt: "found" },
    ]);
  });

  test("an open question, and refs to its candidates", () => {
    const story = run(linked, { type: "removeOpenQuestion", id: "why" });
    expect(story.openQuestions.map(({ id }) => id)).toEqual(["how"]);
    expect(
      refsTo(
        story,
        (ref) => ref.kind === "openQuestion" || ref.kind === "candidate",
      ),
    ).toEqual([]);
  });

  test("a candidate, clearing the answer if it was chosen", () => {
    const answered = run(linked, {
      type: "answerOpenQuestion",
      id: "why",
      candidateId: "cargo",
    });
    const story = run(answered, {
      type: "removeCandidate",
      questionId: "why",
      id: "cargo",
    });
    expect(story.openQuestions[0]?.candidates.map(({ id }) => id)).toEqual([
      "bored",
    ]);
    expect(story.openQuestions[0]?.answer).toBeUndefined();
    expect(refsTo(story, (ref) => ref.kind === "candidate")).toEqual([]);

    const other = run(answered, {
      type: "removeCandidate",
      questionId: "why",
      id: "bored",
    });
    expect(other.openQuestions[0]?.answer).toBe("cargo");
  });

  test("an event, with its positions and constraints", () => {
    const story = run(linked, { type: "removeEvent", id: "exile" });
    expect(story.timeline.events.map(({ id }) => id)).toEqual(["war"]);
    expect(story.timeline.positions.map(({ event }) => event)).toEqual(["war"]);
    expect(story.timeline.constraints).toEqual([]);
    expect(story.drives[0]?.origins).toEqual([]);
    expect(story.scenes[1]?.depicts).toEqual(["war"]);
    expect(refsTo(story, (ref) => ref.kind === "event")).toEqual([]);
  });

  test("leaves refs to other records alone", () => {
    const story = run(linked, { type: "removeFact", id: "fusion" });
    const how = story.openQuestions.find(({ id }) => id === "how");
    const rest = everyRef.filter((ref) => ref.kind !== "fact");
    expect(story.facts.find(({ id }) => id === "titans")?.about).toEqual(rest);
    expect(how?.about).toEqual(rest);
    expect(how?.candidates[0]?.touches).toEqual(rest);
  });
});

describe("timeline commands keep contradictions", () => {
  // `sketch` has war before exile, with war at 1 and exile at 5.
  test("moving an event against a before constraint is kept, with the problem", () => {
    const change = applyStoryCommand(
      sketch,
      position("war", 10),
    )._unsafeUnwrap();
    expect(change.story.timeline.positions).toContainEqual(
      expect.objectContaining({ event: "war", start: 10, end: 11 }),
    );
    expect(change.problems).toHaveLength(1);
    expect(change.problems[0]).toMatchObject({ kind: "contradiction" });
    expect(change.problems[0]?.message).toContain("war");

    // The same move is refused by the app's command.
    const refused = applyTimelineCommand(
      sketch.timeline,
      {
        type: "setPosition",
        event: "war",
        frame: "world",
        position: { start: 10, end: 11 },
      },
      [],
    );
    expect(refused._unsafeUnwrapErr().kind).toBe("contradiction");
  });

  test("a problem is reported by the command that added it, not later ones", () => {
    const contradicted = applyStoryCommand(
      sketch,
      position("war", 10),
    )._unsafeUnwrap().story;
    const change = applyStoryCommand(contradicted, {
      type: "addEvent",
      id: "birth",
      label: "Birth",
      summary: "",
    })._unsafeUnwrap();
    expect(change.problems).toEqual([]);
    const repaired = applyStoryCommand(
      contradicted,
      position("war", 1),
    )._unsafeUnwrap();
    expect(repaired.problems).toEqual([]);
  });

  test("other commands add no problems", () => {
    const change = applyStoryCommand(sketch, {
      type: "setPremise",
      premise: "",
    })._unsafeUnwrap();
    expect(change.problems).toEqual([]);
  });

  test("constrain and removeConstraint", () => {
    const change = applyStoryCommand(sketch, {
      type: "constrain",
      id: "exile-war",
      a: "exile",
      relation: "before",
      b: "war",
    })._unsafeUnwrap();
    expect(change.story.timeline.constraints.map(({ id }) => id)).toEqual([
      "war-exile",
      "exile-war",
    ]);
    expect(change.problems.map(({ kind }) => kind)).toContain("contradiction");
    const removed = run(change.story, {
      type: "removeConstraint",
      id: "war-exile",
    });
    expect(removed.timeline.constraints.map(({ id }) => id)).toEqual([
      "exile-war",
    ]);
  });

  test("applyTimelineCommandKeepingProblems refuses only a malformed command", () => {
    const kept = applyTimelineCommandKeepingProblems(
      sketch.timeline,
      { type: "constrain", id: "k", a: "exile", relation: "before", b: "war" },
      [],
    )._unsafeUnwrap();
    expect(kept.timeline.constraints).toHaveLength(2);
    expect(kept.problems.length).toBeGreaterThan(0);
    const refused = applyTimelineCommandKeepingProblems(
      sketch.timeline,
      {
        type: "constrain",
        id: "k",
        a: "exile",
        relation: "before",
        b: "nowhere",
      },
      [],
    );
    expect(refused._unsafeUnwrapErr().kind).toBe("invalid_command");
  });
});

describe("answering an open question", () => {
  test("records the chosen candidate and nothing else", () => {
    const answered = run(linked, {
      type: "answerOpenQuestion",
      id: "why",
      candidateId: "cargo",
    });
    expect(answered.openQuestions[0]?.answer).toBe("cargo");
    const { openQuestions, ...rest } = answered;
    const { openQuestions: before, ...restBefore } = linked;
    expect(rest).toEqual(restBefore);
    expect(openQuestions.map(({ answer: _, ...q }) => q)).toEqual(before);
  });

  test("can be changed and undone", () => {
    const answered = run(
      linked,
      { type: "answerOpenQuestion", id: "why", candidateId: "cargo" },
      { type: "answerOpenQuestion", id: "why", candidateId: "bored" },
    );
    expect(answered.openQuestions[0]?.answer).toBe("bored");
    const undone = run(answered, { type: "unanswerOpenQuestion", id: "why" });
    const { superseded, ...question } = undone.openQuestions[0] ?? {};
    expect(superseded).toEqual([
      { candidate: "cargo", answer: "The caravans", by: "bored" },
      { candidate: "bored", answer: "Adventure" },
    ]);
    expect(question).toEqual(linked.openQuestions[0] ?? {});
    expect(undone.openQuestions.slice(1)).toEqual(
      linked.openQuestions.slice(1),
    );
  });

  test("the answer's implications are the agent's own commands", () => {
    const story = run(
      linked,
      { type: "answerOpenQuestion", id: "why", candidateId: "cargo" },
      {
        type: "addEvent",
        id: "discovery",
        label: "He finds the cargo",
        summary: "",
      },
      { type: "setDriveOrigins", id: "leave", origins: ["discovery"] },
    );
    expect(story.drives[1]?.origins).toEqual(["discovery"]);
    expect(story.openQuestions[0]?.answer).toBe("cargo");
  });
});

describe("marking an open question as working", () => {
  const why = (story: Story) => story.openQuestions.find((q) => q.id === "why");

  test("sets the mark, changes nothing else, and clears it again", () => {
    const working = run(linked, {
      type: "setOpenQuestionWorking",
      id: "why",
      working: true,
    });
    expect(why(working)?.working).toBe(true);
    const { working: _, ...question } = why(working) ?? {};
    expect(question).toEqual(why(linked) ?? {});
    const parsed = parseStory(serializeStory(working))._unsafeUnwrap();
    expect(why(parsed)?.working).toBe(true);

    const cleared = run(working, {
      type: "setOpenQuestionWorking",
      id: "why",
      working: false,
    });
    expect(serializeStory(cleared)).toBe(serializeStory(linked));
    expect(serializeStory(cleared)).not.toContain("working");
  });

  test("answering clears the mark", () => {
    const answered = run(
      linked,
      { type: "setOpenQuestionWorking", id: "why", working: true },
      { type: "answerOpenQuestion", id: "why", candidateId: "cargo" },
    );
    expect(why(answered)?.answer).toBe("cargo");
    expect(why(answered)?.working).toBeUndefined();
  });

  test("is refused for an answered question", () => {
    const answered = run(linked, {
      type: "answerOpenQuestion",
      id: "why",
      candidateId: "cargo",
    });
    for (const working of [true, false]) {
      expect(
        refusal(answered, {
          type: "setOpenQuestionWorking",
          id: "why",
          working,
        }),
      ).toMatchObject({
        kind: "invalid_command",
        command: "setOpenQuestionWorking",
      });
    }
  });
});

describe("causes between events", () => {
  const cause = (from: string, to: string): StoryCommand => ({
    type: "addCause",
    cause: from,
    effect: to,
  });

  test("records and removes a cause", () => {
    const story = run(linked, cause("war", "exile"));
    expect(story.causes).toEqual([{ cause: "war", effect: "exile" }]);
    const parsed = parseStory(serializeStory(story))._unsafeUnwrap();
    expect(parsed.causes).toEqual(story.causes);
    const removed = run(story, {
      type: "removeCause",
      cause: "war",
      effect: "exile",
    });
    expect(serializeStory(removed)).toBe(serializeStory(linked));
    expect(serializeStory(removed)).not.toContain("causes");
  });

  test("refuses unknown events, a self-cause and a duplicate", () => {
    expect(refusal(linked, cause("war", "nope"))).toMatchObject({
      kind: "unknown_id",
      command: "addCause",
    });
    expect(refusal(linked, cause("nope", "war")).kind).toBe("unknown_id");
    expect(refusal(linked, cause("war", "war")).kind).toBe("self_relation");
    const once = run(linked, cause("war", "exile"));
    expect(refusal(once, cause("war", "exile")).kind).toBe("relation_exists");
    expect(
      refusal(linked, { type: "removeCause", cause: "war", effect: "exile" })
        .kind,
    ).toBe("invalid_command");
  });

  test("keeps a cycle of causes", () => {
    const story = run(linked, cause("war", "exile"), cause("exile", "war"));
    expect(story.causes).toHaveLength(2);
  });

  test("removing an event removes its causes", () => {
    const story = run(linked, cause("war", "exile"), {
      type: "removeEvent",
      id: "war",
    });
    expect(story.causes).toEqual([]);
  });
});

describe("answers keep their history", () => {
  const why = (story: Story) => story.openQuestions.find((q) => q.id === "why");
  const answer = (candidateId: string): StoryCommand => ({
    type: "answerOpenQuestion",
    id: "why",
    candidateId,
  });

  test("changing the answer keeps the old one, with what replaced it", () => {
    const reworked = run(linked, answer("cargo"), answer("bored"));
    expect(why(reworked)?.answer).toBe("bored");
    expect(why(reworked)?.superseded).toEqual([
      { candidate: "cargo", answer: "The caravans", by: "bored" },
    ]);
    const parsed = parseStory(serializeStory(reworked))._unsafeUnwrap();
    expect(why(parsed)?.superseded).toEqual(why(reworked)?.superseded);
  });

  test("unanswering keeps it, with nothing in its place", () => {
    const undone = run(linked, answer("cargo"), {
      type: "unanswerOpenQuestion",
      id: "why",
    });
    expect(why(undone)?.answer).toBeUndefined();
    expect(why(undone)?.superseded).toEqual([
      { candidate: "cargo", answer: "The caravans" },
    ]);
  });

  test("keeps the text it had, after the candidate changes or goes", () => {
    const story = run(
      linked,
      answer("cargo"),
      answer("bored"),
      { type: "updateCandidate", questionId: "why", id: "cargo", answer: "X" },
      { type: "removeCandidate", questionId: "why", id: "bored" },
    );
    expect(why(story)?.answer).toBeUndefined();
    expect(why(story)?.superseded).toEqual([
      { candidate: "cargo", answer: "The caravans", by: "bored" },
      { candidate: "bored", answer: "Adventure" },
    ]);
  });

  test("choosing the same answer again, or answering an open question, adds nothing", () => {
    const story = run(linked, answer("cargo"), answer("cargo"));
    expect(why(story)?.superseded).toBeUndefined();
    expect(
      why(run(linked, { type: "unanswerOpenQuestion", id: "why" }))?.superseded,
    ).toBeUndefined();
  });

  test("history is in the order it happened", () => {
    const story = run(
      linked,
      answer("cargo"),
      answer("bored"),
      answer("cargo"),
    );
    const expected = [
      { candidate: "cargo", answer: "The caravans", by: "bored" },
      { candidate: "bored", answer: "Adventure", by: "cargo" },
    ];
    expect(why(story)?.superseded).toEqual(expected);
    const parsed = parseStory(serializeStory(story))._unsafeUnwrap();
    expect(why(parsed)?.superseded).toEqual(expected);
  });
});

describe("deliberate gaps", () => {
  const velan: Ref = { kind: "drive", id: "leave" };
  const mark: StoryCommand = {
    type: "markGapDeliberate",
    gap: "drive_without_origin",
    ref: velan,
    reason: "From temperament, not an event",
  };

  test("are kept in the file, and a second mark replaces the reason", () => {
    const marked = run(linked, mark);
    expect(marked.deliberateGaps).toEqual([
      {
        gap: "drive_without_origin",
        ref: velan,
        reason: "From temperament, not an event",
      },
    ]);
    const parsed = parseStory(serializeStory(marked))._unsafeUnwrap();
    expect(parsed.deliberateGaps).toEqual(marked.deliberateGaps);
    const again = run(marked, { ...mark, reason: "Stubborn" });
    expect(again.deliberateGaps.map((m) => m.reason)).toEqual(["Stubborn"]);
  });

  test("unmarking removes the mark, and the file is as before", () => {
    const unmarked = run(linked, mark, {
      type: "unmarkGapDeliberate",
      gap: "drive_without_origin",
      ref: velan,
    });
    expect(serializeStory(unmarked)).toBe(serializeStory(linked));
    expect(serializeStory(unmarked)).not.toContain("deliberateGaps");
  });

  test("a story-wide gap is marked with no record", () => {
    const marked = run(linked, {
      type: "markGapDeliberate",
      gap: "no_reader_question",
      ref: null,
      reason: "A story with no mystery",
    });
    expect(marked.deliberateGaps[0]?.ref).toBeNull();
  });

  test("refuses a missing record, the wrong kind, a blank reason and an absent mark", () => {
    expect(
      refusal(linked, { ...mark, ref: { kind: "drive", id: "nope" } }).kind,
    ).toBe("unknown_id");
    expect(
      refusal(linked, { ...mark, ref: { kind: "scene", id: "found" } }),
    ).toMatchObject({
      kind: "invalid_command",
      message: "drive_without_origin is about a drive",
    });
    expect(refusal(linked, { ...mark, ref: null }).kind).toBe(
      "invalid_command",
    );
    expect(
      refusal(linked, {
        type: "markGapDeliberate",
        gap: "no_reader_question",
        ref: velan,
        reason: "x",
      }).kind,
    ).toBe("invalid_command");
    expect(refusal(linked, { ...mark, reason: "  " }).message).toBe(
      "a deliberate gap needs a reason",
    );
    expect(
      refusal(linked, {
        type: "unmarkGapDeliberate",
        gap: "drive_without_origin",
        ref: velan,
      }).kind,
    ).toBe("invalid_command");
  });

  test("removing the record removes its marks", () => {
    const story = run(linked, mark, { type: "removeDrive", id: "leave" });
    expect(story.deliberateGaps).toEqual([]);
  });
});
