/**
 * Talk pages as the app shows them: the world's topics and story bible (for
 * scope names and the World inbox), topics started but not yet stored, the
 * turn running in each topic, and what each command came to. The commands
 * are `talk/talk.ts`'s; this keeps what the views read in stores.
 */

import { err, ok, type Result, type ResultAsync } from "neverthrow";
import type { AgentDefaultsStore } from "~/agent/defaults";
import { type AgentTurn, sessionTurns } from "~/agent/inspect";
import type { NextTurnEdits } from "~/agent/next-turn";
import { loadSessionLog, stepRecordId } from "~/agent/records";
import type { AgentEvent } from "~/agent/runner";
import {
  type NextTurnBase,
  type NextTurnDraft,
  nextTurnDraft,
  nextTurnEdits,
  type SlipTarget,
} from "~/generate/agent-slip";
import { labelOf, type ProfileStore } from "~/generate/profile";
import { buildRequest } from "~/llm/client";
import type { Fetch } from "~/llm/types";
import type { StorageAdapter } from "~/storage/types";
import { loadStory } from "~/story/store";
import type { Story } from "~/story/story";
import type {
  ModelAuthor,
  Topic,
  TopicScope,
  TopicStatus,
  TurnCall,
} from "~/talk/records";
import { passageStale } from "~/talk/scope";
import {
  createTalk,
  describeTalkError,
  type Talk,
  type TalkError,
  type TopicView,
  type TurnOptions,
  type TurnOutcome,
} from "~/talk/talk";
import { createStore, type Store, type WritableStore } from "~/workspace/store";

/** What the running turn of a topic has done so far. */
export interface RunningTurn {
  /** The writer's message the turn answers; null when trying a turn again. */
  readonly message: string | null;
  /**
   * How many messages the topic held when the turn began. The writer's
   * message is shown from here until a loaded view holds more than this,
   * which means it has been stored and shows as a turn of its own.
   */
  readonly after: number;
  /** `Waiting for the model…`, `Running touches…`. */
  readonly status: string;
  /** The model's text so far, streamed. */
  readonly text: string;
  readonly calls: readonly TurnCall[];
}

/** A topic's unsent writing. */
export interface Unsent {
  readonly title: string;
  readonly text: string;
}

const NOTHING_UNSENT: Unsent = { title: "", text: "" };

/**
 * The agent slip open on a topic sheet, in its gloss column: a past model
 * turn's (by the message's index) or the next turn's, beside the composer.
 * One at a time; it stays open while the writer follows its references.
 */
export type TopicSlip = { kind: "turn"; message: number } | { kind: "next" };

/** The next-turn slip's request and the writer's edits of it. */
export type NextTurn =
  | {
      kind: "ready";
      base: NextTurnBase;
      target: SlipTarget;
      draft: NextTurnDraft;
    }
  /** It can't be read now (no model is set up, say): why. */
  | { kind: "problem"; message: string };

export interface AppTalkOptions {
  /** The workspace's connected storage. */
  readonly storage: StorageAdapter;
  readonly profile: ProfileStore;
  /** What a topic's new agent session starts with (`agent/defaults.ts`). */
  readonly defaults: AgentDefaultsStore;
  readonly readOnly: boolean;
  readonly fetch?: Fetch;
  readonly now?: () => number;
  readonly newId?: () => string;
}

export interface AppTalk {
  readonly readOnly: boolean;
  /** Every stored topic, newest first. */
  readonly topics: Store<readonly Topic[]>;
  /** The story bible as last read; null until read or when it can't be. */
  readonly story: Store<Story | null>;
  /** Topics opened with "New topic" and not sent yet, by ID: their scope. */
  readonly drafts: Store<ReadonlyMap<string, TopicScope>>;
  /**
   * What the writer has typed and not sent, by topic: a new topic's title
   * and the composer's text. Kept while the topic's tab is open, so moving
   * to another tab and back loses nothing; never stored.
   */
  readonly unsent: Store<ReadonlyMap<string, Unsent>>;
  setUnsent(id: string, change: Partial<Unsent>): void;
  /** Each opened topic as last loaded. */
  readonly views: Store<ReadonlyMap<string, TopicView>>;
  readonly running: Store<ReadonlyMap<string, RunningTurn>>;
  /** What the last command on a topic failed with, for the writer. */
  readonly errors: Store<ReadonlyMap<string, string>>;
  /** A failure reading the topics or the bible. */
  readonly problem: Store<string | null>;
  /** Reads the topics and the bible again. */
  refresh(): Promise<void>;
  /** Loads a stored topic's view. */
  open(id: string): Promise<void>;
  /** A topic about `scope`, not stored until its first message; its ID. */
  draft(scope: TopicScope): string;
  /**
   * Forgets a topic's tab: a draft is discarded, and what was typed and not
   * sent goes with it.
   */
  discardDraft(id: string): void;
  /** Stores a drafted topic with its first message and runs the model's turn. */
  start(id: string, title: string, message: string): Promise<boolean>;
  send(id: string, message: string): Promise<boolean>;
  /** Tries a stopped turn again. */
  resume(id: string): Promise<void>;
  /** Stops the running turn. */
  stop(id: string): void;
  rename(id: string, title: string): Promise<void>;
  setStatus(id: string, status: TopicStatus): Promise<void>;
  dismissError(id: string): void;
  /**
   * Whether a passage topic's anchor has gone stale: its block is gone from
   * the scene's document, or no longer holds the quoted text.
   */
  passageStale(scope: TopicScope): Promise<boolean>;
  /** The agent slip open on each topic's sheet. */
  readonly slips: Store<ReadonlyMap<string, TopicSlip>>;
  /** Opens a slip on topic `id`'s sheet, or with null puts it away. */
  showSlip(id: string, slip: TopicSlip | null): void;
  /**
   * Each topic's next turn as its slip shows it, read when the slip opens.
   * The writer's edits are sent with the composer's next Send, and kept
   * until then even while the slip is put away.
   */
  readonly nextTurns: Store<ReadonlyMap<string, NextTurn>>;
  setNextDraft(id: string, draft: NextTurnDraft): void;
  /** A model turn's request and trace, as stored, for its slip. */
  loadTurn(author: ModelAuthor): Promise<Result<AgentTurn, string>>;
}

/**
 * `draft` moved from `before` to `after` (a turn ran, or a new topic was
 * renamed): a field the writer hadn't edited takes the new value, and an
 * edited one is kept. An edited context keeps the packet it was edited
 * from, which is what the run records it as a revision of.
 */
function rebase(
  before: NextTurnBase,
  after: NextTurnBase,
  draft: NextTurnDraft,
): { base: NextTurnBase; draft: NextTurnDraft } {
  const was = nextTurnDraft(before);
  const now = nextTurnDraft(after);
  const keep = <K extends "systemPrompt" | "model" | "sampler" | "context">(
    key: K,
  ) => (draft[key] === was[key] ? now[key] : draft[key]);
  const contextEdited = draft.context !== was.context;
  return {
    base: contextEdited ? { ...after, packet: before.packet } : after,
    draft: {
      ...draft,
      systemPrompt: keep("systemPrompt"),
      model: keep("model"),
      sampler: keep("sampler"),
      context: contextEdited ? draft.context : now.context,
    },
  };
}

/** Room for a talk turn: the profile's sampler is set for prose continuations. */
const TALK_SAMPLER = { max_tokens: 2000 };

const IDLE: RunningTurn = {
  message: null,
  after: 0,
  status: "Waiting for the model…",
  text: "",
  calls: [],
};

export function createAppTalk(options: AppTalkOptions): AppTalk {
  const { storage, profile } = options;
  const newId = options.newId ?? (() => crypto.randomUUID());
  const talk: Talk = createTalk({
    storage,
    defaults: options.defaults,
    model: () => {
      const current = profile.get();
      return current === null
        ? null
        : {
            binding: { profile: current, sampler: TALK_SAMPLER, stream: true },
            label: labelOf(current),
          };
    },
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
    ...(options.now === undefined ? {} : { now: options.now }),
  });
  const topics = createStore<readonly Topic[]>([]);
  const story = createStore<Story | null>(null);
  const drafts = createStore<ReadonlyMap<string, TopicScope>>(new Map());
  const views = createStore<ReadonlyMap<string, TopicView>>(new Map());
  const running = createStore<ReadonlyMap<string, RunningTurn>>(new Map());
  const errors = createStore<ReadonlyMap<string, string>>(new Map());
  const unsent = createStore<ReadonlyMap<string, Unsent>>(new Map());
  const setUnsent = (id: string, change: Partial<Unsent>) => {
    const before = unsent.get().get(id) ?? NOTHING_UNSENT;
    setIn(unsent, id, { ...before, ...change });
    // A new topic's prompt names its title.
    if (
      change.title !== undefined &&
      change.title !== before.title &&
      drafts.get().has(id) &&
      nextTurns.get().has(id)
    ) {
      void loadNext(id);
    }
  };
  const problem = createStore<string | null>(null);
  const controllers = new Map<string, AbortController>();
  const slips = createStore<ReadonlyMap<string, TopicSlip>>(new Map());
  const nextTurns = createStore<ReadonlyMap<string, NextTurn>>(new Map());
  /** The latest read of each topic's next turn, so an older one is dropped. */
  const nextReads = new Map<string, number>();

  /**
   * Reads topic `id`'s next turn again, keeping the writer's edits. A new
   * topic is read with its scope and the title typed so far.
   */
  async function loadNext(id: string) {
    const read = (nextReads.get(id) ?? 0) + 1;
    nextReads.set(id, read);
    const scope = drafts.get().get(id);
    const request = await talk.nextTurn(
      id,
      scope === undefined
        ? undefined
        : { title: unsent.get().get(id)?.title ?? "", scope },
    );
    const current = profile.get();
    if (nextReads.get(id) !== read) return;
    if (request.isErr() || current === null) {
      setIn(nextTurns, id, {
        kind: "problem",
        message: request.isErr()
          ? describeTalkError(request.error)
          : describeTalkError({ kind: "no_model" }),
      });
      return;
    }
    const sent = buildRequest(
      current,
      { kind: "chat", messages: [] },
      { stream: true },
    );
    const target: SlipTarget = {
      profileLabel: labelOf(current),
      endpoint: sent.endpoint,
      url: sent.url,
    };
    const before = nextTurns.get().get(id);
    const fresh = request.value;
    setIn(
      nextTurns,
      id,
      before?.kind === "ready"
        ? { kind: "ready", target, ...rebase(before.base, fresh, before.draft) }
        : { kind: "ready", target, base: fresh, draft: nextTurnDraft(fresh) },
    );
  }

  /** The next turn's edits to send, or why they can't be sent. */
  function editsFor(id: string): Result<NextTurnEdits | undefined, string> {
    const next = nextTurns.get().get(id);
    if (next?.kind !== "ready") return ok(undefined);
    const edits = nextTurnEdits(next.base, next.draft);
    return edits.isErr()
      ? err(`The next turn's request can't be sent: ${edits.error}`)
      : ok(edits.value);
  }

  /** The edits went with a stored message: the next turn starts fresh. */
  function nextSent(id: string) {
    nextReads.delete(id);
    setIn(nextTurns, id, undefined);
    if (slips.get().get(id)?.kind === "next") void loadNext(id);
  }

  const setIn = <T>(
    store: WritableStore<ReadonlyMap<string, T>>,
    id: string,
    value: T | undefined,
  ) => {
    const next = new Map(store.get());
    if (value === undefined) next.delete(id);
    else next.set(id, value);
    store.set(next);
  };

  const fail = (id: string, error: TalkError) =>
    setIn(errors, id, describeTalkError(error));

  async function refresh() {
    const [listed, read] = await Promise.all([talk.list(), loadStory(storage)]);
    if (listed.isOk()) topics.set(listed.value);
    if (read.isOk()) story.set(read.value);
    const failure = listed.isErr()
      ? describeTalkError(listed.error)
      : read.isErr()
        ? `The story bible can't be read: ${describeTalkError(read.error)}`
        : null;
    problem.set(failure);
  }

  async function open(id: string) {
    const loaded = await talk.load(id);
    if (loaded.isOk()) setIn(views, id, loaded.value);
    else fail(id, loaded.error);
  }

  /** Runs a turn command, showing its progress, and records what it came to. */
  async function turn(
    id: string,
    command: (run: TurnOptions) => ResultAsync<TurnOutcome, TalkError>,
    message: string | null = null,
  ): Promise<boolean> {
    if (running.get().has(id)) return false;
    const controller = new AbortController();
    controllers.set(id, controller);
    setIn(errors, id, undefined);
    const after = views.get().get(id)?.messages.length ?? 0;
    setIn(running, id, { ...IDLE, message, after });
    const onEvent = (event: AgentEvent) => {
      const now = running.get().get(id) ?? { ...IDLE, message, after };
      switch (event.kind) {
        case "delta":
          setIn(running, id, {
            ...now,
            status: "Writing…",
            text: now.text + event.delta.text,
          });
          return;
        case "step": {
          const { response } = event.step;
          const calls = response.ok ? response.completion.toolCalls : [];
          const first = calls[0]?.function.name;
          setIn(running, id, {
            ...now,
            status: first === undefined ? "Writing…" : `Running ${first}…`,
            text:
              now.text === "" || first === undefined
                ? now.text
                : `${now.text}\n\n`,
          });
          return;
        }
        case "call": {
          const { call, result } = event.call;
          setIn(running, id, {
            ...now,
            status: "Waiting for the model…",
            calls: [
              ...now.calls,
              {
                name: call.function.name,
                ok: result.ok,
                summary: result.ok
                  ? (result.lines[0] ?? "Done")
                  : result.error.message,
              },
            ],
          });
          return;
        }
      }
    };
    const outcome = await command({ signal: controller.signal, onEvent });
    controllers.delete(id);
    setIn(running, id, undefined);
    if (outcome.isOk()) {
      const { log, stop } = outcome.value;
      setIn(views, id, { ...log, stop });
    } else {
      fail(id, outcome.error);
      await open(id);
    }
    // A turn may have changed the bible, and the topic list's order.
    await refresh();
    return outcome.isOk();
  }

  return {
    readOnly: options.readOnly,
    topics,
    story,
    drafts,
    views,
    running,
    errors,
    problem,
    refresh,
    open,
    draft(scope) {
      const id = newId();
      setIn(drafts, id, scope);
      return id;
    },
    discardDraft(id) {
      setIn(drafts, id, undefined);
      setIn(unsent, id, undefined);
      setIn(slips, id, undefined);
      nextReads.delete(id);
      setIn(nextTurns, id, undefined);
    },
    unsent,
    setUnsent,
    async start(id, title, message) {
      const scope = drafts.get().get(id);
      if (scope === undefined) return false;
      const edits = editsFor(id);
      if (edits.isErr()) {
        setIn(errors, id, edits.error);
        return false;
      }
      setUnsent(id, { text: "" });
      const done = await turn(
        id,
        (run) =>
          talk.start(
            { id, title, scope, message },
            { ...run, ...(edits.value ? { edits: edits.value } : {}) },
          ),
        message,
      );
      if (topics.get().some((topic) => topic.id === id)) {
        // Stored once it got that far, whatever the turn came to.
        setIn(drafts, id, undefined);
        nextSent(id);
        // The title is the topic's now; text typed during the turn is the
        // writer's next message, so it stays.
        setUnsent(id, { title: "" });
      } else {
        // Nothing was stored: the writer's text stays theirs to send.
        setUnsent(id, { text: message });
      }
      return done;
    },
    async send(id, message) {
      const sent = () => views.get().get(id)?.topic.messages ?? 0;
      const before = sent();
      const edits = editsFor(id);
      if (edits.isErr()) {
        setIn(errors, id, edits.error);
        return false;
      }
      setUnsent(id, { text: "" });
      const done = await turn(
        id,
        (run) =>
          talk.send(id, message, {
            ...run,
            ...(edits.value ? { edits: edits.value } : {}),
          }),
        message,
      );
      // Not stored: the writer's text and edits stay theirs to send.
      if (sent() <= before) setUnsent(id, { text: message });
      else nextSent(id);
      return done;
    },
    async resume(id) {
      await turn(id, (run) => talk.resume(id, run));
    },
    stop(id) {
      controllers.get(id)?.abort();
    },
    async rename(id, title) {
      const renamed = await talk.rename(id, title);
      if (renamed.isErr()) fail(id, renamed.error);
      await Promise.all([open(id), refresh()]);
    },
    async setStatus(id, status) {
      const set = await talk.setStatus(id, status);
      if (set.isErr()) fail(id, set.error);
      await Promise.all([open(id), refresh()]);
    },
    dismissError: (id) => setIn(errors, id, undefined),
    slips,
    showSlip(id, slip) {
      setIn(slips, id, slip ?? undefined);
      if (slip?.kind === "next") void loadNext(id);
    },
    nextTurns,
    setNextDraft(id, draft) {
      const next = nextTurns.get().get(id);
      if (next?.kind === "ready") setIn(nextTurns, id, { ...next, draft });
    },
    async loadTurn(author) {
      const { session, requestId } = author;
      if (session === null || requestId === null) {
        return err("This turn has no stored request.");
      }
      const log = await loadSessionLog(storage, session);
      if (log.isErr()) return err(describeTalkError(log.error));
      const step = log.value.steps.find(
        (s) => stepRecordId(session, s.index) === requestId,
      );
      const found = sessionTurns(log.value).find(
        (t) => t.run.index === step?.run,
      );
      return found === undefined
        ? err(`The session has no request ${requestId}.`)
        : ok(found);
    },
    async passageStale(scope) {
      if (scope.kind !== "passage") return false;
      const document = await storage.documents.load(scope.documentId);
      // A document that can't be read isn't known to have changed.
      if (document.isErr()) return document.error.kind === "not_found";
      return passageStale(document.value.content, scope);
    },
  };
}
