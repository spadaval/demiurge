/**
 * Talk pages as the app shows them: the world's topics and story bible (for
 * scope names and the World inbox), topics started but not yet stored, the
 * turn running in each topic, and what each command came to. The commands
 * are `talk/talk.ts`'s; this keeps what the views read in stores.
 */

import type { ResultAsync } from "neverthrow";
import type { AgentEvent } from "~/agent/runner";
import { labelOf, type ProfileStore } from "~/generate/profile";
import type { Fetch } from "~/llm/types";
import type { StorageAdapter } from "~/storage/types";
import { loadStory } from "~/story/store";
import type { Story } from "~/story/story";
import type { Topic, TopicScope, TopicStatus, TurnCall } from "~/talk/records";
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
  /** `Waiting for the model…`, `Running touches…`. */
  readonly status: string;
  /** The model's text so far, streamed. */
  readonly text: string;
  readonly calls: readonly TurnCall[];
}

export interface AppTalkOptions {
  /** The workspace's connected storage. */
  readonly storage: StorageAdapter;
  readonly profile: ProfileStore;
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
}

/** Room for a talk turn: the profile's sampler is set for prose continuations. */
const TALK_SAMPLER = { max_tokens: 2000 };

const IDLE: RunningTurn = {
  status: "Waiting for the model…",
  text: "",
  calls: [],
};

export function createAppTalk(options: AppTalkOptions): AppTalk {
  const { storage, profile } = options;
  const newId = options.newId ?? (() => crypto.randomUUID());
  const talk: Talk = createTalk({
    storage,
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
  const problem = createStore<string | null>(null);
  const controllers = new Map<string, AbortController>();

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
  ): Promise<boolean> {
    if (running.get().has(id)) return false;
    const controller = new AbortController();
    controllers.set(id, controller);
    setIn(errors, id, undefined);
    setIn(running, id, IDLE);
    const onEvent = (event: AgentEvent) => {
      const now = running.get().get(id) ?? IDLE;
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
    discardDraft: (id) => setIn(drafts, id, undefined),
    async start(id, title, message) {
      const scope = drafts.get().get(id);
      if (scope === undefined) return false;
      const done = await turn(id, (run) =>
        talk.start({ id, title, scope, message }, run),
      );
      // Stored once it got that far, whatever the turn came to.
      if (topics.get().some((topic) => topic.id === id)) {
        setIn(drafts, id, undefined);
      }
      return done;
    },
    send: (id, message) => turn(id, (run) => talk.send(id, message, run)),
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
    async passageStale(scope) {
      if (scope.kind !== "passage") return false;
      const document = await storage.documents.load(scope.documentId);
      // A document that can't be read isn't known to have changed.
      if (document.isErr()) return document.error.kind === "not_found";
      return passageStale(document.value.content, scope);
    },
  };
}
