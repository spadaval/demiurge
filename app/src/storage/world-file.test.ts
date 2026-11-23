import { describe, expect, test } from "bun:test";
import { IDBFactory } from "fake-indexeddb";
import type { ResultAsync } from "neverthrow";
import documentsFile from "../story/fixtures/lighthouse.documents.json";
import { STORY_RECORD_KINDS, saveStory } from "../story/store";
import { parseStory } from "../story/story";
import { contentFixture, emptyWorld } from "./contract";
import { openIndexedDbStorage } from "./indexeddb";
import { createMemoryStorage } from "./memory";
import {
  COLLECTION_NAMES,
  type StorageAdapter,
  type StoredDocument,
  type WorldRecords,
} from "./types";
import {
  exportWorld,
  importWorld,
  parseWorldFile,
  serializeWorldFile,
  WORLD_FILE_VERSION,
} from "./world-file";

async function value<T, E>(result: ResultAsync<T, E>): Promise<T> {
  return (await result)._unsafeUnwrap();
}

async function failure<T, E>(result: ResultAsync<T, E>): Promise<E> {
  return (await result)._unsafeUnwrapErr();
}

const story = parseStory(
  await Bun.file(
    new URL("../story/fixtures/lighthouse.story.json", import.meta.url),
  ).text(),
)._unsafeUnwrap();
const documents: StoredDocument[] = documentsFile;

/**
 * A world with records in every collection, written the ways the app writes
 * them: the lighthouse story's documents and bible, world entries, AI
 * provenance, a stored request, an outline, a timeline, an agent session, a
 * talk topic, and snapshots saved on their own and in a batch, one of them
 * of a deleted document.
 */
async function fillWorld(storage: StorageAdapter): Promise<void> {
  for (const document of documents) {
    await value(storage.documents.save(document));
  }
  await value(
    storage.documents.save({
      id: "doc-notes",
      title: "Notes",
      content: contentFixture,
      updatedAt: 10,
    }),
  );
  await value(
    storage.worldEntries.save({
      documentId: "doc-notes",
      facts: { kind: "place", aliases: ["the Flats"], fields: { size: 3 } },
      updatedAt: 11,
    }),
  );
  await value(
    storage.batch([
      {
        kind: "saveAnnotation",
        record: {
          id: "seg_01",
          documentId: "doc-notes",
          kind: "ai_provenance",
          data: { requestId: "req-1", logprobs: [-0.25, -1.5] },
          updatedAt: 12,
        },
      },
      {
        kind: "saveSnapshot",
        snapshot: {
          documentId: "doc-notes",
          reason: "accepted_ai_change",
          content: contentFixture,
        },
      },
    ]),
  );
  await value(
    storage.requests.save({
      id: "req-1",
      documentId: "doc-notes",
      request: { model: "local", messages: [{ role: "user", content: "Go" }] },
      createdAt: 13,
    }),
  );
  await value(
    storage.outlines.save({
      id: "outline",
      books: [
        {
          id: "book-1",
          title: "The Salt Road",
          chapters: [
            { id: "ch-1", title: "Arrival", scenes: ["doc-arrival"] },
            { id: "ch-2", title: "Empty", scenes: [] },
          ],
        },
      ],
      updatedAt: 14,
    }),
  );
  await value(
    storage.timelines.save({
      id: "world",
      timeline: { version: 1, events: [{ id: "e1", label: "The storm" }] },
      updatedAt: 15,
    }),
  );
  await value(saveStory(storage, story, 16));
  await value(
    storage.agentRecords.save({
      id: "s1/session",
      sessionId: "s1",
      kind: "session",
      data: { role: "plan", scope: { kind: "world" } },
      updatedAt: 17,
    }),
  );
  await value(
    storage.talkRecords.save({
      id: "t1/topic",
      topicId: "t1",
      kind: "topic",
      data: { title: "Is the keeper's log a lie?", status: "open" },
      updatedAt: 18,
    }),
  );
  await value(
    storage.snapshots.save({
      documentId: "doc-deleted",
      reason: "repaired_on_load",
      content: [{ type: "p", id: "dup", children: [{ text: "x" }] }],
    }),
  );
  await value(
    storage.snapshots.save({
      documentId: "doc-notes",
      reason: "periodic",
      content: [],
    }),
  );
}

const stores: [string, () => Promise<StorageAdapter>][] = [
  ["memory", async () => createMemoryStorage()],
  [
    "IndexedDB",
    async () =>
      (
        await openIndexedDbStorage({ name: "world", factory: new IDBFactory() })
      )._unsafeUnwrap(),
  ],
];

describe.each(stores)("the world file over %s storage", (_, open) => {
  test("round-trips a world with every collection into an empty store", async () => {
    const source = await open();
    await fillWorld(source);
    const before = await value(source.dump());
    // The fixture fills every collection and the bible has every kind.
    expect(
      COLLECTION_NAMES.filter((name) => before[name].length === 0),
    ).toEqual([]);
    expect(new Set(before.storyRecords.map((r) => r.kind))).toEqual(
      new Set(STORY_RECORD_KINDS),
    );

    const file = await value(exportWorld(source));
    const target = await open();
    const imported = await value(importWorld(target, file));

    expect(imported).toEqual(before);
    expect(await value(target.dump())).toEqual(before);
    expect(await value(exportWorld(target))).toBe(file);
    // Records read back through the collections, not just the dump.
    expect(await value(target.documents.list())).toEqual(
      await value(source.documents.list()),
    );
    expect(await value(target.snapshots.list("doc-deleted"))).toEqual(
      await value(source.snapshots.list("doc-deleted")),
    );
    source.close();
    target.close();
  });

  test("refuses a store that has records and writes nothing", async () => {
    const source = await open();
    await fillWorld(source);
    const file = await value(exportWorld(source));
    const target = await open();
    await value(
      target.storyRecords.save({
        id: "story",
        kind: "story",
        data: {},
        updatedAt: 1,
      }),
    );
    const before = await value(target.dump());
    expect(await failure(importWorld(target, file))).toEqual({
      kind: "store_not_empty",
      collection: "storyRecords",
    });
    expect(await value(target.dump())).toEqual(before);
    source.close();
    target.close();
  });

  test("an empty world round-trips", async () => {
    const source = await open();
    const file = await value(exportWorld(source));
    expect(JSON.parse(file)).toEqual({
      format: "demiurge-world",
      version: WORLD_FILE_VERSION,
      records: emptyWorld,
    });
    const target = await open();
    expect(await value(importWorld(target, file))).toEqual(emptyWorld);
    source.close();
    target.close();
  });
});

describe("reading a world file", () => {
  const world: WorldRecords = {
    ...emptyWorld,
    documents: [{ id: "d", title: "T", content: [], updatedAt: 1 }],
    snapshots: [
      { id: 2, documentId: "d", reason: "periodic", createdAt: 1, content: [] },
    ],
    outlines: [
      {
        id: "o",
        books: [
          {
            id: "b",
            title: "B",
            chapters: [{ id: "c", title: "C", scenes: ["d"] }],
          },
        ],
        updatedAt: 1,
      },
    ],
  };
  const file = (records: unknown, overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
      format: "demiurge-world",
      version: WORLD_FILE_VERSION,
      records,
      ...overrides,
    });

  test("reads what it writes", () => {
    expect(parseWorldFile(serializeWorldFile(world))._unsafeUnwrap()).toEqual(
      world,
    );
  });

  test("refuses text that is not JSON", () => {
    expect(parseWorldFile("{")._unsafeUnwrapErr()).toMatchObject({
      kind: "invalid_world_file",
      path: "(root)",
    });
  });

  test("refuses another format", () => {
    expect(
      parseWorldFile(file(world, { format: "something" }))._unsafeUnwrapErr(),
    ).toMatchObject({ kind: "invalid_world_file", path: "format" });
  });

  test("reads a version 1 file, which has no agent or talk records", () => {
    const { agentRecords: _, talkRecords: __, ...version1 } = world;
    expect(
      parseWorldFile(file(version1, { version: 1 }))._unsafeUnwrap(),
    ).toEqual(world);
    expect(
      parseWorldFile(file(world, { version: 1 }))._unsafeUnwrapErr(),
    ).toEqual({
      kind: "invalid_world_file",
      path: "records.agentRecords",
      reason: "not a field of this record",
    });
  });

  test("reads a version 2 file, which has no talk records", () => {
    const { talkRecords: _, ...version2 } = world;
    expect(
      parseWorldFile(file(version2, { version: 2 }))._unsafeUnwrap(),
    ).toEqual(world);
    expect(
      parseWorldFile(file(world, { version: 2 }))._unsafeUnwrapErr(),
    ).toEqual({
      kind: "invalid_world_file",
      path: "records.talkRecords",
      reason: "not a field of this record",
    });
  });

  test("refuses a version it does not read", () => {
    expect(
      parseWorldFile(file(world, { version: 4 }))._unsafeUnwrapErr(),
    ).toEqual({ kind: "unsupported_world_version", version: 4 });
    expect(
      parseWorldFile(file(world, { version: undefined }))._unsafeUnwrapErr(),
    ).toEqual({ kind: "unsupported_world_version", version: undefined });
  });

  const { storyRecords: _, ...withoutStory } = world;
  test.each([
    ["a missing collection", withoutStory, "records.storyRecords", "missing"],
    [
      "an unknown collection",
      { ...world, discussions: [] },
      "records.discussions",
      "not a field of this record",
    ],
    [
      "a record with an extra field",
      { ...world, documents: [{ ...world.documents[0], extra: 1 }] },
      "records.documents[0].extra",
      "not a field of this record",
    ],
    [
      "a record missing a field",
      { ...world, documents: [{ id: "d", title: "T", content: [] }] },
      "records.documents[0].updatedAt",
      "missing",
    ],
    [
      "a field of the wrong type",
      { ...world, documents: [{ ...world.documents[0], title: 3 }] },
      "records.documents[0].title",
      "expected a string",
    ],
    [
      "a snapshot ID that is not a positive integer",
      { ...world, snapshots: [{ ...world.snapshots[0], id: 1.5 }] },
      "records.snapshots[0].id",
      "expected a positive integer",
    ],
    [
      "an unknown snapshot reason",
      { ...world, snapshots: [{ ...world.snapshots[0], reason: "manual" }] },
      "records.snapshots[0].reason",
      "expected one of accepted_ai_change, periodic, repaired_on_load, sync_conflict",
    ],
    [
      "a malformed outline chapter",
      {
        ...world,
        outlines: [
          {
            id: "o",
            books: [
              {
                id: "b",
                title: "B",
                chapters: [{ id: "c", title: "C", scenes: [1] }],
              },
            ],
            updatedAt: 1,
          },
        ],
      },
      "records.outlines[0].books[0].chapters[0].scenes[0]",
      "expected a string",
    ],
    [
      "two records with one key",
      { ...world, documents: [world.documents[0], world.documents[0]] },
      "records.documents[1]",
      'a second record with key "d"',
    ],
    [
      "a collection that is not an array",
      { ...world, requests: {} },
      "records.requests",
      "expected an array",
    ],
  ])("refuses %s", (_, records, path, reason) => {
    expect(parseWorldFile(file(records))._unsafeUnwrapErr()).toEqual({
      kind: "invalid_world_file",
      path,
      reason,
    });
  });

  test("refuses fields beside the records", () => {
    expect(
      parseWorldFile(file(world, { exportedAt: 1 }))._unsafeUnwrapErr(),
    ).toEqual({
      kind: "invalid_world_file",
      path: "exportedAt",
      reason: "not a field of this record",
    });
  });

  test("an invalid file writes nothing", async () => {
    const storage = createMemoryStorage();
    expect(
      await failure(importWorld(storage, file({ ...world, requests: {} }))),
    ).toMatchObject({ kind: "invalid_world_file" });
    expect(await value(storage.dump())).toEqual(emptyWorld);
  });
});
