/**
 * The story agent runner: a multi-turn tool-calling loop between a model and
 * the story bible, owned by the app rather than by a model vendor's agent
 * framework. It decides everything the model sees: the system prompt
 * (`./prompt.ts`, editable per session with `configure`), the context packet
 * assembled from the store at each writer message (`./context.ts`), which the
 * writer may edit before it is sent, the tools offered
 * (`./profiles.ts`), and which backend and sampler each role uses. Every step
 * is logged in storage as it happens (`./records.ts`).
 *
 * A run starts with a writer message (`send`) or a `resume`, and calls the
 * model, runs the story tools it asks for, and calls it again, until the
 * model answers without calling a tool. It stops earlier, resumably, when:
 * - `shouldPause` returns true, checked before each model call and each tool
 *   call;
 * - it has made `maxSteps` model calls this run;
 * - the session asks for approval of edits and the model wants to make one
 *   (`resume` runs them, `resume` with `decline` refuses them);
 * - a model call fails (`resume` tries again).
 * Aborting `signal` cancels the run instead: the model call in flight is
 * dropped, calls not yet run are answered as cancelled, and the session
 * waits for the writer's next message.
 *
 * Nothing here touches the DOM; tests run it against a stub server and the
 * memory adapter.
 */

import { err, ok, type Result, ResultAsync } from "neverthrow";
import { buildRequest, type SendOptions, send } from "../llm/client";
import { parseToolArguments } from "../llm/parse";
import type {
  BackendProfile,
  ChatMessage,
  Completion,
  Fetch,
  LlmError,
  LlmRequest,
  Sampler,
  StreamDelta,
  ToolCall,
  ToolCallMessage,
  ToolDefinition,
} from "../llm/types";
import type { StorageAdapter } from "../storage/types";
import { loadStory } from "../story/store";
import {
  executeStoryToolCall,
  STORY_TOOLS,
  type StoryToolResult,
  storyTool,
  storyToolDefinitions,
  storyToolResultContent,
} from "../story/tools";
import {
  type AgentScope,
  buildContextPacket,
  type ContextError,
  type ContextPacket,
  packetText,
  scopeName,
  scopeProblem,
} from "./context";
import {
  type AgentRole,
  type ProfileBindings,
  type ToolAccess,
  toolAccess,
} from "./profiles";
import { defaultSystemPrompt } from "./prompt";
import {
  AGENT_RECORD_VERSION,
  type AgentRecordError,
  type AgentSession,
  type AgentStep,
  type LoadSessionError,
  readSession,
  readStep,
  type StepCall,
  type StepError,
  type StopReason,
  saveSession,
  sessionRecordId,
  stepRecordId,
} from "./records";

/** How the runner calls a model; `send` unless a test or replay says. */
export type Complete = (
  profile: BackendProfile,
  request: LlmRequest,
  options: SendOptions,
) => ResultAsync<Completion, LlmError>;

export const DEFAULT_MAX_STEPS = 12;

export type AgentRunnerOptions = {
  storage: StorageAdapter;
  bindings: ProfileBindings;
  /** For `send`; the global `fetch` by default. */
  fetch?: Fetch;
  /** Calls the model; `send` by default. Replay passes `replayModel`. */
  complete?: Complete;
  /** Epoch milliseconds; stamps records and story edits. */
  now?: () => number;
  /** A new session's ID. */
  newId?: () => string;
};

export type SessionSpec = {
  role: AgentRole;
  scope: AgentScope;
  /** Defaults to `defaultSystemPrompt(role)`. */
  systemPrompt?: string;
  /** Laid over the role binding's sampler; none by default. */
  sampler?: Sampler;
  /** Defaults to `DEFAULT_MAX_STEPS`. */
  maxSteps?: number;
  /** Stop for the writer's approval before any call that edits the bible. */
  approveMutations?: boolean;
  /** Defaults to one from `newId`. */
  id?: string;
};

/** What a run reports as it goes. `onEvent` must not throw. */
export type AgentEvent =
  /** A streamed piece of the model's answer, when the binding streams. */
  | { kind: "delta"; step: number; delta: StreamDelta }
  /** A model call finished (or failed) and its step was saved. */
  | { kind: "step"; step: AgentStep }
  /** A tool call was answered and saved. */
  | { kind: "call"; step: number; call: StepCall };

export type RunOptions = {
  /** Aborting cancels the run. */
  signal?: AbortSignal;
  /**
   * Checked before each model call and each tool call; true stops the run
   * there with `paused`, to go on with `resume`.
   */
  shouldPause?: () => boolean;
  onEvent?: (event: AgentEvent) => void;
};

export type MessageOptions = RunOptions & {
  /**
   * The context to send instead of a fresh packet: `packet`, assembled for
   * this session's scope and shown to the writer, and `text`, the packet as
   * the writer left it. When `text` differs from `packetText(packet)` it is
   * sent in the packet's place and kept on the run as `editedContext`.
   */
  context?: { packet: ContextPacket; text: string };
};

/**
 * Changes to a session, kept on its record. `sampler: null` drops the
 * session's sampler, so the binding's is used as it is.
 */
export type SessionChanges = {
  systemPrompt?: string;
  sampler?: Sampler | null;
};

export type ResumeOptions = RunOptions & {
  /**
   * When the model's calls wait (for approval, or after a pause between
   * them): refuse the ones not run yet, with this reason, instead of running
   * them. The model is then called again to answer the refusal.
   */
  decline?: string;
};

export type RunOutcome = {
  session: AgentSession;
  /**
   * `done`: the model answered without calling a tool. `stopped`: see
   * `session.stopped`; `resume` goes on. `cancelled`: the signal aborted it.
   */
  status: "done" | "stopped" | "cancelled";
  /** The steps this run made or added calls to, as saved. */
  steps: AgentStep[];
};

export type AgentError =
  | ContextError
  | LoadSessionError
  | AgentRecordError
  /** Another run of this session is going in this runner. */
  | { kind: "busy"; id: string }
  /** The session can't take this now; `message` says what it can take. */
  | { kind: "not_ready"; id: string; message: string };

export interface AgentRunner {
  /** Creates and saves a session. Makes no model call. */
  start(spec: SessionSpec): ResultAsync<AgentSession, AgentError>;
  /**
   * Sends the writer's message, with a fresh context packet or the one
   * `options.context` gives, and runs.
   */
  send(
    id: string,
    message: string,
    options?: MessageOptions,
  ): ResultAsync<RunOutcome, AgentError>;
  /**
   * Changes the session's system prompt or sampler for its next model
   * calls. The conversation's system message is the prompt, so a new prompt
   * replaces it; earlier steps keep the requests they sent. Refused while a
   * run of the session is going.
   */
  configure(
    id: string,
    changes: SessionChanges,
  ): ResultAsync<AgentSession, AgentError>;
  /** Goes on with a run that stopped. */
  resume(
    id: string,
    options?: ResumeOptions,
  ): ResultAsync<RunOutcome, AgentError>;
}

/** The tools a session with `access` offers, by name. */
function offeredTools(access: ToolAccess): {
  definitions: ToolDefinition[];
  names: ReadonlySet<string>;
} {
  const names = STORY_TOOLS.filter(
    (tool) =>
      access === "all" || (access === "queries" && tool.kind === "query"),
  ).map((tool) => tool.name);
  return {
    definitions: storyToolDefinitions(names),
    names: new Set(names),
  };
}

const refusedCall = (
  call: ToolCall,
  code: string,
  message: string,
): StoryToolResult => ({
  ok: false,
  tool: call.function.name,
  error: { kind: "refused", code, message },
});

function notOffered(call: ToolCall, names: ReadonlySet<string>) {
  const offered =
    names.size === 0
      ? "This session offers no tools."
      : `The tools are ${[...names].join(", ")}.`;
  return {
    result: {
      ok: false,
      tool: call.function.name,
      error: {
        kind: "unknown_tool",
        message: `${call.function.name} is not a tool of this session. ${offered}`,
      },
    } satisfies StoryToolResult,
    changes: [],
  };
}

function stepError(error: LlmError): StepError {
  return {
    kind: error.kind,
    message: error.message,
    ...(error.kind === "http" ? { status: error.status } : {}),
  };
}

/** The last assistant turn's calls that have no tool result yet. */
function unanswered(messages: readonly ChatMessage[]): ToolCall[] {
  let last = -1;
  for (const [i, m] of messages.entries()) {
    if (m.role === "assistant" && "tool_calls" in m) last = i;
  }
  const turn = messages[last];
  if (turn === undefined || !("tool_calls" in turn)) return [];
  const answered = new Set(
    messages
      .slice(last + 1)
      .flatMap((m) => (m.role === "tool" ? [m.tool_call_id] : [])),
  );
  return turn.tool_calls.filter((call) => !answered.has(call.id));
}

/**
 * The model's calls as the conversation will hold them. An id this session
 * already used is renamed, since some providers omit ids and the made-up
 * ones (`call_0`) restart on every response. Arguments that aren't a JSON
 * object are sent back as `{}`, since some servers refuse to render a turn
 * holding broken JSON; the tool result tells the model what was wrong.
 */
function conversationCalls(
  messages: readonly ChatMessage[],
  calls: readonly ToolCall[],
  step: number,
): ToolCall[] {
  const used = new Set(
    messages.flatMap((m) =>
      m.role === "assistant" && "tool_calls" in m
        ? m.tool_calls.map((c) => c.id)
        : [],
    ),
  );
  return calls.map((call) => {
    let id = call.id;
    for (let n = 1; used.has(id); n++) {
      id = `${call.id}~${step}${n === 1 ? "" : `.${n}`}`;
    }
    used.add(id);
    const args = parseToolArguments(call).isOk()
      ? call.function.arguments
      : "{}";
    return { ...call, id, function: { ...call.function, arguments: args } };
  });
}

export function createAgentRunner(options: AgentRunnerOptions): AgentRunner {
  const { storage, bindings } = options;
  const now = options.now ?? Date.now;
  const newId = options.newId ?? (() => crypto.randomUUID());
  const complete = options.complete ?? send;
  const running = new Set<string>();

  /** Runs `work` unless a run of `id` is going. */
  function exclusive<T>(
    id: string,
    work: () => Promise<Result<T, AgentError>>,
  ): ResultAsync<T, AgentError> {
    if (running.has(id)) {
      return new ResultAsync(Promise.resolve(err({ kind: "busy", id })));
    }
    running.add(id);
    return new ResultAsync(
      work().finally(() => {
        running.delete(id);
      }),
    );
  }

  function loadSession(id: string) {
    return storage.agentRecords
      .load(sessionRecordId(id))
      .mapErr(
        (error): AgentError =>
          error.kind === "not_found" ? { kind: "no_session", id } : error,
      )
      .andThen((record) => readSession(record));
  }

  function loadStep(session: AgentSession) {
    return storage.agentRecords
      .load(stepRecordId(session.id, session.steps))
      .mapErr((error): AgentError => error)
      .andThen((record) => readStep(record));
  }

  function start(spec: SessionSpec): ResultAsync<AgentSession, AgentError> {
    const at = now();
    const systemPrompt = spec.systemPrompt ?? defaultSystemPrompt(spec.role);
    const session: AgentSession = {
      version: AGENT_RECORD_VERSION,
      id: spec.id ?? newId(),
      role: spec.role,
      scope: spec.scope,
      systemPrompt,
      ...(spec.sampler === undefined ? {} : { sampler: spec.sampler }),
      maxSteps: spec.maxSteps ?? DEFAULT_MAX_STEPS,
      approveMutations: spec.approveMutations ?? false,
      messages: [{ role: "system", content: systemPrompt }],
      runs: [],
      next: "user",
      stopped: null,
      steps: 0,
      createdAt: at,
      updatedAt: at,
    };
    return new ResultAsync(
      (async (): Promise<Result<AgentSession, AgentError>> => {
        const story = await loadStory(storage);
        if (story.isErr()) return err(story.error);
        const problem = scopeProblem(story.value, spec.scope);
        if (problem !== undefined) return err(problem);
        const existing = await storage.agentRecords.load(
          sessionRecordId(session.id),
        );
        if (existing.isOk()) {
          return err({
            kind: "not_ready",
            id: session.id,
            message: `A session ${session.id} already exists`,
          });
        }
        if (existing.error.kind !== "not_found") return err(existing.error);
        const saved = await saveSession(storage, session);
        return saved.isErr() ? err(saved.error) : ok(session);
      })(),
    );
  }

  function sendMessage(
    id: string,
    message: string,
    run: MessageOptions = {},
  ): ResultAsync<RunOutcome, AgentError> {
    return exclusive(id, async () => {
      const loaded = await loadSession(id);
      if (loaded.isErr()) return err(loaded.error);
      const session = loaded.value;
      if (session.next === "tools") {
        return err({
          kind: "not_ready",
          id,
          message:
            "The model's last tool calls are not all answered: resume to run them, or resume with decline to refuse them",
        });
      }
      const given = run.context;
      if (
        given !== undefined &&
        scopeName(given.packet.scope) !== scopeName(session.scope)
      ) {
        return err({
          kind: "not_ready",
          id,
          message: `The context given is for ${scopeName(given.packet.scope)}, and this session is about ${scopeName(session.scope)}`,
        });
      }
      let packet: ContextPacket;
      if (given === undefined) {
        const built = await buildContextPacket(storage, session.scope);
        if (built.isErr()) return err(built.error);
        packet = built.value;
      } else {
        packet = given.packet;
      }
      const assembled = packetText(packet);
      const edited =
        given !== undefined && given.text !== assembled
          ? given.text
          : undefined;
      const index = session.runs.length + 1;
      const at = now();
      session.runs.push({
        index,
        message,
        context: packet,
        ...(edited === undefined ? {} : { editedContext: edited }),
        at,
      });
      session.messages.push({
        role: "user",
        content: `${edited ?? assembled}\n\n# The writer says\n\n${message}`,
      });
      session.next = "model";
      session.stopped = null;
      session.updatedAt = at;
      const saved = await saveSession(storage, session);
      if (saved.isErr()) return err(saved.error);
      return loop(session, undefined, run, index);
    });
  }

  function configure(
    id: string,
    changes: SessionChanges,
  ): ResultAsync<AgentSession, AgentError> {
    return exclusive(id, async () => {
      const loaded = await loadSession(id);
      if (loaded.isErr()) return err(loaded.error);
      const session = loaded.value;
      if (changes.systemPrompt !== undefined) {
        session.systemPrompt = changes.systemPrompt;
        session.messages[0] = { role: "system", content: changes.systemPrompt };
      }
      if (changes.sampler === null) delete session.sampler;
      else if (changes.sampler !== undefined) session.sampler = changes.sampler;
      session.updatedAt = now();
      const saved = await saveSession(storage, session);
      return saved.isErr() ? err(saved.error) : ok(session);
    });
  }

  function resume(
    id: string,
    run: ResumeOptions = {},
  ): ResultAsync<RunOutcome, AgentError> {
    return exclusive(id, async () => {
      const loaded = await loadSession(id);
      if (loaded.isErr()) return err(loaded.error);
      const session = loaded.value;
      if (session.next === "user") {
        return err({
          kind: "not_ready",
          id,
          message: "The session is waiting for the writer: send a message",
        });
      }
      let step: AgentStep | undefined;
      if (session.next === "tools") {
        const last = await loadStep(session);
        if (last.isErr()) return err(last.error);
        step = last.value;
        if (run.decline !== undefined) {
          const reason = run.decline;
          const declined = await answerAll(session, step, (call) =>
            refusedCall(
              call,
              "declined",
              `The writer declined this call${reason === "" ? "" : `: ${reason}`}`,
            ),
          );
          if (declined.isErr()) return err(declined.error);
          session.next = "model";
        }
      }
      session.stopped = null;
      return loop(session, step, run, session.runs.length);
    });
  }

  /**
   * Answers every call still waiting with `result` (a refusal), so the
   * conversation stays well formed, and saves the session and step.
   */
  async function answerAll(
    session: AgentSession,
    step: AgentStep,
    result: (call: ToolCall) => StoryToolResult,
  ): Promise<Result<void, AgentError>> {
    for (const call of unanswered(session.messages)) {
      const answer = result(call);
      session.messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: storyToolResultContent(answer),
      });
      step.calls.push({ call, result: answer, changes: [], at: now() });
    }
    step.finishedAt = now();
    session.updatedAt = step.finishedAt;
    return saveSession(storage, session, step).mapErr((e): AgentError => e);
  }

  async function loop(
    session: AgentSession,
    current: AgentStep | undefined,
    run: RunOptions,
    runIndex: number,
  ): Promise<Result<RunOutcome, AgentError>> {
    const binding = bindings[session.role];
    const offered = offeredTools(toolAccess(session.role, binding));
    const touched: AgentStep[] = [];
    const touch = (step: AgentStep) => {
      if (!touched.includes(step)) touched.push(step);
    };
    let step = current;
    // A resumed step whose calls were declined before the loop is this run's.
    if (step !== undefined) touch(step);
    let modelCalls = 0;
    const { signal, onEvent } = run;

    const save = async () => {
      session.updatedAt = now();
      return saveSession(storage, session, step).mapErr((e): AgentError => e);
    };
    const outcome = (status: RunOutcome["status"]): RunOutcome => ({
      session,
      status,
      steps: touched,
    });
    const stop = async (
      reason: StopReason,
    ): Promise<Result<RunOutcome, AgentError>> => {
      session.stopped = reason;
      const saved = await save();
      return saved.isErr() ? err(saved.error) : ok(outcome("stopped"));
    };
    const cancel = async (): Promise<Result<RunOutcome, AgentError>> => {
      if (session.next === "tools" && step !== undefined) {
        touch(step);
        const answered = await answerAll(session, step, (call) =>
          refusedCall(
            call,
            "cancelled",
            "The writer cancelled the run before this call ran",
          ),
        );
        if (answered.isErr()) return err(answered.error);
      }
      session.next = "user";
      session.stopped = null;
      const saved = await save();
      return saved.isErr() ? err(saved.error) : ok(outcome("cancelled"));
    };

    for (;;) {
      if (signal?.aborted) return cancel();
      if (session.next === "user") {
        const saved = await save();
        return saved.isErr() ? err(saved.error) : ok(outcome("done"));
      }
      if (run.shouldPause?.()) return stop("paused");

      if (session.next === "model") {
        if (modelCalls >= session.maxSteps) return stop("step_limit");
        modelCalls += 1;
        const index = session.steps + 1;
        const request = buildRequest(
          binding.profile,
          {
            kind: "chat",
            // A copy: the session goes on growing, the request must not.
            messages: [...session.messages],
            tools: offered.definitions,
          },
          {
            stream: binding.stream ?? false,
            ...(binding.sampler === undefined && session.sampler === undefined
              ? {}
              : { sampler: { ...binding.sampler, ...session.sampler } }),
          },
        );
        const startedAt = now();
        const sendOptions: SendOptions = {};
        if (signal !== undefined) sendOptions.signal = signal;
        if (options.fetch !== undefined) sendOptions.fetch = options.fetch;
        if (onEvent !== undefined) {
          sendOptions.onDelta = (delta) =>
            onEvent({ kind: "delta", step: index, delta });
        }
        const answer = await complete(binding.profile, request, sendOptions);
        step = {
          version: AGENT_RECORD_VERSION,
          session: session.id,
          index,
          run: runIndex,
          request,
          response: answer.isOk()
            ? { ok: true, completion: answer.value }
            : { ok: false, error: stepError(answer.error) },
          calls: [],
          startedAt,
          finishedAt: now(),
        };
        session.steps = index;
        touch(step);
        if (answer.isErr()) {
          if (answer.error.kind === "aborted") return cancel();
          const stopped = await stop("model_error");
          onEvent?.({ kind: "step", step });
          return stopped;
        }
        const completion = answer.value;
        const calls = conversationCalls(
          session.messages,
          completion.toolCalls,
          index,
        );
        if (calls.length === 0) {
          session.messages.push({
            role: "assistant",
            content: completion.text,
          });
          session.next = "user";
        } else {
          const turn: ToolCallMessage = {
            role: "assistant",
            content: completion.text === "" ? null : completion.text,
            tool_calls: calls,
          };
          session.messages.push(turn);
          session.next = "tools";
        }
        const saved = await save();
        if (saved.isErr()) return err(saved.error);
        onEvent?.({ kind: "step", step });
        const edits = calls.some(
          (call) =>
            offered.names.has(call.function.name) &&
            storyTool(call.function.name)?.kind === "mutation",
        );
        if (session.approveMutations && edits) return stop("approval");
        continue;
      }

      // session.next === "tools"
      if (step === undefined) {
        const last = await loadStep(session);
        if (last.isErr()) return err(last.error);
        step = last.value;
      }
      touch(step);
      const raw =
        step.response.ok === true ? step.response.completion.toolCalls : [];
      const waiting = unanswered(session.messages);
      const turn = [...session.messages]
        .reverse()
        .find(
          (m): m is ToolCallMessage =>
            m.role === "assistant" && "tool_calls" in m,
        );
      for (const call of waiting) {
        if (signal?.aborted) return cancel();
        if (run.shouldPause?.()) return stop("paused");
        // Run the call with the arguments the model wrote, so a broken
        // argument text is refused with what was wrong with it.
        const position =
          turn?.tool_calls.findIndex((c) => c.id === call.id) ?? -1;
        const written = raw[position]?.function.arguments;
        const actual: ToolCall =
          written === undefined
            ? call
            : { ...call, function: { ...call.function, arguments: written } };
        const at = now();
        const ran = offered.names.has(call.function.name)
          ? await executeStoryToolCall(storage, actual, at)
          : ok(notOffered(call, offered.names));
        if (ran.isErr()) return err(ran.error);
        const { result, changes } = ran.value;
        session.messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: storyToolResultContent(result),
        });
        const answered: StepCall = { call, result, changes, at };
        step.calls.push(answered);
        step.finishedAt = now();
        if (unanswered(session.messages).length === 0) session.next = "model";
        const saved = await save();
        if (saved.isErr()) return err(saved.error);
        onEvent?.({ kind: "call", step: step.index, call: answered });
      }
      session.next = "model";
    }
  }

  return { start, send: sendMessage, configure, resume };
}
