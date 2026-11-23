/**
 * Scene prose for the read queries (`./queries.ts`), from the Plate documents
 * the scenes link to (`sceneDocuments`) rather than from files. Each linked
 * document is read through the `prose` projection, the text a model reads,
 * so `trace` finds in it what a writer or model would.
 *
 * A prose suspect is named by its document and the block its paragraph
 * starts in, which stays put as the document is edited, unlike a line.
 * Prose that couldn't be read (a document that is missing or isn't valid
 * content) is listed, never skipped quietly: a trace without it may miss
 * what it says.
 */

import type { ResultAsync } from "neverthrow";
import { type Projection, projectProse } from "../content/projections";
import type { ContentError } from "../content/schema";
import type { StorageAdapter, StorageError } from "../storage/types";
import type { ProseSource } from "./queries";
import { wordCount } from "./render";
import { sceneDocuments } from "./store";
import type { Story } from "./story";
import type { Prose } from "./trace";

/** A linked scene whose prose couldn't be read, and why. */
export type ProseNotRead = {
  scene: string;
  documentId: string;
  reason: "missing" | "invalid_content";
  message: string;
};

/** Where a prose suspect is: its scene's document, and the block it starts in. */
export type ProsePlace = {
  scene: string;
  documentId: string;
  /** Null for the scene's prose as a whole. */
  blockId: string | null;
};

export interface StoredProse extends ProseSource {
  /** Linked scenes whose prose wasn't read. */
  readonly notRead: readonly ProseNotRead[];
  /** Documents more than one scene links to, as `sceneDocuments` finds them. */
  readonly shared: readonly {
    readonly documentId: string;
    readonly scenes: readonly string[];
  }[];
  /** The document and block of a line of a scene's prose, if it was read. */
  place(scene: string, line: number): ProsePlace | undefined;
}

type Read = {
  documentId: string;
  title: string;
  projection: Projection;
};

/**
 * The block a line (from 1) of a projection starts in: the first block
 * whose text ends past the line's start, so a list marker or heading hash
 * the projection inserted reads as its block.
 */
function blockAtLine(projection: Projection, line: number): string | null {
  let start = 0;
  for (let at = 1; at < line; at++) {
    const next = projection.text.indexOf("\n", start);
    if (next === -1) return null;
    start = next + 1;
  }
  return projection.map.spans.find((span) => span.end > start)?.blockId ?? null;
}

const contentProblem = (error: ContentError) =>
  error.kind === "invalid_content"
    ? `${error.path} ${error.reason}`
    : `line ${error.line}: ${error.reason}`;

/** The prose of each scene in `story` that links to a document. */
export function storedProse(
  storage: StorageAdapter,
  story: Story,
): ResultAsync<StoredProse, StorageError> {
  return sceneDocuments(storage, story).map(({ scenes, shared }) => {
    const read = new Map<string, Read>();
    const notRead: ProseNotRead[] = [];
    for (const found of scenes) {
      if (found.kind === "unlinked") continue;
      if (found.kind === "missing") {
        notRead.push({
          scene: found.scene.id,
          documentId: found.documentId,
          reason: "missing",
          message: `document ${found.documentId} does not exist`,
        });
        continue;
      }
      const { document } = found;
      const projection = projectProse(document.content);
      if (projection.isErr()) {
        notRead.push({
          scene: found.scene.id,
          documentId: document.id,
          reason: "invalid_content",
          message: `document ${document.id} is not valid content: ${contentProblem(projection.error)}`,
        });
        continue;
      }
      read.set(found.scene.id, {
        documentId: document.id,
        title: document.title,
        projection: projection.value,
      });
    }
    const prose: Prose[] = [...read].map(([scene, { projection }]) => ({
      scene,
      text: projection.text,
    }));
    const place = (scene: string, line: number): ProsePlace | undefined => {
      const found = read.get(scene);
      if (found === undefined) return undefined;
      return {
        scene,
        documentId: found.documentId,
        blockId: line === 0 ? null : blockAtLine(found.projection, line),
      };
    };
    return {
      prose,
      notRead,
      shared,
      place,
      proseLine: (scene) => {
        if (scene.documentId === undefined) {
          return "prose: no document linked (not written yet)";
        }
        const found = read.get(scene.id);
        if (found !== undefined) {
          return `prose: document ${found.documentId} "${found.title}" (${wordCount(found.projection.text)} words)`;
        }
        const problem = notRead.find((n) => n.scene === scene.id);
        return `prose: ${problem?.message ?? `document ${scene.documentId} not read`}`;
      },
      locate: (scene, line) => {
        const at = place(scene, line);
        if (at === undefined) return `scene:${scene} prose`;
        return at.blockId === null
          ? `document ${at.documentId} (scene:${scene})`
          : `document ${at.documentId} block ${at.blockId} (scene:${scene})`;
      },
    };
  });
}
