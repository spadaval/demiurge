/**
 * Loads what the builder needs from the world for one document: every entry,
 * and the document's story position. A document that isn't a scene in the
 * outline gets `{ kind: "none" }` (see `cards.ts` for what its cards show);
 * any other failure is passed on.
 */

import { errAsync, okAsync, ResultAsync } from "neverthrow";
import {
  buildContextPacket,
  type ContextError,
  type ContextPacket,
} from "../agent/context";
import type { StorageAdapter } from "../storage/types";
import { loadStory } from "../story/store";
import type { TimelineStore, TimelineStoreError } from "../time/store";
import type { Entry } from "../world/facts";
import type { WorldStore } from "../world/store";
import type { StoryPosition } from "./cards";

export type WorldContext = { entries: Entry[]; position: StoryPosition };

export function gatherWorldContext(
  world: WorldStore,
  timeline: TimelineStore,
  documentId: string,
): ResultAsync<WorldContext, TimelineStoreError> {
  const position = timeline
    .sceneContext(documentId)
    .map((context): StoryPosition => ({ kind: "scene", context }))
    .orElse((error) =>
      error.kind === "not_a_scene" && error.documentId === documentId
        ? okAsync<StoryPosition, TimelineStoreError>({ kind: "none" })
        : errAsync(error),
    );
  const entries = world
    .facts()
    .andThen((all) =>
      ResultAsync.combine(all.map(({ documentId: id }) => world.entry(id))),
    );
  return ResultAsync.combine([entries, position]).map(
    ([loaded, storyPosition]) => ({
      entries: loaded,
      position: storyPosition,
    }),
  );
}

/**
 * The story bible's context for one document: the scene context packet
 * (`agent/context.ts`, the one the story agent reads) of the scene whose
 * prose the document holds, without that scene's stored prose, since a
 * prose request carries the text before the cursor itself. Null when no
 * scene links to the document. Should more than one scene name it (sync
 * can make that happen), the first in telling order is taken.
 */
export function gatherBibleContext(
  storage: StorageAdapter,
  documentId: string,
): ResultAsync<ContextPacket | null, ContextError> {
  return loadStory(storage)
    .mapErr((error): ContextError => error)
    .andThen((story) => {
      const scene = story.scenes.find((s) => s.documentId === documentId);
      return scene === undefined
        ? okAsync<ContextPacket | null, ContextError>(null)
        : buildContextPacket(
            storage,
            { kind: "scene", scene: scene.id },
            { prose: false },
          );
    });
}
