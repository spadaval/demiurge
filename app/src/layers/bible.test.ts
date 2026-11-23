import { describe, expect, test } from "bun:test";
import { ninefoldStory } from "~/demo/ninefold-story";
import { assignKeys } from "~/editor/layer-plugin";
import type { JsonValue } from "~/storage/types";
import { parseWhen } from "~/story/calendar";
import fixture from "~/story/fixtures/lighthouse.story.json";
import { type Story, storyFromJson } from "~/story/story";
import {
  type BibleNote,
  bibleLayers,
  bibleScene,
  sameBibleLayers,
  type TextBlock,
} from "./bible";
import type { GlossNote } from "./model";

const lighthouse: Story = storyFromJson(fixture as JsonValue)._unsafeUnwrap();

const text = (note: GlossNote) => note.body.map((run) => run.text).join("");

/** Each note as `Heading: body`, in order. */
const read = (notes: readonly BibleNote[]) =>
  notes.map(({ note }) => `${note.layer} ${note.heading}: ${text(note)}`);

function scene(story: Story, documentId: string) {
  const found = bibleScene(story, documentId);
  if (found === null) throw new Error(`no bible scene for ${documentId}`);
  return found;
}

describe("bibleScene", () => {
  test("a scene's apparatus: time, events, a count, versions against the truth, a plant, irony, what is withheld", () => {
    const sealed = scene(ninefoldStory(), "scene-4-2");
    expect(sealed.sceneId).toBe("scene-4-2");
    expect(sealed.position).toBe(6);
    expect(sealed.stamp).toEqual({
      text: "12 November 1203, 23:00",
      inferred: false,
    });
    expect(read(sealed.notes)).toEqual([
      "time Time: 3 days after “Night Market”.",
      "time Event: Ardelia returns to the sealed door · 12 November 1203, 21:00, 2 hours before the scene's latest event.",
      "time Event: The tide turned · 12 November 1203, 23:00.",
      "world Count: Lamps along the Salt Gate: 40 as the scene opens; then 0 at Ardelia returns to the sealed door.",
      "world Version: Aldric II tells of The sealing of the Salt Gate: “The old king's masons sealed the gate, and no one has opened it since.” What really happened: Ardelia sealed the Salt Gate with her own hand, to keep the Undertow under the harbour.",
      "subtext Planted: The sealed door · pays off in “Undertow”.",
      "subtext Irony: The reader knows Kesh sold the secret of the seal to the king's man (revealed in “Night Market”); Ardelia Vane doesn't know it yet.",
      "subtext Withheld: Still held back from the reader: Ardelia is Aldric's sister.",
    ]);
    // Key facts are lifted to full ink.
    const irony = sealed.notes.find((n) => n.note.heading === "Irony");
    expect(
      irony?.note.body.filter((run) => run.strong).map((run) => run.text),
    ).toEqual([
      "Kesh sold the secret of the seal to the king's man",
      "Ardelia Vane doesn't know it yet",
    ]);
    for (const { note, atScene } of sealed.notes) {
      expect(note.authority).toBe("story bible");
      expect(note.placement).toBeUndefined();
      expect(atScene).toEqual({ ...note, placement: "scene" });
    }
  });

  test("a document no scene names has no bible scene; an unplaced scene has no stamp", () => {
    const story = ninefoldStory();
    expect(bibleScene(story, "entry-ardelia")).toBeNull();
    const ardelia = scene(story, "scene-2-1");
    expect(ardelia.stamp).toBeNull();
    expect(read(ardelia.notes)).toEqual([]);
  });

  test("the same bible gives the same scene, so the stamp and gloss share notes", () => {
    const story = ninefoldStory();
    expect(bibleScene(story, "scene-4-2")).toBe(bibleScene(story, "scene-4-2"));
    expect(bibleScene(ninefoldStory(), "scene-4-2")).not.toBe(
      bibleScene(story, "scene-4-2"),
    );
  });

  test("a viewpoint who believes a version instead, and payoffs, as the lighthouse tells them", () => {
    expect(read(scene(lighthouse, "doc-confession").notes)).toEqual([
      "subtext Pays off: The lamp · planted in “Arrival”.",
      "subtext Irony: The reader knows The wreck (shown in “The night the light failed”); Ivo doesn't know it, and believes “The guild says the keeper let the lamp go dark”.",
      "subtext Withheld: Still held back from the reader: Why did Ivo leave the guild?",
    ]);
    expect(read(scene(lighthouse, "doc-storm-night").notes)).toContain(
      "world Version: Kestrel Guild tells of The wreck: “The guild says the keeper let the lamp go dark.” What really happened isn't recorded yet.",
    );
  });

  test("counts as the scene opens and as they change during it", () => {
    const counts = (documentId: string) =>
      read(scene(lighthouse, documentId).notes).filter((line) =>
        line.startsWith("world Count"),
      );
    expect(counts("doc-arrival")).toContain(
      "world Count: Barrels of oil: none yet as the scene opens; then 9 of 12, reaching 2 at The storm.",
    );
    expect(counts("doc-storm-night")).toContain(
      "world Count: Barrels of oil: 9 of 12, reaching 2 as the scene opens; then 1 of 12, 1 short of 2 at The wreck.",
    );
    // A scene that shows no event has no time to take counts at.
    expect(counts("doc-confession")).toEqual([]);
  });

  test("time spans count calendar days between whole-day events, and ranges for coarse ones", () => {
    const base = ninefoldStory();
    const day = (event: string, when: string) => {
      const span = parseWhen(when)._unsafeUnwrap();
      return {
        event,
        frame: "world",
        ...span,
        precision: null,
        authority: { level: "asserted" as const },
      };
    };
    const story: Story = {
      ...base,
      timeline: {
        ...base.timeline,
        positions: [
          ...base.timeline.positions.filter(
            (p) =>
              !["night-market", "door-visit", "tide-turns"].includes(p.event),
          ),
          day("night-market", "1187-10-30"),
          day("door-visit", "1187-11-01"),
          day("tide-turns", "1187-11-01"),
        ],
      },
    };
    expect(read(scene(story, "scene-4-2").notes)[0]).toBe(
      "time Time: 2 days after “Night Market”.",
    );
    // Placed only by its year, the Undertow may fall anywhere in 1204.
    expect(read(scene(base, "scene-5-1").notes)[0]).toBe(
      "time Time: 0.1 to 1.1 years after “Aldric's Answer”.",
    );
  });

  test("an inferred position shows as inferred", () => {
    const base = ninefoldStory();
    const story: Story = {
      ...base,
      timeline: {
        ...base.timeline,
        positions: base.timeline.positions.map((p) =>
          p.event === "tide-turns"
            ? {
                ...p,
                authority: {
                  level: "inferred",
                  provenance: {
                    model: "m",
                    requestId: "r",
                    sourceBlockId: "p-tide",
                  },
                },
              }
            : p,
        ),
      },
    };
    const sealed = scene(story, "scene-4-2");
    expect(sealed.stamp?.inferred).toBe(true);
    expect(
      sealed.notes.find((n) => n.note.id === "bible/event/tide-turns")?.note
        .authority,
    ).toBe("inferred");
  });
});

describe("bibleLayers", () => {
  const notes = scene(ninefoldStory(), "scene-4-2").notes;
  const blocks: TextBlock[] = [
    {
      id: "p-lamps",
      text: "The lamps along the Salt Gate had burned down by the time Ardelia reached the sealed door.",
    },
    { id: "p-tide", text: "Somewhere below them, the tide turned." },
  ];

  test("a note sits on the first words that name its record; the rest are about the scene", () => {
    const layers = bibleLayers(notes, blocks);
    expect(
      layers.marks.map((mark) => [mark.noteId, mark.anchor, mark.style.kind]),
    ).toEqual([
      [
        "bible/event/tide-turns",
        { blockId: "p-tide", quote: "the tide turned", occurrence: 0 },
        "time",
      ],
      [
        "bible/count/lamps",
        {
          blockId: "p-lamps",
          quote: "lamps along the Salt Gate",
          occurrence: 0,
        },
        "record",
      ],
      [
        "bible/plants/object:sealed-door",
        { blockId: "p-lamps", quote: "the sealed door", occurrence: 0 },
        "subtext",
      ],
    ]);
    expect(
      layers.notes
        .filter((note) => note.placement === "scene")
        .map((note) => note.id),
    ).toEqual([
      "bible/since",
      "bible/event/door-visit",
      "bible/version/kings-account",
      "bible/irony/fact:kesh-sold",
      "bible/withheld",
    ]);
  });

  test("keys go to notes on words in reading order, then to the scene's notes", () => {
    const value = blocks.map((block) => ({
      type: "p",
      id: block.id,
      children: [{ text: block.text }],
    }));
    const keys = assignKeys(value, bibleLayers(notes, blocks));
    expect([...keys].map(([id, key]) => `${key.letter} ${id}`)).toEqual([
      "a bible/count/lamps",
      "b bible/plants/object:sealed-door",
      "c bible/event/tide-turns",
      "d bible/since",
      "e bible/event/door-visit",
      "f bible/version/kings-account",
      "g bible/irony/fact:kesh-sold",
      "h bible/withheld",
    ]);
  });

  test("words edited away move the note to the scene's end, and back when they return", () => {
    const without = bibleLayers(notes, [
      { id: "p-tide", text: "Somewhere below them, the sea moved." },
    ]);
    const tide = (layers: typeof without) =>
      layers.notes.find((note) => note.id === "bible/event/tide-turns");
    expect(tide(without)?.placement).toBe("scene");
    expect(without.marks).toEqual([]);
    expect(tide(bibleLayers(notes, blocks))?.placement).toBeUndefined();
  });

  test("an occurrence is counted as locate counts it, and two notes never share a key's place", () => {
    const story = ninefoldStory();
    const twice: Story = {
      ...story,
      // Two records named alike: the second takes the next occurrence.
      objects: [
        ...story.objects,
        { id: "other-door", name: "The sealed door", notes: "" },
      ],
      scenes: story.scenes.map((s) =>
        s.id === "scene-4-2"
          ? {
              ...s,
              plants: [
                { kind: "object", id: "sealed-door" },
                { kind: "object", id: "other-door" },
              ],
            }
          : s,
      ),
    };
    const layers = bibleLayers(scene(twice, "scene-4-2").notes, [
      { id: "b", text: "At the sealed door, then the sealed door again." },
    ]);
    expect(
      layers.marks
        .filter((mark) => mark.noteId?.includes("door") === true)
        .map((mark) => mark.anchor),
    ).toEqual([
      { blockId: "b", quote: "the sealed door", occurrence: 0 },
      { blockId: "b", quote: "the sealed door", occurrence: 1 },
    ]);
  });

  test("small numbers don't anchor a count; values of ten and more do, in words too", () => {
    const counts = scene(lighthouse, "doc-storm-night").notes.filter((n) =>
      n.note.id.startsWith("bible/count/"),
    );
    expect(
      bibleLayers(counts, [{ id: "b", text: "There were 3 of them, then 2." }])
        .marks,
    ).toEqual([]);
    const lamps = scene(ninefoldStory(), "scene-4-2").notes.filter(
      (n) => n.note.id === "bible/count/lamps",
    );
    expect(
      bibleLayers(lamps, [{ id: "b", text: "Forty lamps burned." }]).marks.map(
        (mark) => mark.anchor.quote,
      ),
    ).toEqual(["Forty"]);
  });

  test("the same text gives layers that draw the same", () => {
    const a = bibleLayers(notes, blocks);
    expect(sameBibleLayers(a, bibleLayers(notes, blocks))).toBe(true);
    expect(sameBibleLayers(a, bibleLayers(notes, blocks.slice(0, 1)))).toBe(
      false,
    );
  });
});
