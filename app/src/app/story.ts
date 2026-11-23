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
import { createStore, type Store } from "~/workspace/store";

export type StoryState =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly story: Story }
  | { readonly kind: "error"; readonly message: string };

/**
 * The world's story bible as the app shows it, kept live: every write of a
 * story record through `storage` reloads it, whoever makes the write (a
 * command, an agent's tool call, a restore), so the views that read `state`
 * follow the bible as it changes.
 */
export interface StoryBible {
  readonly state: Store<StoryState>;
  /**
   * The adapter every writer of the bible in this app uses: give it to an
   * agent runner, `executeStoryTool` or `executeStoryCommand`. A write that
   * goes around it is not seen until the next `refresh`.
   */
  readonly storage: StorageAdapter;
  /** Reloads the bible; calls made while a reload runs share one more. */
  refresh(): Promise<void>;
  /** Applies a story command to the stored bible. */
  execute(
    command: StoryCommand,
    now?: number,
  ): ResultAsync<StoryExecuted, StoryStoreError>;
}

export function createStoryBible(base: StorageAdapter): StoryBible {
  const state = createStore<StoryState>({ kind: "loading" });
  let running: Promise<void> | null = null;
  let stale = false;

  const load = async () => {
    do {
      stale = false;
      const result = await loadStory(storage);
      state.set(
        result.isOk()
          ? { kind: "ready", story: result.value }
          : { kind: "error", message: describeStoryError(result.error) },
      );
    } while (stale);
  };

  function refresh(): Promise<void> {
    if (running !== null) {
      stale = true;
      return running;
    }
    running = load().finally(() => {
      running = null;
    });
    return running;
  }

  const storage = watchStoryWrites(base, () => void refresh());
  return {
    state,
    storage,
    refresh,
    execute: (command, now) => executeStoryCommand(storage, command, now),
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

function describeStoryError(error: StoryStoreError): string {
  return "message" in error && typeof error.message === "string"
    ? `The story bible could not be read: ${error.message}`
    : `The story bible could not be read (${error.kind}).`;
}
