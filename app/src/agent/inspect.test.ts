import { describe, expect, test } from "bun:test";
import type { JsonValue } from "../llm/types";
import type { StoryToolResult } from "../story/tools";
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
): StepCall => ({ call: call(id, result.tool), result, changes, at });

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
        step(1, [answered("a", first, 10), answered("b", first, 25)], 2, 40),
        step(2, [answered("c", first, 50)], 3, 58),
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
    ).toEqual([15, 15, 8, null, null]);
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
});
