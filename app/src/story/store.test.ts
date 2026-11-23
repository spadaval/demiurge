import { describe, expect, test } from "bun:test";
import { IDBFactory } from "fake-indexeddb";
import type { ResultAsync } from "neverthrow";
import { validateDocument } from "../content/schema";
import { openIndexedDbStorage } from "../storage/indexeddb";
import { createMemoryStorage } from "../storage/memory";
import type { StorageAdapter, StoredDocument } from "../storage/types";
import { applyStoryCommand, type StoryCommand } from "./commands";
import documentsFile from "./fixtures/lighthouse.documents.json";
import {
  executeStoryCommand,
  loadStory,
  STORY_RECORD_KINDS,
  saveStory,
  sceneDocuments,
  storyFromRecords,
  storyRecordId,
  storyToRecords,
} from "./store";
import { newStory, parseStory, type Story, serializeStory } from "./story";

const fixture: Story = parseStory(
  await Bun.file(
    new URL("./fixtures/lighthouse.story.json", import.meta.url),
  ).text(),
)._unsafeUnwrap();
const documents: StoredDocument[] = documentsFile;

async function value<T, E>(result: ResultAsync<T, E>): Promise<T> {
  return (await result)._unsafeUnwrap();
}

/** Equal as story files: the same records, whatever order unordered lists are in. */
const sameStory = (a: Story, b: Story) =>
  expect(serializeStory(a)).toBe(serializeStory(b));

function run(story: Story, ...commands: StoryCommand[]): Story {
  return commands.reduce(
    (current, command) =>
      applyStoryCommand(current, command)._unsafeUnwrap().story,
    story,
  );
}

describe("the lighthouse fixture", () => {
  test("fills every list of the story and its timeline", () => {
    const { timeline, ...rest } = fixture;
    const empty = [
      ...Object.entries(rest),
      ...Object.entries(timeline).map(([key, v]) => [`timeline.${key}`, v]),
    ].filter(([, v]) => Array.isArray(v) && v.length === 0);
    expect(empty).toEqual([]);
    expect(fixture.premise).not.toBe("");
  });

  test("has a record of every kind", () => {
    const kinds = new Set(
      storyToRecords(fixture)
        ._unsafeUnwrap()
        .map((record) => record.kind),
    );
    expect([...kinds].sort()).toEqual([...STORY_RECORD_KINDS].sort());
  });

  test("links every scene to a valid Plate document", () => {
    for (const document of documents) {
      expect(validateDocument(document.content).isOk()).toBe(true);
    }
    expect(fixture.scenes.map((scene) => scene.documentId)).toEqual(
      documents.map((document) => document.id),
    );
  });
});

const adapters: [string, () => Promise<StorageAdapter>][] = [
  ["memory", async () => createMemoryStorage()],
  [
    "IndexedDB",
    async () => {
      // One factory per test, kept so the test can reopen the same database.
      const factory = new IDBFactory();
      const open = async () =>
        (
          await openIndexedDbStorage({ name: "story", factory })
        )._unsafeUnwrap();
      const storage = await open();
      return { ...storage, reopen: open } as StorageAdapter;
    },
  ],
];

/** The same store after a reload: reopened from disk where there is one. */
async function reloaded(storage: StorageAdapter): Promise<StorageAdapter> {
  const reopen = (storage as { reopen?: () => Promise<StorageAdapter> }).reopen;
  if (reopen === undefined) return storage;
  storage.close();
  return reopen();
}

describe.each(adapters)("story store on %s", (_, open) => {
  test("the fixture saves, reloads and links to its scene documents", async () => {
    const storage = await open();
    for (const document of documents) {
      await value(storage.documents.save(document));
    }
    const saved = await value(saveStory(storage, fixture, 1000));
    expect(saved.deleted).toEqual([]);
    expect(saved.saved).toHaveLength(
      storyToRecords(fixture)._unsafeUnwrap().length,
    );

    const again = await reloaded(storage);
    const loaded = await value(loadStory(again));
    sameStory(loaded, fixture);
    expect(loaded.scenes).toEqual(fixture.scenes);

    const linked = await value(sceneDocuments(again, loaded));
    expect(linked.shared).toEqual([]);
    expect(
      linked.scenes.map((prose) =>
        prose.kind === "linked" ? prose.document : prose.kind,
      ),
    ).toEqual(documents);
    again.close();
  });

  test("records have string keys built from the item and the save time", async () => {
    const storage = await open();
    await value(saveStory(storage, fixture, 1000));
    const records = await value(storage.storyRecords.list());
    for (const record of records) {
      expect(record.updatedAt).toBe(1000);
      expect(
        record.id === record.kind || record.id.startsWith(`${record.kind}/`),
      ).toBe(true);
    }
    const ids = records.map((record) => record.id);
    expect(ids).toContain("actor/mara");
    expect(ids).toContain("cause/storm/wreck");
    expect(ids).toContain("participant/wreck/actor/ivo");
    expect(ids).toContain(
      "deliberateGap/drive_without_origin/drive/sell-light",
    );
    expect(ids).toContain("deliberateGap/no_reader_question");
    expect(ids).toContain("position/wreck/log");
    expect(ids).toContain("placement/confession");
    expect(ids).toContain("follow/mara");
    expect(ids).toContain("sceneOrder");
    storage.close();
  });

  test("saving writes only what changed", async () => {
    const storage = await open();
    await value(saveStory(storage, fixture, 1000));
    expect(await value(saveStory(storage, fixture, 2000))).toEqual({
      saved: [],
      deleted: [],
      changes: [],
    });

    const renamed = run(fixture, {
      type: "updateScene",
      id: "arrival",
      title: "Landfall",
    });
    const before = await value(storage.storyRecords.load("scene/arrival"));
    const savedRenamed = await value(saveStory(storage, renamed, 3000));
    const record = await value(storage.storyRecords.load("scene/arrival"));
    expect(savedRenamed).toEqual({
      saved: ["scene/arrival"],
      deleted: [],
      changes: [
        {
          id: "scene/arrival",
          kind: "scene",
          before: before.data,
          after: record.data,
        },
      ],
    });
    expect(record.data).toMatchObject({ title: "Landfall" });
    expect(record.updatedAt).toBe(3000);
    expect(
      (await value(storage.storyRecords.load("actor/mara"))).updatedAt,
    ).toBe(1000);

    const moved = run(renamed, {
      type: "moveScene",
      id: "confession",
      index: 0,
    });
    expect(await value(saveStory(storage, moved, 4000))).toMatchObject({
      saved: ["sceneOrder"],
      deleted: [],
    });
    expect(
      (await value(loadStory(storage))).scenes.map((scene) => scene.id),
    ).toEqual(["confession", "arrival", "storm-night"]);
    storage.close();
  });

  test("removing items deletes their records", async () => {
    const storage = await open();
    await value(saveStory(storage, fixture, 1000));
    const change = await value(
      executeStoryCommand(
        storage,
        { type: "removeScene", id: "confession" },
        2000,
      ),
    );
    const loaded = await value(loadStory(storage));
    sameStory(loaded, change.story);
    const ids = (await value(storage.storyRecords.list())).map((r) => r.id);
    expect(ids).not.toContain("scene/confession");
    // The change names the deleted scene with what it held, and the new order.
    expect(
      change.changes.find((c) => c.id === "scene/confession"),
    ).toMatchObject({
      kind: "scene",
      before: { id: "confession" },
      after: null,
    });
    expect(change.changes.find((c) => c.id === "sceneOrder")).toMatchObject({
      before: ["arrival", "storm-night", "confession"],
      after: ["arrival", "storm-night"],
    });
    // Its reveal of the candidate went with it; the knowledge of it stays.
    expect(ids).toContain("knowledge/mara-knows");
    expect((await value(storage.storyRecords.load("sceneOrder"))).data).toEqual(
      ["arrival", "storm-night"],
    );
    storage.close();
  });

  test("a command that is refused writes nothing", async () => {
    const storage = await open();
    await value(saveStory(storage, fixture, 1000));
    const refused = await executeStoryCommand(
      storage,
      { type: "setSceneDocument", id: "arrival", documentId: "doc-confession" },
      2000,
    );
    expect(refused._unsafeUnwrapErr()).toMatchObject({ kind: "duplicate_id" });
    const records = await value(storage.storyRecords.list());
    expect(records.every((record) => record.updatedAt === 1000)).toBe(true);
    storage.close();
  });

  test("a story whose items would share a record is refused whole", async () => {
    const storage = await open();
    await value(saveStory(storage, newStory("first"), 1000));
    const twice: Story = {
      ...fixture,
      actors: [
        ...fixture.actors,
        { id: "mara", name: "Twin", kind: "person", notes: "" },
      ],
    };
    expect(
      (await saveStory(storage, twice, 2000))._unsafeUnwrapErr(),
    ).toMatchObject({
      kind: "invalid_story",
      message: "two items would be stored as actor/mara",
    });
    expect((await value(loadStory(storage))).premise).toBe("first");
    storage.close();
  });

  test("an empty store holds an empty story", async () => {
    const storage = await open();
    sameStory(await value(loadStory(storage)), newStory(""));
    storage.close();
  });

  test("scene documents report unlinked, missing and shared prose", async () => {
    const storage = await open();
    const [first] = documents;
    if (first === undefined) throw new Error("expected a document");
    await value(storage.documents.save(first));
    const story = run(
      newStory(""),
      { type: "addScene", id: "a", title: "A", summary: "" },
      { type: "addScene", id: "b", title: "B", summary: "" },
      { type: "addScene", id: "c", title: "C", summary: "" },
      { type: "setSceneDocument", id: "a", documentId: first.id },
      { type: "setSceneDocument", id: "b", documentId: "gone" },
    );
    // Stored data can still hold what the commands refuse.
    const shared: Story = {
      ...story,
      scenes: [
        ...story.scenes,
        { ...story.scenes[0], id: "d", title: "D" } as Story["scenes"][number],
      ],
    };
    const linked = await value(sceneDocuments(storage, shared));
    expect(linked.scenes.map((prose) => [prose.scene.id, prose.kind])).toEqual([
      ["a", "linked"],
      ["b", "missing"],
      ["c", "unlinked"],
      ["d", "linked"],
    ]);
    expect(linked.scenes[1]).toMatchObject({ documentId: "gone" });
    expect(linked.shared).toEqual([
      { documentId: first.id, scenes: ["a", "d"] },
    ]);
    storage.close();
  });
});

describe("story records", () => {
  test("IDs encode their parts, so a slash in an ID can't collide", () => {
    const story = run(
      newStory(""),
      { type: "addEvent", id: "a/b", label: "", summary: "" },
      { type: "addEvent", id: "c", label: "", summary: "" },
      { type: "addEvent", id: "a", label: "", summary: "" },
      { type: "addEvent", id: "b/c", label: "", summary: "" },
      { type: "addCause", cause: "a/b", effect: "c" },
      { type: "addCause", cause: "a", effect: "b/c" },
    );
    const ids = storyToRecords(story)
      ._unsafeUnwrap()
      .filter((record) => record.kind === "cause")
      .map((record) => record.id);
    expect(ids).toEqual(["cause/a%2Fb/c", "cause/a/b%2Fc"]);
    expect(storyRecordId("event", "a/b")).toBe("event/a%2Fb");
  });

  test("scenes the order doesn't name come last, by ID", () => {
    const records = storyToRecords(fixture)
      ._unsafeUnwrap()
      .map((record) =>
        record.kind === "sceneOrder"
          ? { ...record, data: ["storm-night", "gone", "storm-night"] }
          : record,
      );
    expect(
      storyFromRecords(records)
        ._unsafeUnwrap()
        .scenes.map((scene) => scene.id),
    ).toEqual(["storm-night", "arrival", "confession"]);
  });

  test("records without the story or timeline record still load", () => {
    const records = storyToRecords(fixture)
      ._unsafeUnwrap()
      .filter(
        (record) => record.kind !== "story" && record.kind !== "timeline",
      );
    const story = storyFromRecords(records)._unsafeUnwrap();
    expect(story.premise).toBe("");
    expect(story.timeline.worldUnit).toBe("year");
    expect(story.actors).toHaveLength(fixture.actors.length);
  });

  test("a record of an unknown kind or the wrong shape fails the load", () => {
    const records = storyToRecords(fixture)._unsafeUnwrap();
    expect(
      storyFromRecords([
        ...records,
        { id: "spell/x", kind: "spell", data: {} },
      ])._unsafeUnwrapErr(),
    ).toEqual({
      kind: "invalid_story",
      message: "record spell/x has unknown kind spell",
    });
    expect(
      storyFromRecords(
        records.map((record) =>
          record.id === "actor/mara"
            ? { ...record, data: { id: "mara", name: 3 } }
            : record,
        ),
      )._unsafeUnwrapErr(),
    ).toMatchObject({ kind: "invalid_story" });
  });
});

describe("scene documents and chapters", () => {
  const base = run(
    newStory(""),
    { type: "addScene", id: "a", title: "A", summary: "" },
    { type: "addScene", id: "b", title: "B", summary: "" },
  );

  test("a scene links to one document, and two scenes never share one", () => {
    const linked = run(base, {
      type: "setSceneDocument",
      id: "a",
      documentId: "doc-a",
    });
    expect(linked.scenes[0]?.documentId).toBe("doc-a");
    expect(
      applyStoryCommand(linked, {
        type: "setSceneDocument",
        id: "b",
        documentId: "doc-a",
      })._unsafeUnwrapErr(),
    ).toMatchObject({
      kind: "duplicate_id",
      message: "document doc-a is already the prose of scene a",
    });
    const unlinked = run(linked, {
      type: "setSceneDocument",
      id: "a",
      documentId: null,
    });
    expect(unlinked.scenes[0]).not.toHaveProperty("documentId");
  });

  test("a scene's book and chapter are set and cleared", () => {
    const grouped = run(base, {
      type: "setSceneChapter",
      id: "a",
      book: "One",
      chapter: "The Lamp",
    });
    expect(grouped.scenes[0]).toMatchObject({
      book: "One",
      chapter: "The Lamp",
    });
    const cleared = run(grouped, {
      type: "setSceneChapter",
      id: "a",
      book: null,
      chapter: "Ashore",
    });
    expect(cleared.scenes[0]).not.toHaveProperty("book");
    expect(cleared.scenes[0]?.chapter).toBe("Ashore");
    expect(
      applyStoryCommand(base, {
        type: "setSceneChapter",
        id: "a",
        book: " ",
        chapter: null,
      })._unsafeUnwrapErr(),
    ).toMatchObject({ kind: "invalid_command" });
  });

  test("the story file keeps them, and files without them read the same", () => {
    const grouped = run(
      base,
      { type: "setSceneDocument", id: "a", documentId: "doc-a" },
      { type: "setSceneChapter", id: "a", book: "One", chapter: "Two" },
    );
    const text = serializeStory(grouped);
    expect(text).toContain('"documentId": "doc-a"');
    sameStory(parseStory(text)._unsafeUnwrap(), grouped);
    expect(serializeStory(base)).not.toContain("documentId");
  });
});
