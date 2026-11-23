import type { ResultAsync } from "neverthrow";
import type { BatchWrite, StorageAdapter } from "~/storage/types";
import type { StoryCommand } from "~/story/commands";
import {
  executeStoryCommand,
  loadStory,
  type StoryExecuted,
  type StoryStoreError,
} from "~/story/store";
import type { Story } from "~/story/story";
import { runStoryCommand, type StoryToolResult } from "~/story/tools";
import { createStore, type Store } from "~/workspace/store";
import { describeStorageError } from "./environment";

export type BibleState =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly story: Story }
  | { readonly kind: "error"; readonly message: string };

/**
 * The world's story bible as the app reads it (`src/story/store.ts`), kept
 * live: every write of a story record through `storage` reads it again,
 * whoever makes the write (a command, an agent's tool call, a restore), so
 * the inspector, the scene apparatus and the stamp follow the bible as it
 * changes.
 */
export interface Bible {
  readonly state: Store<BibleState>;
  /**
   * Reads the bible again. A failed read keeps the last story shown, if
   * there was one, so a passing storage error doesn't blank the inspector;
   * the error is in `error` until a read succeeds. Calls made while a read
   * runs share one more read after it.
   */
  refresh(): Promise<void>;
  /** Why the last read failed, or null. */
  readonly error: Store<string | null>;
  /**
   * The adapter every writer of the bible in this app uses: give it to an
   * agent runner, `executeStoryTool` or `executeStoryCommand`. A write that
   * goes around it is not seen until the next `refresh`.
   */
  readonly storage: StorageAdapter;
  /** Applies a story command to the stored bible. */
  execute(
    command: StoryCommand,
    now?: number,
  ): ResultAsync<StoryExecuted, StoryStoreError>;
  /**
   * Applies a story command as the story agent's tool call of the same name
   * does (`runStoryCommand`), and gives its result: a refusal, or what the
   * edit kept and what may still state what it changed. A direct edit in
   * the inspector goes through here.
   */
  edit(
    command: StoryCommand,
    now?: number,
  ): ResultAsync<StoryToolResult, StoryStoreError>;
}

/**
 * The bible over `base`, which in the app is the workspace's connected
 * storage, so a read follows reconnects.
 */
export function createBible(base: StorageAdapter): Bible {
  const state = createStore<BibleState>({ kind: "loading" });
  const error = createStore<string | null>(null);
  let running: Promise<void> | null = null;
  let stale = false;

  const read = async () => {
    do {
      stale = false;
      const loaded = await loadStory(storage);
      if (loaded.isOk()) {
        error.set(null);
        state.set({ kind: "ready", story: loaded.value });
        continue;
      }
      const message = describeBibleError(loaded.error);
      error.set(message);
      if (state.get().kind !== "ready") state.set({ kind: "error", message });
    } while (stale);
  };

  function refresh(): Promise<void> {
    if (running !== null) {
      stale = true;
      return running;
    }
    running = read().finally(() => {
      running = null;
    });
    return running;
  }

  const storage = watchStoryWrites(base, () => void refresh());
  return {
    state,
    error,
    refresh,
    storage,
    execute: (command, now) => executeStoryCommand(storage, command, now),
    edit: (command, now) =>
      runStoryCommand(storage, command, now).map(({ result }) => result),
  };
}

const writesStory = (write: BatchWrite) =>
  write.kind === "saveStoryRecord" || write.kind === "deleteStoryRecord";

/**
 * `storage`, calling `onWrite` after each write that changes story records
 * succeeds: a save or delete in `storyRecords`, a batch with a story write,
 * a restore.
 */
export function watchStoryWrites(
  storage: StorageAdapter,
  onWrite: () => void,
): StorageAdapter {
  const after = <T>(written: T): T => {
    onWrite();
    return written;
  };
  const records = storage.storyRecords;
  return {
    documents: storage.documents,
    worldEntries: storage.worldEntries,
    annotations: storage.annotations,
    requests: storage.requests,
    snapshots: storage.snapshots,
    outlines: storage.outlines,
    timelines: storage.timelines,
    storyRecords: {
      save: (record) => records.save(record).map(after),
      load: (key) => records.load(key),
      list: () => records.list(),
      delete: (key) => records.delete(key).map(after),
      listTombstones: () => records.listTombstones(),
    },
    agentRecords: storage.agentRecords,
    batch: (writes) =>
      writes.some(writesStory)
        ? storage.batch(writes).map(after)
        : storage.batch(writes),
    dump: () => storage.dump(),
    restore: (records) => storage.restore(records).map(after),
    close: () => storage.close(),
  };
}

function describeBibleError(error: StoryStoreError): string {
  switch (error.kind) {
    case "failure":
    case "read_only":
      return `The story bible could not be read. ${describeStorageError(error)}`;
    case "not_found":
      return `The story bible could not be read: record ${error.id} is missing.`;
    default:
      return `The story bible could not be read: ${error.message}`;
  }
}
