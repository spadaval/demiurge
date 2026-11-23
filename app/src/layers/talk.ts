/**
 * A scene's open talk topics on its sheet (DESIGN.md, Topics): gloss notes
 * of kind "Talk" on the Notes layer, because a talk page about a passage is
 * the writer's annotation grown up. A passage topic's note is keyed to the
 * words it quotes; a topic about the whole scene, and a passage topic whose
 * words are no longer in their block (the topic now follows the scene),
 * follow the scene's last line. The topic's title is the body, and "Open"
 * opens its sheet.
 *
 * Nothing here is stored: the notes are found again whenever the topics or
 * the text change.
 */

import type { Topic } from "~/talk/records";
import {
  type GlossNote,
  type LayerMark,
  locate,
  NO_SCENE_LAYERS,
  type SceneLayers,
  type TextAnchor,
} from "./model";

/** A topic's note, before its words are looked for in the prose. */
export interface TalkNote {
  /** The note beside the passage's words. */
  readonly note: GlossNote;
  /** The same note after the scene's last line. */
  readonly atScene: GlossNote;
  /** The passage's words; null for a topic about the whole scene. */
  readonly anchor: TextAnchor | null;
}

/** The note ID of a topic's Talk note. */
export const talkNoteId = (topic: string) => `talk:${topic}`;

/**
 * The Talk notes of `topics` (the scene's open topics, its passages'
 * included), in the order given.
 */
export function talkNotes(topics: readonly Topic[]): TalkNote[] {
  return topics.map((topic) => {
    const atScene: GlossNote = {
      id: talkNoteId(topic.id),
      layer: "notes",
      heading: "Talk",
      authority: topic.startedBy.kind === "model" ? "raised by model" : "yours",
      body: [{ text: topic.title }],
      actions: [
        { id: "open", label: "Open", resolves: "none", topic: topic.id },
      ],
      placement: "scene",
    };
    const { scope } = topic;
    if (scope.kind !== "passage")
      return { note: atScene, atScene, anchor: null };
    const { placement: _, ...note } = atScene;
    return {
      note,
      atScene,
      anchor: { blockId: scope.blockId, quote: scope.quote },
    };
  });
}

/** Where a key sits: one character, in one block. */
const keyPlace = (blockId: string, end: number) => `${blockId}:${end}`;

/**
 * The scene's Talk layers: each passage note keyed to its words in
 * `blocks`, and the rest about the scene. A key sits on its words' last
 * character, and two keys on one character would hide a note, so a passage
 * whose last character a keyed mark in `others` already holds is about the
 * scene too.
 */
export function talkLayers(
  notes: readonly TalkNote[],
  blocks: readonly { readonly id: string; readonly text: string }[],
  others: readonly LayerMark[] = [],
): SceneLayers {
  if (notes.length === 0) return NO_SCENE_LAYERS;
  const spanOf = (anchor: TextAnchor) => {
    const block = blocks.find((b) => b.id === anchor.blockId);
    return block === undefined ? null : locate(block.text, anchor);
  };
  const taken = new Set<string>();
  for (const mark of others) {
    if (mark.noteId === undefined) continue;
    const span = spanOf(mark.anchor);
    if (span !== null) taken.add(keyPlace(mark.anchor.blockId, span.end));
  }
  const marks: LayerMark[] = [];
  const placed: GlossNote[] = [];
  for (const { note, atScene, anchor } of notes) {
    const span = anchor === null ? null : spanOf(anchor);
    if (anchor === null || span === null) {
      placed.push(atScene);
      continue;
    }
    const place = keyPlace(anchor.blockId, span.end);
    if (taken.has(place)) {
      placed.push(atScene);
      continue;
    }
    taken.add(place);
    marks.push({
      id: `${note.id}/words`,
      anchor,
      style: { kind: "talk" },
      noteId: note.id,
    });
    placed.push(note);
  }
  return { speakers: [], cues: new Map(), marks, notes: placed };
}

/** Whether two results of `talkLayers` draw the same. */
export function sameTalkLayers(a: SceneLayers, b: SceneLayers): boolean {
  return (
    a.notes.length === b.notes.length &&
    a.notes.every((note, i) => note === b.notes[i]) &&
    a.marks.length === b.marks.length &&
    a.marks.every((mark, i) => mark.id === b.marks[i]?.id)
  );
}
