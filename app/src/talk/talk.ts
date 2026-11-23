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

import {
  err,
  errAsync,
  ok,
  okAsync,
  type Result,
  ResultAsync,
} from "neverthrow";
import {
  type AgentScope,
  buildContextPacket,
  type ContextPacket,
  type ScopeError,
} from "../agent/context";
import {
  type AgentDefaultsStore,
  createAgentDefaultsStore,
} from "../agent/defaults";
import {
  type NextTurnEdits,
  type NextTurnError,
  sendNextTurn,
} from "../agent/next-turn";
import type { ModelBinding } from "../agent/profiles";
import {
  type AgentRecordError,
  type AgentSession,
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
import { mergeSampler } from "../llm/client";
import type { ChatMessage, Fetch, Sampler } from "../llm/types";
import type { StorageAdapter, StorageError } from "../storage/types";
import { loadStory, type StoryStoreError } from "../story/store";
import type { Story } from "../story/story";
import {
  type LoadTopicError,
  listTopics,
  loadTopic,
  loadTopicRecord,
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
import {
  agentScope,
  TOPIC_PROMPT_HEADING,
  topicPrompt,
  topicScopeProblem,
} from "./scope";

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
  /**
   * What a topic's new agent session starts with: the profile defaults the
   * writer saved from the agent slip. Kept in memory when not given.
   */
  defaults?: AgentDefaultsStore;
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
  | NextTurnError
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
  /**
   * The writer's edits from the next-turn slip, sent with the message
   * (`agent/next-turn.ts`). A system prompt saved as the profile default
   * is saved without this topic's own part (`profilePrompt`).
   */
  edits?: NextTurnEdits;
};

/**
 * What a topic's next turn would send before the writer's edits, for the
 * next-turn slip: the session's prompt, model and sampler (or what a new
 * session would start with), the profile's, and the context packet.
 */
export type NextTurnRequest = {
  systemPrompt: string;
  /** The model the session asks for in place of the profile's, or null. */
  model: string | null;
  /** The profile's own model, or null when it names none. */
  profileModel: string | null;
  /** What the session lays over `profileSampler`. */
  sampler: Sampler;
  /** The profile's sampler with the talk binding's laid over it. */
  profileSampler: Sampler;
  packet: ContextPacket;
};

/** A topic not stored yet: its title and scope, as the writer has them. */
export type UnsentTopic = { title: string; scope: TopicScope };

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
  /**
   * What topic `id`'s next turn would send. `unsent` describes the topic
   * when it isn't stored yet (a new topic before its first Send).
   */
  nextTurn(
    id: string,
    unsent?: UnsentTopic,
  ): ResultAsync<NextTurnRequest, TalkError>;
}

/** The agent session a topic's turns run in. */
export const topicSessionId = (topic: string) => `talk-${topic}`;

/**
 * A topic session's system prompt without the topic's own part (the
 * profile's prompt, then `topicPrompt`): what a "Profile default" edit
 * saves, so the next topic gets its own part and not this one's. A prompt
 * whose topic part the writer took out is saved whole.
 */
export function profilePrompt(prompt: string): string {
  const at = prompt.lastIndexOf(`\n\n${TOPIC_PROMPT_HEADING}\n`);
  return at === -1 ? prompt : prompt.slice(0, at);
}

/** Saves a topic session's prompt default without its topic part. */
const topicDefaults = (store: AgentDefaultsStore): AgentDefaultsStore => ({
  get: (profile, role) => store.get(profile, role),
  save: (profile, role, changes) =>
    store.save(
      profile,
      role,
      changes.systemPrompt === undefined
        ? changes
        : { ...changes, systemPrompt: profilePrompt(changes.systemPrompt) },
    ),
});

/** Defaults kept for this talk service only, when the app gives none. */
function memoryDefaults(): AgentDefaultsStore {
  const items = new Map<string, string>();
  return createAgentDefaultsStore(
    {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => void items.set(key, value),
    },
    "talk",
  );
}

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
  const defaults = topicDefaults(options.defaults ?? memoryDefaults());
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

  const queues = new Map<string, Promise<unknown>>();

  /**
   * Runs `work` after every earlier write of topic `id` has finished, so two
   * read-modify-writes of a topic (a turn's bookkeeping and a rename, say)
   * never overwrite each other.
   */
  function serial<T>(id: string, work: () => Promise<T>): Promise<T> {
    const before = queues.get(id) ?? Promise.resolve();
    const next = before.then(work, work);
    const tail = next.then(
      () => undefined,
      () => undefined,
    );
    queues.set(id, tail);
    void tail.then(() => {
      if (queues.get(id) === tail) queues.delete(id);
    });
    return next;
  }

  /**
   * Reads topic `id` as stored (null when it isn't), applies `change`, and
   * saves the topic with the messages it adds, as one write, after every
   * earlier write of the topic. `change` returning null writes nothing.
   */
  function commit(
    id: string,
    change: (
      stored: Topic | null,
    ) => Result<{ topic: Topic; messages: TalkMessage[] } | null, TalkError>,
  ): Promise<Result<Topic | null, TalkError>> {
    return serial(id, async () => {
      const stored = await loadTopicRecord(storage, id);
      if (stored.isErr()) return err(stored.error);
      const changed = change(stored.value);
      if (changed.isErr()) return err(changed.error);
      if (changed.value === null) return ok(stored.value);
      const { topic, messages } = changed.value;
      const saved = await saveTalk(storage, topic, messages);
      return saved.isErr() ? err(saved.error) : ok(topic);
    });
  }

  /** Every stored step of the session's writer message `run`, in order. */
  async function runSteps(
    session: AgentSession,
    run: number,
  ): Promise<Result<AgentStep[], TalkError>> {
    const steps: AgentStep[] = [];
    for (let index = session.steps; index > 0; index -= 1) {
      const loaded = await storage.agentRecords.load(
        stepRecordId(session.id, index),
      );
      if (loaded.isErr()) return err(loaded.error);
      const step = readStep(loaded.value);
      if (step.isErr()) return err(step.error);
      if (step.value.run < run) break;
      if (step.value.run === run) steps.unshift(step.value);
    }
    return ok(steps);
  }

  /**
   * Records the model's answer to the session's last writer message as the
   * topic's next message, if that run finished with an answer and the topic
   * hasn't recorded it yet. The answer, its calls and its trace come from
   * the run's stored steps, so this can run again after a failed save, from
   * any later command, and records the answer exactly once.
   */
  async function recordAnswer(
    topicId: string,
    sessionId: string,
    model: TalkModel | null,
  ): Promise<Result<void, TalkError>> {
    const record = await storage.agentRecords.load(sessionRecordId(sessionId));
    if (record.isErr()) {
      return record.error.kind === "not_found"
        ? ok(undefined)
        : err(record.error);
    }
    const read = readSession(record.value);
    if (read.isErr()) return err(read.error);
    const session = read.value;
    const run = session.runs.length;
    const last = session.messages.at(-1);
    // A run the writer cancelled, or one still going, has no answer.
    if (
      session.next !== "user" ||
      run === 0 ||
      last?.role !== "assistant" ||
      "tool_calls" in last
    ) {
      return ok(undefined);
    }
    const stored = await loadTopicRecord(storage, topicId);
    if (stored.isErr()) return err(stored.error);
    if (stored.value === null || stored.value.answered >= run) {
      return ok(undefined);
    }
    const steps = await runSteps(session, run);
    if (steps.isErr()) return err(steps.error);
    const final = steps.value.at(-1);
    const request = final?.request;
    const sameProfile =
      model !== null && request?.profile === model.binding.profile.name;
    const sentModel = request?.body.model;
    const author: ModelAuthor = {
      kind: "model",
      profile: sameProfile ? model.label : (request?.profile ?? ""),
      model: typeof sentModel === "string" ? sentModel : "",
      session: session.id,
      requestId:
        final === undefined ? null : stepRecordId(session.id, final.index),
      trace: steps.value.map((step) => stepRecordId(session.id, step.index)),
    };
    const at = now();
    const done = await commit(topicId, (topic) => {
      // Recorded meanwhile, by another command.
      if (topic === null || topic.answered >= run) return ok(null);
      const index = topic.messages + 1;
      const message: TalkMessage = {
        version: TALK_RECORD_VERSION,
        id: messageRecordId(topicId, index),
        topic: topicId,
        index,
        author,
        body: runText(steps.value),
        calls: steps.value.flatMap((step) => step.calls.map(turnCall)),
        createdAt: at,
      };
      return ok({
        topic: { ...topic, messages: index, answered: run, updatedAt: at },
        messages: [message],
      });
    });
    return done.map(() => undefined);
  }

  /** Records an answer left unrecorded, if the topic has a session. */
  async function reconcile(
    topic: Topic,
    model: TalkModel | null,
  ): Promise<Result<void, TalkError>> {
    return topic.session === null
      ? ok(undefined)
      : recordAnswer(topic.id, topic.session, model);
  }

  async function view(id: string): Promise<Result<TopicView, TalkError>> {
    const log = await loadTopic(storage, id);
    if (log.isErr()) return err(log.error);
    const stop = await sessionStop(log.value.topic);
    if (stop.isErr()) return err(stop.error);
    return ok({ ...log.value, stop: stop.value });
  }

  /** Records the model's answer when the run is done, and reports the turn. */
  async function finish(
    topicId: string,
    model: TalkModel,
    outcome: RunOutcome,
  ): Promise<Result<TurnOutcome, TalkError>> {
    if (outcome.status === "done") {
      const recorded = await recordAnswer(topicId, outcome.session.id, model);
      if (recorded.isErr()) return err(recorded.error);
    }
    const shown = await view(topicId);
    if (shown.isErr()) return err(shown.error);
    const { stop, ...log } = shown.value;
    return ok({ log, status: outcome.status, stop });
  }

  /** The topic's turns so far, as the conversation a new session takes up. */
  const history = (messages: readonly TalkMessage[]): ChatMessage[] =>
    messages.map((message) =>
      message.author.kind === "human"
        ? { role: "user", content: message.body }
        : { role: "assistant", content: message.body },
    );

  /**
   * Stores the writer's message (and the topic, with its session) and runs
   * the model's turn. `fresh` is the topic to store when none is stored yet.
   */
  async function take(
    fresh: Topic,
    text: string,
    model: TalkModel,
    run: TurnOptions,
  ): Promise<Result<TurnOutcome, TalkError>> {
    const agent = runner(model);
    const id = fresh.id;
    let session = fresh.session;
    if (session === null) {
      const sessionId = topicSessionId(id);
      // A session left by a first turn whose topic failed to save is reused:
      // it holds no message yet, since the session starts before the save.
      const left = await storage.agentRecords.load(sessionRecordId(sessionId));
      if (left.isOk()) {
        session = sessionId;
      } else if (left.error.kind !== "not_found") {
        return err(left.error);
      }
    }
    if (session === null) {
      const story = await loadStory(storage);
      if (story.isErr()) return err(story.error);
      // What was said before the first turn (a raised topic's opening).
      const earlier = await loadTopic(storage, id);
      const said = earlier.isOk()
        ? earlier.value.messages
        : earlier.error.kind === "no_topic"
          ? []
          : null;
      if (said === null && earlier.isErr()) return err(earlier.error);
      const sessionId = topicSessionId(id);
      const started = await agent.start({
        id: sessionId,
        role: "plan",
        scope: agentScope(fresh.scope),
        ...newSession(model, story.value, fresh.title, fresh.scope),
        history: history(said ?? []),
      });
      if (started.isErr()) return err(started.error);
      session = sessionId;
    }
    const sessionId = session;
    const at = now();
    const saved = await commit(id, (stored) => {
      const base = stored ?? fresh;
      const index = base.messages + 1;
      const message: TalkMessage = {
        version: TALK_RECORD_VERSION,
        id: messageRecordId(id, index),
        topic: id,
        index,
        author: { kind: "human" },
        body: text,
        calls: [],
        createdAt: at,
      };
      return ok({
        topic: { ...base, session: sessionId, messages: index, updatedAt: at },
        messages: [message],
      });
    });
    if (saved.isErr()) return err(saved.error);
    const { edits, ...options } = run;
    let outcome: Result<RunOutcome, TalkError>;
    if (edits === undefined || Object.keys(edits).length === 0) {
      outcome = await agent.send(sessionId, text, options);
    } else {
      const loaded = await loadSession(sessionId);
      if (loaded.isErr()) return err(loaded.error);
      if (loaded.value === null) {
        return err({ kind: "no_session", id: sessionId });
      }
      outcome = await sendNextTurn(
        { runner: agent, defaults, profile: model.binding.profile.name },
        loaded.value,
        text,
        edits,
        options,
      );
    }
    if (outcome.isErr()) return err(outcome.error);
    return finish(id, model, outcome.value);
  }

  /** What a topic's new session starts with: the profile's defaults. */
  function newSession(
    model: TalkModel,
    story: Story,
    title: string,
    scope: TopicScope,
  ): { systemPrompt: string; model?: string; sampler?: Sampler } {
    const saved = defaults.get(model.binding.profile.name, "plan");
    return {
      ...saved,
      systemPrompt: [saved.systemPrompt, topicPrompt(story, title, scope)].join(
        "\n\n",
      ),
    };
  }

  /** Session `id` as stored; null when there is none. */
  async function loadSession(
    id: string,
  ): Promise<Result<AgentSession | null, TalkError>> {
    const record = await storage.agentRecords.load(sessionRecordId(id));
    if (record.isErr()) {
      return record.error.kind === "not_found" ? ok(null) : err(record.error);
    }
    return readSession(record.value);
  }

  const modelNow = (): Result<TalkModel, TalkError> => {
    const model = options.model();
    return model === null ? err({ kind: "no_model" }) : ok(model);
  };

  /** Loads `id`, changes it with `change`, and saves it, in the topic's queue. */
  function update(
    id: string,
    change: (topic: Topic) => Result<Topic, TalkError>,
  ): ResultAsync<Topic, TalkError> {
    return new ResultAsync(
      commit(id, (stored) =>
        stored === null
          ? err({ kind: "no_topic", id })
          : change(stored).map((topic) => ({ topic, messages: [] })),
      ),
    ).andThen((topic) =>
      topic === null
        ? errAsync<Topic, TalkError>({ kind: "no_topic", id })
        : okAsync<Topic, TalkError>(topic),
    );
  }

  return {
    list: () => listTopics(storage).mapErr((e): TalkError => e),

    load: (id) =>
      new ResultAsync(
        (async (): Promise<Result<TopicView, TalkError>> => {
          // Best effort: a read-only tab can't record, and still reads.
          if (!running.has(id)) {
            const topic = await loadTopicRecord(storage, id);
            if (topic.isOk() && topic.value !== null) {
              await reconcile(topic.value, options.model());
            }
          }
          return view(id);
        })(),
      ),

    start(spec, run = {}) {
      const id = spec.id ?? newId();
      return exclusive(id, async () => {
        const title = spec.title.trim();
        const text = spec.message.trim();
        if (title === "") return err({ kind: "no_title" });
        if (text === "") return err({ kind: "empty_message" });
        const model = modelNow();
        if (model.isErr()) return err(model.error);
        const existing = await loadTopicRecord(storage, id);
        if (existing.isErr()) return err(existing.error);
        if (existing.value !== null) return err({ kind: "topic_exists", id });
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
          answered: 0,
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
        const model = modelNow();
        if (model.isErr()) return err(model.error);
        const loaded = await loadTopicRecord(storage, id);
        if (loaded.isErr()) return err(loaded.error);
        if (loaded.value === null) return err({ kind: "no_topic", id });
        // An answer a failed save left out goes in before the next message.
        const reconciled = await reconcile(loaded.value, model.value);
        if (reconciled.isErr()) return err(reconciled.error);
        const stored = await loadTopicRecord(storage, id);
        if (stored.isErr()) return err(stored.error);
        const topic = stored.value;
        if (topic === null) return err({ kind: "no_topic", id });
        if (topic.status !== "open") {
          return err({ kind: "topic_closed", id, status: topic.status });
        }
        if (topic.title.trim() === "") return err({ kind: "no_title" });
        const stop = await sessionStop(topic);
        if (stop.isErr()) return err(stop.error);
        if (stop.value !== null) {
          return err({ kind: "turn_stopped", id, reason: stop.value.reason });
        }
        return take(topic, text, model.value, run);
      });
    },

    resume(id, run = {}) {
      return exclusive(id, async () => {
        const model = modelNow();
        if (model.isErr()) return err(model.error);
        const stored = await loadTopicRecord(storage, id);
        if (stored.isErr()) return err(stored.error);
        const topic = stored.value;
        if (topic === null) return err({ kind: "no_topic", id });
        if (topic.status !== "open") {
          return err({ kind: "topic_closed", id, status: topic.status });
        }
        const stop = await sessionStop(topic);
        if (stop.isErr()) return err(stop.error);
        if (stop.value === null) {
          // Nothing to go on with: record an answer a failed save left out.
          const reconciled = await reconcile(topic, model.value);
          if (reconciled.isErr()) return err(reconciled.error);
          const shown = await view(id);
          if (shown.isErr()) return err(shown.error);
          const { stop: none, ...log } = shown.value;
          return ok({ log, status: "done", stop: none });
        }
        const outcome = await runner(model.value).resume(
          topic.session ?? topicSessionId(id),
          run,
        );
        if (outcome.isErr()) return err(outcome.error);
        return finish(id, model.value, outcome.value);
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

    nextTurn: (id, unsent) =>
      new ResultAsync(
        (async (): Promise<Result<NextTurnRequest, TalkError>> => {
          const model = modelNow();
          if (model.isErr()) return err(model.error);
          const { profile, sampler: bound } = model.value.binding;
          const stored = await loadTopicRecord(storage, id);
          if (stored.isErr()) return err(stored.error);
          const topic = stored.value ?? unsent;
          if (topic === undefined) return err({ kind: "no_topic", id });
          // The topic's session, or the one a first turn left (see `take`).
          const session = await loadSession(
            stored.value?.session ?? topicSessionId(id),
          );
          if (session.isErr()) return err(session.error);
          let start: {
            systemPrompt: string;
            model?: string;
            sampler?: Sampler;
          };
          let scope: AgentScope;
          if (session.value === null) {
            const story = await loadStory(storage);
            if (story.isErr()) return err(story.error);
            start = newSession(
              model.value,
              story.value,
              topic.title,
              topic.scope,
            );
            scope = agentScope(topic.scope);
          } else {
            start = session.value;
            scope = session.value.scope;
          }
          const packet = await buildContextPacket(storage, scope);
          if (packet.isErr()) return err(packet.error);
          return ok({
            systemPrompt: start.systemPrompt,
            model: start.model ?? null,
            profileModel: profile.model ?? null,
            sampler: start.sampler ?? {},
            profileSampler: mergeSampler(profile.sampler, bound ?? {}),
            packet: packet.value,
          });
        })(),
      ),

    raise(spec) {
      const id = spec.id ?? newId();
      return new ResultAsync(
        (async (): Promise<Result<TopicLog, TalkError>> => {
          const title = spec.title.trim();
          if (title === "") return err({ kind: "no_title" });
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
            answered: 0,
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
          const saved = await commit(id, (stored) =>
            stored === null
              ? ok({ topic, messages: [message] })
              : err({ kind: "topic_exists", id }),
          );
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
