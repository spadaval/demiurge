import { errAsync, okAsync, ResultAsync } from "neverthrow";
import {
  batchContext,
  type FailureContext,
  failure,
  notFound,
  restoreContext,
} from "./internal";
import {
  type AnnotationCollection,
  type AnnotationRecord,
  COLLECTION_NAMES,
  type Collection,
  type CollectionName,
  type Snapshot,
  type SnapshotCollection,
  type SnapshotInfo,
  type StorageAdapter,
  type StorageError,
  type WorldRecords,
} from "./types";

/**
 * Bump when the stores or indexes change, and add a step to `upgrade` that
 * moves version N-1 data forward. Never edit an existing step.
 *
 * 1: documents, world entries, annotations, requests, snapshots, outlines,
 *    timelines. 2: story-bible records (`storyRecords`).
 */
export const DB_VERSION = 2;

const DOCUMENT_INDEX = "byDocument";

/**
 * Snapshot content lives apart from snapshot metadata so listing history
 * never reads every revision's full tree. Both are keyed by snapshot ID and
 * written in one transaction.
 */
const SNAPSHOT_CONTENT = "snapshotContent";

type StoreName = CollectionName | typeof SNAPSHOT_CONTENT;

interface SnapshotContentRecord {
  readonly id: number;
  readonly content: Snapshot["content"];
}

/**
 * Moves a database from `oldVersion` to `newVersion` by running each step in
 * between. `newVersion` is `DB_VERSION` except in tests that build a database
 * as an older release left it.
 */
export function upgrade(
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number = DB_VERSION,
): void {
  const step = (version: number) =>
    oldVersion < version && version <= newVersion;
  if (step(1)) {
    db.createObjectStore("documents", { keyPath: "id" });
    db.createObjectStore("worldEntries", { keyPath: "documentId" });
    db.createObjectStore("annotations", { keyPath: "id" }).createIndex(
      DOCUMENT_INDEX,
      "documentId",
    );
    db.createObjectStore("requests", { keyPath: "id" });
    db.createObjectStore("snapshots", {
      keyPath: "id",
      autoIncrement: true,
    }).createIndex(DOCUMENT_INDEX, "documentId");
    db.createObjectStore(SNAPSHOT_CONTENT, { keyPath: "id" });
    // Added to version 1 before any user data existed: no release has
    // opened a real database yet, so v1 is still open. After the first
    // release, schema changes bump DB_VERSION instead.
    db.createObjectStore("outlines", { keyPath: "id" });
    db.createObjectStore("timelines", { keyPath: "id" });
  }
  if (step(2)) {
    db.createObjectStore("storyRecords", { keyPath: "id" });
  }
}

export interface IndexedDbStorageOptions {
  readonly name: string;
  /** Defaults to the browser's `indexedDB`. Tests pass `fake-indexeddb`. */
  readonly factory?: IDBFactory;
}

/** Opens (creating or upgrading as needed) the database behind the adapter. */
export function openIndexedDbStorage(
  options: IndexedDbStorageOptions,
): ResultAsync<StorageAdapter, StorageError> {
  const context: FailureContext = { operation: "open", id: options.name };
  return ResultAsync.fromPromise(
    openDatabase(options.factory ?? globalThis.indexedDB, options.name),
    (cause) => failure(context, cause),
  ).map(createAdapter);
}

function openDatabase(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = factory.open(name, DB_VERSION);
    request.onupgradeneeded = (event) => {
      upgrade(request.result, event.oldVersion);
    };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) {
        // The caller already got an error; don't leak the connection.
        db.close();
        return;
      }
      // Another tab wants a newer schema. Step aside rather than block it;
      // operations here then fail with a StorageFailure instead of writing
      // to a schema they don't understand.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error("upgrade blocked: close other tabs using Demiurge"));
    };
  });
}

/**
 * Runs `issue` in one transaction over `stores` and, once the transaction
 * commits, resolves with the value its returned getter reads. Either every
 * write in the transaction takes effect or none does. `issue` may call
 * `abort(cause)` from a request callback to roll back with that cause; if
 * `issue` itself throws (e.g. a value that can't be cloned), the transaction
 * is aborted with what it threw, even if it already issued writes.
 *
 * Writes request strict durability, so the browser reports completion only
 * after flushing to disk: a resolved write survives a reload, a crash or a
 * power cut. Not guaranteed: data the browser evicts under storage pressure
 * (unless storage is persisted), the user clearing site data, or a browser
 * that ignores the durability hint.
 */
function transact<T>(
  db: IDBDatabase,
  stores: readonly StoreName[],
  mode: IDBTransactionMode,
  issue: (tx: IDBTransaction, abort: (cause: unknown) => void) => () => T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx =
      mode === "readwrite"
        ? db.transaction(stores, mode, { durability: "strict" })
        : db.transaction(stores, mode);
    let abortCause: unknown;
    let result: (() => T) | undefined;
    const abort = (cause: unknown) => {
      abortCause = cause;
      try {
        tx.abort();
      } catch {
        // Already finished or aborting: the abort handler reports it.
      }
    };
    tx.oncomplete = () => {
      if (result) resolve(result());
    };
    tx.onabort = () =>
      reject(abortCause ?? tx.error ?? new Error("transaction aborted"));
    try {
      result = issue(tx, abort);
    } catch (cause) {
      abort(cause);
    }
  });
}

function createAdapter(db: IDBDatabase): StorageAdapter {
  // Values read back are trusted to have the shape this module wrote; the
  // schema is versioned by DB_VERSION and moved forward only by `upgrade`.
  function runIn<T>(
    context: FailureContext,
    stores: readonly StoreName[],
    mode: IDBTransactionMode,
    issue: (tx: IDBTransaction, abort: (cause: unknown) => void) => () => T,
  ): ResultAsync<T, StorageError> {
    return ResultAsync.fromPromise(transact(db, stores, mode, issue), (cause) =>
      failure(context, cause),
    );
  }

  /** One request against the context's own collection. */
  function run<T>(
    context: FailureContext & { readonly collection: CollectionName },
    mode: IDBTransactionMode,
    issue: (store: IDBObjectStore) => IDBRequest,
  ): ResultAsync<T, StorageError> {
    return runIn(context, [context.collection], mode, (tx) => {
      const request = issue(tx.objectStore(context.collection));
      return () => request.result as T;
    });
  }

  function load<T>(
    collection: CollectionName,
    key: IDBValidKey,
  ): ResultAsync<T, StorageError> {
    const id = String(key);
    return run<T | undefined>(
      { operation: "load", collection, id },
      "readonly",
      (store) => store.get(key),
    ).andThen((record) =>
      record === undefined
        ? errAsync(notFound(collection, id))
        : okAsync(record),
    );
  }

  function keyed<T>(
    collection: CollectionName,
    keyOf: (record: T) => string,
  ): Collection<T> {
    return {
      save: (record) =>
        run<IDBValidKey>(
          { operation: "save", collection, id: keyOf(record) },
          "readwrite",
          (store) => store.put(record),
        ).map(() => undefined),
      load: (key) => load<T>(collection, key),
      list: () =>
        run<T[]>({ operation: "list", collection }, "readonly", (store) =>
          store.getAll(),
        ),
      delete: (key) =>
        run<undefined>(
          { operation: "delete", collection, id: key },
          "readwrite",
          (store) => store.delete(key),
        ),
    };
  }

  const annotationStore = keyed<AnnotationRecord>(
    "annotations",
    (record) => record.id,
  );
  const annotations: AnnotationCollection = {
    ...annotationStore,
    listForDocument: (documentId) =>
      run<AnnotationRecord[]>(
        { operation: "list", collection: "annotations", id: documentId },
        "readonly",
        (store) => store.index(DOCUMENT_INDEX).getAll(documentId),
      ),
  };

  const snapshots: SnapshotCollection = {
    save: (input) => {
      const info: Omit<SnapshotInfo, "id"> = {
        documentId: input.documentId,
        reason: input.reason,
        createdAt: Date.now(),
      };
      return runIn(
        { operation: "save", collection: "snapshots", id: input.documentId },
        ["snapshots", SNAPSHOT_CONTENT],
        "readwrite",
        (tx, abort) => {
          const add = tx.objectStore("snapshots").add(info);
          add.onsuccess = () => {
            const record: SnapshotContentRecord = {
              id: Number(add.result),
              content: input.content,
            };
            try {
              tx.objectStore(SNAPSHOT_CONTENT).put(record);
            } catch (cause) {
              // E.g. uncloneable content: don't keep metadata without content.
              abort(cause);
            }
          };
          return () => add.result;
        },
      ).andThen((id) =>
        typeof id === "number"
          ? okAsync({ ...info, id })
          : errAsync(
              failure(
                { operation: "save", collection: "snapshots" },
                new Error(`expected a numeric key, got ${String(id)}`),
              ),
            ),
      );
    },
    // The index orders equal documentIds by primary key, which is the
    // auto-incremented snapshot ID, so this is oldest first.
    list: (documentId) =>
      run<SnapshotInfo[]>(
        { operation: "list", collection: "snapshots", id: documentId },
        "readonly",
        (store) => store.index(DOCUMENT_INDEX).getAll(documentId),
      ),
    load: (id) =>
      runIn(
        { operation: "load", collection: "snapshots", id },
        ["snapshots", SNAPSHOT_CONTENT],
        "readonly",
        (tx) => {
          const info = tx.objectStore("snapshots").get(id);
          const record = tx.objectStore(SNAPSHOT_CONTENT).get(id);
          return () => ({
            info: info.result as SnapshotInfo | undefined,
            record: record.result as SnapshotContentRecord | undefined,
          });
        },
      ).andThen(({ info, record }) => {
        if (info === undefined) return errAsync(notFound("snapshots", id));
        if (record === undefined) {
          return errAsync(
            failure(
              { operation: "load", collection: "snapshots", id },
              new Error("snapshot metadata exists but its content is missing"),
            ),
          );
        }
        return okAsync({ ...info, content: record.content });
      }),
  };

  return {
    documents: keyed("documents", (record) => record.id),
    worldEntries: keyed("worldEntries", (record) => record.documentId),
    annotations,
    requests: keyed("requests", (record) => record.id),
    snapshots,
    outlines: keyed("outlines", (record) => record.id),
    timelines: keyed("timelines", (record) => record.id),
    storyRecords: keyed("storyRecords", (record) => record.id),
    batch: (writes) => {
      const stores = new Set<StoreName>();
      for (const write of writes) {
        if (write.kind === "saveDocument") stores.add("documents");
        if (write.kind === "saveAnnotation") stores.add("annotations");
        if (write.kind === "saveSnapshot") {
          stores.add("snapshots");
          stores.add(SNAPSHOT_CONTENT);
        }
        if (
          write.kind === "saveStoryRecord" ||
          write.kind === "deleteStoryRecord"
        ) {
          stores.add("storyRecords");
        }
      }
      // A transaction needs at least one store.
      if (stores.size === 0) return okAsync([]);
      return runIn(
        batchContext(writes),
        [...stores],
        "readwrite",
        (tx, abort) => {
          const added: { info: Omit<SnapshotInfo, "id">; add: IDBRequest }[] =
            [];
          for (const write of writes) {
            switch (write.kind) {
              case "saveDocument":
                tx.objectStore("documents").put(write.record);
                break;
              case "saveAnnotation":
                tx.objectStore("annotations").put(write.record);
                break;
              case "saveSnapshot": {
                const { content, ...rest } = write.snapshot;
                const info = { ...rest, createdAt: Date.now() };
                const add = tx.objectStore("snapshots").add(info);
                add.onsuccess = () => {
                  try {
                    tx.objectStore(SNAPSHOT_CONTENT).put({
                      id: Number(add.result),
                      content,
                    } satisfies SnapshotContentRecord);
                  } catch (cause) {
                    abort(cause);
                  }
                };
                added.push({ info, add });
                break;
              }
              case "saveStoryRecord":
                tx.objectStore("storyRecords").put(write.record);
                break;
              case "deleteStoryRecord":
                tx.objectStore("storyRecords").delete(write.id);
                break;
            }
          }
          return () =>
            added.map(({ info, add }) => ({ ...info, id: Number(add.result) }));
        },
      );
    },
    dump: () =>
      runIn(
        { operation: "list" },
        [...COLLECTION_NAMES, SNAPSHOT_CONTENT],
        "readonly",
        (tx) => {
          const all = (store: StoreName) => tx.objectStore(store).getAll();
          const requests = {
            documents: all("documents"),
            worldEntries: all("worldEntries"),
            annotations: all("annotations"),
            requests: all("requests"),
            snapshots: all("snapshots"),
            snapshotContent: all(SNAPSHOT_CONTENT),
            outlines: all("outlines"),
            timelines: all("timelines"),
            storyRecords: all("storyRecords"),
          };
          return () => {
            const read = <T>(request: IDBRequest) => request.result as T[];
            return {
              records: {
                documents: read(requests.documents),
                worldEntries: read(requests.worldEntries),
                annotations: read(requests.annotations),
                requests: read(requests.requests),
                outlines: read(requests.outlines),
                timelines: read(requests.timelines),
                storyRecords: read(requests.storyRecords),
              } as Omit<WorldRecords, "snapshots">,
              infos: read<SnapshotInfo>(requests.snapshots),
              contents: read<SnapshotContentRecord>(requests.snapshotContent),
            };
          };
        },
      ).andThen(({ records, infos, contents }) => {
        const byId = new Map(contents.map((record) => [record.id, record]));
        const snapshots: Snapshot[] = [];
        for (const info of infos) {
          const record = byId.get(info.id);
          if (record === undefined) {
            return errAsync(
              failure(
                { operation: "list", collection: "snapshots", id: info.id },
                new Error(
                  "snapshot metadata exists but its content is missing",
                ),
              ),
            );
          }
          snapshots.push({ ...info, content: record.content });
        }
        return okAsync<WorldRecords>({ ...records, snapshots });
      }),
    restore: (records) =>
      runIn(
        restoreContext(records),
        [...COLLECTION_NAMES, SNAPSHOT_CONTENT],
        "readwrite",
        (tx) => {
          const putAll = (store: StoreName, list: readonly unknown[]) => {
            const target = tx.objectStore(store);
            for (const record of list) target.put(record);
          };
          putAll("documents", records.documents);
          putAll("worldEntries", records.worldEntries);
          putAll("annotations", records.annotations);
          putAll("requests", records.requests);
          putAll("outlines", records.outlines);
          putAll("timelines", records.timelines);
          putAll("storyRecords", records.storyRecords);
          // An explicit key above the key generator's moves it past that
          // key, so later snapshot saves get higher IDs.
          for (const { content, ...info } of records.snapshots) {
            tx.objectStore("snapshots").put(info);
            tx.objectStore(SNAPSHOT_CONTENT).put({
              id: info.id,
              content,
            } satisfies SnapshotContentRecord);
          }
          return () => undefined;
        },
      ),
    close: () => db.close(),
  };
}
