/**
 * A passage topic's words in its scene's text: taken from the writer's
 * selection (`passageAt`), and found again in the text as it is now
 * (`passageSpans`), by the editor's gloss and by the stored document.
 *
 * Text is read as text blocks: each block whose children are text (and
 * links), in document order, as the editor's layers read it. A passage is
 * its first block's ID, which occurrence of its words there, and its last
 * block's ID when it runs on. Its words are found again only where they are
 * all still there, in those blocks in the same order: the end of the first
 * block, the whole of each block between, and the start of the last. The
 * quote joins the blocks' parts with a blank line, which a block's own text
 * can hold too, so it is matched against the blocks, never split on it.
 */

import { anchorAt, locate, type Span } from "../layers/model";
import type { JsonValue } from "../storage/types";
import { PASSAGE_BREAK, type PassageScope } from "./records";

/** A text block of a document: its ID and its text. */
export type TextBlock = { readonly id: string; readonly text: string };

/** Where the passage's words are in one block. */
export type PassageSpan = Span & { readonly blockId: string };

/** A passage's anchor in its blocks, without its scene and document. */
export type PassageAnchor = Pick<
  PassageScope,
  "blockId" | "quote" | "occurrence" | "through"
>;

/** A place in the text: a block, and an offset into its text. */
export type TextPoint = { readonly blockId: string; readonly offset: number };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const leafText = (node: unknown): string =>
  !isObject(node)
    ? ""
    : typeof node.text === "string"
      ? node.text
      : Array.isArray(node.children)
        ? node.children.map(leafText).join("")
        : "";

const isInline = (node: unknown) =>
  isObject(node) && (typeof node.text === "string" || node.type === "a");

/** A stored document's text blocks, as the editor's layers read them. */
export function contentBlocks(content: JsonValue): TextBlock[] {
  const blocks: TextBlock[] = [];
  const visit = (node: unknown) => {
    if (!isObject(node) || !Array.isArray(node.children)) return;
    if (node.children.every(isInline)) {
      if (typeof node.id === "string") {
        blocks.push({
          id: node.id,
          text: node.children.map(leafText).join(""),
        });
      }
      return;
    }
    for (const child of node.children) visit(child);
  };
  if (Array.isArray(content)) for (const node of content) visit(node);
  return blocks;
}

/**
 * The passage between two points of `blocks`, in either order, with
 * surrounding white space left out. Null when no words are between them or
 * a point isn't in `blocks`.
 */
export function passageAt(
  blocks: readonly TextBlock[],
  a: TextPoint,
  b: TextPoint,
): PassageAnchor | null {
  const index = (p: TextPoint) => blocks.findIndex((x) => x.id === p.blockId);
  const [ia, ib] = [index(a), index(b)];
  if (ia === -1 || ib === -1) return null;
  const forward = ia < ib || (ia === ib && a.offset <= b.offset);
  let [first, start] = forward ? [ia, a.offset] : [ib, b.offset];
  let [last, end] = forward ? [ib, b.offset] : [ia, a.offset];
  const text = (i: number) => blocks[i]?.text ?? "";
  // Leave out white space at either end, and blocks it leaves empty.
  for (;;) {
    while (start < text(first).length && /\s/.test(text(first)[start] ?? "")) {
      start++;
    }
    if (first < last && start >= text(first).length) {
      first++;
      start = 0;
      continue;
    }
    break;
  }
  for (;;) {
    while (end > 0 && /\s/.test(text(last)[end - 1] ?? "")) end--;
    if (last > first && end <= 0) {
      last--;
      end = text(last).length;
      continue;
    }
    break;
  }
  if (first === last && end <= start) return null;
  const firstBlock = blocks[first];
  const lastBlock = blocks[last];
  if (firstBlock === undefined || lastBlock === undefined) return null;
  const head = anchorAt(firstBlock.text, firstBlock.id, {
    start,
    end: first === last ? end : firstBlock.text.length,
  });
  if (head === null) return null;
  const parts = [
    head.quote,
    ...blocks.slice(first + 1, last).map((block) => block.text),
    ...(first === last ? [] : [lastBlock.text.slice(0, end)]),
  ];
  return {
    blockId: firstBlock.id,
    quote: parts.join(PASSAGE_BREAK),
    ...(head.occurrence === undefined ? {} : { occurrence: head.occurrence }),
    ...(first === last ? {} : { through: lastBlock.id }),
  };
}

/**
 * Where the passage's words are in `blocks` now, one span per block, or
 * null when they aren't all there: the topic then follows the scene.
 */
export function passageSpans(
  blocks: readonly TextBlock[],
  passage: PassageAnchor,
): PassageSpan[] | null {
  const first = blocks.findIndex((b) => b.id === passage.blockId);
  if (first === -1) return null;
  const last =
    passage.through === undefined
      ? first
      : blocks.findIndex((b) => b.id === passage.through);
  if (last < first) return null;
  const firstBlock = blocks[first];
  const lastBlock = blocks[last];
  if (firstBlock === undefined || lastBlock === undefined) return null;
  /** The first block's part, found at the passage's occurrence. */
  const head = (quote: string) =>
    locate(firstBlock.text, {
      blockId: firstBlock.id,
      quote,
      ...(passage.occurrence === undefined
        ? {}
        : { occurrence: passage.occurrence }),
    });
  if (first === last) {
    const span = head(passage.quote);
    return span === null ? null : [{ blockId: firstBlock.id, ...span }];
  }
  // A block's own text can hold a blank line, so the quote isn't split on
  // the breaks: the blocks between, as they are now, fix where the first
  // block's part ends and the last's begins.
  const middle = blocks.slice(first + 1, last);
  const joint = ["", ...middle.map((block) => block.text), ""].join(
    PASSAGE_BREAK,
  );
  const { quote } = passage;
  for (
    let at = quote.indexOf(joint);
    at !== -1;
    at = quote.indexOf(joint, at + 1)
  ) {
    const start = head(quote.slice(0, at));
    const tail = quote.slice(at + joint.length);
    // A passage that runs on takes the rest of its first block, and the
    // start of its last.
    if (
      start === null ||
      start.end !== firstBlock.text.length ||
      !lastBlock.text.startsWith(tail)
    ) {
      continue;
    }
    return [
      { blockId: firstBlock.id, ...start },
      ...middle.map((block) => ({
        blockId: block.id,
        start: 0,
        end: block.text.length,
      })),
      { blockId: lastBlock.id, start: 0, end: tail.length },
    ];
  }
  return null;
}
