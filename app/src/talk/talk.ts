/**
 * Talk pages as typed commands: start a topic, take a turn in it, resolve,
 * archive or reopen it, rename it, and raise one as a model. The model's
 * turns run through the story agent runner (`agent/runner.ts`), one agent
 * session per topic, scoped to the topic's scope. Each model message is
 * signed with the profile and model it ran on, the stored step whose answer
 * it is, and the steps of the run (its tool-call trace).
 *
 * Nothing here touches the DOM; the app's topic sheet (`app/topics.tsx`)
 * and tests call the same commands.
 */

import { err, ok, type Result, ResultAsync } from "neverthrow";
import type { ScopeError } from "../agent/context";
import type { ModelBinding } from "../agent/profiles";
import { defaultSystemPrompt } from "../agent/prompt";
import {
  type AgentRecordError,
  type AgentStep,
  readSession,
  readStep,
  type StepCall,
  type StopReason,
  sessionRecordId,
  stepRecordId,
} from "../agent/records";
import {
  type AgentError,
  type AgentEvent,
  type Complete,
  createAgentRunner,
  type RunOutcome,
} from "../agent/runner";
import type { Fetch } from "../llm/types";
import type { StorageAdapter, StorageError } from "../storage/types";
import { loadStory, type StoryStoreError } from "../story/store";
import {
  type LoadTopicError,
  listTopics,
  loadTopic,
  type ModelAuthor,
  messageRecordId,
  saveTalk,
  TALK_RECORD_VERSION,
  type TalkAuthor,
  type TalkMessage,
  type TalkRecordError,
  type Topic,
  type TopicLog,
  type TopicScope,
  type TopicStatus,
  type TurnCall,
} from "./records";
import { agentScope, topicPrompt, topicScopeProblem } from "./scope";

/** The model topic turns run on, read at each turn. */
export type TalkModel = {
  binding: ModelBinding;
  /** The profile's label, as a model turn is signed: `Model · <label>`. */
  label: string;
};

export type TalkOptions = {
  storage: StorageAdapter;
  /** The model to use now; null when none is set up. */
  model: () => TalkModel | null;
  /** For the model calls; the global `fetch` by default. */
  fetch?: Fetch;
  /** Calls the model; the runner's default unless a test says. */
  complete?: Complete;
  /** Epoch milliseconds. */
  now?: () => number;
  /** A new topic's ID. */
  newId?: () => string;
};

export type TalkError =
  | LoadTopicError
  | AgentError
  | StoryStoreError
  | ScopeError
  /** No model is set up to take the turn. */
  | { kind: "no_model" }
  /** Only an open topic takes turns. */
  | { kind: "topic_closed"; id: string; status: TopicStatus }
  /** A topic is named before anything is said in it. */
  | { kind: "no_title" }
  | { kind: "empty_message" }
  /** A turn is running in this topic. */
  | { kind: "turn_running"; id: string }
  /** The topic's last turn stopped before the model answered: resume it. */
  | { kind: "turn_stopped"; id: string; reason: StopReason }
  | { kind: "topic_exists"; id: string };

/** Why the model's turn stopped before it answered, when it did. */
export type TurnStop = {
  reason: StopReason;
  /** The failed model call's message, for `model_error`. */
  error: string | null;
};

export type TurnOutcome = {
  /** The topic and its messages after the turn, as stored. */
  log: TopicLog;
  /**
   * `done`: the model answered, and its message is the last one. `stopped`:
   * see `stop`; `resume` goes on. `cancelled`: the writer stopped it.
   */
  status: RunOutcome["status"];
  stop: TurnStop | null;
};

/** A topic as the sheet shows it: its messages, and a turn left stopped. */
export type TopicView = TopicLog & { stop: TurnStop | null };

/** What a running turn reports, as the agent runner reports it. */
export type TurnOptions = {
  signal?: AbortSignal;
  onEvent?: (event: AgentEvent) => void;
};

export type NewTopic = {
  /** Defaults to one from `newId`. */
  id?: string;
  title: string;
  scope: TopicScope;
  /** The writer's first message. */
  message: string;
};

export type RaisedTopic = {
  id?: string;
  title: string;
  scope: TopicScope;
  /** The model's first message, saying why it raised the topic. */
  body: string;
  author: ModelAuthor;
  calls?: TurnCall[];
};

export interface Talk {
  /** Every topic, newest first. */
  list(): ResultAsync<Topic[], TalkError>;
  /** A topic, its messages, and whether its last turn stopped. */
  load(id: string): ResultAsync<TopicView, TalkError>;
  /**
   * Starts a topic with the writer's first message and runs the model's
   * turn. Nothing is stored unless the title, message, scope and model are
   * all there.
   */
  start(
    topic: NewTopic,
    run?: TurnOptions,
  ): ResultAsync<TurnOutcome, TalkError>;
  /** The writer's next message in an open topic, and the model's turn. */
  send(
    id: string,
    message: string,
    run?: TurnOptions,
  ): ResultAsync<TurnOutcome, TalkError>;
  /** Goes on with a turn that stopped (a failed call, the step limit). */
  resume(id: string, run?: TurnOptions): ResultAsync<TurnOutcome, TalkError>;
  rename(id: string, title: string): ResultAsync<Topic, TalkError>;
  /** Resolves, archives or reopens a topic. */
  setStatus(id: string, status: TopicStatus): ResultAsync<Topic, TalkError>;
  /** A topic the model starts, for the World inbox. Runs no turn. */
  raise(topic: RaisedTopic): ResultAsync<TopicLog, TalkError>;
}

/** The agent session a topic's turns run in. */
export const topicSessionId = (topic: string) => `talk-${topic}`;

/** A call's one-line summary, for the turn's fold line. */
function turnCall({ call, result }: StepCall): TurnCall {
  const summary = result.ok
    ? (result.lines.find((line) => line.trim() !== "") ?? "Done")
    : result.error.message;
  return { name: call.function.name, ok: result.ok, summary: summary.trim() };
}

/** The model's text across a run's steps, in order. */
function runText(steps: readonly AgentStep[]): string {
  return steps
    .flatMap((step) =>
      step.response.ok ? [step.response.completion.text.trim()] : [],
    )
    .filter((text) => text !== "")
    .join("\n\n");
}

export function createTalk(options: TalkOptions): Talk {
  const { storage } = options;
  const now = options.now ?? Date.now;
  const newId = options.newId ?? (() => crypto.randomUUID());
  const running = new Set<string>();

  /** Runs `work` unless a turn of `id` is running. */
  function exclusive<T>(
    id: string,
    work: () => Promise<Result<T, TalkError>>,
  ): ResultAsync<T, TalkError> {
    if (running.has(id)) {
      return new ResultAsync(
        Promise.resolve(err({ kind: "turn_running" as const, id })),
      );
    }
    running.add(id);
    return new ResultAsync(
      work().finally(() => {
        running.delete(id);
      }),
    );
  }

  const runner = (model: TalkModel) =>
    createAgentRunner({
      storage,
      // Topics run as `plan` sessions; `prose` is bound to the same model so
      // the bindings are whole, and is never used here.
      bindings: { plan: model.binding, prose: model.binding },
      now,
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      ...(options.complete === undefined ? {} : { complete: options.complete }),
    });

  /** Why the topic's session can't take a writer's message, if it can't. */
  async function sessionStop(
    topic: Topic,
  ): Promise<Result<TurnStop | null, TalkError>> {
    if (topic.session === null) return ok(null);
    const record = await storage.agentRecords.load(
      sessionRecordId(topic.session),
    );
    if (record.isErr()) {
      return record.error.kind === "not_found" ? ok(null) : err(record.error);
    }
    const session = readSession(record.value);
    if (session.isErr()) return err(session.error);
    const { next, stopped, steps } = session.value;
    if (next === "user" || stopped === null) return ok(null);
    let error: string | null = null;
    if (stopped === "model_error" && steps > 0) {
      const step = await storage.agentRecords
        .load(stepRecordId(session.value.id, steps))
        .mapErr((e): TalkError => e)
        .andThen((r) => readStep(r).mapErr((e): TalkError => e));
      if (step.isOk() && !step.value.response.ok) {
        error = step.value.response.error.message;
      }
    }
    return ok({ reason: stopped, error });
  }

  /**
   * Every step of the writer message `run` that ended in `outcome`: the ones
   * this run made, after the ones earlier runs of it made before stopping.
   */
  async function runSteps(
    session: string,
    run: number,
    made: readonly AgentStep[],
  ): Promise<Result<AgentStep[], TalkError>> {
    const steps = [...made].sort((a, b) => a.index - b.index);
    let index = (steps[0]?.index ?? 1) - 1;
    while (index > 0) {
      const loaded = await storage.agentRecords.load(
        stepRecordId(session, index),
      );
      if (loaded.isErr()) return err(loaded.error);
      const step = readStep(loaded.value);
      if (step.isErr()) return err(step.error);
      if (step.value.run !== run) break;
      steps.unshift(step.value);
      index -= 1;
    }
    return ok(steps);
  }

  /** Records the model's answer when the run is done, and reports the turn. */
  async function finish(
    topic: Topic,
    model: TalkModel,
    outcome: RunOutcome,
  ): Promise<Result<TurnOutcome, TalkError>> {
    const { session } = outcome;
    if (outcome.status !== "done") {
      const stop = await sessionStop(topic);
      if (stop.isErr()) return err(stop.error);
      const log = await loadTopic(storage, topic.id);
      if (log.isErr()) return err(log.error);
      return ok({ log: log.value, status: outcome.status, stop: stop.value });
    }
    const steps = await runSteps(
      session.id,
      session.runs.length,
      outcome.steps,
    );
    if (steps.isErr()) return err(steps.error);
    const last = steps.value.at(-1);
    const at = now();
    const author: ModelAuthor = {
      kind: "model",
      profile: model.label,
      model: model.binding.profile.model ?? "",
      session: session.id,
      requestId:
        last === undefined ? null : stepRecordId(session.id, last.index),
      trace: steps.value.map((step) => stepRecordId(session.id, step.index)),
    };
    const index = topic.messages + 1;
    const message: TalkMessage = {
      version: TALK_RECORD_VERSION,
      id: messageRecordId(topic.id, index),
      topic: topic.id,
      index,
      author,
      body: runText(steps.value),
      calls: steps.value.flatMap((step) => step.calls.map(turnCall)),
      createdAt: at,
    };
    const next: Topic = { ...topic, messages: index, updatedAt: at };
    const saved = await saveTalk(storage, next, [message]);
    if (saved.isErr()) return err(saved.error);
    const log = await loadTopic(storage, topic.id);
    if (log.isErr()) return err(log.error);
    return ok({ log: log.value, status: "done", stop: null });
  }

  /**
   * Stores the writer's message (and the topic, with its session) and runs
   * the model's turn. `fresh` is a topic not stored yet.
   */
  async function take(
    topic: Topic,
    text: string,
    model: TalkModel,
    run: TurnOptions,
  ): Promise<Result<TurnOutcome, TalkError>> {
    const agent = runner(model);
    let current = topic;
    if (current.session === null) {
      const id = topicSessionId(current.id);
      // A session left by a first turn whose topic failed to save is reused:
      // it holds no message yet, since the session starts before the save.
      const left = await storage.agentRecords.load(sessionRecordId(id));
      if (left.isOk()) {
        current = { ...current, session: id };
      } else if (left.error.kind !== "not_found") {
        return err(left.error);
      }
    }
    if (current.session === null) {
      const story = await loadStory(storage);
      if (story.isErr()) return err(story.error);
      const id = topicSessionId(current.id);
      const started = await agent.start({
        id,
        role: "plan",
        scope: agentScope(current.scope),
        systemPrompt: [
          defaultSystemPrompt("plan"),
          topicPrompt(story.value, current.title, current.scope),
        ].join("\n\n"),
      });
      if (started.isErr()) return err(started.error);
      current = { ...current, session: id };
    }
    const at = now();
    const index = current.messages + 1;
    const message: TalkMessage = {
      version: TALK_RECORD_VERSION,
      id: messageRecordId(current.id, index),
      topic: current.id,
      index,
      author: { kind: "human" },
      body: text,
      calls: [],
      createdAt: at,
    };
    current = { ...current, messages: index, updatedAt: at };
    const saved = await saveTalk(storage, current, [message]);
    if (saved.isErr()) return err(saved.error);
    const session = current.session ?? topicSessionId(current.id);
    const outcome = await agent.send(session, text, run);
    if (outcome.isErr()) return err(outcome.error);
    return finish(current, model, outcome.value);
  }

  const modelNow = (): Result<TalkModel, TalkError> => {
    const model = options.model();
    return model === null ? err({ kind: "no_model" }) : ok(model);
  };

  function load(id: string): ResultAsync<TopicView, TalkError> {
    return loadTopic(storage, id)
      .mapErr((e): TalkError => e)
      .andThen((log) =>
        new ResultAsync(sessionStop(log.topic)).map((stop) => ({
          ...log,
          stop,
        })),
      );
  }

  /** Loads `id`, changes it with `change`, and saves it. */
  function update(
    id: string,
    change: (topic: Topic) => Result<Topic, TalkError>,
  ): ResultAsync<Topic, TalkError> {
    return loadTopic(storage, id)
      .mapErr((e): TalkError => e)
      .andThen(({ topic }) => change(topic))
      .andThen((topic) =>
        saveTalk(storage, topic)
          .mapErr((e): TalkError => e)
          .map(() => topic),
      );
  }

  return {
    list: () => listTopics(storage).mapErr((e): TalkError => e),

    load,

    start(spec, run = {}) {
      const id = spec.id ?? newId();
      return exclusive(id, async () => {
        const title = spec.title.trim();
        const text = spec.message.trim();
        if (title === "") return err({ kind: "no_title" });
        if (text === "") return err({ kind: "empty_message" });
        const model = modelNow();
        if (model.isErr()) return err(model.error);
        const existing = await loadTopic(storage, id);
        if (existing.isOk()) return err({ kind: "topic_exists", id });
        if (existing.error.kind !== "no_topic") return err(existing.error);
        const story = await loadStory(storage);
        if (story.isErr()) return err(story.error);
        const problem = topicScopeProblem(story.value, spec.scope);
        if (problem !== undefined) {
          return err({ kind: "invalid_scope", message: problem });
        }
        const at = now();
        const topic: Topic = {
          version: TALK_RECORD_VERSION,
          id,
          title,
          scope: spec.scope,
          status: "open",
          startedBy: { kind: "human" },
          session: null,
          messages: 0,
          createdAt: at,
          updatedAt: at,
          closedAt: null,
        };
        return take(topic, text, model.value, run);
      });
    },

    send(id, message, run = {}) {
      return exclusive(id, async () => {
        const text = message.trim();
        if (text === "") return err({ kind: "empty_message" });
        const log = await loadTopic(storage, id);
        if (log.isErr()) return err(log.error);
        const { topic } = log.value;
        if (topic.status !== "open") {
          return err({ kind: "topic_closed", id, status: topic.status });
        }
        if (topic.title.trim() === "") return err({ kind: "no_title" });
        const stop = await sessionStop(topic);
        if (stop.isErr()) return err(stop.error);
        if (stop.value !== null) {
          return err({ kind: "turn_stopped", id, reason: stop.value.reason });
        }
        const model = modelNow();
        if (model.isErr()) return err(model.error);
        return take(topic, text, model.value, run);
      });
    },

    resume(id, run = {}) {
      return exclusive(id, async () => {
        const log = await loadTopic(storage, id);
        if (log.isErr()) return err(log.error);
        const { topic } = log.value;
        if (topic.status !== "open") {
          return err({ kind: "topic_closed", id, status: topic.status });
        }
        const model = modelNow();
        if (model.isErr()) return err(model.error);
        const outcome = await runner(model.value).resume(
          topic.session ?? topicSessionId(id),
          run,
        );
        if (outcome.isErr()) return err(outcome.error);
        return finish(topic, model.value, outcome.value);
      });
    },

    rename: (id, title) =>
      update(id, (topic) => {
        const trimmed = title.trim();
        if (trimmed === "") return err({ kind: "no_title" });
        if (topic.status !== "open") {
          return err({ kind: "topic_closed", id, status: topic.status });
        }
        return ok({ ...topic, title: trimmed, updatedAt: now() });
      }),

    setStatus: (id, status) =>
      update(id, (topic) => {
        const at = now();
        return ok({
          ...topic,
          status,
          updatedAt: at,
          closedAt: status === "open" ? null : at,
        });
      }),

    raise(spec) {
      const id = spec.id ?? newId();
      return new ResultAsync(
        (async (): Promise<Result<TopicLog, TalkError>> => {
          const title = spec.title.trim();
          if (title === "") return err({ kind: "no_title" });
          const existing = await loadTopic(storage, id);
          if (existing.isOk()) return err({ kind: "topic_exists", id });
          if (existing.error.kind !== "no_topic") return err(existing.error);
          const story = await loadStory(storage);
          if (story.isErr()) return err(story.error);
          const problem = topicScopeProblem(story.value, spec.scope);
          if (problem !== undefined) {
            return err({ kind: "invalid_scope", message: problem });
          }
          const at = now();
          const author: TalkAuthor = spec.author;
          const topic: Topic = {
            version: TALK_RECORD_VERSION,
            id,
            title,
            scope: spec.scope,
            status: "open",
            startedBy: author,
            session: null,
            messages: 1,
            createdAt: at,
            updatedAt: at,
            closedAt: null,
          };
          const message: TalkMessage = {
            version: TALK_RECORD_VERSION,
            id: messageRecordId(id, 1),
            topic: id,
            index: 1,
            author,
            body: spec.body,
            calls: spec.calls ?? [],
            createdAt: at,
          };
          const saved = await saveTalk(storage, topic, [message]);
          if (saved.isErr()) return err(saved.error);
          return ok({ topic, messages: [message] });
        })(),
      );
    },
  };
}

/** A talk error as one sentence for the writer. */
export function describeTalkError(error: TalkError): string {
  switch (error.kind) {
    case "no_model":
      return "No model is set up. Set one up to talk with it.";
    case "topic_closed":
      return `This topic is ${error.status}. Reopen it to go on.`;
    case "no_title":
      return "Name this topic first.";
    case "empty_message":
      return "Write something to send.";
    case "turn_running":
    case "busy":
      return "A turn is running in this topic. Stop it or let it finish first.";
    case "turn_stopped":
      return "The model's last turn stopped before it answered. Try it again first.";
    case "topic_exists":
      return "A topic with this ID already exists.";
    case "invalid_scope":
      return error.message;
    case "no_topic":
      return "This topic doesn't exist (any more).";
    case "no_session":
      return "This topic's agent session is missing.";
    case "not_ready":
      return error.message;
    case "invalid_talk_record":
    case "invalid_agent_record":
      return `A stored record can't be read (${error.id}): ${error.message}`;
    case "not_found":
      return `Storage has no ${error.collection} record ${error.id}.`;
    case "read_only":
      return "This tab is read-only: another tab holds the world.";
    case "failure":
      return error.message;
    default:
      // Story errors: each says what went wrong.
      return error.message;
  }
}

export type { AgentRecordError, StorageError, TalkRecordError };
