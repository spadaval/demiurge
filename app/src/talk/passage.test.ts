import { expect, test } from "bun:test";
import { textBlocks } from "~/editor/layer-plugin";
import documentsFile from "../story/fixtures/lighthouse.documents.json";
import { contentBlocks, passageAt, passageSpans } from "./passage";

const BLOCKS = [
  { id: "a", text: "Echo. Echo." },
  { id: "b", text: "" },
  { id: "c", text: "Next it broke." },
];

test("reads a stored document's text blocks as the editor's layers do", () => {
  for (const document of documentsFile) {
    expect(contentBlocks(document.content)).toEqual(
      textBlocks(document.content),
    );
  }
});

test("a passage in one block keeps which occurrence of its words it is", () => {
  const second = passageAt(
    BLOCKS,
    { blockId: "a", offset: 6 },
    { blockId: "a", offset: 10 },
  );
  expect(second).toEqual({ blockId: "a", quote: "Echo", occurrence: 1 });
  expect(passageSpans(BLOCKS, second ?? { blockId: "", quote: "" })).toEqual([
    { blockId: "a", start: 6, end: 10 },
  ]);
  // Backwards, and with white space at either end, it is the same passage.
  expect(
    passageAt(
      BLOCKS,
      { blockId: "a", offset: 11 },
      { blockId: "a", offset: 5 },
    ),
  ).toEqual({ blockId: "a", quote: "Echo.", occurrence: 1 });
  expect(
    passageAt(BLOCKS, { blockId: "a", offset: 0 }, { blockId: "a", offset: 4 }),
  ).toEqual({ blockId: "a", quote: "Echo" });
  expect(
    passageAt(BLOCKS, { blockId: "a", offset: 5 }, { blockId: "a", offset: 6 }),
  ).toBeNull();
});

test("a passage over several blocks has each block's part, and its last block", () => {
  const passage = passageAt(
    BLOCKS,
    { blockId: "a", offset: 6 },
    { blockId: "c", offset: 7 },
  );
  expect(passage).toEqual({
    blockId: "a",
    quote: "Echo.\n\n\n\nNext it",
    occurrence: 1,
    through: "c",
  });
  if (passage === null) throw new Error("no passage");
  expect(passageSpans(BLOCKS, passage)).toEqual([
    { blockId: "a", start: 6, end: 11 },
    { blockId: "b", start: 0, end: 0 },
    { blockId: "c", start: 0, end: 7 },
  ]);
  // Starting at a block's end, it starts at the next block's words.
  expect(
    passageAt(
      BLOCKS,
      { blockId: "a", offset: 11 },
      { blockId: "c", offset: 4 },
    ),
  ).toEqual({ blockId: "c", quote: "Next" });
});

test("a passage whose words are no longer all there isn't found", () => {
  const passage = {
    blockId: "a",
    quote: "Echo.\n\n\n\nNext it",
    occurrence: 1,
    through: "c",
  };
  const edited = (id: string, text: string) =>
    BLOCKS.map((b) => (b.id === id ? { id, text } : b));
  expect(passageSpans(edited("c", "Then it broke."), passage)).toBeNull();
  expect(passageSpans(edited("b", "More."), passage)).toBeNull();
  // The first block's part must still end it.
  expect(passageSpans(edited("a", "Echo. Echo. Echo"), passage)).toBeNull();
  expect(
    passageSpans(edited("a", "Echo."), {
      blockId: "a",
      quote: "Echo",
      occurrence: 1,
    }),
  ).toBeNull();
  // A passage stored before occurrences were kept is the first.
  expect(passageSpans(BLOCKS, { blockId: "a", quote: "Echo" })).toEqual([
    { blockId: "a", start: 0, end: 4 },
  ]);
});
