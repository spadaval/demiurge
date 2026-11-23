/**
 * A session's log read for the agent slip: each writer message with the
 * model calls it led to (a turn), and for each turn its tool calls in order,
 * the contradictions its edits added and kept, and what its edits and
 * `trace` queries suspect may now be stale, each as something to open.
 *
 * Nothing here touches the DOM; the slip (`generate/agent-slip.tsx`) renders
 * what it returns.
 */

import type { JsonValue, ToolCall } from "../llm/types";
import type { StoryRecordChange } from "../story/store";
import type {
  StoryToolRefusal,
  StoryToolResult,
  SuspectData,
} from "../story/tools";
import { packetText } from "./context";
import type { AgentRun, AgentStep, SessionLog } from "./records";

/** One writer message and the model calls that answered it. */
export type AgentTurn = { run: AgentRun; steps: AgentStep[] };

/** The session's turns, in order. Steps of a run with no message are left out. */
export function sessionTurns(log: SessionLog): AgentTurn[] {
  return log.session.runs.map((run) => ({
    run,
    steps: log.steps.filter((step) => step.run === run.index),
  }));
}

/** The context as the turn sent it: the writer's edit, or the packet. */
export const sentContext = (run: AgentRun): string =>
  run.editedContext ?? packetText(run.context);

/** Something a result names that the writer can open. */
export type Reference =
  | { kind: "record"; ref: string }
  | {
      kind: "prose";
      scene: string;
      documentId: string | null;
      /** Null for the scene's prose as a whole. */
      blockId: string | null;
      text: string;
    };

/** A reference as one string, to compare two. */
export const referenceKey = (reference: Reference): string =>
  reference.kind === "record"
    ? reference.ref
    : `prose:${reference.scene}/${reference.blockId ?? ""}`;

/** A tool call of a turn, as the trace lists it. */
export type TraceCall = {
  /** From 1, across the turn. */
  ordinal: number;
  /** The step (model call) that made it. */
  step: number;
  /** The call as the model wrote it: its own arguments text. */
  call: ToolCall;
  state:
    | {
        kind: "answered";
        result: StoryToolResult;
        changes: readonly StoryRecordChange[];
        /** How long it ran, in milliseconds, when that is known. */
        ms: number | null;
      }
    /** Made by the model and not answered yet: running, or waiting. */
    | { kind: "waiting" };
};

/** The calls of `turn`, in the order the model made them. */
export function turnTrace(turn: AgentTurn): TraceCall[] {
  const calls: TraceCall[] = [];
  for (const step of turn.steps) {
    const written =
      step.response.ok === true ? step.response.completion.toolCalls : [];
    step.calls.forEach((answered, i) => {
      const next = step.calls[i + 1];
      const end = next?.at ?? step.finishedAt;
      calls.push({
        ordinal: calls.length + 1,
        step: step.index,
        call: written[i] ?? answered.call,
        state: {
          kind: "answered",
          result: answered.result,
          changes: answered.changes,
          ms: end >= answered.at ? end - answered.at : null,
        },
      });
    });
    for (const call of written.slice(step.calls.length)) {
      calls.push({
        ordinal: calls.length + 1,
        step: step.index,
        call,
        state: { kind: "waiting" },
      });
    }
  }
  return calls;
}

/** A refusal, if the call was refused. */
export const refusal = (call: TraceCall): StoryToolRefusal | undefined =>
  call.state.kind === "answered" && call.state.result.ok === false
    ? call.state.result.error
    : undefined;

/** The arguments as JSON, or the text as written when it isn't JSON. */
export function callArguments(call: ToolCall): JsonValue {
  try {
    return JSON.parse(call.function.arguments);
  } catch {
    return call.function.arguments;
  }
}

/** The arguments on one line, for the trace's fold line. */
export function argumentsLine(call: ToolCall): string {
  const args = callArguments(call);
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return JSON.stringify(args);
  }
  return Object.entries(args)
    .map(
      ([key, value]) =>
        `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`,
    )
    .join(", ");
}

/** A contradiction an edit in the turn added and kept. */
export type KeptContradiction = {
  /** What kind, as the Contradictions ledger names it. */
  label: string;
  message: string;
  /** The call that added it. */
  ordinal: number;
};

const CONTRADICTION_LABELS: Record<string, string> = {
  cause: "Causes",
  count: "Count",
  knowledge: "Knowledge",
  membership: "Membership",
};

/** The contradictions the turn's edits added and kept, in call order. */
export function keptContradictions(trace: TraceCall[]): KeptContradiction[] {
  return trace.flatMap((call) => {
    const { state } = call;
    if (
      state.kind !== "answered" ||
      !state.result.ok ||
      state.result.kind !== "mutation"
    ) {
      return [];
    }
    const { warnings } = state.result;
    return [
      ...warnings.timelineProblems.map((message) => ({
        label: "Timeline",
        message,
        ordinal: call.ordinal,
      })),
      ...warnings.contradictions.map(({ source, message }) => ({
        label: CONTRADICTION_LABELS[source] ?? source,
        message,
        ordinal: call.ordinal,
      })),
    ];
  });
}

/** Something that may now be stale, with why, as the trace suspects it. */
export type TraceSuspect = {
  target: Reference;
  reasons: string[];
  score: number;
  /** The calls that suspected it. */
  ordinals: number[];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** A `trace` query's datum, checked: the model's results are only JSON. */
function suspectOf(value: unknown): SuspectData | undefined {
  if (!isObject(value) || !isObject(value.target)) return undefined;
  const { target, score, reasons } = value;
  if (typeof score !== "number" || !isStrings(reasons)) return undefined;
  if (target.kind === "record" && typeof target.ref === "string") {
    return {
      target: { kind: "record", ref: target.ref },
      score,
      reasons,
      inText: value.inText === true,
    };
  }
  if (
    target.kind === "prose" &&
    typeof target.scene === "string" &&
    typeof target.text === "string"
  ) {
    return {
      target: {
        kind: "prose",
        scene: target.scene,
        documentId:
          typeof target.documentId === "string" ? target.documentId : null,
        blockId: typeof target.blockId === "string" ? target.blockId : null,
        text: target.text,
      },
      score,
      reasons,
      inText: value.inText === true,
    };
  }
  return undefined;
}

/** The suspects one answered call reports. */
function callSuspects(call: TraceCall): SuspectData[] {
  const { state } = call;
  if (state.kind !== "answered" || !state.result.ok) return [];
  const { result } = state;
  if (result.kind === "mutation") {
    const stale = result.warnings.stale;
    return stale?.kind === "suspects" ? stale.suspects : [];
  }
  if (result.tool !== "trace" || !Array.isArray(result.data)) return [];
  return result.data.flatMap((datum) => {
    const suspect = suspectOf(datum);
    return suspect === undefined ? [] : [suspect];
  });
}

/**
 * What the turn's edits and `trace` queries suspect may depend on what
 * changed, each once, likeliest first. A target suspected twice keeps its
 * higher score and every reason.
 */
export function traceSuspects(trace: TraceCall[]): TraceSuspect[] {
  const found = new Map<string, TraceSuspect>();
  for (const call of trace) {
    for (const suspect of callSuspects(call)) {
      const target: Reference = suspect.target;
      const key = referenceKey(target);
      const seen = found.get(key);
      if (seen === undefined) {
        found.set(key, {
          target,
          reasons: [...suspect.reasons],
          score: suspect.score,
          ordinals: [call.ordinal],
        });
        continue;
      }
      seen.score = Math.max(seen.score, suspect.score);
      for (const reason of suspect.reasons) {
        if (!seen.reasons.includes(reason)) seen.reasons.push(reason);
      }
      if (!seen.ordinals.includes(call.ordinal)) {
        seen.ordinals.push(call.ordinal);
      }
    }
  }
  return [...found.values()].sort((a, b) => b.score - a.score);
}

/** Story record kinds whose stored ID is a ref's kind and ID. */
const REF_RECORD_KINDS: Record<string, string> = {
  actor: "actor",
  drive: "drive",
  fact: "fact",
  readerQuestion: "reader-question",
  scene: "scene",
  openQuestion: "open-question",
  version: "version",
  knowledge: "knowledge",
  object: "object",
  count: "count",
  event: "event",
};

/** The ref of a changed story record, when it is a record a ref names. */
function changeRef(change: StoryRecordChange): string | undefined {
  const name = REF_RECORD_KINDS[change.kind];
  const parts = change.id.split("/");
  if (name === undefined || parts.length !== 2 || parts[0] !== change.kind) {
    return undefined;
  }
  return `${name}:${decodeURIComponent(parts[1] ?? "")}`;
}

/** Something a call's result names, for the slip to list above the result. */
export type Named =
  /** A record or scene to open; `removed` when the call deleted it. */
  | { kind: "reference"; reference: Reference; removed: boolean }
  /** A story record written that no ref names, such as a constraint. */
  | { kind: "record"; id: string; removed: boolean };

/**
 * What a call's result names: each story record it wrote or deleted, then
 * what it suspects may now be stale, each once.
 */
export function callNamed(call: TraceCall): Named[] {
  if (call.state.kind !== "answered") return [];
  const named: Named[] = [];
  const keys = new Set<string>();
  const add = (item: Named, key: string) => {
    if (keys.has(key)) return;
    keys.add(key);
    named.push(item);
  };
  for (const change of call.state.changes) {
    const ref = changeRef(change);
    const removed = change.after === null;
    if (ref === undefined) {
      add({ kind: "record", id: change.id, removed }, change.id);
    } else {
      add(
        { kind: "reference", reference: { kind: "record", ref }, removed },
        ref,
      );
    }
  }
  for (const suspect of callSuspects(call)) {
    add(
      { kind: "reference", reference: suspect.target, removed: false },
      referenceKey(suspect.target),
    );
  }
  return named;
}
