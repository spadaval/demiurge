/**
 * Markdown for content trees, in two forms:
 *
 * - `exportReadableMarkdown`: the readable, one-way export (Boundary 3's
 *   `export`, docs/rebuild/data-model-boundaries.md), for reading and sharing
 *   outside the app. Plain CommonMark with no IDs, no directives and no
 *   parser; its rules are on the function, below the ID-carrying format.
 * - `exportMarkdown` and `parseMarkdown`: the ID-carrying format, built when
 *   markdown was meant to round-trip. `parseMarkdown(exportMarkdown(tree))`
 *   deep-equals `tree` for every tree that passes `validateDocument`. Nothing
 *   in the product reads or writes it; it is kept, unchanged, as a strict
 *   format that tests use to pin trees. It is not the exact export: that is
 *   the world file (`storage/world-file.ts`), which keeps every record of a
 *   world and not only its prose.
 *
 * The ID-carrying format
 * ----------------------
 *
 * Syntax
 * ------
 * Blocks are separated by a blank line; consecutive list items are not. Every
 * block ends with its ID as a trailing `{#id}` attribute (alone when the block
 * is empty):
 *
 *     # Heading {#b_1}            h1, h2, h3 use #, ##, ###
 *     Some _text_. {#b_2}         paragraph
 *     {#b_3}                      empty paragraph
 *     > Quoted. {#b_4}            blockquote
 *     --- {#b_5}                  horizontal rule
 *     - Item {#b_6}               bulleted list item (indent 1)
 *       1. Nested {#b_7}          numbered item (indent 2), indented to the
 *                                 parent's content column
 *       - Deep {#b_10 indent=4}   indent that skips levels (here 2 -> 4)
 *
 * A list item's indent is normally derived from its nesting: one more than
 * its parent item's, or 1 with no parent. When the tree's indent differs
 * (the writer skipped levels, or a list starts indented, e.g. at the top of
 * an AI segment), the item is nested under the closest preceding item with a
 * smaller indent and the actual value is written as `indent=N` in its braces.
 *
 * AI segments and placeholders are container directives. The segment ID and
 * status sit on the opening fence; the body is blocks or plain text:
 *
 *     :::ai{#seg_1 status=ready}
 *     Generated paragraph. {#b_8}
 *     :::
 *
 *     :::placeholder{#b_9}
 *     Describe the storm
 *     :::
 *
 * Inline: `**bold**`, `_italic_`, `~~strikethrough~~`, `` `code` `` (fence
 * lengthened and space-padded per CommonMark when the code holds backticks),
 * `[label](canonical-name)` and `[label](https://…)`. A line break inside a
 * block is a backslash at the end of the line; continuation lines repeat the
 * block's container prefix (`> ` or the list indentation).
 *
 * Escaping: `\ * _ ~ \` [ ] { } <` are always backslash-escaped in text, and
 * so is the first non-space character of each line when it is punctuation
 * (or the `.`/`)` after a leading number), so text can never be read as block
 * syntax. Mark delimiters are strict toggles, so marks may start or end next
 * to whitespace and may overlap; CommonMark readers may render those spans
 * differently, but this parser restores them exactly.
 */

import { err, ok, type Result } from "neverthrow";
import { blockText, walkBlocks } from "./projections";
import {
  AI_SEGMENT_STATUSES,
  type AiSegmentStatus,
  BLOCK_ID_CHARS,
  type Block,
  type ContentDocument,
  type ContentError,
  type Inline,
  type ListStyle,
  type Mark,
  sameMarks,
  type Text,
  type TopBlock,
  validateDocument,
} from "./schema";

type ToggleMark = Exclude<Mark, "code">;
const TOGGLE_MARKS: readonly ToggleMark[] = ["bold", "italic", "strikethrough"];
const DELIMITERS: Record<ToggleMark, string> = {
  bold: "**",
  italic: "_",
  strikethrough: "~~",
};

const ALWAYS_ESCAPED = new Set([
  "\\",
  "*",
  "_",
  "~",
  "`",
  "[",
  "]",
  "{",
  "}",
  "<",
]);
const ASCII_PUNCTUATION = /^[!-/:-@[-`{-~]$/;
const ID = BLOCK_ID_CHARS;
// Line regexes use the `s` flag: text may hold \r, \u2028 and \u2029, which
// `.` would otherwise refuse to match.
const ATTRIBUTES = `\\{#(${ID})(?: indent=([1-9]\\d*))?\\}$`;
const ATTRIBUTES_ONLY = new RegExp(`^${ATTRIBUTES}`);
const ATTRIBUTES_SUFFIX = new RegExp(` ${ATTRIBUTES}`);
const LIST_ITEM = /^( *)(-|\d+\.) (.*)$/s;
const HEADING = /^(#{1,3}) (.*)$/s;
const RULE = new RegExp(`^--- \\{#(${ID})\\}$`);
const AI_FENCE = new RegExp(`^:::ai\\{#(${ID}) status=(\\S+)\\}$`);
const PLACEHOLDER_FENCE = new RegExp(`^:::placeholder\\{#(${ID})\\}$`);
const CLOSE_FENCE = ":::";

// ---------------------------------------------------------------- export

class InlineWriter {
  out = "";
  private lineStart = true;

  syntax(value: string): void {
    this.out += value;
    this.lineStart = false;
  }

  text(value: string): void {
    for (let i = 0; i < value.length; i++) {
      const ch = value[i] as string;
      if (ch === "\n") {
        this.out += "\\\n";
        this.lineStart = true;
        continue;
      }
      if (this.lineStart && ch !== " ") {
        this.lineStart = false;
        const number = /^\d+[.)]/.exec(value.slice(i));
        if (number) {
          this.out += `${number[0].slice(0, -1)}\\${number[0].slice(-1)}`;
          i += number[0].length - 1;
          continue;
        }
        if (ASCII_PUNCTUATION.test(ch)) {
          this.out += `\\${ch}`;
          continue;
        }
      }
      this.out += ALWAYS_ESCAPED.has(ch) ? `\\${ch}` : ch;
    }
  }

  code(value: string): void {
    const longestRun = Math.max(
      0,
      ...(value.match(/`+/g) ?? []).map((run) => run.length),
    );
    const fence = "`".repeat(longestRun + 1);
    const pad =
      value.startsWith("`") ||
      value.endsWith("`") ||
      (value.startsWith(" ") && value.endsWith(" ") && /[^ ]/.test(value));
    const body = pad ? ` ${value} ` : value;
    this.syntax(`${fence}${body}${fence}`);
  }
}

function writeLeaves(writer: InlineWriter, leaves: Text[]): void {
  const open: ToggleMark[] = [];
  const closeFrom = (index: number) => {
    for (let i = open.length - 1; i >= index; i--) {
      writer.syntax(DELIMITERS[open[i] as ToggleMark]);
    }
    open.length = index;
  };
  for (const leaf of leaves) {
    const wanted = TOGGLE_MARKS.filter((mark) => leaf[mark]);
    let keep = 0;
    while (keep < open.length && wanted.includes(open[keep] as ToggleMark))
      keep++;
    closeFrom(keep);
    for (const mark of wanted) {
      if (!open.includes(mark)) {
        writer.syntax(DELIMITERS[mark]);
        open.push(mark);
      }
    }
    if (leaf.code) writer.code(leaf.text);
    else writer.text(leaf.text);
  }
  closeFrom(0);
}

function writeInlines(children: Inline[]): string {
  const writer = new InlineWriter();
  let run: Text[] = [];
  for (const child of children) {
    if ("type" in child) {
      writeLeaves(writer, run);
      run = [];
      writer.syntax("[");
      writeLeaves(writer, child.children);
      writer.syntax(`](${child.url.replace(/[\\()<>]/g, "\\$&")})`);
    } else {
      run.push(child);
    }
  }
  writeLeaves(writer, run);
  return writer.out;
}

function writeTextBlock(
  prefix: string,
  continuation: string,
  children: Inline[],
  attributes: string,
): string {
  const inline = writeInlines(children);
  const withId =
    inline === "" ? `{${attributes}}` : `${inline} {${attributes}}`;
  return withId
    .split("\n")
    .map((line, i) => (i === 0 ? prefix : continuation) + line)
    .join("\n");
}

function listMarker(style: ListStyle, number: number): string {
  return style === "disc" ? "- " : `${number}. `;
}

/** An open list item: its indent, content column and numbering. */
type OpenItem = {
  indent: number;
  column: number;
  style: ListStyle;
  count: number;
};

function writeBlocks(blocks: TopBlock[]): string {
  let out = "";
  let open: OpenItem[] = [];
  let previousWasListItem = false;

  for (const block of blocks) {
    const isListItem = block.type === "p" && block.listStyleType !== undefined;
    if (out !== "") out += isListItem && previousWasListItem ? "\n" : "\n\n";
    if (!isListItem) open = [];
    previousWasListItem = isListItem;

    switch (block.type) {
      case "p": {
        if (block.listStyleType === undefined || block.indent === undefined) {
          out += writeTextBlock("", "", block.children, `#${block.id}`);
          break;
        }
        const { indent, listStyleType: style } = block;
        // Nest under the closest open item with a smaller indent.
        const level = open.findIndex((item) => item.indent >= indent);
        const depth = level === -1 ? open.length : level;
        const parent = open[depth - 1];
        const sibling = open[depth];
        const count =
          sibling?.indent === indent && sibling.style === style
            ? sibling.count + 1
            : 1;
        const marker = listMarker(style, count);
        const markerColumn = parent?.column ?? 0;
        const column = markerColumn + marker.length;
        open = [...open.slice(0, depth), { indent, column, style, count }];
        const derived = (parent?.indent ?? 0) + 1;
        out += writeTextBlock(
          " ".repeat(markerColumn) + marker,
          " ".repeat(column),
          block.children,
          indent === derived ? `#${block.id}` : `#${block.id} indent=${indent}`,
        );
        break;
      }
      case "h1":
      case "h2":
      case "h3": {
        const hashes = "#".repeat(Number(block.type.slice(1)));
        out += writeTextBlock(`${hashes} `, "", block.children, `#${block.id}`);
        break;
      }
      case "blockquote":
        out += writeTextBlock("> ", "> ", block.children, `#${block.id}`);
        break;
      case "hr":
        out += `--- {#${block.id}}`;
        break;
      case "ai_segment":
        out += `:::ai{#${block.id} status=${block.status}}\n${writeBlocks(block.children)}\n${CLOSE_FENCE}`;
        break;
      case "placeholder": {
        const body = writeInlines(block.children);
        out += `:::placeholder{#${block.id}}\n${body === "" ? "" : `${body}\n`}${CLOSE_FENCE}`;
        break;
      }
    }
  }
  return out;
}

/**
 * Projects a document to export markdown. Validates first: anything outside
 * the restricted schema is an `invalid_content` error, never dropped.
 */
export function exportMarkdown(value: unknown): Result<string, ContentError> {
  return validateDocument(value).map((document) => {
    const out = writeBlocks(document);
    return out === "" ? "" : `${out}\n`;
  });
}

// ------------------------------------------------------- readable export

/** Characters escaped wherever they appear in readable text. */
const READABLE_ESCAPED = new Set(["\\", "*", "~", "`", "[", "]"]);
/** Characters that could start block syntax when first on a line. */
const READABLE_LINE_START = new Set(["#", ">", "-", "+", "=", "|"]);
const READABLE_DELIMITERS: Record<ToggleMark, string> = {
  bold: "**",
  italic: "*",
  strikethrough: "~~",
};
const ENTITY = /^&(?:#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);/;
const WORD = /[\p{L}\p{N}]/u;

/** One piece of a block's inline markdown, before whitespace is moved. */
type ReadableToken =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "syntax"; text: string; closes: boolean; opens: boolean };

/**
 * Marks on a whitespace-only leaf can't be seen and would only put emphasis
 * delimiters beside spaces, which CommonMark doesn't read as emphasis. Such
 * a leaf takes the marks it shares with both neighbours, and leaves that end
 * up alike are merged.
 */
function readableLeaves(leaves: Text[]): Text[] {
  const adjusted = leaves.map((leaf, i): Text => {
    if (leaf.code || leaf.text === "" || /\S/.test(leaf.text)) return leaf;
    const before = leaves[i - 1];
    const after = leaves[i + 1];
    const next: Text = { text: leaf.text };
    for (const mark of TOGGLE_MARKS) {
      if (before?.[mark] && after?.[mark]) next[mark] = true;
    }
    return next;
  });
  const merged: Text[] = [];
  for (const leaf of adjusted) {
    const last = merged.at(-1);
    if (last && !last.code && !leaf.code && sameMarks(last, leaf)) {
      merged[merged.length - 1] = { ...last, text: last.text + leaf.text };
    } else {
      merged.push(leaf);
    }
  }
  return merged;
}

function readableLeafTokens(leaves: Text[], tokens: ReadableToken[]): void {
  const open: ToggleMark[] = [];
  const closeFrom = (index: number) => {
    for (let i = open.length - 1; i >= index; i--) {
      const mark = open[i] as ToggleMark;
      tokens.push({
        kind: "syntax",
        text: READABLE_DELIMITERS[mark],
        closes: true,
        opens: false,
      });
    }
    open.length = index;
  };
  for (const leaf of readableLeaves(leaves)) {
    const wanted = TOGGLE_MARKS.filter((mark) => leaf[mark]);
    let keep = 0;
    while (keep < open.length && wanted.includes(open[keep] as ToggleMark))
      keep++;
    closeFrom(keep);
    for (const mark of wanted) {
      if (!open.includes(mark)) {
        tokens.push({
          kind: "syntax",
          text: READABLE_DELIMITERS[mark],
          closes: false,
          opens: true,
        });
        open.push(mark);
      }
    }
    tokens.push({ kind: leaf.code ? "code" : "text", text: leaf.text });
  }
  closeFrom(0);
}

type SyntaxToken = Extract<ReadableToken, { kind: "syntax" }>;

/**
 * Moves whitespace out of emphasis: closing delimiters go before the spaces
 * that precede them and opening ones after the spaces that follow them, so
 * `**bold **` is written `**bold** `, which CommonMark reads as bold. A run
 * of delimiters between two texts is closes then opens (one leaf to the
 * next), and the moved whitespace lands between the two.
 */
function hoistWhitespace(tokens: ReadableToken[]): ReadableToken[] {
  const out: ReadableToken[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i] as ReadableToken;
    if (token.kind !== "syntax") {
      out.push({ ...token });
      i++;
      continue;
    }
    let end = i;
    while (tokens[end]?.kind === "syntax") end++;
    const run = tokens.slice(i, end) as SyntaxToken[];
    const closes = run.filter((t) => t.closes);
    const opens = run.filter((t) => t.opens);
    let moved = "";
    const before = out.at(-1);
    if (closes.length > 0 && before?.kind === "text") {
      const trailing = /\s+$/.exec(before.text)?.[0] ?? "";
      before.text = before.text.slice(0, before.text.length - trailing.length);
      moved += trailing;
    }
    out.push(...closes);
    const after = tokens[end];
    let rest: string | null = null;
    if (opens.length > 0 && after?.kind === "text") {
      const leading = /^\s+/.exec(after.text)?.[0] ?? "";
      moved += leading;
      rest = after.text.slice(leading.length);
      end++;
    }
    if (moved !== "") out.push({ kind: "text", text: moved });
    out.push(...opens);
    if (rest !== null) out.push({ kind: "text", text: rest });
    i = end;
  }
  return out;
}

/**
 * Writes readable inline markdown. `lineStart` says whether the first line
 * can start block syntax (not in a heading). Leading spaces of each line are
 * dropped: they would read as indented code, and HTML collapses them anyway.
 */
class ReadableWriter {
  out = "";
  private atLineStart: boolean;

  constructor(lineStart: boolean) {
    this.atLineStart = lineStart;
  }

  syntax(value: string): void {
    this.out += value;
    this.atLineStart = false;
  }

  text(value: string): void {
    for (let i = 0; i < value.length; i++) {
      const ch = value[i] as string;
      if (ch === "\n") {
        this.out += "\\\n";
        this.atLineStart = true;
        continue;
      }
      if (this.atLineStart) {
        if (ch === " " || ch === "\t") continue;
        this.atLineStart = false;
        const number = /^\d+[.)]/.exec(value.slice(i));
        if (number) {
          this.out += `${number[0].slice(0, -1)}\\${number[0].slice(-1)}`;
          i += number[0].length - 1;
          continue;
        }
        if (READABLE_LINE_START.has(ch)) {
          this.out += `\\${ch}`;
          continue;
        }
      }
      this.out += this.escape(value, i);
    }
  }

  private escape(value: string, i: number): string {
    const ch = value[i] as string;
    if (READABLE_ESCAPED.has(ch)) return `\\${ch}`;
    // `_` between letters or digits can't be emphasis.
    if (ch === "_") {
      const inWord =
        WORD.test(value[i - 1] ?? this.out.at(-1) ?? "") &&
        WORD.test(value[i + 1] ?? "");
      return inWord ? ch : "\\_";
    }
    // Only what could open an HTML tag, an autolink or an entity.
    if (ch === "<" && /[A-Za-z/!?]/.test(value[i + 1] ?? "")) return "\\<";
    if (ch === "&" && ENTITY.test(value.slice(i))) return "\\&";
    return ch;
  }

  code(value: string): void {
    const longestRun = Math.max(
      0,
      ...(value.match(/`+/g) ?? []).map((run) => run.length),
    );
    const fence = "`".repeat(longestRun + 1);
    const pad =
      value.startsWith("`") ||
      value.endsWith("`") ||
      (value.startsWith(" ") && value.endsWith(" ") && /[^ ]/.test(value));
    this.syntax(`${fence}${pad ? ` ${value} ` : value}${fence}`);
  }
}

function writeReadableTokens(writer: ReadableWriter, leaves: Text[]): void {
  const tokens: ReadableToken[] = [];
  readableLeafTokens(leaves, tokens);
  for (const token of hoistWhitespace(tokens)) {
    if (token.kind === "syntax") writer.syntax(token.text);
    else if (token.kind === "code") writer.code(token.text);
    else writer.text(token.text);
  }
}

function writeReadableInlines(children: Inline[], lineStart: boolean): string {
  const writer = new ReadableWriter(lineStart);
  let run: Text[] = [];
  for (const child of children) {
    if ("type" in child) {
      writeReadableTokens(writer, run);
      run = [];
      writer.syntax("[");
      writeReadableTokens(writer, child.children);
      writer.syntax(`](${child.url.replace(/[\\()<>]/g, "\\$&")})`);
    } else {
      run.push(child);
    }
  }
  writeReadableTokens(writer, run);
  // Line breaks at either end of a block show as nothing or a stray `\`.
  return writer.out.replace(/^(?:\\\n)+/, "").replace(/(?:\\\n)+$/, "");
}

/** A heading's text on one line, its line breaks as spaces. */
function readableHeading(level: number, children: Inline[]): string {
  const flat = children.map(
    (child): Inline =>
      "type" in child
        ? {
            ...child,
            children: child.children.map((leaf) => ({
              ...leaf,
              text: leaf.text.replaceAll("\n", " "),
            })),
          }
        : { ...child, text: child.text.replaceAll("\n", " ") },
  );
  // A closing run of `#` after a space would be read as the heading's end.
  const text = writeReadableInlines(flat, false).replace(
    /(^|\s)(#+\s*)$/,
    "$1\\$2",
  );
  return `${"#".repeat(level)} ${text}`;
}

/** An open list item while writing nested lists: its indent and content column. */
type ReadableItem = { indent: number; column: number };

/**
 * The readable, one-way markdown export of a document, for reading and
 * sharing outside the app (Boundary 3's `export`). It is CommonMark with GFM
 * strikethrough, and keeps only what a reader sees:
 *
 *     # Heading                 h1, h2, h3 as #, ##, ###
 *     Some *italic* and **bold** text, ~~struck~~, `code`.
 *     > Quoted.
 *     ---                       hr
 *     - Item                    lists nest by indentation; numbers are the
 *       1. Nested               editor's
 *     [label](old-mill)         links, internal ones by canonical name
 *
 * Dropped: block IDs, AI segment boundaries and status (their blocks are
 * written in place, as text), placeholders (instructions to the writer),
 * empty blocks, leading spaces of lines, and line breaks at either end of a
 * block. A line break inside a block is a backslash at the end of the line,
 * except in a heading, where it becomes a space. An indent that skips levels
 * nests under the closest shallower item, as markdown has no deeper level.
 * Numbered items keep the numbers the editor shows; where the numbering
 * restarts without a block between (at a placeholder or an AI segment edge),
 * a blank line separates the two runs, and most renderers will continue the
 * first list's numbering.
 *
 * Text is escaped so a reader shows it as written, but escaping is kept to
 * what CommonMark could misread, so the source stays readable: `\ * ~ \` [ ]`
 * anywhere, `_` outside words, `<` before a tag or autolink, `&` before an
 * entity, and block syntax (`#`, `>`, `-`, `+`, `=`, `|`, `1.`) at the start
 * of a line. Whitespace at the edges of a marked span moves outside it, so
 * CommonMark reads the emphasis. Some marked spans have no CommonMark form
 * (for example bold ending in punctuation right before a letter); those are
 * written with their delimiters and a renderer may show the delimiters.
 *
 * There is no parser: exact export and import go through the world file
 * (`storage/world-file.ts`). Validates first: anything outside the schema
 * is an `invalid_content` error.
 */
export function exportReadableMarkdown(
  value: unknown,
): Result<string, ContentError> {
  return validateDocument(value).map((document) => {
    let out = "";
    let open: ReadableItem[] = [];
    // As in `prose`: a single newline only between items of one list.
    let listContinues = false;
    for (const step of walkBlocks(document)) {
      if (step.kind === "placeholder") continue;
      const { block, listNumber, restart } = step;
      const listItem = listNumber > 0;
      if (restart || !listItem) {
        listContinues = false;
        open = [];
      }
      const empty = block.type !== "hr" && blockText(block) === "";
      if (empty) continue;
      if (out !== "") out += listItem && listContinues ? "\n" : "\n\n";
      listContinues = listItem;

      switch (block.type) {
        case "p": {
          if (block.indent === undefined || block.listStyleType === undefined) {
            out += writeReadableInlines(block.children, true);
            break;
          }
          const { indent } = block;
          const level = open.findIndex((item) => item.indent >= indent);
          const depth = level === -1 ? open.length : level;
          const markerColumn = open[depth - 1]?.column ?? 0;
          const marker =
            block.listStyleType === "decimal" ? `${listNumber}. ` : "- ";
          const column = markerColumn + marker.length;
          open = [...open.slice(0, depth), { indent, column }];
          out += writeReadableInlines(block.children, true)
            .split("\n")
            .map(
              (line, i) =>
                (i === 0
                  ? " ".repeat(markerColumn) + marker
                  : " ".repeat(column)) + line,
            )
            .join("\n");
          break;
        }
        case "h1":
        case "h2":
        case "h3":
          out += readableHeading(Number(block.type.slice(1)), block.children);
          break;
        case "blockquote":
          out += writeReadableInlines(block.children, true)
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n");
          break;
        case "hr":
          out += "---";
          break;
      }
    }
    return out === "" ? "" : `${out}\n`;
  });
}

// ----------------------------------------------------------------- parse

class InlineParser {
  private pos = 0;
  constructor(private readonly src: string) {}

  parse(): Result<Inline[], string> {
    const children: Inline[] = [];
    for (;;) {
      const leaves = this.leaves(false);
      if (leaves.isErr()) return err(leaves.error);
      children.push(
        ...(leaves.value.length > 0 ? leaves.value : [{ text: "" }]),
      );
      if (this.pos >= this.src.length) return ok(children);

      this.pos++; // "["
      const label = this.leaves(true);
      if (label.isErr()) return err(label.error);
      if (this.src[this.pos] !== "]") return err("unclosed link label");
      if (this.src[this.pos + 1] !== "(")
        return err('expected "(" after link label');
      this.pos += 2;
      const url = this.url();
      if (url.isErr()) return err(url.error);
      children.push({
        type: "a",
        url: url.value,
        children: label.value.length > 0 ? label.value : [{ text: "" }],
      });
    }
  }

  /** Reads text up to the end, or to `[` outside a link / `]` inside one. */
  private leaves(inLink: boolean): Result<Text[], string> {
    const { src } = this;
    const leaves: Text[] = [];
    const active: Record<ToggleMark, boolean> = {
      bold: false,
      italic: false,
      strikethrough: false,
    };
    let buffer = "";
    const push = (text: string, code: boolean) => {
      const leaf: Text = { text };
      for (const mark of TOGGLE_MARKS) if (active[mark]) leaf[mark] = true;
      if (code) leaf.code = true;
      const last = leaves.at(-1);
      if (last && sameMarks(last, leaf)) last.text += text;
      else leaves.push(leaf);
    };
    const flush = () => {
      if (buffer !== "") push(buffer, false);
      buffer = "";
    };
    const toggle = (mark: ToggleMark) => {
      flush();
      active[mark] = !active[mark];
      this.pos += DELIMITERS[mark].length;
    };

    while (this.pos < src.length) {
      const ch = src[this.pos] as string;
      if (ch === "\\") {
        const next = src[this.pos + 1];
        if (
          next === "\n" ||
          (next !== undefined && ASCII_PUNCTUATION.test(next))
        ) {
          buffer += next;
          this.pos += 2;
          continue;
        }
        return err("backslash must escape punctuation or end the line");
      }
      if (ch === "`") {
        flush();
        const code = this.codeSpan();
        if (code.isErr()) return err(code.error);
        push(code.value, true);
        continue;
      }
      if (src.startsWith("**", this.pos)) {
        toggle("bold");
        continue;
      }
      if (ch === "_") {
        toggle("italic");
        continue;
      }
      if (src.startsWith("~~", this.pos)) {
        toggle("strikethrough");
        continue;
      }
      if (ch === "[" && !inLink) break;
      if (ch === "]" && inLink) break;
      if ("*~[]{}\n".includes(ch)) {
        return err(`unescaped ${JSON.stringify(ch)} in text`);
      }
      buffer += ch;
      this.pos++;
    }
    flush();
    const unclosed = TOGGLE_MARKS.find((mark) => active[mark]);
    if (unclosed) {
      return err(
        `unclosed ${unclosed} mark (marks must close before a link or block end)`,
      );
    }
    return ok(leaves);
  }

  private codeSpan(): Result<string, string> {
    const { src } = this;
    const fenceLength = /^`+/.exec(src.slice(this.pos))?.[0].length ?? 0;
    const start = this.pos + fenceLength;
    let at = start;
    for (;;) {
      const open = src.indexOf("`", at);
      if (open === -1) return err("unclosed code span");
      let end = open;
      while (src[end] === "`") end++;
      if (end - open === fenceLength) {
        const body = src.slice(start, open);
        if (body.includes("\n"))
          return err("code span cannot contain a line break");
        this.pos = end;
        const padded =
          body.startsWith(" ") && body.endsWith(" ") && /[^ ]/.test(body);
        return ok(padded ? body.slice(1, -1) : body);
      }
      at = end;
    }
  }

  private url(): Result<string, string> {
    const { src } = this;
    let url = "";
    while (this.pos < src.length && src[this.pos] !== ")") {
      const ch = src[this.pos] as string;
      if (/\s/.test(ch)) return err("link url cannot contain whitespace");
      if (ch === "\\" && ASCII_PUNCTUATION.test(src[this.pos + 1] ?? "")) {
        url += src[this.pos + 1];
        this.pos += 2;
      } else {
        url += ch;
        this.pos++;
      }
    }
    if (this.pos >= src.length) return err("unclosed link url");
    this.pos++; // ")"
    return ok(url);
  }
}

const endsWithLineBreak = (line: string) =>
  ((/\\*$/.exec(line)?.[0].length ?? 0) & 1) === 1;

class BlockParser {
  private i = 0;
  constructor(private readonly lines: string[]) {}

  private fail(reason: string, line = this.i): Result<never, ContentError> {
    return err({ kind: "invalid_markdown", line: line + 1, reason });
  }

  parseDocument(): Result<TopBlock[], ContentError> {
    const blocks = this.blocks(false);
    if (blocks.isErr()) return blocks;
    if (this.i < this.lines.length)
      return this.fail("closing fence without a directive");
    return blocks;
  }

  /** Parses blocks until the end, or until a closing fence when `inSegment`. */
  private blocks(inSegment: boolean): Result<TopBlock[], ContentError> {
    const blocks: TopBlock[] = [];
    let open: { indent: number; column: number }[] = [];
    while (this.i < this.lines.length) {
      const line = this.lines[this.i] as string;
      if (line === "") {
        this.i++;
        continue;
      }
      if (line === CLOSE_FENCE) break;

      const listItem = LIST_ITEM.exec(line);
      if (listItem) {
        const [, spaces = "", marker = "", content = ""] = listItem;
        const markerColumns = [0, ...open.map((item) => item.column)];
        const depth = markerColumns.indexOf(spaces.length);
        if (depth === -1) {
          return this.fail("list item indentation matches no open list level");
        }
        const parentIndent = open[depth - 1]?.indent ?? 0;
        const column = spaces.length + marker.length + 1;
        const block = this.textBlock(content, " ".repeat(column));
        if (block.isErr()) return err(block.error);
        const indent = block.value.indent ?? parentIndent + 1;
        if (indent <= parentIndent) {
          return this.fail(
            `indent=${indent} must be deeper than the parent item's ${parentIndent}`,
            this.i - 1,
          );
        }
        open = [...open.slice(0, depth), { indent, column }];
        blocks.push({
          type: "p",
          id: block.value.id,
          children: block.value.children,
          listStyleType: marker === "-" ? "disc" : "decimal",
          indent,
        });
        continue;
      }
      open = [];

      if (line.startsWith(":::")) {
        if (inSegment) return this.fail("directives cannot be nested");
        const directive = this.directive(line);
        if (directive.isErr()) return err(directive.error);
        blocks.push(directive.value);
        continue;
      }
      const rule = RULE.exec(line);
      if (rule) {
        blocks.push({
          type: "hr",
          id: rule[1] as string,
          children: [{ text: "" }],
        });
        this.i++;
        continue;
      }
      const heading = HEADING.exec(line);
      const quote = line.startsWith("> ");
      const block = heading
        ? this.textBlock(heading[2] as string, "")
        : quote
          ? this.textBlock(line.slice(2), "> ")
          : this.textBlock(line, "");
      if (block.isErr()) return err(block.error);
      const { id, children, indent } = block.value;
      if (indent !== undefined) {
        return this.fail("indent applies to list items only", this.i - 1);
      }
      const type = heading
        ? (`h${(heading[1] as string).length}` as "h1" | "h2" | "h3")
        : quote
          ? "blockquote"
          : "p";
      blocks.push({ type, id, children } satisfies Block);
    }
    if (inSegment && this.i >= this.lines.length) {
      return this.fail("unclosed ai directive", this.lines.length - 1);
    }
    return ok(blocks);
  }

  /** Reads lines joined by trailing-backslash line breaks, stripping `continuation`. */
  private logicalLine(
    first: string,
    continuation: string,
  ): Result<string, ContentError> {
    const parts = [first];
    while (endsWithLineBreak(parts.at(-1) as string)) {
      this.i++;
      const next = this.lines[this.i];
      if (next === undefined || !next.startsWith(continuation)) {
        return this.fail(
          `line break must continue on a line starting with ${JSON.stringify(continuation)}`,
        );
      }
      parts.push(next.slice(continuation.length));
    }
    this.i++;
    return ok(parts.join("\n"));
  }

  private inlines(
    content: string,
    line: number,
  ): Result<Inline[], ContentError> {
    return new InlineParser(content).parse().mapErr((reason) => ({
      kind: "invalid_markdown" as const,
      line: line + 1,
      reason,
    }));
  }

  private textBlock(
    first: string,
    continuation: string,
  ): Result<
    { id: string; indent: number | undefined; children: Inline[] },
    ContentError
  > {
    const start = this.i;
    const joined = this.logicalLine(first, continuation);
    if (joined.isErr()) return err(joined.error);
    const alone = ATTRIBUTES_ONLY.exec(joined.value);
    const suffix = alone ? null : ATTRIBUTES_SUFFIX.exec(joined.value);
    const match = alone ?? suffix;
    if (!match)
      return this.fail("block is missing its trailing {#id}", this.i - 1);
    const content = suffix ? joined.value.slice(0, suffix.index) : "";
    return this.inlines(content, start).map((children) => ({
      id: match[1] as string,
      indent: match[2] === undefined ? undefined : Number(match[2]),
      children,
    }));
  }

  private directive(line: string): Result<TopBlock, ContentError> {
    const start = this.i;
    const ai = AI_FENCE.exec(line);
    if (ai) {
      const status = AI_SEGMENT_STATUSES.find((s) => s === ai[2]);
      if (!status)
        return this.fail(`unknown ai segment status ${JSON.stringify(ai[2])}`);
      this.i++;
      const children = this.blocks(true);
      if (children.isErr()) return err(children.error);
      this.i++; // closing fence
      return ok({
        type: "ai_segment",
        id: ai[1] as string,
        status: status satisfies AiSegmentStatus,
        children: children.value as Block[],
      });
    }
    const placeholder = PLACEHOLDER_FENCE.exec(line);
    if (!placeholder)
      return this.fail(`unknown directive ${JSON.stringify(line)}`);
    this.i++;
    let text = "";
    const body = this.lines[this.i];
    if (body === undefined)
      return this.fail("unclosed placeholder directive", start);
    if (body !== CLOSE_FENCE) {
      const joined = this.logicalLine(body, "");
      if (joined.isErr()) return err(joined.error);
      const children = this.inlines(joined.value, start + 1);
      if (children.isErr()) return err(children.error);
      const [only, ...rest] = children.value;
      if (
        !only ||
        rest.length > 0 ||
        "type" in only ||
        Object.keys(only).length > 1
      ) {
        return this.fail("placeholder holds plain text only", start + 1);
      }
      text = only.text;
    }
    if (this.lines[this.i] !== CLOSE_FENCE) {
      return this.fail("expected closing fence for placeholder");
    }
    this.i++;
    return ok({
      type: "placeholder",
      id: placeholder[1] as string,
      children: [{ text }],
    });
  }
}

/**
 * Parses export markdown back into a document. Syntax errors are
 * `invalid_markdown` (with a 1-based line); a well-formed file whose tree
 * breaks a schema rule (e.g. duplicate IDs) is `invalid_content`.
 */
export function parseMarkdown(
  markdown: string,
): Result<ContentDocument, ContentError> {
  const lines = markdown.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return new BlockParser(lines).parseDocument().andThen(validateDocument);
}
