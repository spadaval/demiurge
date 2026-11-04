import { describe, expect, test } from "bun:test";
import { applyStoryCommand, type StoryCommand } from "./commands";
import { newStory, type Ref, type Story } from "./story";
import { type Touches, type TouchGroups, whatThisTouches } from "./touches";

function run(story: Story, ...commands: StoryCommand[]): Story {
  return commands.reduce(
    (current, command) =>
      applyStoryCommand(current, command)._unsafeUnwrap().story,
    story,
  );
}

const touches = (story: Story, ref: Ref): Touches =>
  whatThisTouches(story, ref)._unsafeUnwrap();

/** Each group as its IDs (`question/id` for candidates), dropping empty ones. */
function ids(groups: TouchGroups): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(groups)
      .filter(([, list]) => list.length > 0)
      .map(([kind, list]) => [
        kind,
        list.map(({ ref }) =>
          ref.kind === "candidate" ? `${ref.questionId}/${ref.id}` : ref.id,
        ),
      ]),
  );
}

const scene = (id: string, title: string): StoryCommand => ({
  type: "addScene",
  id,
  title,
  summary: "",
});

/**
 * The paper walkthrough on the demo world (worldcrafter-o8b7, Background):
 * Ardelia wants the Salt Gate shut, from the seal, and that drive is under
 * pressure in 4.2 and 5.1. Scene 2.1 shows her with no drive under pressure,
 * and 3.2 depicts the seal. She also wants it open, from the drowning of the
 * archive, which opposes the first.
 */
const ninefold = run(
  newStory(
    "A keeper of the tide tables sealed the sea gate and stopped aging.",
  ),
  {
    type: "addActor",
    id: "ardelia",
    name: "Ardelia",
    kind: "person",
    notes: "",
  },
  {
    type: "addActor",
    id: "aldric",
    name: "Aldric II",
    kind: "person",
    notes: "",
  },
  { type: "addActor", id: "kesh", name: "Kesh", kind: "person", notes: "" },
  {
    type: "addEvent",
    id: "seal",
    label: "The Salt Gate is sealed",
    summary: "",
  },
  {
    type: "addEvent",
    id: "coronation",
    label: "Aldric is crowned",
    summary: "",
  },
  {
    type: "addEvent",
    id: "drowning",
    label: "The archive drowns",
    summary: "",
  },
  {
    type: "constrain",
    id: "seal-in-coronation-winter",
    a: "seal",
    relation: "during",
    b: "coronation",
  },
  {
    type: "addDrive",
    id: "shut",
    actorId: "ardelia",
    want: "keep the Salt Gate shut",
    stakes: "",
    method: "",
  },
  {
    type: "addDrive",
    id: "open",
    actorId: "ardelia",
    want: "open the Salt Gate",
    stakes: "",
    method: "",
  },
  {
    type: "addDrive",
    id: "crown",
    actorId: "aldric",
    want: "hold the crown",
    stakes: "",
    method: "",
  },
  { type: "setDriveOrigins", id: "shut", origins: ["seal"] },
  { type: "setDriveOrigins", id: "open", origins: ["drowning"] },
  { type: "setDriveOrigins", id: "crown", origins: ["coronation"] },
  { type: "relateDrives", from: "open", to: "shut", relation: "opposes" },
  scene("1.1", "The Drowned Archive"),
  scene("2.1", "Ardelia"),
  scene("3.2", "The Winter Seal"),
  scene("4.2", "The Sealed Door"),
  scene("4.3", "Aldric's Answer"),
  scene("5.1", "Undertow"),
  { type: "setSceneEvents", id: "1.1", depicts: ["drowning"] },
  { type: "setSceneActors", id: "2.1", actors: ["ardelia"] },
  { type: "setSceneActors", id: "3.2", actors: ["aldric"] },
  { type: "setSceneEvents", id: "3.2", depicts: ["seal"] },
  { type: "setSceneActors", id: "4.2", actors: ["ardelia", "kesh"] },
  { type: "setScenePressures", id: "4.2", pressures: ["shut"] },
  { type: "setSceneActors", id: "4.3", actors: ["aldric"] },
  { type: "setScenePressures", id: "4.3", pressures: ["crown"] },
  { type: "setSceneActors", id: "5.1", actors: ["ardelia"] },
  { type: "setScenePressures", id: "5.1", pressures: ["shut", "open"] },
  {
    type: "addOpenQuestion",
    id: "why-seal",
    question: "Why did Ardelia seal the gate?",
    about: [{ kind: "event", id: "seal" }],
    conflict: false,
  },
  {
    type: "addCandidate",
    questionId: "why-seal",
    id: "order",
    answer: "Aldric ordered it",
    touches: [
      { kind: "actor", id: "aldric" },
      { kind: "event", id: "seal" },
    ],
  },
);

describe("the Ninefold walkthrough", () => {
  test("changing the drive reaches 2.1 through its actor", () => {
    const shut = touches(ninefold, { kind: "drive", id: "shut" });
    expect(ids(shut.direct)).toEqual({
      actor: ["ardelia"],
      drive: ["open"],
      event: ["seal"],
      scene: ["4.2", "5.1"],
    });
    expect(ids(shut.further)).toEqual({ scene: ["2.1"] });
    expect(shut.further.scene[0]?.how).toEqual([
      "a scene its actor Ardelia is in",
    ]);
  });

  test("the drive is reached from 2.1", () => {
    const ardelia = touches(ninefold, { kind: "scene", id: "2.1" });
    expect(ids(ardelia.direct)).toEqual({ actor: ["ardelia"] });
    expect(ids(ardelia.further)).toEqual({ drive: ["shut", "open"] });
  });

  test("changing the origin reaches 3.2 through depicts, and 4.2 through the drive", () => {
    const seal = touches(ninefold, { kind: "event", id: "seal" });
    expect(ids(seal.direct)).toEqual({
      drive: ["shut"],
      event: ["coronation"],
      scene: ["3.2"],
      openQuestion: ["why-seal"],
      candidate: ["why-seal/order"],
    });
    expect(seal.direct.scene[0]?.how).toEqual(["a scene that depicts it"]);
    expect(ids(seal.further)).toEqual({ scene: ["4.2", "5.1"] });
  });

  test("her two opposed drives each list the other", () => {
    const opposed = ["a drive opposed to it"];
    const shut = touches(ninefold, { kind: "drive", id: "shut" });
    const open = touches(ninefold, { kind: "drive", id: "open" });
    expect(shut.direct.drive).toEqual([
      {
        ref: { kind: "drive", id: "open" },
        label: "open the Salt Gate",
        how: opposed,
      },
    ]);
    expect(open.direct.drive).toEqual([
      {
        ref: { kind: "drive", id: "shut" },
        label: "keep the Salt Gate shut",
        how: opposed,
      },
    ]);
  });
});

describe("a candidate answer", () => {
  const order: Ref = { kind: "candidate", questionId: "why-seal", id: "order" };

  test("touches what it declares, and its question", () => {
    expect(ids(touches(ninefold, order).direct)).toEqual({
      actor: ["aldric"],
      event: ["seal"],
      openQuestion: ["why-seal"],
    });
  });

  test("one step past its touches reaches records it doesn't name", () => {
    const further = touches(ninefold, order).further;
    expect(ids(further)).toEqual({
      drive: ["crown", "shut"],
      event: ["coronation"],
      scene: ["3.2", "4.3", "4.2", "5.1"],
    });
    expect(further.drive[0]?.how).toEqual(["its drive, of actor aldric"]);
  });
});

describe("a candidate carries as its touched records do", () => {
  const withCandidate = (id: string, touched: Ref) =>
    run(ninefold, {
      type: "addCandidate",
      questionId: "why-seal",
      id,
      answer: "",
      touches: [touched],
    });

  test("touching the drive reaches 2.1 through its actor", () => {
    const story = withCandidate("drive-only", { kind: "drive", id: "shut" });
    const further = touches(story, {
      kind: "candidate",
      questionId: "why-seal",
      id: "drive-only",
    }).further;
    expect(ids(further).scene).toContain("2.1");
    expect(further.scene.find(({ ref }) => ref.id === "2.1")?.how).toEqual([
      "a scene its actor Ardelia is in, of drive shut",
    ]);
  });

  test("touching the seal reaches 4.2 through the drive", () => {
    const story = withCandidate("seal-only", { kind: "event", id: "seal" });
    const further = touches(story, {
      kind: "candidate",
      questionId: "why-seal",
      id: "seal-only",
    }).further;
    expect(ids(further).scene).toEqual(["3.2", "4.2", "5.1"]);
  });
});

describe("direct links", () => {
  test("an actor: its drives, its scenes, and what refers to it", () => {
    const story = run(ninefold, {
      type: "addFact",
      id: "ageless",
      text: "She hasn't aged since the seal.",
      about: [{ kind: "actor", id: "ardelia" }],
    });
    expect(
      ids(touches(story, { kind: "actor", id: "ardelia" }).direct),
    ).toEqual({
      drive: ["shut", "open"],
      scene: ["2.1", "4.2", "5.1"],
      fact: ["ageless"],
    });
  });

  test("a scene: actors, events, pressures and reader questions", () => {
    const story = run(
      ninefold,
      { type: "addReaderQuestion", id: "opens", question: "Will it open?" },
      { type: "addReaderQuestion", id: "kept", question: "What did it keep?" },
      {
        type: "setReaderQuestionScenes",
        id: "opens",
        opensAt: "4.2",
        answeredAt: "5.1",
      },
      {
        type: "setReaderQuestionScenes",
        id: "kept",
        opensAt: "1.1",
        answeredAt: "4.2",
      },
    );
    const door = touches(story, { kind: "scene", id: "4.2" });
    expect(ids(door.direct)).toEqual({
      actor: ["ardelia", "kesh"],
      drive: ["shut"],
      readerQuestion: ["opens", "kept"],
    });
    expect(door.direct.readerQuestion.map(({ how }) => how)).toEqual([
      ["a reader question it opens"],
      ["a reader question it answers"],
    ]);
    expect(ids(door.further)).toEqual({ drive: ["open"] });
    expect(
      ids(touches(story, { kind: "readerQuestion", id: "kept" }).direct),
    ).toEqual({
      scene: ["1.1", "4.2"],
    });
  });

  test("a fact: what it's about, and facts about it", () => {
    const story = run(
      ninefold,
      {
        type: "addFact",
        id: "cold",
        text: "The door is colder than the sea.",
        about: [
          { kind: "scene", id: "4.2" },
          { kind: "drive", id: "shut" },
        ],
      },
      {
        type: "addFact",
        id: "aside",
        text: "Kesh noticed the cold.",
        about: [{ kind: "fact", id: "cold" }],
      },
    );
    expect(ids(touches(story, { kind: "fact", id: "cold" }).direct)).toEqual({
      drive: ["shut"],
      scene: ["4.2"],
      fact: ["aside"],
    });
  });

  test("an open question: what it's about and its candidates", () => {
    const story = run(
      ninefold,
      {
        type: "addCandidate",
        questionId: "why-seal",
        id: "flood",
        answer: "To stop a flood",
        touches: [],
      },
      { type: "answerOpenQuestion", id: "why-seal", candidateId: "flood" },
    );
    const why = touches(story, { kind: "openQuestion", id: "why-seal" });
    expect(ids(why.direct)).toEqual({
      event: ["seal"],
      candidate: ["why-seal/order", "why-seal/flood"],
    });
    expect(why.direct.candidate.map(({ how }) => how)).toEqual([
      ["a candidate answer"],
      ["its chosen answer"],
    ]);
  });
});

describe("what it skips", () => {
  test("dangling references", () => {
    // A hand-edited file can hold these: the parser doesn't resolve refs.
    const story: Story = {
      ...newStory(""),
      drives: [
        {
          id: "lost",
          actorId: "ghost",
          want: "",
          stakes: "",
          method: "",
          origins: ["never"],
          relations: [{ to: "nobody", type: "opposes" }],
        },
      ],
      facts: [{ id: "f", text: "", about: [{ kind: "scene", id: "nowhere" }] }],
      readerQuestions: [{ id: "rq", question: "", opensAt: "nowhere" }],
      scenes: [
        {
          id: "s",
          title: "",
          summary: "",
          actors: ["ghost"],
          depicts: ["never"],
          pressures: ["lost", "nobody"],
        },
        {
          id: "s2",
          title: "",
          summary: "",
          actors: ["ghost"],
          depicts: [],
          pressures: [],
        },
      ],
    };
    const lost = touches(story, { kind: "drive", id: "lost" });
    expect(ids(lost.direct)).toEqual({ scene: ["s"] });
    expect(ids(lost.further)).toEqual({});
    expect(ids(touches(story, { kind: "scene", id: "s" }).direct)).toEqual({
      drive: ["lost"],
    });
    // Not through the missing actor both share.
    expect(ids(touches(story, { kind: "scene", id: "s2" }).further)).toEqual(
      {},
    );
    expect(ids(touches(story, { kind: "fact", id: "f" }).direct)).toEqual({});
    expect(
      ids(touches(story, { kind: "readerQuestion", id: "rq" }).direct),
    ).toEqual({});
  });

  test("an unknown subject is refused", () => {
    expect(
      whatThisTouches(ninefold, {
        kind: "drive",
        id: "nope",
      })._unsafeUnwrapErr(),
    ).toEqual({ kind: "unknown_ref", message: "drive nope does not exist" });
  });
});
