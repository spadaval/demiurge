import { expect, test } from "bun:test";
import type { Topic, TopicScope } from "~/talk/records";
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

const passage = (blockId: string, quote: string): TopicScope => ({
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
      id: "talk:a/words",
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
