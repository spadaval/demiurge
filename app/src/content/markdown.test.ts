import { describe, expect, test } from "bun:test";
import {
  exportMarkdown,
  exportReadableMarkdown,
  parseMarkdown,
} from "./markdown";
import type { Block, ContentDocument, Inline, Text } from "./schema";
import { fixture, generateTrees, p } from "./test-trees";

function roundTrip(tree: ContentDocument): string {
  const exported = exportMarkdown(tree);
  if (exported.isErr()) throw new Error(JSON.stringify(exported.error));
  const parsed = parseMarkdown(exported.value);
  if (parsed.isErr()) {
    throw new Error(`${JSON.stringify(parsed.error)}\n---\n${exported.value}`);
  }
  expect(parsed.value).toEqual(tree);
  return exported.value;
}

describe("round trip", () => {
  test("fixture covering every node type and mark", () => {
    expect(roundTrip(fixture)).toBe(
      [
        "# The Old Mill {#h_1}",
        "",
        "## Arrival {#h_2}",
        "",
        "### Night _one_ {#h_3}",
        "",
        "Plain, **bold**, _italic_, ~~struck~~ and `code`. {#b_1}",
        "",
        "See [the mill](old-mill) or [the web](https://example.com/a_\\(b\\)?q=1). {#b_2}",
        "",
        "> Quoted line {#q_1}",
        "",
        "--- {#r_1}",
        "",
        "- one {#l_1}",
        "  - nested {#l_2}",
        "    1. deep {#l_3}",
        "    2. deeper {#l_4}",
        "- two {#l_5}",
        "",
        "Between lists. {#b_3}",
        "",
        "1. first {#n_1}",
        "2. second {#n_2}",
        "",
        ":::ai{#seg_1 status=ready}",
        "Generated **prose**. {#a_1}",
        "",
        "- item {#a_2}",
        "",
        "## Generated heading {#a_3}",
        ":::",
        "",
        ":::ai{#seg_2 status=generating}",
        "{#a_4}",
        ":::",
        "",
        ":::placeholder{#ph_1}",
        "Describe the storm",
        ":::",
        "",
        ":::placeholder{#ph_2}",
        ":::",
        "",
        "{#b_4}",
        "",
      ].join("\n"),
    );
  });

  test("empty document", () => {
    expect(roundTrip([])).toBe("");
  });

  test("markdown-special characters in plain text", () => {
    for (const text of [
      "*stars* and _underscores_ and ~~tildes~~ and ~one",
      "[not a link](old-mill) and {#not_an_id}",
      "# not a heading",
      "## also not",
      "> not a quote",
      "- not a list",
      "+ not a list",
      "1. not a list",
      "12) not a list",
      "--- not a rule",
      "---",
      ":::ai{#x status=ready}",
      ":::",
      "{#b_1}",
      "back\\slash\\",
      "`ticks` and ``double``",
      "   leading spaces",
      "  - indented dash",
      "trailing spaces   ",
      " ",
      "<b>html</b> & entities &amp;",
      "line one\nline two",
      "\n",
      "a\n# b\n:::\n- c\n\n",
      "ends with backslash \\",
      "\\\nafter escaped backslash",
      "emoji 🌧 and ünïcödé",
    ]) {
      roundTrip([p("b_1", { text })]);
    }
  });

  test("tricky code spans", () => {
    for (const text of [
      "`",
      "``",
      "a`b",
      "`a`",
      " a ",
      "  ",
      " ",
      "\\",
      "**x**",
      "[x](y)",
      "{#id}",
    ]) {
      roundTrip([
        p("b_1", { text: "x " }, { text, code: true }, { text: " y" }),
      ]);
      roundTrip([p("b_1", { text, code: true })]);
    }
  });

  test("adjacent and overlapping marks", () => {
    roundTrip([
      p(
        "b_1",
        { text: "a", bold: true },
        { text: "b", bold: true, italic: true },
        { text: "c", italic: true },
        { text: "d", italic: true, strikethrough: true },
        { text: "e", bold: true, strikethrough: true },
        {
          text: "f",
          bold: true,
          italic: true,
          strikethrough: true,
          code: true,
        },
        { text: "g", code: true },
        { text: "h", bold: true, code: true },
        { text: " spaced ", italic: true },
        { text: "_", bold: true },
      ),
    ]);
  });

  test("marks across line breaks and in every container", () => {
    const children: Inline[] = [
      { text: "one\n", bold: true },
      { text: "two", bold: true, italic: true },
      { text: "\n# three" },
    ];
    roundTrip([
      { type: "p", id: "b_1", children },
      { type: "h2", id: "b_2", children },
      { type: "blockquote", id: "b_3", children },
      { type: "p", id: "b_4", listStyleType: "decimal", indent: 1, children },
      { type: "p", id: "b_5", listStyleType: "disc", indent: 2, children },
      { type: "placeholder", id: "b_6", children: [{ text: "multi\nline\n" }] },
    ]);
  });

  test("links with marks, at block edges, adjacent, and empty", () => {
    roundTrip([
      p(
        "b_1",
        { text: "" },
        {
          type: "a",
          url: "old-mill",
          children: [
            { text: "the " },
            { text: "old", bold: true },
            { text: " mill", code: true },
          ],
        },
        { text: "" },
        { type: "a", url: "mailto:a@b.c", children: [{ text: "" }] },
        { text: "!", italic: true },
        { type: "a", url: "https://x.y/[z]", children: [{ text: "*]" }] },
        { text: "" },
      ),
    ]);
  });

  test("links to canonical names in any script", () => {
    expect(
      roundTrip([
        p(
          "b_1",
          { text: "At " },
          { type: "a", url: "café-noir", children: [{ text: "the café" }] },
          { text: " and " },
          { type: "a", url: "東京", children: [{ text: "Tokyo" }] },
          { text: "." },
        ),
      ]),
    ).toBe("At [the café](café-noir) and [Tokyo](東京). {#b_1}\n");
  });

  test("numbered list markers wider than one digit", () => {
    const items: Block[] = Array.from({ length: 11 }, (_, i) => ({
      type: "p",
      id: `l_${i}`,
      listStyleType: "decimal",
      indent: 1,
      children: [{ text: `item ${i}` }],
    }));
    items.push({
      type: "p",
      id: "l_nested",
      listStyleType: "disc",
      indent: 2,
      children: [{ text: "under ten" }],
    });
    expect(roundTrip(items)).toContain(
      "\n11. item 10 {#l_10}\n    - under ten {#l_nested}",
    );
  });

  test("indents that skip levels are kept, with an explicit indent attribute", () => {
    const item = (
      id: string,
      indent: number,
      style: "disc" | "decimal" = "disc",
    ): Block => ({
      type: "p",
      id,
      listStyleType: style,
      indent,
      children: [{ text: id }],
    });
    expect(
      roundTrip([
        item("first", 2),
        item("next", 2),
        item("back", 1),
        item("deep", 3, "decimal"),
        item("mid", 2),
        item("deeper", 4),
      ]),
    ).toBe(
      [
        "- first {#first indent=2}",
        "- next {#next indent=2}",
        "- back {#back}",
        "  1. deep {#deep indent=3}",
        "  - mid {#mid}",
        "    - deeper {#deeper indent=4}",
        "",
      ].join("\n"),
    );
    // An AI segment starts a fresh list, so an indented first item inside it
    // after an outer list needs the attribute; so does one after a paragraph.
    expect(
      roundTrip([
        item("outer", 1),
        {
          type: "ai_segment",
          id: "seg",
          status: "ready",
          children: [item("inner", 2)],
        },
        p("para", { text: "x" }),
        item("after", 3),
      ]),
    ).toBe(
      [
        "- outer {#outer}",
        "",
        ":::ai{#seg status=ready}",
        "- inner {#inner indent=2}",
        ":::",
        "",
        "x {#para}",
        "",
        "- after {#after indent=3}",
        "",
      ].join("\n"),
    );
  });

  test("the deepest allowed indent round-trips", () => {
    expect(
      roundTrip([
        {
          type: "p",
          id: "a",
          listStyleType: "disc",
          indent: 32,
          children: [{ text: "x" }],
        },
      ]),
    ).toBe("- x {#a indent=32}\n");
  });

  test("text with \\r, \\t and Unicode line separators in every block", () => {
    const children: Inline[] = [{ text: "\r# a\u2028b\u2029\tc\r" }];
    roundTrip([
      { type: "h1", id: "b_1", children },
      { type: "p", id: "b_2", listStyleType: "disc", indent: 1, children },
      { type: "p", id: "b_3", listStyleType: "decimal", indent: 2, children },
      { type: "blockquote", id: "b_4", children },
      { type: "p", id: "b_5", children },
      { type: "placeholder", id: "b_6", children: [{ text: "\u2028\r" }] },
      p("b_7", { text: " \t ", code: true }),
    ]);
  });
});

describe("rejection", () => {
  const rejectsExport = (tree: unknown, reason: RegExp) => {
    const result = exportMarkdown(tree);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe("invalid_content");
      if (result.error.kind === "invalid_content")
        expect(result.error.reason).toMatch(reason);
    }
  };

  test("export rejects content outside the schema", () => {
    rejectsExport(
      [{ type: "table", id: "t", children: [] }],
      /block type "table"/,
    );
    rejectsExport([{ type: "p", children: [{ text: "x" }] }], /block id/);
    rejectsExport(
      [p("a", { text: "x" }), p("a", { text: "y" })],
      /duplicate block id/,
    );
    rejectsExport(
      [{ type: "p", id: "a", align: "center", children: [{ text: "x" }] }],
      /"align"/,
    );
    rejectsExport(
      [p("a", { text: "x", underline: true } as Text)],
      /"underline"/,
    );
    rejectsExport(
      [p("a", { text: "x", bold: false } as unknown as Text)],
      /must be true/,
    );
    rejectsExport(
      [
        p(
          "a",
          { text: "" },
          { type: "mention", children: [{ text: "" }] } as unknown as Inline,
          { text: "" },
        ),
      ],
      /inline node type "mention"/,
    );
    rejectsExport(
      [p("a", { type: "a", url: "old-mill", children: [{ text: "x" }] })],
      /text on both sides/,
    );
    rejectsExport([p("a", { text: "x" }, { text: "y" })], /same marks/);
    rejectsExport(
      [p("a", { text: "", bold: true })],
      /empty text cannot carry marks/,
    );
    rejectsExport([p("a", { text: "x\ny", code: true })], /line break/);
    rejectsExport(
      [
        p(
          "a",
          { text: "" },
          { type: "a", url: "../relative", children: [{ text: "x" }] },
          { text: "" },
        ),
      ],
      /link url/,
    );
    const listItem = (extra: Record<string, unknown>) => [
      {
        type: "p",
        id: "a",
        listStyleType: "decimal",
        indent: 1,
        children: [{ text: "x" }],
        ...extra,
      },
    ];
    rejectsExport(
      listItem({ listStart: 2 }),
      /listStart is derived.*canonicalize/,
    );
    rejectsExport(
      listItem({ listRestart: 3 }),
      /listRestart\) are not supported/,
    );
    rejectsExport(
      listItem({ listRestartPolite: 3 }),
      /listRestartPolite\) are not supported/,
    );
    rejectsExport(
      [
        {
          type: "p",
          id: "a",
          listStyleType: "circle",
          indent: 1,
          children: [{ text: "x" }],
        },
      ],
      /listStyleType/,
    );
    for (const indent of [0, 1.5, 33, 1e21, Number.NaN]) {
      rejectsExport(
        [
          {
            type: "p",
            id: "a",
            listStyleType: "disc",
            indent,
            children: [{ text: "x" }],
          },
        ],
        /list indent must be an integer from 1 to 32/,
      );
    }
    rejectsExport(
      [
        {
          type: "ai_segment",
          id: "s",
          status: "ready",
          children: [
            { type: "ai_segment", id: "t", status: "ready", children: [] },
          ],
        },
      ],
      /block type "ai_segment" is not allowed/,
    );
    rejectsExport(
      [
        {
          type: "ai_segment",
          id: "s",
          status: "accepted",
          children: [p("a", { text: "x" })],
        },
      ],
      /status/,
    );
    rejectsExport(
      [{ type: "placeholder", id: "s", children: [{ text: "x", bold: true }] }],
      /marks are not allowed/,
    );
    rejectsExport(
      [{ type: "hr", id: "r", children: [{ text: "x" }] }],
      /empty text/,
    );
    rejectsExport("not a document", /array of blocks/);
  });

  const rejectsParse = (markdown: string, reason: RegExp) => {
    const result = parseMarkdown(markdown);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.reason).toMatch(reason);
    }
  };

  test("parse rejects text outside the export syntax", () => {
    rejectsParse("Missing id\n", /missing its trailing \{#id\}/);
    rejectsParse(":::table{#t}\n:::\n", /unknown directive/);
    rejectsParse(
      ":::ai{#s status=accepted}\nx {#a}\n:::\n",
      /unknown ai segment status/,
    );
    rejectsParse(":::ai{#s status=ready}\nx {#a}\n", /unclosed ai directive/);
    rejectsParse(
      ":::ai{#s status=ready}\n:::placeholder{#p}\n:::\n:::\n",
      /cannot be nested/,
    );
    rejectsParse(":::ai{#s status=ready}\n:::\n", /at least one block/);
    rejectsParse(":::\n", /closing fence/);
    rejectsParse("**open {#a}\n", /unclosed bold/);
    rejectsParse("a * b {#a}\n", /unescaped "\*"/);
    rejectsParse("a ~ b {#a}\n", /unescaped "~"/);
    rejectsParse("[x](old-mill {#a}\n", /unclosed link url/);
    rejectsParse("[x] {#a}\n", /expected "\("/);
    rejectsParse("**[x](old-mill)** {#a}\n", /must close before a link/);
    rejectsParse("`x {#a}\n", /unclosed code span/);
    rejectsParse("\\a {#a}\n", /backslash/);
    rejectsParse("  - x {#a}\n", /indentation/);
    rejectsParse("x {#a indent=2}\n", /list items only/);
    rejectsParse(
      "- x {#a indent=33}\n",
      /list indent must be an integer from 1 to 32/,
    );
    rejectsParse(
      "- x {#a indent=2}\n  - y {#b indent=2}\n",
      /deeper than the parent/,
    );
    rejectsParse("- a\\\nb {#a}\n", /line break must continue/);
    rejectsParse("x {#a}\n\ny {#a}\n", /duplicate block id/);
    rejectsParse("[x](../up) {#a}\n", /link url/);
    // Internal targets must be canonical names (world/names.ts).
    rejectsParse("[x](Old-Mill) {#a}\n", /link url/);
    rejectsParse("[x](a--b) {#a}\n", /link url/);
    rejectsParse(":::placeholder{#p}\n**x**\n:::\n", /plain text only/);
  });

  test("parse errors carry a 1-based line", () => {
    const result = parseMarkdown("ok {#a}\n\nbad *\n");
    expect(result._unsafeUnwrapErr()).toMatchObject({
      kind: "invalid_markdown",
      line: 3,
    });
  });
});

// Property-style: random trees from a seeded generator must round-trip.
describe("generated trees", () => {
  test("parse(export(tree)) equals tree for 500 random trees", () => {
    for (const tree of generateTrees(500)) roundTrip(tree);
  });
});

describe("readable export", () => {
  const readable = (tree: unknown) =>
    exportReadableMarkdown(tree)._unsafeUnwrap();
  const item = (
    id: string,
    listStyleType: "disc" | "decimal",
    indent: number,
    ...children: Inline[]
  ): Block => ({ type: "p", id, listStyleType, indent, children });

  test("fixture: no IDs, no directives, AI text in place, placeholders gone", () => {
    expect(readable(fixture)).toBe(
      [
        "# The Old Mill",
        "",
        "## Arrival",
        "",
        "### Night *one*",
        "",
        "Plain, **bold**, *italic*, ~~struck~~ and `code`.",
        "",
        "See [the mill](old-mill) or [the web](https://example.com/a_\\(b\\)?q=1).",
        "",
        "> Quoted line",
        "",
        "---",
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
        "Generated **prose**.",
        "",
        "- item",
        "",
        "## Generated heading",
        "",
      ].join("\n"),
    );
  });

  test("an empty or text-free document exports nothing", () => {
    for (const tree of [
      [],
      [{ type: "placeholder", id: "ph", children: [{ text: "Write" }] }],
      [p("b", { text: "" })],
    ]) {
      expect(readable(tree)).toBe("");
    }
  });

  test("escapes only what CommonMark could misread", () => {
    expect(
      readable([
        p("a", {
          text: '"Hi," she said: snake_case, _x_, 1 < 2, <b>, &amp; & a*b ~x~ [x] \\ `t` #tag',
        }),
      ]),
    ).toBe(
      '"Hi," she said: snake_case, \\_x\\_, 1 < 2, \\<b>, \\&amp; & a\\*b \\~x\\~ \\[x\\] \\\\ \\`t\\` #tag\n',
    );
  });

  test("block syntax at the start of a line is escaped, leading spaces dropped", () => {
    expect(
      readable([
        p("a", {
          text: "# one\n  2. two\n- three\n> four\n+ five\n=== six\n| seven\n    code? no",
        }),
      ]),
    ).toBe(
      [
        "\\# one\\",
        "2\\. two\\",
        "\\- three\\",
        "\\> four\\",
        "\\+ five\\",
        "\\=== six\\",
        "\\| seven\\",
        "code? no",
        "",
      ].join("\n"),
    );
  });

  test("line breaks: backslash inside a block, trimmed at its ends, a space in a heading", () => {
    expect(
      readable([
        p("a", { text: "\none\ntwo\n\n" }),
        { type: "blockquote", id: "q", children: [{ text: "said\nagain" }] },
        { type: "h2", id: "h", children: [{ text: "Two\nlines" }] },
        item("l", "decimal", 1, { text: "item\nmore" }),
      ]),
    ).toBe(
      [
        "one\\",
        "two",
        "",
        "> said\\",
        "> again",
        "",
        "## Two lines",
        "",
        "1. item\\",
        "   more",
        "",
      ].join("\n"),
    );
  });

  test("a closing # run in a heading is escaped", () => {
    expect(
      readable([{ type: "h1", id: "h", children: [{ text: "Part #" }] }]),
    ).toBe("# Part \\#\n");
  });

  test("whitespace moves outside emphasis so CommonMark reads it", () => {
    const tree: ContentDocument = [
      p(
        "a",
        { text: "a " },
        { text: "bold ", bold: true },
        { text: "plain" },
        { text: " it", italic: true },
        { text: "!" },
      ),
      // A marked space between two leaves keeps only their shared marks.
      p(
        "b",
        { text: "x", bold: true },
        { text: " ", bold: true, italic: true },
        { text: "y", bold: true },
        { text: " ", italic: true },
        { text: "z" },
      ),
    ];
    expect(readable(tree)).toBe("a **bold** plain *it*!\n\n**x y** z\n");
  });

  test("lists: nested by indentation, skipped levels nest under the closest", () => {
    expect(
      readable([
        item("a", "decimal", 1, { text: "one" }),
        item("b", "disc", 3, { text: "skipped" }),
        item("c", "disc", 4, { text: "deeper" }),
        item("d", "decimal", 1, { text: "two" }),
        item("e", "decimal", 1, { text: "" }),
        item("f", "decimal", 1, { text: "four" }),
        p("x", { text: "after" }),
        item("g", "disc", 2, { text: "starts indented" }),
      ]),
    ).toBe(
      [
        "1. one",
        "   - skipped",
        "     - deeper",
        "2. two",
        "4. four",
        "",
        "after",
        "",
        "- starts indented",
        "",
      ].join("\n"),
    );
  });

  test("numbering restarts at a placeholder and an AI segment, with a blank line", () => {
    expect(
      readable([
        item("a", "decimal", 1, { text: "a" }),
        { type: "placeholder", id: "ph", children: [{ text: "more" }] },
        item("b", "decimal", 1, { text: "b" }),
        {
          type: "ai_segment",
          id: "s",
          status: "generating",
          children: [item("c", "decimal", 1, { text: "c" })],
        },
      ]),
    ).toBe(["1. a", "", "1. b", "", "1. c", ""].join("\n"));
  });

  test("links and code keep their syntax", () => {
    expect(
      readable([
        p(
          "a",
          { text: "See " },
          {
            type: "a",
            url: "café",
            children: [{ text: "the " }, { text: "café", bold: true }],
          },
          { text: " and " },
          { text: "a`b", code: true },
          { text: "." },
        ),
      ]),
    ).toBe("See [the **café**](café) and ``a`b``.\n");
  });

  test("rejects a tree outside the schema", () => {
    expect(
      exportReadableMarkdown([
        { type: "table", id: "t", children: [] },
      ])._unsafeUnwrapErr(),
    ).toMatchObject({ kind: "invalid_content", path: "[0]" });
  });

  test("exports every generated tree with none of its IDs or directives", () => {
    for (const tree of generateTrees(300, 11)) {
      const markdown = readable(tree);
      const ids = tree.flatMap((block) => [
        block.id,
        ...(block.type === "ai_segment" ? block.children.map((c) => c.id) : []),
      ]);
      // Generated IDs are `b_<n>`, which generated text never holds.
      for (const id of ids) expect(markdown).not.toContain(id);
      expect(markdown).not.toMatch(/^:::(ai|placeholder)\{/m);
    }
  });
});
