import { expect, test } from "bun:test";
import type { PassageScope, Topic, TopicScope } from "~/talk/records";
import type { LayerMark } from "./model";
import { talkLayers, talkNotes } from "./talk";

const topic = (id: string, scope: TopicScope, model = false): Topic => ({
  version: 1,
  id,
  title: `Topic ${id}`,
  scope,
  status: "open",
  startedBy: model
    ? {
        kind: "model",
        profile: "Planner",
        model: "m",
        session: null,
        requestId: null,
        trace: [],
      }
    : { kind: "human" },
  session: null,
  messages: 1,
  answered: 0,
  createdAt: 1,
  updatedAt: 1,
  closedAt: null,
});

const passage = (blockId: string, quote: string): PassageScope => ({
  kind: "passage",
  scene: "s",
  documentId: "d",
  blockId,
  quote,
});

const BLOCKS = [{ id: "b1", text: "The wind took the shutters first." }];

test("a passage's note sits on its words; a scene's follows the last line", () => {
  const layers = talkLayers(
    talkNotes([
      topic("a", passage("b1", "the shutters")),
      topic("b", { kind: "scene", scene: "s" }, true),
    ]),
    BLOCKS,
  );
  expect(layers.marks).toEqual([
    {
      id: "talk:a/words/0",
      anchor: { blockId: "b1", quote: "the shutters" },
      style: { kind: "talk" },
      noteId: "talk:a",
    },
  ]);
  expect(
    layers.notes.map((n) => [n.id, n.layer, n.placement, n.authority]),
  ).toEqual([
    ["talk:a", "notes", undefined, "yours"],
    ["talk:b", "notes", "scene", "raised by model"],
  ]);
  expect(layers.notes[0]?.body).toEqual([{ text: "Topic a" }]);
  expect(layers.notes[0]?.actions).toEqual([
    { id: "open", label: "Open", resolves: "none", topic: "a" },
  ]);
});

test("a passage whose words are gone follows the scene", () => {
  const notes = talkNotes([
    topic("gone", passage("b1", "the door")),
    topic("lost", passage("b9", "the shutters")),
  ]);
  const layers = talkLayers(notes, BLOCKS);
  expect(layers.marks).toEqual([]);
  expect(layers.notes.map((n) => n.placement)).toEqual(["scene", "scene"]);
});

test("a passage never takes a key's place another note holds", () => {
  const other: LayerMark = {
    id: "w",
    anchor: { blockId: "b1", quote: "shutters" },
    style: { kind: "record" },
    noteId: "world-note",
  };
  const layers = talkLayers(
    talkNotes([
      topic("a", passage("b1", "the shutters")),
      topic("b", passage("b1", "took the shutters")),
    ]),
    BLOCKS,
    [other],
  );
  expect(layers.marks).toEqual([]);
  expect(layers.notes.map((n) => n.placement)).toEqual(["scene", "scene"]);
});

test("a passage's mark is on the occurrence it was started on", () => {
  const layers = talkLayers(
    talkNotes([topic("a", { ...passage("b2", "Echo"), occurrence: 1 })]),
    [{ id: "b2", text: "Echo. Echo." }],
  );
  expect(layers.marks.map((m) => m.anchor)).toEqual([
    { blockId: "b2", quote: "Echo", occurrence: 1 },
  ]);
});

test("a passage over several blocks is marked in each, keyed on the last", () => {
  const layers = talkLayers(
    talkNotes([
      topic("a", {
        ...passage("b1", "shutters first.\n\nBy the"),
        through: "b2",
      }),
    ]),
    [...BLOCKS, { id: "b2", text: "By the second watch." }],
  );
  expect(
    layers.marks.map((m) => [m.anchor.blockId, m.anchor.quote, m.noteId]),
  ).toEqual([
    ["b1", "shutters first.", undefined],
    ["b2", "By the", "talk:a"],
  ]);
  expect(layers.notes[0]?.placement).toBeUndefined();
});

test("a passage whose paragraphs hold blank lines is marked, not stale", () => {
  const layers = talkLayers(
    talkNotes([
      topic("a", {
        ...passage("p1", "First\n\nSecond.\n\nThird"),
        through: "p2",
      }),
    ]),
    [
      { id: "p1", text: "First\n\nSecond." },
      { id: "p2", text: "Third\n\nand last." },
    ],
  );
  expect(
    layers.marks.map((m) => [m.anchor.blockId, m.anchor.quote, m.noteId]),
  ).toEqual([
    ["p1", "First\n\nSecond.", undefined],
    ["p2", "Third", "talk:a"],
  ]);
  expect(layers.notes[0]?.placement).toBeUndefined();
});
