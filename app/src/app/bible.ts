import type { StorageAdapter } from "~/storage/types";
import { loadStory, type StoryStoreError } from "~/story/store";
import type { Story } from "~/story/story";
import { createStore, type Store } from "~/workspace/store";
import { describeStorageError } from "./environment";

export type BibleState =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly story: Story }
  | { readonly kind: "error"; readonly message: string };

/** The world's story bible as the app reads it (`src/story/store.ts`). */
export interface Bible {
  readonly state: Store<BibleState>;
  /**
   * Reads the bible again. A failed read keeps the last story shown, if
   * there was one, so a passing storage error doesn't blank the inspector;
   * the error is in `error` until a read succeeds.
   */
  refresh(): Promise<void>;
  /** Why the last read failed, or null. */
  readonly error: Store<string | null>;
}

/**
 * Reads the bible through `storage`, which in the app is the workspace's
 * connected storage, so a read follows reconnects. Nothing here writes:
 * the inspector reads, and edits go through the story commands.
 */
export function createBible(storage: StorageAdapter): Bible {
  const state = createStore<BibleState>({ kind: "loading" });
  const error = createStore<string | null>(null);
  const refresh = async () => {
    const loaded = await loadStory(storage);
    if (loaded.isOk()) {
      error.set(null);
      state.set({ kind: "ready", story: loaded.value });
      return;
    }
    const message = describeBibleError(loaded.error);
    error.set(message);
    if (state.get().kind !== "ready") state.set({ kind: "error", message });
  };
  return { state, error, refresh };
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
