import { describe, expect, test } from "bun:test";
import {
  blockText,
  type Projection,
  projectAddressable,
  projectPlain,
  projectProse,
} from "./projections";
import {
  AI_SEGMENT_STATUSES,
  BLOCK_TYPES,
  type Block,
  type ContentDocument,
  LIST_STYLES,
  MARKS,
  type TopBlock,
} from "./schema";
import { fixture, generateTrees, p } from "./test-trees";
import { type TextRange, writerNoteCuts } from "./writer-notes";

const prose = (tree: unknown): Projection => projectProse(tree)._unsafeUnwrap();
const plain = (tree: unknown): Projection => projectPlain(tree)._unsafeUnwrap();
const addressable = (tree: unknown): Projection =>
  projectAddressable(tree)._unsafeUnwrap();

const item = (
  id: string,
  listStyleType: "disc" | "decimal",
  indent: number,
  text: string,
): Block => ({ type: "p", id, listStyleType, indent, children: [{ text }] });

/** The text blocks of a tree in document order, AI segment children inline. */
function textBlocks(tree: ContentDocument): Block[] {
  return tree.flatMap((block) =>
    block.type === "placeholder"
      ? []
      : block.type === "ai_segment"
        ? block.children
        : [block],
  );
}

/** `text` without the `cuts` ranges. */
function withoutCuts(text: string, cuts: readonly TextRange[] = []): string {
  let kept = "";
  let from = 0;
  for (const cut of cuts) {
    kept += text.slice(from, cut.start);
    from = cut.end;
  }
  return kept + text.slice(from);
}

/** Each block's own text by ID: text blocks and placeholders. */
function ownTexts(tree: ContentDocument): Map<string, string> {
  const texts = new Map(
    textBlocks(tree).map((block) => [block.id, blockText(block)]),
  );
  for (const block of tree) {
    if (block.type === "placeholder") {
      texts.set(block.id, block.children[0].text);
    }
  }
  return texts;
}

/**
 * Checks the source-map contract against the tree: every mapped character is
 * the same character of its block's text, each included block's text (less
 * its cuts) appears whole in one span, and the inverse agrees. Returns the
 * unmapped characters.
 */
function checkMap(
  tree: ContentDocument,
  { text, map }: Projection,
  expectedIds: string[],
): string {
  const texts = ownTexts(tree);
  expect(map.spans.map((span) => span.blockId)).toEqual(expectedIds);

  let previousEnd = -1;
  for (const span of map.spans) {
    const own = texts.get(span.blockId) as string;
    const cuts = span.cuts ?? [];
    expect(text.slice(span.start, span.end)).toBe(withoutCuts(own, cuts));
    // Spans are in order and never adjacent, so positions are unambiguous.
    expect(span.start).toBeGreaterThan(previousEnd);
    previousEnd = span.end;
    for (let offset = 0; offset <= own.length; offset++) {
      const kept = withoutCuts(own.slice(0, offset), cuts).length;
      expect(map.toText(span.blockId, offset)).toBe(span.start + kept);
    }
    expect(map.toText(span.blockId, own.length + 1)).toBeNull();
    expect(map.toText(span.blockId, -1)).toBeNull();
    const first = cuts[0]?.start === 0 ? (cuts[0]?.end ?? 0) : 0;
    const last =
      cuts.at(-1)?.end === own.length ? (cuts.at(-1)?.start ?? 0) : own.length;
    if (span.end > span.start) {
      expect(map.toBlockRange(span.start, span.end)).toEqual({
        blockId: span.blockId,
        start: first,
        end: last,
      });
    }
    expect(map.toBlockRange(span.start, span.end + 1)).toBeNull();
    expect(map.toBlockRange(span.start - 1, span.end)).toBeNull();
  }

  let unmapped = "";
  for (let offset = 0; offset < text.length; offset++) {
    const position = map.toBlock(offset);
    if (position === null) {
      unmapped += text[offset];
      continue;
    }
    const own = texts.get(position.blockId) as string;
    expect(own[position.offset]).toBe(text[offset] as string);
    expect(map.toText(position.blockId, position.offset)).toBe(offset);
  }
  const mappedLength = map.spans.reduce(
    (sum, span) => sum + span.end - span.start,
    0,
  );
  expect(unmapped.length).toBe(text.length - mappedLength);
  expect(map.toBlock(-1)).toBeNull();
  expect(map.toBlock(text.length)).toBeNull();
  return unmapped;
}

const proseIds = (tree: ContentDocument) =>
  textBlocks(tree)
    .filter(
      (block) =>
        block.type !== "hr" &&
        withoutCuts(blockText(block), writerNoteCuts(blockText(block))) !== "",
    )
    .map((block) => block.id);

const plainIds = (tree: ContentDocument) =>
  textBlocks(tree).map((block) => block.id);

describe("blockText", () => {
  test("concatenates leaves and link text, keeping soft line breaks", () => {
    expect(
      blockText(
        p(
          "b",
          { text: "See " },
          {
            type: "a",
            url: "old-mill",
            children: [{ text: "the " }, { text: "mill", bold: true }],
          },
          { text: ".\nNext" },
        ),
      ),
    ).toBe("See the mill.\nNext");
  });
});

describe("prose", () => {
  test("fixture", () => {
    const projection = prose(fixture);
    expect(projection.text).toBe(
      [
        "# The Old Mill",
        "",
        "## Arrival",
        "",
        "### Night one",
        "",
        "Plain, bold, italic, struck and code.",
        "",
        "See the mill or the web.",
        "",
        "> Quoted line",
        "",
        "* * *",
        "",
        "- one",
        "  - nested",
        "    1. deep",
        "    2. deeper",
        "- two",
        "",
        "Between lists.",
        "",
        "1. first",
        "2. second",
        "",
        "Generated prose.",
        "",
        "- item",
        "",
        "## Generated heading",
      ].join("\n"),
    );
    checkMap(fixture, projection, proseIds(fixture));
    // Placeholders, empty blocks and the hr have no position in the prose.
    for (const id of ["ph_1", "ph_2", "b_4", "a_4", "r_1", "seg_1"]) {
      expect(projection.map.toText(id, 0)).toBeNull();
    }
  });

  test("separators and markers map to no block", () => {
    const { map } = prose([
      { type: "h2", id: "h", children: [{ text: "Hi" }] },
      item("l", "disc", 2, "x"),
    ]);
    // "## Hi\n\n  - x"
    expect([0, 1, 2].map((offset) => map.toBlock(offset))).toEqual([
      null,
      null,
      null,
    ]);
    expect(map.toBlock(3)).toEqual({ blockId: "h", offset: 0 });
    expect(map.toBlock(5)).toBeNull();
    expect(map.toBlock(11)).toEqual({ blockId: "l", offset: 0 });
    // A position at the end of a block's text still resolves as a range.
    expect(map.toBlockRange(5, 5)).toEqual({ blockId: "h", start: 2, end: 2 });
    expect(map.toBlockRange(6, 6)).toBeNull();
    expect(map.toBlockRange(4, 3)).toBeNull();
  });

  test("numbering follows the editor's flat-list rules", () => {
    const projection = prose([
      item("a", "decimal", 1, "a"),
      item("b", "decimal", 2, "b"),
      item("c", "decimal", 1, "c"),
      item("d", "decimal", 2, "d"),
      item("e", "disc", 1, "e"),
      item("f", "decimal", 1, "f"),
      item("g", "decimal", 1, ""),
      item("h", "decimal", 1, "h"),
      p("x", { text: "" }),
      item("i", "decimal", 1, "i"),
      { type: "placeholder", id: "ph", children: [{ text: "Next step" }] },
      item("k", "decimal", 1, "k"),
      {
        type: "ai_segment",
        id: "s",
        status: "ready",
        children: [item("j", "decimal", 1, "j")],
      },
    ]);
    expect(projection.text).toBe(
      [
        "1. a",
        "  1. b",
        "2. c",
        "  1. d",
        "- e",
        "1. f",
        "3. h",
        "",
        "1. i",
        "",
        "1. k",
        "",
        "1. j",
      ].join("\n"),
    );
  });

  test("soft line breaks are kept inside the block's span", () => {
    const tree: ContentDocument = [
      { type: "blockquote", id: "q", children: [{ text: "one\ntwo" }] },
    ];
    const projection = prose(tree);
    expect(projection.text).toBe("> one\ntwo");
    expect(projection.map.toBlock(5)).toEqual({ blockId: "q", offset: 3 });
    checkMap(tree, projection, ["q"]);
  });

  test("an empty or text-free document projects to nothing", () => {
    for (const tree of [
      [],
      [{ type: "placeholder", id: "ph", children: [{ text: "Write" }] }],
      [p("b", { text: "" })],
    ]) {
      const projection = prose(tree);
      expect(projection.text).toBe("");
      expect(projection.map.spans).toEqual([]);
    }
  });

  test("rejects a tree outside the schema", () => {
    expect(
      projectProse([
        { type: "table", id: "t", children: [] },
      ])._unsafeUnwrapErr(),
    ).toMatchObject({ kind: "invalid_content", path: "[0]" });
  });
});

describe("plain+map", () => {
  test("fixture", () => {
    const projection = plain(fixture);
    expect(projection.text).toBe(
      [
        "The Old Mill",
        "Arrival",
        "Night one",
        "Plain, bold, italic, struck and code.",
        "See the mill or the web.",
        "Quoted line",
        "",
        "one",
        "nested",
        "deep",
        "deeper",
        "two",
        "Between lists.",
        "first",
        "second",
        "Generated prose.",
        "item",
        "Generated heading",
        "",
        "",
      ].join("\n"),
    );
    checkMap(fixture, projection, plainIds(fixture));
    // Empty blocks and the hr keep a position; placeholders do not.
    expect(projection.map.toText("r_1", 0)).toBe(
      "The Old Mill\nArrival\nNight one\nPlain, bold, italic, struck and code.\nSee the mill or the web.\nQuoted line\n"
        .length,
    );
    expect(projection.map.toText("b_4", 0)).toBe(projection.text.length);
    expect(projection.map.toText("ph_1", 0)).toBeNull();
  });

  test("an entity match maps back to its block, one crossing blocks does not", () => {
    const { text, map } = plain([
      p(
        "a",
        { text: "At the " },
        {
          type: "a",
          url: "old-mill",
          children: [{ text: "Old Mill" }],
        },
        { text: "." },
      ),
      p("b", { text: "Mill pond" }),
    ]);
    const start = text.indexOf("Old Mill");
    expect(map.toBlockRange(start, start + 8)).toEqual({
      blockId: "a",
      start: 7,
      end: 15,
    });
    const crossing = text.indexOf(".\nMill");
    expect(map.toBlockRange(crossing, crossing + 6)).toBeNull();
  });

  test("rejects a tree outside the schema", () => {
    expect(projectPlain("not a tree").isErr()).toBe(true);
  });
});

const addressableIds = (tree: ContentDocument) =>
  tree.flatMap((block) =>
    block.type === "ai_segment"
      ? block.children.map((child) => child.id)
      : [block.id],
  );

describe("addressable", () => {
  test("fixture", () => {
    const projection = addressable(fixture);
    expect(projection.text).toBe(
      [
        "[h_1] # The Old Mill",
        "[h_2] ## Arrival",
        "[h_3] ### Night one",
        "[b_1] Plain, bold, italic, struck and code.",
        "[b_2] See the mill or the web.",
        "[q_1] > Quoted line",
        "[r_1] * * *",
        "[l_1] - one",
        "[l_2]   - nested",
        "[l_3]     1. deep",
        "[l_4]     2. deeper",
        "[l_5] - two",
        "[b_3] Between lists.",
        "[n_1] 1. first",
        "[n_2] 2. second",
        "[a_1] Generated prose.",
        "[a_2] - item",
        "[a_3] ## Generated heading",
        "[a_4] ",
        "[ph_1] (placeholder) Describe the storm",
        "[ph_2] (placeholder) ",
        "[b_4] ",
      ].join("\n"),
    );
    const unmapped = checkMap(fixture, projection, addressableIds(fixture));
    // Every line starts with its block's ID; nothing else is unmapped but
    // markers and line breaks.
    expect(
      unmapped.split("\n").every((line) => /^\[[\w-]+\] /.test(line)),
    ).toBe(true);
    // Every block is addressable, the hr and empty blocks included; an AI
    // segment is not (its children are).
    const hrLine = "[r_1] * * *";
    expect(projection.map.toText("r_1", 0)).toBe(
      projection.text.indexOf(hrLine) + hrLine.length,
    );
    expect(projection.map.toText("b_4", 0)).toBe(projection.text.length);
    expect(projection.map.toText("ph_1", 0)).toBe(
      projection.text.indexOf("Describe the storm"),
    );
    expect(projection.map.toText("seg_1", 0)).toBeNull();
  });

  test("numbering matches prose, and empty items keep their line", () => {
    const tree: ContentDocument = [
      item("a", "decimal", 1, "a"),
      item("g", "decimal", 1, ""),
      item("h", "decimal", 1, "h"),
      { type: "placeholder", id: "ph", children: [{ text: "Next" }] },
      item("k", "decimal", 1, "k"),
    ];
    expect(addressable(tree).text).toBe(
      [
        "[a] 1. a",
        "[g] 2. ",
        "[h] 3. h",
        "[ph] (placeholder) Next",
        "[k] 1. k",
      ].join("\n"),
    );
  });

  test("soft line breaks are kept inside the block's span", () => {
    const tree: ContentDocument = [
      { type: "blockquote", id: "q", children: [{ text: "one\ntwo" }] },
      p("n", { text: "next" }),
    ];
    const projection = addressable(tree);
    expect(projection.text).toBe("[q] > one\ntwo\n[n] next");
    expect(projection.map.toBlock(10)).toEqual({ blockId: "q", offset: 4 });
    checkMap(tree, projection, ["q", "n"]);
  });

  test("an empty document projects to nothing", () => {
    expect(addressable([]).text).toBe("");
  });

  test("rejects a tree outside the schema", () => {
    expect(
      projectAddressable([
        { type: "p", id: "dup", children: [{ text: "a" }] },
        { type: "p", id: "dup", children: [{ text: "b" }] },
      ])._unsafeUnwrapErr(),
    ).toMatchObject({ kind: "invalid_content", path: "[1]" });
  });
});

/**
 * Every node type, mark, list style and AI segment status the schema allows,
 * each alone in a document, with what each projection makes of it. A new
 * node type fails "covers every node type" until it has a row here.
 */
describe("every node type has all three projections", () => {
  type Row = {
    tree: TopBlock[];
    prose: string;
    addressable: string;
    plain: string;
  };
  const rows: Record<string, Row> = {
    paragraph: {
      tree: [p("b", { text: "Text" })],
      prose: "Text",
      addressable: "[b] Text",
      plain: "Text",
    },
    "empty paragraph": {
      tree: [p("b", { text: "" })],
      prose: "",
      addressable: "[b] ",
      plain: "",
    },
    "bulleted item": {
      tree: [item("b", "disc", 2, "Item")],
      prose: "  - Item",
      addressable: "[b]   - Item",
      plain: "Item",
    },
    "numbered item": {
      tree: [item("b", "decimal", 1, "Item")],
      prose: "1. Item",
      addressable: "[b] 1. Item",
      plain: "Item",
    },
    h1: {
      tree: [{ type: "h1", id: "b", children: [{ text: "Title" }] }],
      prose: "# Title",
      addressable: "[b] # Title",
      plain: "Title",
    },
    h2: {
      tree: [{ type: "h2", id: "b", children: [{ text: "Title" }] }],
      prose: "## Title",
      addressable: "[b] ## Title",
      plain: "Title",
    },
    h3: {
      tree: [{ type: "h3", id: "b", children: [{ text: "Title" }] }],
      prose: "### Title",
      addressable: "[b] ### Title",
      plain: "Title",
    },
    blockquote: {
      tree: [{ type: "blockquote", id: "b", children: [{ text: "Said" }] }],
      prose: "> Said",
      addressable: "[b] > Said",
      plain: "Said",
    },
    hr: {
      tree: [{ type: "hr", id: "b", children: [{ text: "" }] }],
      prose: "* * *",
      addressable: "[b] * * *",
      plain: "",
    },
    "marks and links": {
      tree: [
        p(
          "b",
          { text: "a", bold: true },
          { text: "b", italic: true },
          { text: "c", strikethrough: true },
          { text: "d", code: true },
          { type: "a", url: "old-mill", children: [{ text: "mill" }] },
          { text: " " },
          {
            type: "a",
            url: "https://example.com",
            children: [{ text: "web", bold: true }],
          },
          { text: "." },
        ),
      ],
      prose: "abcdmill web.",
      addressable: "[b] abcdmill web.",
      plain: "abcdmill web.",
    },
    "ready AI segment": {
      tree: [
        {
          type: "ai_segment",
          id: "s",
          status: "ready",
          children: [p("b", { text: "Made" }), p("c", { text: "up" })],
        },
      ],
      prose: "Made\n\nup",
      addressable: "[b] Made\n[c] up",
      plain: "Made\nup",
    },
    "generating AI segment": {
      tree: [
        {
          type: "ai_segment",
          id: "s",
          status: "generating",
          children: [{ type: "h2", id: "b", children: [{ text: "So far" }] }],
        },
      ],
      prose: "## So far",
      addressable: "[b] ## So far",
      plain: "So far",
    },
    placeholder: {
      tree: [{ type: "placeholder", id: "b", children: [{ text: "Fill" }] }],
      prose: "",
      addressable: "[b] (placeholder) Fill",
      plain: "",
    },
  };

  test("covers every node type, mark, list style and status", () => {
    const seen = new Set<string>();
    const visit = (node: unknown) => {
      if (typeof node !== "object" || node === null) return;
      const record = node as Record<string, unknown>;
      if (typeof record.type === "string") seen.add(record.type);
      if (typeof record.listStyleType === "string") {
        seen.add(`list:${record.listStyleType}`);
      }
      if (typeof record.status === "string")
        seen.add(`status:${record.status}`);
      for (const mark of MARKS) if (record[mark]) seen.add(`mark:${mark}`);
      if (Array.isArray(record.children)) record.children.forEach(visit);
    };
    for (const row of Object.values(rows)) row.tree.forEach(visit);
    expect([...seen].sort()).toEqual(
      [
        ...BLOCK_TYPES,
        "ai_segment",
        "placeholder",
        "a",
        ...LIST_STYLES.map((style) => `list:${style}`),
        ...AI_SEGMENT_STATUSES.map((status) => `status:${status}`),
        ...MARKS.map((mark) => `mark:${mark}`),
      ].sort(),
    );
  });

  test.each(Object.entries(rows))("%s", (_, row) => {
    const projections = {
      prose: prose(row.tree),
      addressable: addressable(row.tree),
      plain: plain(row.tree),
    };
    expect({
      prose: projections.prose.text,
      addressable: projections.addressable.text,
      plain: projections.plain.text,
    }).toEqual({
      prose: row.prose,
      addressable: row.addressable,
      plain: row.plain,
    });
    checkMap(row.tree, projections.prose, proseIds(row.tree));
    checkMap(row.tree, projections.addressable, addressableIds(row.tree));
    checkMap(row.tree, projections.plain, plainIds(row.tree));
  });
});

// Offsets are UTF-16 units: an astral character (emoji) is two of them.
describe("surrogate pairs", () => {
  const tree: ContentDocument = [
    p("x", { text: "🐉" }),
    {
      type: "blockquote",
      id: "u",
      children: [
        { text: "😀 at " },
        { type: "a", url: "old-mill", children: [{ text: "the 🏰" }] },
        { text: "\n🌊 end" },
      ],
    },
  ];
  const own = "😀 at the 🏰\n🌊 end";

  test("block text counts UTF-16 units", () => {
    expect(blockText(tree[1] as Block)).toBe(own);
    expect(own.length).toBe(19);
  });

  test("plain+map", () => {
    const projection = plain(tree);
    const { text, map } = projection;
    expect(text).toBe(`🐉\n${own}`);
    expect(map.toBlock(1)).toEqual({ blockId: "x", offset: 1 });
    expect(map.toBlock(2)).toBeNull();
    expect(map.toBlock(3)).toEqual({ blockId: "u", offset: 0 });
    expect(map.toBlock(4)).toEqual({ blockId: "u", offset: 1 });
    expect(map.toBlock(15)).toEqual({ blockId: "u", offset: 12 });
    expect(text[15]).toBe("\n");
    expect(map.toText("u", 10)).toBe(13);
    expect(map.toBlockRange(13, 15)).toEqual({
      blockId: "u",
      start: 10,
      end: 12,
    });
    expect(text.slice(13, 15)).toBe("🏰");
    expect(map.toBlockRange(16, 18)).toEqual({
      blockId: "u",
      start: 13,
      end: 15,
    });
    expect(text.slice(16, 18)).toBe("🌊");
    checkMap(tree, projection, ["x", "u"]);
  });

  test("prose", () => {
    const projection = prose(tree);
    const { text, map } = projection;
    expect(text).toBe(`🐉\n\n> ${own}`);
    expect(map.toBlock(2)).toBeNull();
    expect(map.toBlock(6)).toEqual({ blockId: "u", offset: 0 });
    expect(map.toBlock(18)).toEqual({ blockId: "u", offset: 12 });
    expect(map.toText("u", 13)).toBe(19);
    expect(map.toBlockRange(19, 21)).toEqual({
      blockId: "u",
      start: 13,
      end: 15,
    });
    expect(text.slice(19, 21)).toBe("🌊");
    expect(map.toBlockRange(16, 18)).toEqual({
      blockId: "u",
      start: 10,
      end: 12,
    });
    checkMap(tree, projection, ["x", "u"]);
  });
});

describe("prose: writer notes", () => {
  const one = (text: string) => prose([p("b", { text })]).text;

  test("a multi-word note is cut with the space before it", () => {
    expect(one("The door held. [[ does Kesh already know? ]] She left.")).toBe(
      "The door held. She left.",
    );
  });

  test("several notes in one paragraph are all cut", () => {
    expect(one("a [[one]] b [[ two words ]] c [[three]][[four]] d")).toBe(
      "a b c d",
    );
    expect(one("a [[one]] [[two]] b")).toBe("a b");
  });

  test("notes at the ends of a block take their whitespace with them", () => {
    expect(one("[[ open ]] The door. [[ close ]]")).toBe("The door.");
    expect(one("  [[x]]  [[y]] a")).toBe("a");
  });

  test("a note against a word leaves the words as they were", () => {
    expect(one("a [[x]]b")).toBe("a b");
    expect(one("a[[x]]b")).toBe("ab");
    expect(one("one\n[[x]]\ntwo")).toBe("one\ntwo");
  });

  test("unclosed or broken brackets stay in the prose", () => {
    expect(one("a [[ never closed")).toBe("a [[ never closed");
    expect(one("a [[ half ] closed ]] b")).toBe("a [[ half ] closed ]] b");
    expect(one("a [x] b ]] c")).toBe("a [x] b ]] c");
    expect(one("a [[ closed ]] b [[ open")).toBe("a b [[ open");
  });

  test("a note across marks and links is cut whole", () => {
    const tree: ContentDocument = [
      p(
        "b",
        { text: "See [[ check " },
        { type: "a", url: "old-mill", children: [{ text: "the mill" }] },
        { text: " ]] the ", italic: true },
        { text: "gate." },
      ),
    ];
    const projection = prose(tree);
    expect(projection.text).toBe("See the gate.");
    checkMap(tree, projection, ["b"]);
  });

  test("a block that holds only notes is dropped", () => {
    const tree: ContentDocument = [
      p("a", { text: "Before." }),
      p("n", { text: " [[ fix this scene ]] " }),
      { type: "h2", id: "h", children: [{ text: "[[ title? ]] Arrival" }] },
    ];
    const projection = prose(tree);
    expect(projection.text).toBe("Before.\n\n## Arrival");
    expect(projection.map.toText("n", 0)).toBeNull();
    checkMap(tree, projection, ["a", "h"]);
  });

  test("offsets map across a cut", () => {
    const text = "a [[x]] b";
    const { map } = prose([p("b", { text })]);
    // "a b": the space at 1 is the one after the note, at block offset 7.
    expect(map.spans).toEqual([
      { blockId: "b", start: 0, end: 3, cuts: [{ start: 1, end: 7 }] },
    ]);
    expect(map.toBlock(0)).toEqual({ blockId: "b", offset: 0 });
    expect(map.toBlock(1)).toEqual({ blockId: "b", offset: 7 });
    expect(map.toBlock(2)).toEqual({ blockId: "b", offset: 8 });
    // Every block offset inside the note collapses to where it was cut.
    for (let offset = 1; offset <= 7; offset++) {
      expect(map.toText("b", offset)).toBe(1);
    }
    expect(map.toText("b", text.length)).toBe(3);
    expect(map.toText("b", text.length + 1)).toBeNull();
    // A range over the cut covers the note; a collapsed one sits before it.
    expect(map.toBlockRange(0, 2)).toEqual({ blockId: "b", start: 0, end: 8 });
    expect(map.toBlockRange(1, 1)).toEqual({ blockId: "b", start: 1, end: 1 });
  });

  test("plain+map keeps notes, so every block offset has a position", () => {
    const tree: ContentDocument = [p("b", { text: "a [[x]] b" })];
    expect(plain(tree).text).toBe("a [[x]] b");
  });

  test("addressable keeps notes, so a rewrite of the block sees them", () => {
    const tree: ContentDocument = [p("b", { text: "a [[x]] b" })];
    expect(addressable(tree).text).toBe("[b] a [[x]] b");
  });
});

// Property-style: the map contract holds for generated valid trees.
describe("generated trees", () => {
  const trees = generateTrees(300, 7);

  test("prose: every output offset maps to the same character or a marker", () => {
    for (const tree of trees) {
      const unmapped = checkMap(tree, prose(tree), proseIds(tree));
      expect(unmapped).toMatch(/^[\n #>*\-0-9.]*$/);
    }
  });

  test("plain+map: every offset maps back; only block separators do not", () => {
    for (const tree of trees) {
      const ids = plainIds(tree);
      const unmapped = checkMap(tree, plain(tree), ids);
      expect(unmapped).toBe("\n".repeat(Math.max(ids.length - 1, 0)));
    }
  });

  test("addressable: every block has a span; only ID prefixes and markers do not", () => {
    for (const tree of trees) {
      const unmapped = checkMap(tree, addressable(tree), addressableIds(tree));
      for (const line of unmapped.split("\n")) {
        expect(line).toMatch(
          /^\[[A-Za-z0-9_-]+\] (\(placeholder\) | *(- |\d+\. )|#{1,3} |> |\* \* \*)?$/,
        );
      }
    }
  });
});
