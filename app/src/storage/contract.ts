/**
 * The behaviour every StorageAdapter must have. Each implementation's test
 * file calls `describeStorageContract` with a factory for a fresh, empty store.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { ResultAsync } from "neverthrow";
import type {
  Collection,
  JsonValue,
  Snapshot,
  StorageAdapter,
  StorageError,
  WorldRecords,
} from "./types";

/** A content tree with nested blocks, marks, links, an AI segment and block IDs. */
export const contentFixture: JsonValue = [
  {
    type: "h1",
    id: "b_title",
    children: [{ text: "The Salt Road" }],
  },
  {
    type: "p",
    id: "b_7f3a",
    children: [
      { text: "Mara crossed the " },
      { text: "Ashen Flats", bold: true },
      { text: " at dusk, " },
      { text: "half", italic: true, bold: true },
      { text: " expecting the " },
      {
        type: "a",
        id: "b_link1",
        url: "wc://entry/kestrel-guild",
        children: [{ text: "Kestrel Guild" }],
      },
      { text: " to be waiting." },
    ],
  },
  {
    type: "blockquote",
    id: "b_q1",
    children: [
      {
        type: "p",
        id: "b_q1p",
        children: [{ text: "No one trades salt for water.", code: true }],
      },
    ],
  },
  {
    type: "ul",
    id: "b_list",
    children: [
      {
        type: "li",
        id: "b_li1",
        children: [
          { type: "lic", id: "b_li1c", children: [{ text: "First rule" }] },
          {
            type: "ul",
            id: "b_list_nested",
            children: [
              {
                type: "li",
                id: "b_li2",
                children: [
                  {
                    type: "lic",
                    id: "b_li2c",
                    children: [{ text: "Nested, struck", strikethrough: true }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "ai_segment",
    id: "seg_01",
    status: "pending",
    children: [
      {
        type: "p",
        id: "b_gen1",
        children: [{ text: "The wind carried voices — “unicode” too. ✦" }],
      },
    ],
  },
  { type: "hr", id: "b_hr", children: [{ text: "" }] },
  {
    type: "p",
    id: "b_numbers",
    meta: { depth: 0, weight: -1.5, flags: [true, false, null] },
    children: [{ text: "" }],
  },
];

/** A world with no records. */
export const emptyWorld: WorldRecords = {
  documents: [],
  worldEntries: [],
  annotations: [],
  requests: [],
  snapshots: [],
  outlines: [],
  timelines: [],
  storyRecords: [],
  agentRecords: [],
  talkRecords: [],
};

async function value<T>(result: ResultAsync<T, StorageError>): Promise<T> {
  return (await result)._unsafeUnwrap();
}

async function error<T>(
  result: ResultAsync<T, StorageError>,
): Promise<StorageError> {
  return (await result)._unsafeUnwrapErr();
}

export function describeStorageContract(
  implementation: string,
  open: () => Promise<StorageAdapter>,
): void {
  describe(`${implementation} storage contract`, () => {
    let storage: StorageAdapter;
    beforeEach(async () => {
      storage = await open();
    });
    afterEach(() => {
      storage.close();
    });

    function describeCollection<T>(
      name: string,
      collection: () => Collection<T>,
      make: (key: string, version: number) => T,
    ): void {
      describe(name, () => {
        test("saves and loads a record", async () => {
          await value(collection().save(make("k1", 1)));
          expect<unknown>(await value(collection().load("k1"))).toEqual(
            make("k1", 1),
          );
        });

        test("save replaces the record with the same key", async () => {
          await value(collection().save(make("k1", 1)));
          await value(collection().save(make("k1", 2)));
          expect<unknown>(await value(collection().load("k1"))).toEqual(
            make("k1", 2),
          );
          expect(await value(collection().list())).toHaveLength(1);
        });

        test("lists every record in ascending key order", async () => {
          for (const key of ["k2", "k3", "k1"]) {
            await value(collection().save(make(key, 1)));
          }
          expect(await value(collection().list())).toEqual([
            make("k1", 1),
            make("k2", 1),
            make("k3", 1),
          ]);
        });

        test("deletes a record", async () => {
          await value(collection().save(make("k1", 1)));
          await value(collection().save(make("k2", 1)));
          await value(collection().delete("k1"));
          expect(await value(collection().list())).toEqual([make("k2", 1)]);
          expect(await error(collection().load("k1"))).toEqual({
            kind: "not_found",
            collection: expect.any(String),
            id: "k1",
          });
        });

        test("deleting a missing record succeeds", async () => {
          await value(collection().delete("missing"));
        });

        test("delete leaves a tombstone with when it ran", async () => {
          await value(collection().save(make("k1", 1)));
          const before = Date.now();
          await value(collection().delete("k1"));
          const after = Date.now();
          const [tombstone, ...rest] = await value(
            collection().listTombstones(),
          );
          expect(rest).toEqual([]);
          expect(tombstone?.key).toBe("k1");
          expect(tombstone?.deletedAt).toBeGreaterThanOrEqual(before);
          expect(tombstone?.deletedAt).toBeLessThanOrEqual(after);
          expect(await value(collection().list())).toEqual([]);
          expect(await error(collection().load("k1"))).toMatchObject({
            kind: "not_found",
            id: "k1",
          });
        });

        test("deleting a missing record leaves a tombstone too", async () => {
          await value(collection().delete("missing"));
          expect(
            (await value(collection().listTombstones())).map((t) => t.key),
          ).toEqual(["missing"]);
        });

        test("lists tombstones in ascending key order, live keys left out", async () => {
          for (const key of ["k1", "k2", "k3", "k4"]) {
            await value(collection().save(make(key, 1)));
          }
          for (const key of ["k3", "k1", "k4"]) {
            await value(collection().delete(key));
          }
          expect(
            (await value(collection().listTombstones())).map((t) => t.key),
          ).toEqual(["k1", "k3", "k4"]);
          expect(await value(collection().list())).toEqual([make("k2", 1)]);
        });

        test("save after a delete brings the record back", async () => {
          await value(collection().save(make("k1", 1)));
          await value(collection().delete("k1"));
          await value(collection().save(make("k1", 2)));
          expect<unknown>(await value(collection().load("k1"))).toEqual(
            make("k1", 2),
          );
          expect(await value(collection().list())).toEqual([make("k1", 2)]);
          expect(await value(collection().listTombstones())).toEqual([]);
        });

        test("loading a missing record is a not_found error", async () => {
          expect(await error(collection().load("missing"))).toMatchObject({
            kind: "not_found",
            id: "missing",
          });
        });
      });
    }

    describeCollection(
      "documents",
      () => storage.documents,
      (id, version) => ({
        id,
        title: `Chapter ${version}`,
        content: contentFixture,
        updatedAt: version,
      }),
    );
    describeCollection(
      "worldEntries",
      () => storage.worldEntries,
      (documentId, version) => ({
        documentId,
        facts: { kind: "character", aliases: ["Mara", "the Salter"], version },
        updatedAt: version,
      }),
    );
    describeCollection(
      "annotations",
      () => storage.annotations,
      (id, version) => ({
        id,
        documentId: "doc1",
        kind: "ai_provenance",
        data: { model: "local", messages: [{ role: "user", text: "go" }] },
        updatedAt: version,
      }),
    );
    describeCollection(
      "requests",
      () => storage.requests,
      (id, version) => ({
        id,
        documentId: version % 2 === 0 ? null : "doc1",
        request: { prompt: "Continue the scene.", temperature: 0.7 },
        createdAt: version,
      }),
    );

    describeCollection(
      "outlines",
      () => storage.outlines,
      (id, version) => ({
        id,
        books: [
          {
            id: "book1",
            title: `Book ${version}`,
            chapters: [
              { id: "ch1", title: "Arrival", scenes: ["doc1", "doc2"] },
              { id: "ch2", title: "Empty", scenes: [] },
            ],
          },
        ],
        updatedAt: version,
      }),
    );

    describeCollection(
      "timelines",
      () => storage.timelines,
      (id, version) => ({
        id,
        timeline: {
          version,
          events: [{ id: "e1", label: "The coronation" }],
          positions: [],
        },
        updatedAt: version,
      }),
    );

    describeCollection(
      "storyRecords",
      () => storage.storyRecords,
      (id, version) => ({
        id,
        kind: "drive",
        data: {
          id,
          actorId: null,
          want: `Version ${version}`,
          origins: ["e1"],
          turns: [{ how: "flipped", into: "d2", note: "" }],
        },
        updatedAt: version,
      }),
    );

    test("a document's content tree round-trips losslessly", async () => {
      const document = {
        id: "doc1",
        title: "The Salt Road",
        content: structuredClone(contentFixture),
        updatedAt: 1_760_000_000_000,
      };
      await value(storage.documents.save(document));
      const loaded = await value(storage.documents.load("doc1"));
      expect(loaded).toEqual(document);
      expect(loaded.content).toStrictEqual(contentFixture);
    });

    describeCollection(
      "agentRecords",
      () => storage.agentRecords,
      (id, version) => ({
        id,
        sessionId: "s1",
        kind: "step",
        data: { request: { messages: [] }, version },
        updatedAt: version,
      }),
    );

    test("agent records can be listed for one session", async () => {
      const record = (id: string, sessionId: string) => ({
        id: `${sessionId}/${id}`,
        sessionId,
        kind: "step",
        data: { id },
        updatedAt: 1,
      });
      await value(storage.agentRecords.save(record("step/2", "s1")));
      await value(storage.agentRecords.save(record("session", "s2")));
      await value(storage.agentRecords.save(record("session", "s1")));
      await value(storage.agentRecords.save(record("step/1", "s1")));
      expect(await value(storage.agentRecords.listForSession("s1"))).toEqual([
        record("session", "s1"),
        record("step/1", "s1"),
        record("step/2", "s1"),
      ]);
      expect(await value(storage.agentRecords.listForSession("none"))).toEqual(
        [],
      );
      await value(storage.agentRecords.delete("s1/step/1"));
      expect(await value(storage.agentRecords.listForSession("s1"))).toEqual([
        record("session", "s1"),
        record("step/2", "s1"),
      ]);
    });

    describeCollection(
      "talkRecords",
      () => storage.talkRecords,
      (id, version) => ({
        id,
        topicId: "t1",
        kind: "message",
        data: { body: "Is the ferry late?", version },
        updatedAt: version,
      }),
    );

    test("talk records can be listed for one topic and by kind", async () => {
      const record = (id: string, topicId: string, kind: string) => ({
        id: `${topicId}/${id}`,
        topicId,
        kind,
        data: { id },
        updatedAt: 1,
      });
      const t1 = record("topic", "t1", "topic");
      const t2 = record("topic", "t2", "topic");
      const m1 = record("message/000001", "t1", "message");
      const m2 = record("message/000002", "t1", "message");
      for (const r of [m2, t2, t1, m1]) {
        await value(storage.talkRecords.save(r));
      }
      expect(await value(storage.talkRecords.listForTopic("t1"))).toEqual([
        m1,
        m2,
        t1,
      ]);
      expect(await value(storage.talkRecords.listOfKind("topic"))).toEqual([
        t1,
        t2,
      ]);
      expect(await value(storage.talkRecords.listForTopic("none"))).toEqual(
        [],
      );
      await value(storage.talkRecords.delete("t1/message/000001"));
      expect(await value(storage.talkRecords.listOfKind("message"))).toEqual([
        m2,
      ]);
    });

    test("stored records are not shared with the caller", async () => {
      const content = structuredClone(contentFixture);
      await value(
        storage.documents.save({
          id: "doc1",
          title: "t",
          content,
          updatedAt: 1,
        }),
      );
      if (Array.isArray(content)) content.pop();
      const loaded = await value(storage.documents.load("doc1"));
      expect(loaded.content).toEqual(contentFixture);
      if (Array.isArray(loaded.content)) loaded.content.pop();
      expect((await value(storage.documents.load("doc1"))).content).toEqual(
        contentFixture,
      );
    });

    test("annotations can be listed for one document", async () => {
      const annotation = (id: string, documentId: string) => ({
        id,
        documentId,
        kind: "entity_candidate",
        data: { name: id },
        updatedAt: 1,
      });
      await value(storage.annotations.save(annotation("seg_b", "doc1")));
      await value(storage.annotations.save(annotation("b_other", "doc2")));
      await value(storage.annotations.save(annotation("b_a", "doc1")));
      expect(await value(storage.annotations.listForDocument("doc1"))).toEqual([
        annotation("b_a", "doc1"),
        annotation("seg_b", "doc1"),
      ]);
      expect(await value(storage.annotations.listForDocument("none"))).toEqual(
        [],
      );
      await value(storage.annotations.delete("seg_b"));
      expect(await value(storage.annotations.listForDocument("doc1"))).toEqual([
        annotation("b_a", "doc1"),
      ]);
    });

    test("a collection's tombstones are its own", async () => {
      await value(storage.documents.delete("shared-key"));
      expect(await value(storage.annotations.listTombstones())).toEqual([]);
      expect(await value(storage.storyRecords.listTombstones())).toEqual([]);
      expect(
        (await value(storage.documents.listTombstones())).map((t) => t.key),
      ).toEqual(["shared-key"]);
    });

    describe("snapshots", () => {
      test("are listed per document, oldest first", async () => {
        const saved = [];
        for (const [documentId, reason] of [
          ["doc1", "periodic"],
          ["doc2", "periodic"],
          ["doc1", "accepted_ai_change"],
          ["doc1", "periodic"],
        ] as const) {
          saved.push(
            await value(
              storage.snapshots.save({ documentId, reason, content: [] }),
            ),
          );
        }
        const listed = await value(storage.snapshots.list("doc1"));
        expect(listed.map((info) => info.reason)).toEqual([
          "periodic",
          "accepted_ai_change",
          "periodic",
        ]);
        expect(listed).toEqual(
          saved.filter((info) => info.documentId === "doc1"),
        );
        const ids = listed.map((info) => info.id);
        expect(ids).toEqual([...ids].sort((a, b) => a - b));
        expect(new Set(ids).size).toBe(3);
        expect(listed.every((info) => !("content" in info))).toBe(true);
        expect(await value(storage.snapshots.list("none"))).toEqual([]);
      });

      test("load returns the saved content losslessly", async () => {
        const info = await value(
          storage.snapshots.save({
            documentId: "doc1",
            reason: "accepted_ai_change",
            content: contentFixture,
          }),
        );
        expect(await value(storage.snapshots.load(info.id))).toEqual({
          ...info,
          content: contentFixture,
        });
      });

      test("loading a missing snapshot is a not_found error", async () => {
        expect(await error(storage.snapshots.load(999))).toEqual({
          kind: "not_found",
          collection: "snapshots",
          id: "999",
        });
      });
    });

    describe("batch", () => {
      const document = (title: string) => ({
        id: "doc1",
        title,
        content: contentFixture,
        updatedAt: 2,
      });
      const annotation = {
        id: "seg_01",
        documentId: "doc1",
        kind: "ai_provenance",
        data: { model: "local" },
        updatedAt: 2,
      };

      test("writes a document, an annotation and a snapshot together", async () => {
        const infos = await value(
          storage.batch([
            { kind: "saveDocument", record: document("After") },
            { kind: "saveAnnotation", record: annotation },
            {
              kind: "saveSnapshot",
              snapshot: {
                documentId: "doc1",
                reason: "accepted_ai_change",
                content: contentFixture,
              },
            },
          ]),
        );
        expect(await value(storage.documents.load("doc1"))).toEqual(
          document("After"),
        );
        expect(await value(storage.annotations.load("seg_01"))).toEqual(
          annotation,
        );
        expect(infos).toHaveLength(1);
        expect(await value(storage.snapshots.list("doc1"))).toEqual(infos);
        const [info] = infos;
        if (info === undefined) throw new Error("expected a snapshot");
        expect(info.reason).toBe("accepted_ai_change");
        expect(await value(storage.snapshots.load(info.id))).toEqual({
          ...info,
          content: contentFixture,
        });
      });

      // A function can't be stored, so each of these fails part-way: after
      // the document is written, at the annotation or at the snapshot.
      const unstorable = [() => undefined] as unknown as JsonValue;
      test.each([
        ["an annotation", { ...annotation, data: unstorable }, contentFixture],
        ["a snapshot", annotation, unstorable],
      ])("writes nothing when %s fails", async (_, record, content) => {
        await value(storage.documents.save(document("Before")));
        const failure = await error(
          storage.batch([
            { kind: "saveDocument", record: document("After") },
            { kind: "saveAnnotation", record },
            {
              kind: "saveSnapshot",
              snapshot: {
                documentId: "doc1",
                reason: "accepted_ai_change",
                content,
              },
            },
          ]),
        );
        expect(failure).toMatchObject({
          kind: "failure",
          operation: "save",
          collection: "documents",
          id: "doc1",
        });
        expect(await value(storage.documents.load("doc1"))).toEqual(
          document("Before"),
        );
        expect(await error(storage.annotations.load("seg_01"))).toMatchObject({
          kind: "not_found",
        });
        expect(await value(storage.snapshots.list("doc1"))).toEqual([]);
      });

      const storyRecord = (id: string, want: JsonValue) => ({
        id,
        kind: "drive",
        data: { id, want },
        updatedAt: 3,
      });

      test("saves and deletes story records together", async () => {
        await value(storage.storyRecords.save(storyRecord("drive/a", "old")));
        await value(storage.storyRecords.save(storyRecord("drive/b", "gone")));
        expect(
          await value(
            storage.batch([
              {
                kind: "saveStoryRecord",
                record: storyRecord("drive/a", "new"),
              },
              { kind: "deleteStoryRecord", id: "drive/b" },
              { kind: "saveStoryRecord", record: storyRecord("drive/c", "c") },
              { kind: "deleteStoryRecord", id: "drive/missing" },
            ]),
          ),
        ).toEqual([]);
        expect(await value(storage.storyRecords.list())).toEqual([
          storyRecord("drive/a", "new"),
          storyRecord("drive/c", "c"),
        ]);
      });

      test("deletes no story record when a later write fails", async () => {
        await value(storage.storyRecords.save(storyRecord("drive/a", "kept")));
        const failure = await error(
          storage.batch([
            { kind: "deleteStoryRecord", id: "drive/a" },
            {
              kind: "saveStoryRecord",
              record: storyRecord("drive/b", unstorable),
            },
          ]),
        );
        expect(failure).toMatchObject({
          kind: "failure",
          operation: "delete",
          collection: "storyRecords",
          id: "drive/a",
        });
        expect(await value(storage.storyRecords.list())).toEqual([
          storyRecord("drive/a", "kept"),
        ]);
        expect(await value(storage.storyRecords.listTombstones())).toEqual([]);
      });

      test("saves agent records together, or none of them", async () => {
        const agentRecord = (id: string, data: JsonValue) => ({
          id: `s1/${id}`,
          sessionId: "s1",
          kind: id,
          data,
          updatedAt: 4,
        });
        await value(
          storage.batch([
            {
              kind: "saveAgentRecord",
              record: agentRecord("session", { steps: 1 }),
            },
            { kind: "saveAgentRecord", record: agentRecord("step", { n: 1 }) },
          ]),
        );
        const failure = await error(
          storage.batch([
            {
              kind: "saveAgentRecord",
              record: agentRecord("session", { steps: 2 }),
            },
            {
              kind: "saveAgentRecord",
              record: agentRecord("step", unstorable),
            },
          ]),
        );
        expect(failure).toMatchObject({
          kind: "failure",
          operation: "save",
          collection: "agentRecords",
          id: "s1/session",
        });
        expect(await value(storage.agentRecords.listForSession("s1"))).toEqual([
          agentRecord("session", { steps: 1 }),
          agentRecord("step", { n: 1 }),
        ]);
      });

      test("saves talk records together, or none of them", async () => {
        const talkRecord = (id: string, kind: string, data: JsonValue) => ({
          id: `t1/${id}`,
          topicId: "t1",
          kind,
          data,
          updatedAt: 4,
        });
        const topic = talkRecord("topic", "topic", { title: "Ferry" });
        const first = talkRecord("message/000001", "message", { body: "a" });
        await value(
          storage.batch([
            { kind: "saveTalkRecord", record: topic },
            { kind: "saveTalkRecord", record: first },
          ]),
        );
        const failure = await error(
          storage.batch([
            {
              kind: "saveTalkRecord",
              record: talkRecord("topic", "topic", { title: "Changed" }),
            },
            {
              kind: "saveTalkRecord",
              record: talkRecord("message/000002", "message", unstorable),
            },
          ]),
        );
        expect(failure).toMatchObject({
          kind: "failure",
          operation: "save",
          collection: "talkRecords",
          id: "t1/topic",
        });
        expect(await value(storage.talkRecords.listForTopic("t1"))).toEqual([
          first,
          topic,
        ]);
      });

      test("saving a document and annotation after their delete brings them back", async () => {
        await value(storage.documents.save(document("Before")));
        await value(storage.annotations.save(annotation));
        await value(storage.documents.delete("doc1"));
        await value(storage.annotations.delete("seg_01"));
        expect(
          await value(storage.annotations.listForDocument("doc1")),
        ).toEqual([]);
        await value(
          storage.batch([
            { kind: "saveDocument", record: document("After") },
            { kind: "saveAnnotation", record: annotation },
          ]),
        );
        expect(await value(storage.documents.load("doc1"))).toEqual(
          document("After"),
        );
        expect(
          await value(storage.annotations.listForDocument("doc1")),
        ).toEqual([annotation]);
        expect(await value(storage.documents.listTombstones())).toEqual([]);
        expect(await value(storage.annotations.listTombstones())).toEqual([]);
      });

      test("deleting a story record leaves a tombstone; saving it again removes it", async () => {
        await value(storage.storyRecords.save(storyRecord("drive/a", "a")));
        const before = Date.now();
        await value(
          storage.batch([{ kind: "deleteStoryRecord", id: "drive/a" }]),
        );
        const [tombstone] = await value(storage.storyRecords.listTombstones());
        expect(tombstone?.key).toBe("drive/a");
        expect(tombstone?.deletedAt).toBeGreaterThanOrEqual(before);
        await value(
          storage.batch([
            { kind: "saveStoryRecord", record: storyRecord("drive/a", "back") },
          ]),
        );
        expect(await value(storage.storyRecords.list())).toEqual([
          storyRecord("drive/a", "back"),
        ]);
        expect(await value(storage.storyRecords.listTombstones())).toEqual([]);
      });

      test("an empty batch succeeds", async () => {
        expect(await value(storage.batch([]))).toEqual([]);
      });
    });

    describe("dump and restore", () => {
      const documentB = { id: "doc-b", title: "B", content: [], updatedAt: 2 };
      const world: WorldRecords = {
        documents: [
          { id: "doc-a", title: "A", content: contentFixture, updatedAt: 1 },
          documentB,
        ],
        worldEntries: [
          { documentId: "doc-a", facts: { aliases: ["Mara"] }, updatedAt: 3 },
        ],
        annotations: [
          {
            id: "seg_01",
            documentId: "doc-a",
            kind: "ai_provenance",
            data: { model: "local" },
            updatedAt: 4,
          },
        ],
        requests: [
          {
            id: "req-1",
            documentId: null,
            request: { messages: [] },
            createdAt: 5,
          },
        ],
        // IDs with a gap, and one for a document that no longer exists.
        snapshots: [
          {
            id: 3,
            documentId: "doc-a",
            reason: "periodic",
            createdAt: 6,
            content: contentFixture,
          },
          {
            id: 7,
            documentId: "doc-gone",
            reason: "repaired_on_load",
            createdAt: 7,
            content: { not: "a content tree" },
          },
        ],
        outlines: [
          {
            id: "outline",
            books: [
              {
                id: "book-1",
                title: "One",
                chapters: [{ id: "ch-1", title: "I", scenes: ["doc-a"] }],
              },
            ],
            updatedAt: 8,
          },
        ],
        timelines: [{ id: "timeline", timeline: { events: [] }, updatedAt: 9 }],
        storyRecords: [
          {
            id: "actor/mara",
            kind: "actor",
            data: { id: "mara" },
            updatedAt: 1,
          },
          { id: "story", kind: "story", data: { premise: "p" }, updatedAt: 1 },
        ],
        agentRecords: [
          {
            id: "s1/session",
            sessionId: "s1",
            kind: "session",
            data: { role: "plan" },
            updatedAt: 10,
          },
        ],
        talkRecords: [
          {
            id: "t1/topic",
            topicId: "t1",
            kind: "topic",
            data: { title: "Ferry" },
            updatedAt: 11,
          },
        ],
      };

      test("an empty store dumps empty collections", async () => {
        expect(await value(storage.dump())).toEqual(emptyWorld);
      });

      test("dump returns every record a restore wrote, unchanged", async () => {
        await value(storage.restore(world));
        expect(await value(storage.dump())).toEqual(world);
        expect(await value(storage.snapshots.load(7))).toEqual(
          world.snapshots[1] as Snapshot,
        );
        expect(await value(storage.snapshots.list("doc-a"))).toEqual([
          { id: 3, documentId: "doc-a", reason: "periodic", createdAt: 6 },
        ]);
      });

      test("dump lists what the collections saved", async () => {
        await value(storage.documents.save(documentB));
        const info = await value(
          storage.snapshots.save({
            documentId: "doc-b",
            reason: "periodic",
            content: [],
          }),
        );
        expect(await value(storage.dump())).toMatchObject({
          documents: [documentB],
          snapshots: [{ ...info, content: [] }],
        });
      });

      test("snapshots saved after a restore get higher IDs", async () => {
        await value(storage.restore(world));
        const info = await value(
          storage.snapshots.save({
            documentId: "doc-a",
            reason: "periodic",
            content: [],
          }),
        );
        expect(info.id).toBeGreaterThan(7);
      });

      test("a restore that fails part-way writes nothing", async () => {
        const unstorable = [() => undefined] as unknown as JsonValue;
        const failure = await error(
          storage.restore({
            ...world,
            storyRecords: [
              { id: "story", kind: "story", data: unstorable, updatedAt: 1 },
            ],
          }),
        );
        expect(failure).toMatchObject({
          kind: "failure",
          operation: "save",
          collection: "documents",
        });
        expect(await value(storage.documents.list())).toEqual([]);
        expect(await value(storage.snapshots.list("doc-a"))).toEqual([]);
      });

      test("a restore removes the tombstones of the keys it writes", async () => {
        await value(storage.documents.delete("doc-a"));
        await value(storage.documents.delete("doc-other"));
        await value(storage.storyRecords.delete("story"));
        await value(storage.restore(world));
        expect(await value(storage.dump())).toEqual(world);
        expect(
          (await value(storage.documents.listTombstones())).map((t) => t.key),
        ).toEqual(["doc-other"]);
        expect(await value(storage.storyRecords.listTombstones())).toEqual([]);
      });
    });

    test("operations on a closed store fail as Results, not throws", async () => {
      storage.close();
      const document = { id: "d", title: "t", content: [], updatedAt: 1 };
      const failures = [
        await error(storage.documents.save(document)),
        await error(storage.documents.load("d")),
        await error(storage.worldEntries.list()),
        await error(storage.annotations.listForDocument("d")),
        await error(storage.agentRecords.listForSession("s")),
        await error(storage.talkRecords.listForTopic("t")),
        await error(storage.talkRecords.listOfKind("topic")),
        await error(storage.requests.delete("d")),
        await error(storage.timelines.listTombstones()),
        await error(storage.dump()),
        await error(storage.restore({ ...emptyWorld, documents: [document] })),
        await error(
          storage.batch([{ kind: "saveDocument", record: document }]),
        ),
        await error(
          storage.snapshots.save({
            documentId: "d",
            reason: "periodic",
            content: [],
          }),
        ),
      ];
      for (const failure of failures) {
        expect(failure).toMatchObject({ kind: "failure" });
        expect(failure.kind === "failure" && failure.message).toContain(
          "failed",
        );
      }
      expect(failures[0]).toMatchObject({
        operation: "save",
        collection: "documents",
        id: "d",
      });
    });
  });
}
