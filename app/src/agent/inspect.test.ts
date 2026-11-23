import { describe, expect, test } from "bun:test";
import type { JsonValue } from "../llm/types";
import { createMemoryStorage } from "../storage/memory";
import { saveStory } from "../story/store";
import { parseStory } from "../story/story";
import type { StoryToolResult } from "../story/tools";
import { executeStoryToolCall } from "../story/tools";
import { type AgentTurn, callNamed, traceSuspects, turnTrace } from "./inspect";
import type { AgentStep, StepCall } from "./records";

const call = (id: string, name: string, args = "{}") => ({
  id,
  type: "function" as const,
  function: { name, arguments: args },
});

const traced = (data: JsonValue[]): StoryToolResult => ({
  ok: true,
  tool: "trace",
  kind: "query",
  lines: [],
  data,
});

const answered = (
  id: string,
  result: StoryToolResult,
  at: number,
  changes: StepCall["changes"] = [],
  finishedAt: number | null = at + 1,
): StepCall => ({
  call: call(id, result.tool),
  result,
  changes,
  at,
  ...(finishedAt === null ? {} : { finishedAt }),
});

function step(
  index: number,
  calls: StepCall[],
  written: number,
  finishedAt: number,
): AgentStep {
  return {
    version: 1,
    session: "s",
    index,
    run: 1,
    request: { profile: "p", endpoint: "chat", url: "u", body: {} },
    response: {
      ok: true,
      completion: {
        text: "",
        toolCalls: Array.from({ length: written }, (_, i) =>
          call(
            `c${index}.${i}`,
            calls[i]?.result.tool ?? "show",
            '{"ref":"actor:mara"}',
          ),
        ),
        finishReason: "tool_calls",
        logprobs: null,
        model: null,
      },
    },
    calls,
    startedAt: 0,
    finishedAt,
  };
}

const turn = (steps: AgentStep[]): AgentTurn => ({
  run: {
    index: 1,
    message: "m",
    context: { scope: { kind: "world" }, sections: [] },
    at: 0,
  },
  steps,
});

describe("a turn's trace", () => {
  test("numbers calls across steps, times them, and lists unanswered ones as waiting", () => {
    const first = traced([]);
    const trace = turnTrace(
      turn([
        // Between a and b the writer paused: a's time is its own.
        step(
          1,
          [
            answered("a", first, 10, [], 14),
            answered("b", first, 9000, [], 9015),
          ],
          2,
          9015,
        ),
        // Stored before calls recorded their end: not known.
        step(2, [answered("c", first, 9050, [], null)], 3, 9058),
      ]),
    );
    expect(trace.map((c) => [c.ordinal, c.step, c.state.kind])).toEqual([
      [1, 1, "answered"],
      [2, 1, "answered"],
      [3, 2, "answered"],
      [4, 2, "waiting"],
      [5, 2, "waiting"],
    ]);
    expect(
      trace.map((c) => (c.state.kind === "answered" ? c.state.ms : null)),
    ).toEqual([4, 15, null, null, null]);
    // The call as the model wrote it.
    expect(trace[0]?.call.function.arguments).toBe('{"ref":"actor:mara"}');
  });

  test("merges a target two calls suspect, likeliest first, and skips data that isn't a suspect", () => {
    const a = traced([
      {
        target: { kind: "record", ref: "drive:x" },
        score: 2,
        reasons: ["links"],
        inText: false,
      },
      {
        target: {
          kind: "prose",
          scene: "arrival",
          documentId: "d",
          blockId: "b1",
          text: "The lamp.",
        },
        score: 5,
        reasons: ["prose"],
        inText: true,
      },
      { nonsense: true },
    ]);
    const b = traced([
      {
        target: { kind: "record", ref: "drive:x" },
        score: 9,
        reasons: ["mentions", "links"],
        inText: true,
      },
    ]);
    const suspects = traceSuspects(
      turnTrace(
        turn([step(1, [answered("a", a, 1), answered("b", b, 2)], 2, 3)]),
      ),
    );
    expect(suspects).toEqual([
      {
        target: { kind: "record", ref: "drive:x" },
        reasons: ["links", "mentions"],
        score: 9,
        ordinals: [1, 2],
      },
      {
        target: {
          kind: "prose",
          scene: "arrival",
          documentId: "d",
          blockId: "b1",
          text: "The lamp.",
        },
        reasons: ["prose"],
        score: 5,
        ordinals: [1],
      },
    ]);
  });

  test("names what a call wrote: refs as references, other records by ID", () => {
    const result: StoryToolResult = {
      ok: true,
      tool: "removeActor",
      kind: "mutation",
      lines: [],
      warnings: {
        timelineProblems: [],
        contradictions: [],
        alsoRemoved: [],
        droppedLinks: null,
        crossedLinks: [],
        stale: null,
      },
    };
    const [named] = turnTrace(
      turn([
        step(
          1,
          [
            answered("a", result, 1, [
              { id: "actor/old%20man", kind: "actor", before: {}, after: null },
              {
                id: "constraint/c1",
                kind: "constraint",
                before: null,
                after: {},
              },
              { id: "story", kind: "story", before: {}, after: {} },
            ]),
          ],
          1,
          2,
        ),
      ]),
    ).map(callNamed);
    expect(named).toEqual([
      {
        kind: "reference",
        reference: { kind: "record", ref: "actor:old man" },
        removed: true,
      },
      { kind: "record", id: "constraint/c1", removed: false },
      { kind: "record", id: "story", removed: false },
    ]);
  });

  test("names the records and scenes a query's data holds", () => {
    const query = (tool: string, data: JsonValue): StoryToolResult => ({
      ok: true,
      tool,
      kind: "query",
      lines: [],
      data,
    });
    const named = turnTrace(
      turn([
        step(
          1,
          [
            answered(
              "a",
              query("touches", {
                ref: "actor:mara",
                direct: [
                  { ref: "drive:keep-light", how: ["its drive"] },
                  { ref: "scene:arrival", how: ["a scene it's in"] },
                ],
              }),
              1,
            ),
            answered(
              "b",
              query("scenes", [
                { scene: "arrival", position: 1 },
                { scene: "confession", position: 3 },
              ]),
              2,
            ),
            answered(
              "c",
              query("contradictions", [
                { source: "membership", message: "m", on: "membership m1" },
                { source: "knowledge", message: "k", on: "knowledge:k1" },
              ]),
              3,
            ),
          ],
          3,
          4,
        ),
      ]),
    ).map((call) =>
      callNamed(call).map((item) =>
        item.kind === "reference" && item.reference.kind === "record"
          ? item.reference.ref
          : item,
      ),
    );
    expect(named).toEqual([
      ["actor:mara", "drive:keep-light", "scene:arrival"],
      ["scene:arrival", "scene:confession"],
      // "membership m1" isn't a ref.
      ["knowledge:k1"],
    ]);
  });

  test("names the refs real query results hold, stored as data or listed", async () => {
    const storage = createMemoryStorage();
    const story = parseStory(
      await Bun.file(
        new URL("../story/fixtures/lighthouse.story.json", import.meta.url),
      ).text(),
    )._unsafeUnwrap();
    (await saveStory(storage, story, 1))._unsafeUnwrap();
    const run = async (name: string, args: JsonValue) =>
      (
        await executeStoryToolCall(
          storage,
          {
            id: name,
            type: "function",
            function: { name, arguments: JSON.stringify(args) },
          },
          2,
        )
      )._unsafeUnwrap().result;
    const refsOf = (result: StoryToolResult) => {
      const [only] = turnTrace(
        turn([step(1, [answered("a", result, 1)], 1, 2)]),
      );
      return only === undefined
        ? []
        : callNamed(only).flatMap((item) =>
            item.kind === "reference" && item.reference.kind === "record"
              ? [item.reference.ref]
              : [],
          );
    };
    // A fact's `about` holds refs as { kind, id }.
    expect(refsOf(await run("show", { ref: "fact:oil-runs-out" }))).toEqual(
      expect.arrayContaining(["fact:oil-runs-out", "count:oil", "object:lamp"]),
    );
    // What is held back is a list of refs as text.
    expect(
      refsOf(await run("readerOrder", { before: "confession" })),
    ).toContain("open-question:why-leave");
  });
});
