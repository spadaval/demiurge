import { beforeEach, describe, expect, test } from "bun:test";
import type { ResultAsync } from "neverthrow";
import type { ToolCall } from "../llm/types";
import { createMemoryStorage } from "../storage/memory";
import type { StorageAdapter, StoredDocument } from "../storage/types";
import type { StoryCommandType } from "./commands";
import documentsFile from "./fixtures/lighthouse.documents.json";
import { loadStory, saveStory } from "./store";
import { parseStory, type Story } from "./story";
import {
  executeStoryTool,
  executeStoryToolCall,
  STORY_TOOLS,
  type StoryToolResult,
  storyTool,
  storyToolDefinitions,
} from "./tools";

const fixture: Story = parseStory(
  await Bun.file(
    new URL("./fixtures/lighthouse.story.json", import.meta.url),
  ).text(),
)._unsafeUnwrap();
const documents: StoredDocument[] = documentsFile;

async function value<T, E>(result: ResultAsync<T, E>): Promise<T> {
  return (await result)._unsafeUnwrap();
}

let storage: StorageAdapter;

beforeEach(async () => {
  storage = createMemoryStorage();
  await value(saveStory(storage, fixture, 1000));
  await value(
    storage.batch(
      documents.map((record) => ({ kind: "saveDocument" as const, record })),
    ),
  );
});

const call = (name: string, args: unknown) =>
  value(executeStoryTool(storage, name, args, 2000));

/** The result of a call that succeeded, of the kind expected. */
async function succeeded<K extends "query" | "mutation">(
  kind: K,
  name: string,
  args: unknown,
): Promise<Extract<StoryToolResult, { ok: true; kind: K }>> {
  const result = await call(name, args);
  if (!result.ok || result.kind !== kind) {
    throw new Error(`${name} did not succeed: ${JSON.stringify(result)}`);
  }
  // Checked just above.
  return result as Extract<StoryToolResult, { ok: true; kind: K }>;
}

async function refused(name: string, args: unknown) {
  const result = await call(name, args);
  if (result.ok) throw new Error(`${name} was not refused`);
  return result.error;
}

/** Every stored record's write time, to see that nothing was written. */
const writeTimes = async () =>
  (await value(storage.storyRecords.list())).map((r) => r.updatedAt);

describe("the registry", () => {
  const COMMANDS: Record<StoryCommandType, true> = {
    setPremise: true,
    addActor: true,
    updateActor: true,
    removeActor: true,
    addMembership: true,
    updateMembership: true,
    removeMembership: true,
    addDrive: true,
    updateDrive: true,
    removeDrive: true,
    setDriveOrigins: true,
    relateDrives: true,
    unrelateDrives: true,
    addFact: true,
    updateFact: true,
    removeFact: true,
    addReaderQuestion: true,
    updateReaderQuestion: true,
    removeReaderQuestion: true,
    setReaderQuestionScenes: true,
    addScene: true,
    updateScene: true,
    removeScene: true,
    moveScene: true,
    setSceneActors: true,
    setSceneViewpoint: true,
    setSceneDocument: true,
    setSceneChapter: true,
    setSceneEvents: true,
    setScenePressures: true,
    setSceneLinks: true,
    addOpenQuestion: true,
    updateOpenQuestion: true,
    removeOpenQuestion: true,
    addCandidate: true,
    updateCandidate: true,
    removeCandidate: true,
    answerOpenQuestion: true,
    unanswerOpenQuestion: true,
    rejectCandidate: true,
    leaveForReader: true,
    addEvent: true,
    describeEvent: true,
    addCause: true,
    removeCause: true,
    removeEvent: true,
    addVersion: true,
    updateVersion: true,
    removeVersion: true,
    addKnowledge: true,
    updateKnowledge: true,
    removeKnowledge: true,
    addObject: true,
    updateObject: true,
    removeObject: true,
    addCount: true,
    updateCount: true,
    removeCount: true,
    setCount: true,
    setParticipant: true,
    removeParticipant: true,
    addDriveTurn: true,
    removeDriveTurn: true,
    markGapDeliberate: true,
    unmarkGapDeliberate: true,
    setPosition: true,
    constrain: true,
    removeConstraint: true,
  };

  test("has a mutation for every command and a query for every read", () => {
    const mutations = STORY_TOOLS.filter((t) => t.kind === "mutation");
    expect(mutations.map((t) => t.name).sort()).toEqual(
      Object.keys(COMMANDS).sort(),
    );
    expect(
      STORY_TOOLS.filter((t) => t.kind === "query").map((t) => t.name),
    ).toEqual([
      "show",
      "list",
      "touches",
      "scenes",
      "readerOrder",
      "span",
      "trace",
      "mentions",
      "gaps",
      "contradictions",
      "render",
    ]);
  });

  test("gives each tool a unique name and a closed object schema", () => {
    const definitions = storyToolDefinitions();
    const names = definitions.map((d) => d.function.name);
    expect(new Set(names).size).toBe(names.length);
    for (const { type, function: fn } of definitions) {
      expect(type).toBe("function");
      expect(fn.name).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
      expect(fn.description?.length ?? 0).toBeGreaterThan(10);
      expect(fn.parameters).toMatchObject({
        type: "object",
        additionalProperties: false,
      });
      // Survives the trip through JSON a request makes.
      expect(JSON.parse(JSON.stringify(fn.parameters))).toEqual(
        fn.parameters ?? {},
      );
    }
  });

  test("picks definitions by name, skipping names it doesn't have", () => {
    expect(
      storyToolDefinitions(["trace", "nope", "addCause"]).map(
        (d) => d.function.name,
      ),
    ).toEqual(["trace", "addCause"]);
  });

  test("writes refs as text and marks required fields", () => {
    expect(storyTool("addFact")?.parameters.json).toMatchObject({
      required: ["id", "text", "about"],
      properties: {
        about: { type: "array", items: { type: "string" } },
      },
    });
    expect(storyTool("updateFact")?.parameters.json).toMatchObject({
      required: ["id"],
    });
  });
});

describe("a valid call", () => {
  test("applies the command and saves it", async () => {
    const result = await succeeded("mutation", "addActor", {
      id: "keeper",
      name: "The old keeper",
      kind: "person",
      notes: "",
    });
    expect(result.lines).toEqual([]);
    expect(result.warnings).toEqual({
      timelineProblems: [],
      contradictions: [],
      alsoRemoved: [],
      droppedLinks: null,
      crossedLinks: [],
      stale: null,
    });
    const story = await value(loadStory(storage));
    expect(story.actors.find((a) => a.id === "keeper")?.name).toBe(
      "The old keeper",
    );
    const record = await value(storage.storyRecords.load("actor/keeper"));
    expect(record.updatedAt).toBe(2000);
  });

  test("parses refs written as text", async () => {
    await succeeded("mutation", "addFact", {
      id: "debt",
      text: "Ivo owes the guild a ship.",
      about: ["actor:ivo", "candidate:why-leave/debt"],
    });
    const story = await value(loadStory(storage));
    expect(story.facts.find((f) => f.id === "debt")?.about).toEqual([
      { kind: "actor", id: "ivo" },
      { kind: "candidate", questionId: "why-leave", id: "debt" },
    ]);
  });

  test("reads null for an optional field that can't be null as left out", async () => {
    await succeeded("mutation", "updateActor", {
      id: "ivo",
      name: "Ivo Marr",
      kind: null,
    });
    const story = await value(loadStory(storage));
    expect(story.actors.find((a) => a.id === "ivo")).toMatchObject({
      name: "Ivo Marr",
      kind: "person",
    });
  });

  test("places an event by a date, as the CLI does", async () => {
    await succeeded("mutation", "setPosition", {
      event: "tide",
      start: "1954-10",
    });
    const story = await value(loadStory(storage));
    const position = story.timeline.positions.find(
      (p) => p.event === "tide" && p.frame === "world",
    );
    expect(position?.start).toBeCloseTo(1954 + 273 / 365, 3);
    expect(position?.end).toBeCloseTo(1954 + 304 / 365, 3);
  });

  test("gives a gap as a span", async () => {
    await succeeded("mutation", "constrain", {
      id: "wreck-tide",
      a: "wreck",
      relation: "before",
      b: "tide",
      gap: "2w",
    });
    const story = await value(loadStory(storage));
    const constraint = story.timeline.constraints.find(
      (c) => c.id === "wreck-tide",
    );
    expect(constraint?.duration?.amount).toBeCloseTo(14 / 365.2425, 4);
    // Half its unit, a week, by default.
    expect(constraint?.duration?.tolerance).toBeCloseTo(3.5 / 365.2425, 4);
  });

  test("counts scene positions from 1", async () => {
    await succeeded("mutation", "moveScene", { id: "confession", position: 1 });
    const story = await value(loadStory(storage));
    expect(story.scenes.map((s) => s.id)).toEqual([
      "confession",
      "arrival",
      "storm-night",
    ]);
  });

  test("answers a query with lines and data", async () => {
    await succeeded("mutation", "setPosition", { event: "tide", start: "13" });
    const span = await succeeded("query", "span", {
      from: "storm",
      to: "tide",
    });
    expect(span.lines).toHaveLength(1);
    expect(span.data).toEqual({ from: "storm", to: "tide", years: 10 });
    const before = await succeeded("query", "readerOrder", {
      before: "confession",
    });
    expect(before.data).toMatchObject({
      scene: "confession",
      position: 3,
      withheld: ["open-question:why-leave"],
    });
    expect(before.lines[0]).toStartWith("Before 3. scene:confession");
  });

  test("shows a scene's linked document", async () => {
    const shown = await succeeded("query", "show", { ref: "scene:arrival" });
    expect(shown.lines).toContain(
      'prose: document doc-arrival "Arrival" (21 words)',
    );
    expect(shown.data).toMatchObject({
      ref: "scene:arrival",
      record: { id: "arrival", documentId: "doc-arrival" },
    });
  });
});

describe("a refused call", () => {
  test("names a tool that doesn't exist", async () => {
    const error = await refused("deleteEverything", {});
    expect(error.kind).toBe("unknown_tool");
    expect(error.message).toContain("addActor");
  });

  test("lists every issue with the arguments, by path", async () => {
    const error = await refused("addActor", {
      id: "keeper",
      name: 3,
      kind: "robot",
      extra: true,
    });
    expect(error).toMatchObject({
      kind: "invalid_arguments",
      issues: [
        { path: "name", message: "must be a string, not a number" },
        {
          path: "kind",
          message: 'must be one of person, organization, not "robot"',
        },
        { path: "notes", message: "is required" },
        { path: "extra" },
      ],
    });
  });

  test("names a bad ref inside a list", async () => {
    const error = await refused("addFact", {
      id: "debt",
      text: "",
      about: ["actor:ivo", "ivo"],
    });
    expect(error).toMatchObject({
      kind: "invalid_arguments",
      issues: [{ path: "about[1]" }],
    });
    expect(error.message).toContain('"ivo" is not a ref');
  });

  test("names a date it can't read", async () => {
    const error = await refused("setPosition", {
      event: "tide",
      start: "next Tuesday",
    });
    expect(error).toMatchObject({
      kind: "invalid_arguments",
      issues: [{ path: "start" }],
    });
  });

  test("passes on the story's refusal and writes nothing", async () => {
    const before = await writeTimes();
    const error = await refused("addActor", {
      id: "ivo",
      name: "Ivo",
      kind: "person",
      notes: "",
    });
    expect(error).toEqual({
      kind: "refused",
      code: "duplicate_id",
      message: "actor ivo already exists",
    });
    const unknown = await refused("addCause", {
      cause: "storm",
      effect: "flood",
    });
    expect(unknown).toMatchObject({ kind: "refused", code: "unknown_id" });
    expect(await writeTimes()).toEqual(before);
  });

  test("refuses a query on a record that doesn't exist", async () => {
    expect(await refused("trace", { ref: "event:flood" })).toMatchObject({
      kind: "refused",
      message: "event flood does not exist",
    });
    expect(await refused("render", { sections: ["nope"] })).toMatchObject({
      kind: "invalid_arguments",
    });
  });
});

describe("what a mutation keeps", () => {
  test("reports a circle of causes and keeps it", async () => {
    const result = await succeeded("mutation", "addCause", {
      cause: "wreck",
      effect: "storm",
    });
    expect(result.warnings.contradictions).toEqual([
      {
        source: "cause",
        message:
          'These events are recorded as causing each other, in a circle: "The storm"; "The wreck".',
      },
    ]);
    expect(result.lines[0]).toStartWith("Cause problem (kept;");
    const story = await value(loadStory(storage));
    expect(story.causes).toContainEqual({ cause: "wreck", effect: "storm" });
    const listed = await succeeded("query", "contradictions", {});
    expect(listed.lines).toContain(
      `- ${result.warnings.contradictions[0]?.message}`,
    );
  });

  test("reports a timeline problem and keeps it", async () => {
    const result = await succeeded("mutation", "constrain", {
      id: "tide-first",
      a: "tide",
      relation: "before",
      b: "storm",
    });
    expect(result.warnings.timelineProblems).toHaveLength(1);
    expect(result.warnings.timelineProblems[0]).toContain("tide-first");
    const story = await value(loadStory(storage));
    expect(story.timeline.constraints.map((c) => c.id)).toContain("tide-first");
  });

  test("reports the links a replaced list dropped", async () => {
    const result = await succeeded("mutation", "setSceneLinks", {
      id: "storm-night",
      how: "reveals",
      refs: [],
    });
    expect(result.warnings.droppedLinks).toEqual({
      scene: "storm-night",
      how: "reveals",
      refs: ["version:guild-account"],
    });
    expect(result.lines).toEqual([
      "Dropped from storm-night reveals: version:guild-account",
    ]);
  });

  test("reports a link that now cancels another", async () => {
    const result = await succeeded("mutation", "setSceneLinks", {
      id: "arrival",
      how: "reveals",
      refs: ["open-question:why-leave"],
    });
    expect(result.warnings.crossedLinks).toEqual([
      { scene: "arrival", how: "reveals", ref: "open-question:why-leave" },
    ]);
  });

  test("reports what went with a removed record", async () => {
    const result = await succeeded("mutation", "removeVersion", {
      id: "guild-account",
    });
    expect(result.warnings.alsoRemoved).toEqual([
      expect.stringContaining("knowledge:ivo-believes"),
    ]);
  });

  test("lists every suspect that may still state the old version", async () => {
    const result = await succeeded("mutation", "updateObject", {
      id: "lamp",
      name: "The lantern",
    });
    const { stale } = result.warnings;
    if (stale?.kind !== "suspects") throw new Error("no suspects");
    expect(stale.ref).toBe("object:lamp");
    // More than the CLI's three, none cut.
    expect(stale.suspects.length).toBe(5);
    expect(stale.suspects.every((s) => s.inText)).toBe(true);
    expect(stale.suspects.map((s) => s.target)).toContainEqual({
      kind: "prose",
      scene: "storm-night",
      documentId: "doc-storm-night",
      blockId: "b_storm2",
      text: "By the second watch the lamp guttered — “unicode” and all. ✦",
    });
    expect(result.lines).toContain(
      '- document doc-storm-night block b_storm2 (scene:storm-night) "By the second watch the lamp guttered — “unicode” and all. ✦": "the lamp" names it',
    );
  });
});

describe("trace through the store", () => {
  test("reads the prose of linked scene documents", async () => {
    const result = await succeeded("query", "trace", { ref: "object:lamp" });
    const data = result.data;
    if (!Array.isArray(data)) throw new Error("no suspects");
    const prose = data.flatMap((s) =>
      typeof s === "object" &&
      s !== null &&
      !Array.isArray(s) &&
      typeof s.target === "object" &&
      s.target !== null &&
      !Array.isArray(s.target) &&
      s.target.kind === "prose"
        ? [s.target]
        : [],
    );
    expect(prose).toEqual([
      {
        kind: "prose",
        scene: "storm-night",
        documentId: "doc-storm-night",
        blockId: "b_storm2",
        text: "By the second watch the lamp guttered — “unicode” and all. ✦",
      },
      {
        kind: "prose",
        scene: "arrival",
        documentId: "doc-arrival",
        blockId: null,
        text: "",
      },
      {
        kind: "prose",
        scene: "confession",
        documentId: "doc-confession",
        blockId: null,
        text: "",
      },
    ]);
    expect(result.proseNotRead).toBeUndefined();
  });

  test("follows a document linked by a tool call", async () => {
    await value(
      storage.documents.save({
        id: "doc-harbour",
        title: "Harbour",
        content: [
          {
            type: "p",
            id: "b_h1",
            children: [{ text: "The harbour was quiet." }],
          },
          {
            type: "p",
            id: "b_h2",
            children: [{ text: "Somewhere above, the lamp burned on." }],
          },
        ],
        updatedAt: 1,
      }),
    );
    await succeeded("mutation", "addScene", {
      id: "harbour",
      title: "Harbour",
      summary: "",
    });
    await succeeded("mutation", "setSceneDocument", {
      id: "harbour",
      documentId: "doc-harbour",
    });
    const result = await succeeded("query", "trace", { ref: "object:lamp" });
    expect(result.lines).toContain(
      '- document doc-harbour block b_h2 (scene:harbour) "Somewhere above, the lamp burned on.": "the lamp" names it',
    );
  });

  test("lists linked prose it couldn't read", async () => {
    await value(storage.documents.delete("doc-confession"));
    await value(
      storage.documents.save({
        id: "doc-arrival",
        title: "Arrival",
        content: [{ type: "nonsense" }],
        updatedAt: 1,
      }),
    );
    const result = await succeeded("query", "trace", { ref: "object:lamp" });
    expect(result.proseNotRead).toEqual([
      expect.objectContaining({
        scene: "arrival",
        documentId: "doc-arrival",
        reason: "invalid_content",
      }),
      {
        scene: "confession",
        documentId: "doc-confession",
        reason: "missing",
        message: "document doc-confession does not exist",
      },
    ]);
    const shown = await succeeded("query", "show", {
      ref: "scene:confession",
    });
    expect(shown.lines).toContain(
      "prose: document doc-confession does not exist",
    );
  });
});

describe("a model's tool call", () => {
  const toolCall = (name: string, args: string): ToolCall => ({
    id: "call-1",
    type: "function",
    function: { name, arguments: args },
  });

  test("answers with the whole result as the tool turn", async () => {
    const { result, message, changes } = await value(
      executeStoryToolCall(
        storage,
        toolCall("addCause", '{"cause":"wreck","effect":"storm"}'),
        2000,
      ),
    );
    expect(message.role).toBe("tool");
    expect(message.tool_call_id).toBe("call-1");
    expect(JSON.parse(message.content)).toEqual(result);
    expect(result.ok).toBe(true);
    // The record it wrote, beside the result rather than in what the model reads.
    expect(changes).toEqual([
      {
        id: "cause/wreck/storm",
        kind: "cause",
        before: null,
        after: { cause: "wreck", effect: "storm" },
      },
    ]);
    expect(message.content).not.toContain("cause/wreck/storm");
  });

  test("a query or a refusal changes no record", async () => {
    for (const [name, args] of [
      ["show", '{"ref":"actor:mara"}'],
      ["addCause", '{"cause":"wreck","effect":"nowhere"}'],
    ] as const) {
      const { changes } = await value(
        executeStoryToolCall(storage, toolCall(name, args), 2000),
      );
      expect(changes).toEqual([]);
    }
  });

  test("refuses arguments that aren't JSON", async () => {
    const { result } = await value(
      executeStoryToolCall(storage, toolCall("addCause", "{cause:"), 2000),
    );
    expect(result).toMatchObject({
      ok: false,
      tool: "addCause",
      error: { kind: "invalid_arguments" },
    });
  });
});
