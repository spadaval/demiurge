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
 * the output holding exactly its block text, less any ranges the projection
 * cut from it (the span's `cuts`, in block-text offsets; only `prose` cuts,
 * for writer notes). Every other output character (block separators, list
 * markers, heading hashes, the scene break) was inserted by the projection:
 * `toBlock` returns null for it, and no span contains it. Spans are
 * therefore never adjacent, so every output position belongs to at most one
 * span.
 *
 * Across a cut, a character maps to its own block offset, so the output
 * position where a cut was made maps to the first character after it. A block
 * offset inside or at either end of a cut maps to that output position. An
 * output range that spans a cut maps to a block range that contains it.
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
 * So are writer notes, `[[ like this ]]`, with the whitespace that would
 * double up around them (`writer-notes.ts` has the rules): they are the
 * writer talking to themselves. A block that held only notes is dropped as
 * an empty one is.
 * AI segments are rendered inline, whatever their status; their children are
 * numbered among themselves (they are not siblings of the blocks around the
 * segment), as in the export.
 * Blocks with empty text are dropped too, so they have no span; an hr keeps
 * its marker but has no span either.
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
  validateDocument,
} from "./schema";
import { type TextRange, writerNoteCuts } from "./writer-notes";

/** A position in a block's text: `offset` is from 0 to the text's length. */
export type BlockPosition = { blockId: string; offset: number };

/** A range `[start, end)` of one block's text. */
export type BlockRange = { blockId: string; start: number; end: number };

/**
 * Where a block's text sits in the output: `[start, end)`. `cuts`, when
 * present, are the ranges of the block's text left out of the span, sorted
 * and disjoint.
 */
export type Span = {
  blockId: string;
  start: number;
  end: number;
  cuts?: readonly TextRange[];
};

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
    return {
      blockId: span.blockId,
      offset: blockOffset(span, offset - span.start, true),
    };
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
    const blockEnd = blockOffset(span, end - span.start, false);
    return {
      blockId: span.blockId,
      start:
        start === end ? blockEnd : blockOffset(span, start - span.start, true),
      end: blockEnd,
    };
  }

  /**
   * The output offset of a block position, or null when the block is not in
   * the projection or `offset` is outside its text. `offset` may equal the
   * text's length (the position after its last character).
   */
  toText(blockId: string, offset: number): number | null {
    const span = this.byId.get(blockId);
    if (!span || offset < 0) return null;
    let cut = 0;
    let removed = 0;
    for (const range of span.cuts ?? []) {
      removed += range.end - range.start;
      if (range.start < offset)
        cut += Math.min(offset, range.end) - range.start;
    }
    if (offset > span.end - span.start + removed) return null;
    return span.start + offset - cut;
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

/**
 * The block offset of output position `local` (from the span's start). A
 * `character` position is the character there, so it skips a cut that starts
 * at it; otherwise it is the boundary after the character before, which
 * doesn't.
 */
function blockOffset(span: Span, local: number, character: boolean): number {
  let offset = local;
  for (const range of span.cuts ?? []) {
    if (character ? range.start > offset : range.start >= offset) break;
    offset += range.end - range.start;
  }
  return offset;
}

/** Accumulates output text and the spans of block text within it. */
class Writer {
  text = "";
  readonly spans: Span[] = [];

  /** Text the projection inserts; it maps to no block. */
  insert(text: string): void {
    this.text += text;
  }

  /** A block's text, less `cuts` (block-text ranges, sorted and disjoint). */
  block(blockId: string, text: string, cuts: readonly TextRange[] = []): void {
    const start = this.text.length;
    let from = 0;
    for (const cut of cuts) {
      this.text += text.slice(from, cut.start);
      from = cut.end;
    }
    this.text += text.slice(from);
    const span: Span = { blockId, start, end: this.text.length };
    if (cuts.length > 0) span.cuts = cuts;
    this.spans.push(span);
  }

  finish(): Projection {
    return { text: this.text, map: new SourceMap(this.spans) };
  }
}

/**
 * The text blocks of a document in order, AI segment children inline, split
 * into runs of list-numbering siblings: an AI segment's children are one run,
 * and an AI segment or a placeholder ends the run of blocks before it.
 */
function siblingRuns(document: ContentDocument): Block[][] {
  const runs: Block[][] = [[]];
  for (const block of document) {
    if (block.type === "placeholder") runs.push([]);
    else if (block.type === "ai_segment") runs.push(block.children, []);
    else (runs.at(-1) as Block[]).push(block);
  }
  return runs;
}

/** The marker `prose` writes before a block's text. */
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
  for (const siblings of siblingRuns(document)) {
    const counts = new Map<number, { style: ListStyle; count: number }>();
    listContinues = false;
    for (const block of siblings) {
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
        listContinues = false;
      }

      const text = blockText(block);
      const cuts = writerNoteCuts(text);
      const kept = cuts.reduce(
        (length, cut) => length - (cut.end - cut.start),
        text.length,
      );
      if (kept === 0 && block.type !== "hr") continue;
      const listItem = listNumber > 0;
      if (out.text !== "") {
        out.insert(listItem && listContinues ? "\n" : "\n\n");
      }
      listContinues = listItem;
      out.insert(proseMarker(block, listNumber));
      if (block.type !== "hr") out.block(block.id, text, cuts);
    }
  }
  return out.finish();
}

function writePlain(document: ContentDocument): Projection {
  const out = new Writer();
  let first = true;
  for (const block of siblingRuns(document).flat()) {
    if (!first) out.insert("\n");
    first = false;
    out.block(block.id, blockText(block));
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
 * The `plain+map` projection, for entity matching and extraction. Validates
 * first: anything outside the schema is an `invalid_content` error.
 */
export function projectPlain(value: unknown): Result<Projection, ContentError> {
  return validateDocument(value).map(writePlain);
}
