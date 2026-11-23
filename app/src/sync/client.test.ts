/**
 * Two devices sync one world through the real Worker handler and ledger,
 * run in-process (`src/worker/testing.ts`), over the fetch transport.
 */

import { describe, expect, test } from "bun:test";
import { IDBFactory } from "fake-indexeddb";
import { okAsync, type Result, ResultAsync } from "neverthrow";
import { openIndexedDbStorage } from "~/storage/indexeddb";
import { createMemoryStorage } from "~/storage/memory";
import type {
  StorageAdapter,
  StoredDocument,
  StoredStoryRecord,
} from "~/storage/types";
import { inProcessWorker } from "~/worker/testing";
import { type SyncTransport, syncWorld } from "./client";
import type { PushResult } from "./protocol";
import { memorySyncState } from "./state";
import { createFetchTransport } from "./transport";

type Worker = ReturnType<typeof inProcessWorker>;

interface Device {
  readonly storage: StorageAdapter;
  /** Results of every push this device made, in order. */
  readonly pushResults: PushResult[];
  /** Runs before this device's next push, once (another device racing it). */
  beforeNextPush: (() => Promise<unknown>) | null;
  sync(): ReturnType<typeof syncWorld>;
}

type MakeStorage = () => Promise<StorageAdapter>;

const ADAPTERS: [string, MakeStorage][] = [
  ["memory", async () => createMemoryStorage()],
  [
    "IndexedDB",
    async () =>
      (
        await openIndexedDbStorage({ name: "world", factory: new IDBFactory() })
      )._unsafeUnwrap(),
  ],
];

async function device(
  worker: Worker,
  deviceId: string,
  makeStorage: MakeStorage,
): Promise<Device> {
  const storage = await makeStorage();
  const state = memorySyncState();
  const inner = createFetchTransport({ worldId: "w", fetch: worker.fetch });
  const self: Device = {
    storage,
    pushResults: [],
    beforeNextPush: null,
    sync: () => syncWorld({ storage, transport, state, deviceId }),
  };
  const transport: SyncTransport = {
    pull: inner.pull,
    push: (request) => {
      const race = self.beforeNextPush;
      self.beforeNextPush = null;
      return (race ? ResultAsync.fromSafePromise(race()) : okAsync(undefined))
        .andThen(() => inner.push(request))
        .map((response) => {
          self.pushResults.push(...response.results);
          return response;
        });
    },
  };
  return self;
}

async function devices(makeStorage: MakeStorage) {
  const worker = inProcessWorker();
  return {
    worker,
    laptop: await device(worker, "laptop", makeStorage),
    phone: await device(worker, "phone", makeStorage),
  };
}

const paragraph = (id: string, text: string) => ({
  type: "p",
  id,
  children: [{ text }],
});

const scene = (text: string, updatedAt = 1): StoredDocument => ({
  id: "scene-1",
  title: "The ferry",
  content: [paragraph("b1", text)],
  updatedAt,
});

const actor = (name: string, updatedAt = 1): StoredStoryRecord => ({
  id: "actor/mara",
  kind: "actor",
  data: { name },
  updatedAt,
});

async function ok<T, E>(result: PromiseLike<Result<T, E>>): Promise<T> {
  return (await result)._unsafeUnwrap({ withStackTrace: true });
}

const load = async (storage: StorageAdapter) => ({
  scene: (await storage.documents.load("scene-1")).unwrapOr(null),
  actor: (await storage.storyRecords.load("actor/mara")).unwrapOr(null),
});

async function syncedRecords(storage: StorageAdapter) {
  const { snapshots: _, ...rest } = await ok(storage.dump());
  return rest;
}

async function snapshotsOf(storage: StorageAdapter, documentId: string) {
  const infos = await ok(storage.snapshots.list(documentId));
  return Promise.all(
    infos.map(async (info) => {
      const snap = await ok(storage.snapshots.load(info.id));
      return { reason: snap.reason, content: snap.content };
    }),
  );
}

/** Both devices hold the scene and the actor, synced. */
async function startedTogether(makeStorage: MakeStorage) {
  const setup = await devices(makeStorage);
  const { laptop, phone } = setup;
  await ok(laptop.storage.documents.save(scene("The ferry left at dawn.")));
  await ok(laptop.storage.storyRecords.save(actor("Mara")));
  await ok(laptop.sync());
  await ok(phone.sync());
  expect(await load(phone.storage)).toEqual(await load(laptop.storage));
  return setup;
}

describe.each(ADAPTERS)("sync with %s storage", (_, makeStorage) => {
  test("a record saved on one device reaches the other, and deletes follow", async () => {
    const { laptop, phone } = await startedTogether(makeStorage);
    await ok(laptop.storage.storyRecords.delete("actor/mara"));
    await ok(laptop.sync());
    const report = await ok(phone.sync());
    expect(report).toMatchObject({ pulled: 1, pushed: 0, conflicts: [] });
    expect((await load(phone.storage)).actor).toBeNull();
    expect(await ok(phone.storage.storyRecords.listTombstones())).toHaveLength(
      1,
    );
    // Nothing left to send either way.
    expect(await ok(laptop.sync())).toMatchObject({ pulled: 0, pushed: 0 });
    expect(await ok(phone.sync())).toMatchObject({ pulled: 0, pushed: 0 });
  });

  test("(a) the same record edited on two devices: the first to sync wins, the other's prose is kept as a snapshot", async () => {
    const { laptop, phone } = await startedTogether(makeStorage);
    await ok(
      laptop.storage.documents.save(
        scene("Laptop: the ferry left at noon.", 2),
      ),
    );
    await ok(laptop.storage.storyRecords.save(actor("Mara Venn", 2)));
    await ok(
      phone.storage.documents.save(scene("Phone: the ferry never left.", 2)),
    );
    await ok(phone.storage.storyRecords.save(actor("Mara of the Docks", 2)));

    await ok(laptop.sync());
    const report = await ok(phone.sync());

    expect(report.conflicts.map((c) => [c.collection, c.deleted])).toEqual([
      ["documents", false],
      ["storyRecords", false],
    ]);
    expect(report.conflicts[0]?.snapshotId).toBeNumber();
    expect(await load(phone.storage)).toEqual(await load(laptop.storage));
    expect((await load(phone.storage)).scene?.content).toEqual([
      paragraph("b1", "Laptop: the ferry left at noon."),
    ]);
    expect(await snapshotsOf(phone.storage, "scene-1")).toEqual([
      {
        reason: "sync_conflict",
        content: [paragraph("b1", "Phone: the ferry never left.")],
      },
    ]);
    expect(await ok(laptop.sync())).toMatchObject({ pulled: 0, pushed: 0 });
  });

  test("(b) a stale offline phone's push is refused; the laptop's passage survives and the phone's edit is kept as a snapshot", async () => {
    const { laptop, phone } = await startedTogether(makeStorage);
    // The phone, offline, makes a small edit.
    await ok(phone.storage.documents.save(scene("The ferry left at dawn!", 3)));
    // The laptop writes a long passage and syncs while the phone reconnects:
    // it lands between the phone's pull and its push.
    const passage = Array.from(
      { length: 40 },
      (_, i) => `Sentence ${i} of the long passage.`,
    ).join(" ");
    await ok(laptop.storage.documents.save(scene(passage, 2)));
    phone.beforeNextPush = async () => ok(laptop.sync());

    const report = await ok(phone.sync());

    expect(phone.pushResults.map((r) => r.status)).toEqual(["conflict"]);
    expect(report).toMatchObject({ pushed: 0 });
    expect(report.conflicts).toHaveLength(1);
    expect((await load(phone.storage)).scene?.content).toEqual([
      paragraph("b1", passage),
    ]);
    expect(await snapshotsOf(phone.storage, "scene-1")).toEqual([
      {
        reason: "sync_conflict",
        content: [paragraph("b1", "The ferry left at dawn!")],
      },
    ]);
    // The laptop's passage is what the server holds.
    await ok(laptop.sync());
    expect((await load(laptop.storage)).scene?.content).toEqual([
      paragraph("b1", passage),
    ]);
    expect(await snapshotsOf(laptop.storage, "scene-1")).toEqual([]);
  });

  test("(b) the same reconnect without a race: the phone's pull finds the newer passage first", async () => {
    const { laptop, phone } = await startedTogether(makeStorage);
    await ok(phone.storage.documents.save(scene("The ferry left at dawn!", 3)));
    await ok(laptop.storage.documents.save(scene("A long passage.", 2)));
    await ok(laptop.sync());
    const report = await ok(phone.sync());
    expect(phone.pushResults).toEqual([]);
    expect(report.conflicts).toHaveLength(1);
    expect((await load(phone.storage)).scene?.content).toEqual([
      paragraph("b1", "A long passage."),
    ]);
    expect(
      (await snapshotsOf(phone.storage, "scene-1")).map((s) => s.reason),
    ).toEqual(["sync_conflict"]);
  });

  test("(c) a stale edit does not bring back a record deleted on another device", async () => {
    const { laptop, phone } = await startedTogether(makeStorage);
    await ok(laptop.storage.documents.delete("scene-1"));
    await ok(laptop.storage.storyRecords.delete("actor/mara"));
    await ok(laptop.sync());
    await ok(phone.storage.documents.save(scene("An edit made offline.", 5)));
    await ok(phone.storage.storyRecords.save(actor("Mara, edited offline", 5)));

    const report = await ok(phone.sync());

    expect(report.conflicts.map((c) => [c.collection, c.deleted])).toEqual([
      ["documents", true],
      ["storyRecords", true],
    ]);
    expect(await load(phone.storage)).toEqual({ scene: null, actor: null });
    expect(await snapshotsOf(phone.storage, "scene-1")).toEqual([
      {
        reason: "sync_conflict",
        content: [paragraph("b1", "An edit made offline.")],
      },
    ]);
    await ok(laptop.sync());
    expect(await load(laptop.storage)).toEqual({ scene: null, actor: null });
  });

  test("(c) the same when the delete lands between the phone's pull and push", async () => {
    const { laptop, phone } = await startedTogether(makeStorage);
    await ok(phone.storage.storyRecords.save(actor("Mara, edited offline", 5)));
    await ok(laptop.storage.storyRecords.delete("actor/mara"));
    phone.beforeNextPush = async () => ok(laptop.sync());

    await ok(phone.sync());

    expect(phone.pushResults.map((r) => r.status)).toEqual(["conflict"]);
    expect((await load(phone.storage)).actor).toBeNull();
    await ok(laptop.sync());
    expect((await load(laptop.storage)).actor).toBeNull();
  });

  test("(d) a save after the delete has synced recreates the record everywhere", async () => {
    const { laptop, phone } = await startedTogether(makeStorage);
    await ok(laptop.storage.storyRecords.delete("actor/mara"));
    await ok(laptop.sync());
    await ok(phone.sync());
    expect((await load(phone.storage)).actor).toBeNull();

    await ok(phone.storage.storyRecords.save(actor("Mara, recreated", 6)));
    const report = await ok(phone.sync());

    expect(report).toMatchObject({ pushed: 1, conflicts: [] });
    expect(phone.pushResults.at(-1)?.status).toBe("accepted");
    await ok(laptop.sync());
    expect((await load(laptop.storage)).actor).toEqual(
      actor("Mara, recreated", 6),
    );
    expect(await ok(laptop.storage.storyRecords.listTombstones())).toEqual([]);
  });

  test("(e) a device that was offline for many changes catches up, and its own edits go out", async () => {
    const { laptop, phone } = await startedTogether(makeStorage);
    for (let i = 0; i < 260; i++) {
      await ok(
        laptop.storage.storyRecords.save({
          id: `event/${String(i).padStart(3, "0")}`,
          kind: "event",
          data: { n: i },
          updatedAt: 10,
        }),
      );
    }
    for (let i = 0; i < 20; i++) {
      await ok(
        laptop.storage.storyRecords.delete(
          `event/${String(i).padStart(3, "0")}`,
        ),
      );
    }
    await ok(
      laptop.storage.documents.save(scene("Revised on the laptop.", 10)),
    );
    await ok(laptop.sync());
    // Meanwhile the phone wrote something new of its own.
    await ok(
      phone.storage.annotations.save({
        id: "note-1",
        documentId: "scene-1",
        kind: "writer-note",
        data: { text: "check the tide tables" },
        updatedAt: 11,
      }),
    );

    const report = await ok(phone.sync());

    expect(report.conflicts).toEqual([]);
    expect(report.pushed).toBe(1);
    await ok(laptop.sync());
    expect(await syncedRecords(phone.storage)).toEqual(
      await syncedRecords(laptop.storage),
    );
    expect(await ok(phone.storage.storyRecords.list())).toHaveLength(241);
    expect(await ok(laptop.storage.annotations.list())).toHaveLength(1);
  });

  test("(f) a clock running ahead does not let a stale edit win", async () => {
    const { laptop, phone } = await startedTogether(makeStorage);
    const farFuture = Date.UTC(2099, 0, 1);
    await ok(laptop.storage.storyRecords.save(actor("Mara Venn", 2)));
    await ok(laptop.sync());
    await ok(
      phone.storage.storyRecords.save(
        actor("Mara, from a fast clock", farFuture),
      ),
    );

    const report = await ok(phone.sync());

    expect(report.conflicts).toHaveLength(1);
    expect((await load(phone.storage)).actor).toEqual(actor("Mara Venn", 2));
  });

  test("(f) a clock running behind does not stop a current edit from winning", async () => {
    const { laptop, phone } = await startedTogether(makeStorage);
    await ok(
      laptop.storage.storyRecords.save(
        actor("Mara Venn", Date.UTC(2030, 0, 1)),
      ),
    );
    await ok(laptop.sync());
    await ok(phone.sync());
    // The phone's clock is years behind, but its edit is made on the current revision.
    await ok(
      phone.storage.storyRecords.save(
        actor("Mara, from a slow clock", Date.UTC(2001, 0, 1)),
      ),
    );

    expect(await ok(phone.sync())).toMatchObject({ pushed: 1, conflicts: [] });
    await ok(laptop.sync());
    expect((await load(laptop.storage)).actor).toEqual(
      actor("Mara, from a slow clock", Date.UTC(2001, 0, 1)),
    );
  });

  test("a sync that wrote records but lost its state does not count them as conflicts", async () => {
    const worker = inProcessWorker();
    const laptop = await device(worker, "laptop", makeStorage);
    await ok(laptop.storage.documents.save(scene("Same on both.")));
    await ok(laptop.sync());
    // A second device that already holds the same content (for example
    // restored from a world file) and has no sync state.
    const phone = await device(worker, "phone", makeStorage);
    await ok(phone.storage.documents.save(scene("Same on both.")));
    const report = await ok(phone.sync());
    expect(report).toMatchObject({ pulled: 0, pushed: 0, conflicts: [] });
    expect(await snapshotsOf(phone.storage, "scene-1")).toEqual([]);
  });

  test("refuses a record from the server that isn't its collection's shape", async () => {
    const storage = await makeStorage();
    const transport: SyncTransport = {
      pull: () =>
        okAsync({
          changes: [
            {
              collection: "documents",
              key: "d1",
              serverRev: 1,
              syncedAt: 1,
              // No title.
              record: {
                id: "d1",
                content: [],
                updatedAt: 1,
              } as unknown as StoredDocument,
              deletedAt: null,
            },
          ],
          cursor: 1,
          more: false,
        }),
      push: () => okAsync({ results: [] }),
    };
    const result = await syncWorld({
      storage,
      transport,
      state: memorySyncState(),
      deviceId: "d",
    });
    expect(result.isErr() && result.error.kind).toBe("invalid_record");
    expect(await ok(storage.documents.list())).toEqual([]);
  });
});
