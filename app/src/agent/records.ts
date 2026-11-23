/**
 * What the story agent keeps of a session, in the `agentRecords` collection:
 * one session record, and one record per step. A step is one model call: the
 * exact request sent, what the model answered, and each tool call it made
 * with its result and the story records that call changed. Together they
 * are enough to inspect a session, re-send any request, and replay the
 * session against a fresh copy of the world (`./replay.ts`).
 *
 *     <session>/session            AgentSession
 *     <session>/step/000001        AgentStep
 *
 * A session and its current step are saved in one batch, so the two always
 * agree. A step's story-record mutations are written by the story store in
 * their own step, before the records that log them.
 */

import { err, ok, type Result, type ResultAsync } from "neverthrow";
import type {
  ChatMessage,
  Completion,
  JsonValue,
  LlmError,
  LlmRequest,
  ToolCall,
} from "../llm/types";
import type {
  StorageAdapter,
  StorageError,
  StoredAgentRecord,
} from "../storage/types";
import type { StoryRecordChange } from "../story/store";
import type { StoryToolResult } from "../story/tools";
import type { AgentScope, ContextPacket } from "./context";
import { AGENT_ROLES, type AgentRole } from "./profiles";

export const AGENT_RECORD_VERSION = 1;

/**
 * Who moves next. `user`: the run is over and the session waits for the
 * writer. `model`: the next step is a model call. `tools`: the model's last
 * turn made tool calls not all answered yet.
 */
export type NextMove = "user" | "model" | "tools";

/**
 * Why a run stopped with the next move not the writer's:
 * - `paused`: the writer asked it to.
 * - `step_limit`: it made as many model calls as one run may.
 * - `approval`: the model wants to change the bible, and the session asks
 *   the writer first.
 * - `model_error`: the model call failed (the step says how); resuming
 *   tries it again.
 */
export type StopReason = "paused" | "step_limit" | "approval" | "model_error";

/** One message from the writer, with the context it was sent with. */
export type AgentRun = {
  /** From 1. */
  index: number;
  message: string;
  context: ContextPacket;
  at: number;
};

export type AgentSession = {
  version: typeof AGENT_RECORD_VERSION;
  id: string;
  role: AgentRole;
  scope: AgentScope;
  systemPrompt: string;
  /** The most model calls one run (a message, or a resume) may make. */
  maxSteps: number;
  /** Stop for the writer's approval before any call that changes the bible. */
  approveMutations: boolean;
  /** The conversation as the next request will send it, system prompt first. */
  messages: ChatMessage[];
  runs: AgentRun[];
  next: NextMove;
  /** Why the last run stopped, while `next` isn't `user`. */
  stopped: StopReason | null;
  /** How many steps have been recorded. */
  steps: number;
  createdAt: number;
  updatedAt: number;
};

/** An `LlmError` as stored: its cause, if any, isn't JSON. */
export type StepError = {
  kind: LlmError["kind"];
  message: string;
  status?: number;
};

/** One tool call of a step, as the conversation holds it, and what it did. */
export type StepCall = {
  /**
   * The call as sent back to the model. Its id is the model's unless that id
   * was already used in this session, and arguments that aren't a JSON
   * object read `{}`; the step's completion keeps what the model sent.
   */
  call: ToolCall;
  result: StoryToolResult;
  /** The story records it wrote or deleted; empty for a query or refusal. */
  changes: readonly StoryRecordChange[];
  at: number;
};

export type AgentStep = {
  version: typeof AGENT_RECORD_VERSION;
  session: string;
  /** From 1, across the session. */
  index: number;
  /** The run (writer message) it belongs to, from 1. */
  run: number;
  /** Exactly what was sent, without the API key. */
  request: LlmRequest;
  response:
    | { ok: true; completion: Completion }
    | { ok: false; error: StepError };
  /** In the order the model made them, each once it has been answered. */
  calls: StepCall[];
  startedAt: number;
  finishedAt: number;
};

export const sessionRecordId = (session: string) => `${session}/session`;

export const stepRecordId = (session: string, index: number) =>
  `${session}/step/${String(index).padStart(6, "0")}`;

const toJson = (value: unknown): JsonValue => JSON.parse(JSON.stringify(value));

export function sessionRecord(session: AgentSession): StoredAgentRecord {
  return {
    id: sessionRecordId(session.id),
    sessionId: session.id,
    kind: "session",
    data: toJson(session),
    updatedAt: session.updatedAt,
  };
}

export function stepRecord(step: AgentStep): StoredAgentRecord {
  return {
    id: stepRecordId(step.session, step.index),
    sessionId: step.session,
    kind: "step",
    data: toJson(step),
    updatedAt: step.finishedAt,
  };
}

/** Saves `session`, and `step` with it when given, as one write. */
export function saveSession(
  storage: StorageAdapter,
  session: AgentSession,
  step?: AgentStep,
): ResultAsync<void, StorageError> {
  return storage
    .batch([
      { kind: "saveAgentRecord", record: sessionRecord(session) },
      ...(step === undefined
        ? []
        : [{ kind: "saveAgentRecord" as const, record: stepRecord(step) }]),
    ])
    .map(() => undefined);
}

/** A stored agent record that isn't what its kind says. */
export type AgentRecordError = {
  kind: "invalid_agent_record";
  id: string;
  message: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const NEXT_MOVES: readonly unknown[] = ["user", "model", "tools"];

/**
 * A stored session, checked as far as the runner relies on it: its version,
 * role, scope, conversation and state. The rest is as the runner wrote it.
 */
export function readSession(
  record: StoredAgentRecord,
): Result<AgentSession, AgentRecordError> {
  const invalid = (message: string) =>
    err<AgentSession, AgentRecordError>({
      kind: "invalid_agent_record",
      id: record.id,
      message,
    });
  const data = record.data;
  if (record.kind !== "session" || !isObject(data)) {
    return invalid("not a session record");
  }
  if (data.version !== AGENT_RECORD_VERSION) {
    return invalid(`session record version ${String(data.version)}`);
  }
  if (!AGENT_ROLES.some((role) => role === data.role)) {
    return invalid(`unknown role ${String(data.role)}`);
  }
  if (
    !isObject(data.scope) ||
    !["world", "scene", "record"].includes(String(data.scope.kind))
  ) {
    return invalid("no scope");
  }
  if (!Array.isArray(data.messages) || !Array.isArray(data.runs)) {
    return invalid("no messages");
  }
  if (!NEXT_MOVES.includes(data.next)) {
    return invalid(`unknown next move ${String(data.next)}`);
  }
  if (typeof data.systemPrompt !== "string" || typeof data.steps !== "number") {
    return invalid("no system prompt or step count");
  }
  // The runner wrote it, and the fields it reads were checked above.
  return ok(data as unknown as AgentSession);
}

/** A stored step. Steps are only ever read back to inspect or replay. */
export function readStep(
  record: StoredAgentRecord,
): Result<AgentStep, AgentRecordError> {
  const data = record.data;
  if (
    record.kind !== "step" ||
    !isObject(data) ||
    data.version !== AGENT_RECORD_VERSION ||
    !isObject(data.request) ||
    !isObject(data.response) ||
    !Array.isArray(data.calls)
  ) {
    return err({
      kind: "invalid_agent_record",
      id: record.id,
      message: "not a step record of this version",
    });
  }
  // The runner wrote it, and the fields replay reads were checked above.
  return ok(data as unknown as AgentStep);
}

/** A session with every step it recorded, in order. */
export type SessionLog = { session: AgentSession; steps: AgentStep[] };

export type LoadSessionError =
  | StorageError
  | AgentRecordError
  | { kind: "no_session"; id: string };

/** The session `id` and its steps, as stored. */
export function loadSessionLog(
  storage: StorageAdapter,
  id: string,
): ResultAsync<SessionLog, LoadSessionError> {
  return storage.agentRecords
    .listForSession(id)
    .mapErr((error): LoadSessionError => error)
    .andThen((records) => {
      const head = records.find((r) => r.id === sessionRecordId(id));
      if (head === undefined) {
        return err<SessionLog, LoadSessionError>({ kind: "no_session", id });
      }
      const session = readSession(head);
      if (session.isErr()) return err(session.error);
      const steps: AgentStep[] = [];
      for (const record of records) {
        if (record.kind !== "step") continue;
        const step = readStep(record);
        if (step.isErr()) return err(step.error);
        steps.push(step.value);
      }
      return ok({ session: session.value, steps });
    });
}

/** Every stored session, oldest first, without their steps. */
export function listSessions(
  storage: StorageAdapter,
): ResultAsync<AgentSession[], StorageError | AgentRecordError> {
  return storage.agentRecords
    .list()
    .mapErr((error): StorageError | AgentRecordError => error)
    .andThen((records) => {
      const sessions: AgentSession[] = [];
      for (const record of records) {
        if (record.kind !== "session") continue;
        const session = readSession(record);
        if (session.isErr()) return err(session.error);
        sessions.push(session.value);
      }
      sessions.sort((a, b) => a.createdAt - b.createdAt);
      return ok(sessions);
    });
}
