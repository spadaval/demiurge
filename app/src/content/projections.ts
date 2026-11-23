/**
 * Purpose-specific text projections of a content tree
 * (docs/rebuild/data-model-boundaries.md, Boundary 3). Each returns the text
 * plus a source map, so a result computed on the text (an entity match, a
 * model's edit target) can be mapped back to a block and an offset.
 *
 * Block text and offsets
 * ----------------------
 * A block's text is the concatenation of its text leaves in order, link text
 * included, with marks and link targets dropped (`blockText`). An offset
 * within a block is a UTF-16 index into that string, as for JS strings; a soft
 * line break is the single character `\n`. Annotations anchor to these
 * offsets. Only text blocks have text: an `ai_segment` is a container (its
 * child blocks carry the text) and an `hr`'s text is always empty.
 *
 * Source map
 * ----------
 * Every block a projection includes appears once, as one contiguous span of
 * the output holding exactly its block text. Every other output character
 * (block separators, list markers, heading hashes, the scene break) was
 * inserted by the projection: `toBlock` returns null for it, and no span
 * contains it. Spans are therefore never adjacent, so every output position
 * belongs to at most one span.
 *
 * `prose` (continuation, summaries, world context)
 * ------------------------------------------------
 * Plain text with light markdown-style markers, for a model to read:
 *
 *     # Heading                 h1–h3 as #, ##, ###
 *     Paragraph text.
 *     > Quoted text.
 *     * * *                     hr, as a scene break
 *     - Item                    bulleted item; nested items get two spaces
 *       1. Numbered               per indent level beyond 1
 *
 * Blocks are separated by a blank line; consecutive list items by a single
 * newline, unless their numbering restarted between them (a dropped empty
 * paragraph or placeholder, or an AI segment boundary), so a model never
 * sees one list with repeated numbers. Numbered items count up from 1 among consecutive items at the same
 * indent and style, as in the editor and the export: a shallower item resets
 * deeper counts, a non-list block (even a dropped placeholder) resets all of
 * them, and empty items count.
 * Soft line breaks are written as-is, with no marker on the next line.
 * Placeholders are dropped (they are instructions to the writer, not story).
 * AI segments are rendered inline, whatever their status; their children are
 * numbered among themselves (they are not siblings of the blocks around the
 * segment), as in the export.
 * Blocks with empty text are dropped too, so they have no span; an hr keeps
 * its marker but has no span either.
 *
 * `addressable` (AI edits)
 * ------------------------
 * Every block a model may target, one per line, each prefixed with its ID so
 * the model can name it in an edit operation (`replace`, `insertAfter`,
 * `delete`; worldcrafter-yx9v):
 *
 *     [b_1] # Heading
 *     [b_2] Paragraph text.
 *     [b_3] > Quoted text.
 *     [b_4] * * *               hr: an empty span after the marker
 *     [b_5] - Item
 *     [b_6]   1. Numbered
 *     [b_7]                     empty paragraph: an empty span
 *     [b_8] (placeholder) Describe the storm
 *
 * Unlike `prose`, nothing is dropped: empty blocks, hrs and placeholders all
 * have a line and a span (an hr's is empty and sits after its marker), so
 * every block ID in the document except an AI segment's is addressable and
 * `toText(id, 0)` finds it. A placeholder's span holds its text and is marked
 * `(placeholder)`, so a model can see it is an instruction to fill, not story.
 * An AI segment is a container, as in `prose`: its child blocks appear inline
 * with their own IDs and the segment has no line, whatever its status
 * (whether a generating segment may be edited is the edit applier's call).
 * Markers and numbering are those of `prose`. Lines are joined by a single
 * `\n`; a soft line break is written as-is, so a line that does not start
 * with `[<id>] ` continues the block above (the source map is exact either
 * way).
 *
 * `plain+map` (entity matching, extraction, consistency checks)
 * --------------------------------------------------------------
 * Every text block's text, in document order (AI segment children inline),
 * joined by a single `\n` and with no markers. Empty blocks and hrs are kept
 * as empty spans so every block has a position. Placeholders are dropped, as
 * in `prose`: an entity named in an instruction is not in the story.
 */

import type { Result } from "neverthrow";
import {
  type Block,
  type ContentDocument,
  type ContentError,
  type Inline,
  type ListStyle,
  type Placeholder,
  validateDocument,
} from "./schema";

/** A position in a block's text: `offset` is from 0 to the text's length. */
export type BlockPosition = { blockId: string; offset: number };

/** A range `[start, end)` of one block's text. */
export type BlockRange = { blockId: string; start: number; end: number };

/** Where a block's text sits in the output: `[start, end)`. */
export type Span = { blockId: string; start: number; end: number };

export type Projection = { text: string; map: SourceMap };

/** The text of a block: its leaves concatenated, link text included. */
export function blockText(block: Block): string {
  return block.children.map(inlineText).join("");
}

function inlineText(inline: Inline): string {
  return "type" in inline
    ? inline.children.map((leaf) => leaf.text).join("")
    : inline.text;
}

export class SourceMap {
  private readonly byId: ReadonlyMap<string, Span>;

  /** One span per included block, in output order. */
  constructor(readonly spans: readonly Span[]) {
    this.byId = new Map(spans.map((span) => [span.blockId, span]));
  }

  /**
   * The block position of the character at output `offset`, or null when
   * the projection inserted that character or `offset` is out of range.
   */
  toBlock(offset: number): BlockPosition | null {
    const span = this.spanAt(offset);
    if (!span || offset >= span.end) return null;
    return { blockId: span.blockId, offset: offset - span.start };
  }

  /**
   * The block range of output range `[start, end)`, or null unless it lies
   * within one block's text. A collapsed range maps if it sits in or at
   * either end of a block's text, including an empty block's.
   */
  toBlockRange(start: number, end: number): BlockRange | null {
    if (end < start) return null;
    const span = this.spanAt(start);
    if (!span || end > span.end) return null;
    return {
      blockId: span.blockId,
      start: start - span.start,
      end: end - span.start,
    };
  }

  /**
   * The output offset of a block position, or null when the block is not in
   * the projection or `offset` is outside its text. `offset` may equal the
   * text's length (the position after its last character).
   */
  toText(blockId: string, offset: number): number | null {
    const span = this.byId.get(blockId);
    if (!span || offset < 0 || offset > span.end - span.start) return null;
    return span.start + offset;
  }

  /** The last span starting at or before `offset`, if `offset` is in it or at its end. */
  private spanAt(offset: number): Span | undefined {
    let low = 0;
    let high = this.spans.length - 1;
    let found: Span | undefined;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const span = this.spans[mid] as Span;
      if (span.start <= offset) {
        found = span;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return found && offset <= found.end ? found : undefined;
  }
}

/** Accumulates output text and the spans of block text within it. */
class Writer {
  text = "";
  readonly spans: Span[] = [];

  /** Text the projection inserts; it maps to no block. */
  insert(text: string): void {
    this.text += text;
  }

  block(blockId: string, text: string): void {
    const start = this.text.length;
    this.text += text;
    this.spans.push({ blockId, start, end: this.text.length });
  }

  finish(): Projection {
    return { text: this.text, map: new SourceMap(this.spans) };
  }
}

/**
 * One step of `walkBlocks`: a text block with its list number (0 unless it is a
 * numbered or bulleted item) or a placeholder. `restart` is true on the first
 * block after a numbering reset that `prose` doesn't otherwise see: the
 * start of the document, a placeholder, or either edge of an AI segment.
 */
export type BlockStep =
  | {
      readonly kind: "block";
      readonly block: Block;
      readonly listNumber: number;
      readonly restart: boolean;
    }
  | { readonly kind: "placeholder"; readonly placeholder: Placeholder };

/**
 * The blocks of a document in order, AI segment children inline, with list
 * numbers. Numbered items count up from 1 among consecutive items at the
 * same indent and style: a shallower item resets deeper counts, a non-list
 * block resets all of them, and empty items count. An AI segment's children
 * are numbered among themselves, and a placeholder or a segment edge
 * restarts numbering, as in the editor and the export.
 */
export function* walkBlocks(document: ContentDocument): Generator<BlockStep> {
  let counts = new Map<number, { style: ListStyle; count: number }>();
  let restart = true;
  const reset = () => {
    counts = new Map();
    restart = true;
  };
  const step = (block: Block): BlockStep => {
    let listNumber = 0;
    if (block.type === "p" && block.listStyleType && block.indent) {
      const { indent, listStyleType: style } = block;
      for (const deeper of counts.keys()) {
        if (deeper > indent) counts.delete(deeper);
      }
      const previous = counts.get(indent);
      listNumber = previous?.style === style ? previous.count + 1 : 1;
      counts.set(indent, { style, count: listNumber });
    } else {
      counts.clear();
    }
    const result: BlockStep = { kind: "block", block, listNumber, restart };
    restart = false;
    return result;
  };
  for (const block of document) {
    if (block.type === "placeholder") {
      reset();
      yield { kind: "placeholder", placeholder: block };
    } else if (block.type === "ai_segment") {
      reset();
      for (const child of block.children) yield step(child);
      reset();
    } else {
      yield step(block);
    }
  }
}

/** The marker `prose` and `addressable` write before a block's text. */
function proseMarker(block: Block, listNumber: number): string {
  switch (block.type) {
    case "p":
      if (block.indent === undefined) return "";
      return `${"  ".repeat(block.indent - 1)}${block.listStyleType === "decimal" ? `${listNumber}. ` : "- "}`;
    case "h1":
    case "h2":
    case "h3":
      return `${"#".repeat(Number(block.type.slice(1)))} `;
    case "blockquote":
      return "> ";
    case "hr":
      return "* * *";
  }
}

function writeProse(document: ContentDocument): Projection {
  const out = new Writer();
  // True while the last written block is a list item whose list is still
  // open: no numbering reset since. Only then is a single newline used.
  let listContinues = false;

  // Numbering counts empty items and restarts at a placeholder, as the
  // editor does, even though neither is written.
  for (const step of walkBlocks(document)) {
    if (step.kind === "placeholder") continue;
    const { block, listNumber, restart } = step;
    const listItem = listNumber > 0;
    if (restart || !listItem) listContinues = false;
    const text = blockText(block);
    if (text === "" && block.type !== "hr") continue;
    if (out.text !== "") {
      out.insert(listItem && listContinues ? "\n" : "\n\n");
    }
    listContinues = listItem;
    out.insert(proseMarker(block, listNumber));
    if (block.type !== "hr") out.block(block.id, text);
  }
  return out.finish();
}

function writeAddressable(document: ContentDocument): Projection {
  const out = new Writer();
  for (const step of walkBlocks(document)) {
    if (out.text !== "") out.insert("\n");
    if (step.kind === "placeholder") {
      const { id, children } = step.placeholder;
      out.insert(`[${id}] (placeholder) `);
      out.block(id, children[0].text);
      continue;
    }
    const { block, listNumber } = step;
    out.insert(`[${block.id}] ${proseMarker(block, listNumber)}`);
    out.block(block.id, blockText(block));
  }
  return out.finish();
}

function writePlain(document: ContentDocument): Projection {
  const out = new Writer();
  let first = true;
  for (const step of walkBlocks(document)) {
    if (step.kind === "placeholder") continue;
    // Not `out.text !== ""`: an empty first block writes no text.
    if (!first) out.insert("\n");
    first = false;
    out.block(step.block.id, blockText(step.block));
  }
  return out.finish();
}

/**
 * The `prose` projection, for text a model reads: continuation, summaries
 * and world context. Validates first: anything outside the schema is an
 * `invalid_content` error.
 */
export function projectProse(value: unknown): Result<Projection, ContentError> {
  return validateDocument(value).map(writeProse);
}

/**
 * The `addressable` projection, for AI edits by block ID. Validates first:
 * anything outside the schema is an `invalid_content` error.
 */
export function projectAddressable(
  value: unknown,
): Result<Projection, ContentError> {
  return validateDocument(value).map(writeAddressable);
}

/**
 * The `plain+map` projection, for entity matching and extraction. Validates
 * first: anything outside the schema is an `invalid_content` error.
 */
export function projectPlain(value: unknown): Result<Projection, ContentError> {
  return validateDocument(value).map(writePlain);
}
