import { describe, expect, test } from "bun:test";
import { IDBFactory } from "fake-indexeddb";
import { contentFixture, describeStorageContract } from "./contract";
import { DB_VERSION, openIndexedDbStorage, upgrade } from "./indexeddb";
import type { JsonValue } from "./types";

async function open(factory: IDBFactory) {
  return (
    await openIndexedDbStorage({ name: "worldcrafter", factory })
  )._unsafeUnwrap();
}

describeStorageContract("IndexedDB", () => open(new IDBFactory()));

describe("IndexedDB persistence", () => {
  test("data survives closing and reopening the database", async () => {
    const factory = new IDBFactory();
    const document = {
      id: "doc1",
      title: "The Salt Road",
      content: contentFixture,
      updatedAt: 1,
    };
    const first = await open(factory);
    (await first.documents.save(document))._unsafeUnwrap();
    (
      await first.worldEntries.save({
        documentId: "doc1",
        facts: { aliases: ["Mara"] },
        updatedAt: 1,
      })
    )._unsafeUnwrap();
    (
      await first.annotations.save({
        id: "seg_01",
        documentId: "doc1",
        kind: "ai_provenance",
        data: { model: "local" },
        updatedAt: 1,
      })
    )._unsafeUnwrap();
    (
      await first.requests.save({
        id: "r1",
        documentId: "doc1",
        request: { prompt: "Continue." },
        createdAt: 1,
      })
    )._unsafeUnwrap();
    const outline = {
      id: "manuscript",
      books: [
        {
          id: "b1",
          title: "Book One",
          chapters: [{ id: "c1", title: "Arrival", scenes: ["doc1"] }],
        },
      ],
      updatedAt: 1,
    };
    (await first.outlines.save(outline))._unsafeUnwrap();
    const before = (
      await first.snapshots.save({
        documentId: "doc1",
        reason: "periodic",
        content: contentFixture,
      })
    )._unsafeUnwrap();
    first.close();

    const second = await open(factory);
    expect((await second.documents.load("doc1"))._unsafeUnwrap()).toEqual(
      document,
    );
    expect((await second.worldEntries.list())._unsafeUnwrap()).toHaveLength(1);
    expect(
      (await second.annotations.listForDocument("doc1"))._unsafeUnwrap(),
    ).toHaveLength(1);
    expect((await second.requests.load("r1"))._unsafeUnwrap()).toMatchObject({
      id: "r1",
    });
    expect((await second.snapshots.list("doc1"))._unsafeUnwrap()).toEqual([
      before,
    ]);
    expect((await second.outlines.load("manuscript"))._unsafeUnwrap()).toEqual(
      outline,
    );

    // Snapshot IDs keep increasing across a reopen, so ordering still holds.
    const after = (
      await second.snapshots.save({
        documentId: "doc1",
        reason: "accepted_ai_change",
        content: [],
      })
    )._unsafeUnwrap();
    expect(after.id).toBeGreaterThan(before.id);
    second.close();
  });

  test("snapshot list reads metadata only; content is a separate store", async () => {
    const factory = new IDBFactory();
    const storage = await open(factory);
    const info = (
      await storage.snapshots.save({
        documentId: "doc1",
        reason: "periodic",
        content: contentFixture,
      })
    )._unsafeUnwrap();
    storage.close();

    // Remove the content behind the adapter's back.
    await new Promise<void>((resolve, reject) => {
      const request = factory.open("worldcrafter", DB_VERSION);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("snapshotContent", "readwrite");
        tx.objectStore("snapshotContent").delete(info.id);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });

    const reopened = await open(factory);
    expect((await reopened.snapshots.list("doc1"))._unsafeUnwrap()).toEqual([
      info,
    ]);
    expect(
      (await reopened.snapshots.load(info.id))._unsafeUnwrapErr(),
    ).toMatchObject({
      kind: "failure",
      operation: "load",
      id: String(info.id),
    });
    reopened.close();
  });

  test("a snapshot whose content can't be stored leaves no metadata", async () => {
    const storage = await open(new IDBFactory());
    // A function is not cloneable, so the content write throws DataCloneError.
    // The type system already forbids this; the cast simulates a caller bug.
    const content = [{ handler: () => 1 }] as unknown as JsonValue;
    const result = await storage.snapshots.save({
      documentId: "doc1",
      reason: "periodic",
      content,
    });
    expect(result._unsafeUnwrapErr()).toMatchObject({
      kind: "failure",
      operation: "save",
      collection: "snapshots",
    });
    expect((await storage.snapshots.list("doc1"))._unsafeUnwrap()).toEqual([]);
    storage.close();
  });

  test("upgrading from version 1 keeps every record and adds story records", async () => {
    const factory = new IDBFactory();
    const document = {
      id: "doc1",
      title: "The Salt Road",
      content: contentFixture,
      updatedAt: 1,
    };
    const worldEntry = {
      documentId: "doc1",
      facts: { aliases: ["Mara"] },
      updatedAt: 1,
    };
    const annotation = {
      id: "seg_01",
      documentId: "doc1",
      kind: "ai_provenance",
      data: { model: "local" },
      updatedAt: 1,
    };
    const request = {
      id: "r1",
      documentId: "doc1",
      request: { prompt: "Continue." },
      createdAt: 1,
    };
    const outline = {
      id: "manuscript",
      books: [
        {
          id: "b1",
          title: "Book One",
          chapters: [{ id: "c1", title: "Arrival", scenes: ["doc1"] }],
        },
      ],
      updatedAt: 1,
    };
    const timeline = {
      id: "world",
      timeline: { version: 1, events: [{ id: "e1", label: "Storm" }] },
      updatedAt: 1,
    };
    const snapshot = { documentId: "doc1", reason: "periodic", createdAt: 5 };

    // The database as a version 1 release left it, written without the adapter.
    await new Promise<void>((resolve, reject) => {
      const request1 = factory.open("worldcrafter", 1);
      request1.onupgradeneeded = (event) =>
        upgrade(request1.result, event.oldVersion, 1);
      request1.onsuccess = () => {
        const db = request1.result;
        expect([...db.objectStoreNames]).not.toContain("storyRecords");
        const stores = [
          "documents",
          "worldEntries",
          "annotations",
          "requests",
          "snapshots",
          "snapshotContent",
          "outlines",
          "timelines",
        ];
        const tx = db.transaction(stores, "readwrite");
        tx.objectStore("documents").put(document);
        tx.objectStore("worldEntries").put(worldEntry);
        tx.objectStore("annotations").put(annotation);
        tx.objectStore("requests").put(request);
        tx.objectStore("outlines").put(outline);
        tx.objectStore("timelines").put(timeline);
        const add = tx.objectStore("snapshots").add(snapshot);
        add.onsuccess = () =>
          tx
            .objectStore("snapshotContent")
            .put({ id: add.result, content: contentFixture });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => reject(tx.error);
      };
      request1.onerror = () => reject(request1.error);
    });

    const upgraded = await open(factory);
    expect((await upgraded.documents.list())._unsafeUnwrap()).toEqual([
      document,
    ]);
    expect((await upgraded.worldEntries.list())._unsafeUnwrap()).toEqual([
      worldEntry,
    ]);
    expect(
      (await upgraded.annotations.listForDocument("doc1"))._unsafeUnwrap(),
    ).toEqual([annotation]);
    expect((await upgraded.requests.list())._unsafeUnwrap()).toEqual([request]);
    expect((await upgraded.outlines.list())._unsafeUnwrap()).toEqual([outline]);
    expect((await upgraded.timelines.list())._unsafeUnwrap()).toEqual([
      timeline,
    ]);
    const [info] = (await upgraded.snapshots.list("doc1"))._unsafeUnwrap();
    expect(info).toMatchObject(snapshot);
    if (info === undefined) throw new Error("expected the snapshot");
    expect((await upgraded.snapshots.load(info.id))._unsafeUnwrap()).toEqual({
      ...info,
      content: contentFixture,
    });

    const record = {
      id: "actor/mara",
      kind: "actor",
      data: { id: "mara", name: "Mara" },
      updatedAt: 2,
    };
    expect((await upgraded.storyRecords.list())._unsafeUnwrap()).toEqual([]);
    (await upgraded.storyRecords.save(record))._unsafeUnwrap();
    upgraded.close();

    const reopened = await open(factory);
    expect((await reopened.storyRecords.list())._unsafeUnwrap()).toEqual([
      record,
    ]);
    reopened.close();
  });

  test("upgrading from version 2 keeps story records and adds agent records", async () => {
    const factory = new IDBFactory();
    const record = {
      id: "actor/mara",
      kind: "actor",
      data: { id: "mara", name: "Mara" },
      updatedAt: 2,
    };
    // The database as a version 2 release left it, written without the adapter.
    await new Promise<void>((resolve, reject) => {
      const request2 = factory.open("worldcrafter", 2);
      request2.onupgradeneeded = (event) =>
        upgrade(request2.result, event.oldVersion, 2);
      request2.onsuccess = () => {
        const db = request2.result;
        expect([...db.objectStoreNames]).not.toContain("agentRecords");
        const tx = db.transaction(["storyRecords"], "readwrite");
        tx.objectStore("storyRecords").put(record);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => reject(tx.error);
      };
      request2.onerror = () => reject(request2.error);
    });

    const upgraded = await open(factory);
    expect((await upgraded.storyRecords.list())._unsafeUnwrap()).toEqual([
      record,
    ]);
    const step = {
      id: "s1/step/000001",
      sessionId: "s1",
      kind: "step",
      data: { request: { messages: [] } },
      updatedAt: 3,
    };
    (await upgraded.agentRecords.save(step))._unsafeUnwrap();
    upgraded.close();

    const reopened = await open(factory);
    expect(
      (await reopened.agentRecords.listForSession("s1"))._unsafeUnwrap(),
    ).toEqual([step]);
    reopened.close();
  });

  test("upgrading from version 3 keeps every record and adds tombstones", async () => {
    const factory = new IDBFactory();
    const records = {
      documents: [
        {
          id: "doc1",
          title: "The Salt Road",
          content: contentFixture,
          updatedAt: 1,
        },
      ],
      worldEntries: [
        { documentId: "doc1", facts: { aliases: ["Mara"] }, updatedAt: 1 },
      ],
      annotations: [
        {
          id: "seg_01",
          documentId: "doc1",
          kind: "ai_provenance",
          data: { model: "local" },
          updatedAt: 1,
        },
      ],
      requests: [
        {
          id: "r1",
          documentId: "doc1",
          request: { prompt: "Go." },
          createdAt: 1,
        },
      ],
      outlines: [
        {
          id: "manuscript",
          books: [
            {
              id: "b1",
              title: "Book One",
              chapters: [{ id: "c1", title: "Arrival", scenes: ["doc1"] }],
            },
          ],
          updatedAt: 1,
        },
      ],
      timelines: [{ id: "world", timeline: { events: [] }, updatedAt: 1 }],
      storyRecords: [
        { id: "actor/mara", kind: "actor", data: { id: "mara" }, updatedAt: 2 },
      ],
      agentRecords: [
        {
          id: "s1/session",
          sessionId: "s1",
          kind: "session",
          data: { role: "plan" },
          updatedAt: 3,
        },
      ],
    };
    const snapshot = {
      documentId: "doc1",
      reason: "periodic" as const,
      createdAt: 5,
    };

    // The database as a version 3 release left it, written without the adapter.
    await new Promise<void>((resolve, reject) => {
      const request3 = factory.open("worldcrafter", 3);
      request3.onupgradeneeded = (event) =>
        upgrade(request3.result, event.oldVersion, 3);
      request3.onsuccess = () => {
        const db = request3.result;
        expect([...db.objectStoreNames]).not.toContain("tombstones");
        const tx = db.transaction(
          [...Object.keys(records), "snapshots", "snapshotContent"],
          "readwrite",
        );
        for (const [store, list] of Object.entries(records)) {
          for (const record of list) tx.objectStore(store).put(record);
        }
        const add = tx.objectStore("snapshots").add(snapshot);
        add.onsuccess = () =>
          tx
            .objectStore("snapshotContent")
            .put({ id: add.result, content: contentFixture });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => reject(tx.error);
      };
      request3.onerror = () => reject(request3.error);
    });

    const upgraded = await open(factory);
    const dumped = (await upgraded.dump())._unsafeUnwrap();
    const { snapshots, ...keyed } = dumped;
    expect(keyed).toEqual(records);
    expect(snapshots).toEqual([
      { ...snapshot, id: expect.any(Number), content: contentFixture },
    ]);
    expect(
      (await upgraded.annotations.listForDocument("doc1"))._unsafeUnwrap(),
    ).toEqual(records.annotations);
    expect(
      (await upgraded.agentRecords.listForSession("s1"))._unsafeUnwrap(),
    ).toEqual(records.agentRecords);
    expect((await upgraded.documents.listTombstones())._unsafeUnwrap()).toEqual(
      [],
    );
    (await upgraded.storyRecords.delete("actor/mara"))._unsafeUnwrap();
    upgraded.close();

    const reopened = await open(factory);
    expect((await reopened.storyRecords.list())._unsafeUnwrap()).toEqual([]);
    expect(
      (await reopened.storyRecords.listTombstones())._unsafeUnwrap(),
    ).toEqual([{ key: "actor/mara", deletedAt: expect.any(Number) }]);
    reopened.close();
  });

  test("opening a database from a newer schema fails as a Result", async () => {
    const factory = new IDBFactory();
    await new Promise<void>((resolve, reject) => {
      const request = factory.open("worldcrafter", DB_VERSION + 1);
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
    const result = await openIndexedDbStorage({
      name: "worldcrafter",
      factory,
    });
    expect(result._unsafeUnwrapErr()).toMatchObject({
      kind: "failure",
      operation: "open",
      id: "worldcrafter",
    });
  });
});
