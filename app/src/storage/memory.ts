import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import {
  batchContext,
  type FailureContext,
  failure,
  notFound,
  restoreContext,
  snapshotInfo,
} from "./internal";
import type {
  AgentRecordCollection,
  AnnotationCollection,
  AnnotationRecord,
  Collection,
  NewSnapshot,
  Snapshot,
  SnapshotCollection,
  SnapshotInfo,
  StorageAdapter,
  StorageError,
  StoredAgentRecord,
  StoredDocument,
  StoredOutline,
  StoredRequest,
  StoredStoryRecord,
  StoredTimeline,
  SyncedCollectionName,
  Tombstone,
  WorldEntry,
  WorldRecords,
} from "./types";

/**
 * Storage held in memory, for tests and for running without persistence.
 * Values are deep-copied on the way in and out, as IndexedDB does, so callers
 * can never mutate stored state by reference.
 */
export function createMemoryStorage(): StorageAdapter {
  let closed = false;

  /** Runs `work` unless the store is closed, turning throws into failures. */
  function run<T>(
    context: FailureContext,
    work: () => T,
  ): ResultAsync<T, StorageError> {
    if (closed) {
      return errAsync(failure(context, new Error("storage is closed")));
    }
    try {
      return okAsync(work());
    } catch (cause) {
      return errAsync(failure(context, cause));
    }
  }

  function sorted<T>(records: Map<string, T>): T[] {
    return [...records.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([, record]) => record);
  }

  /** Deleted keys and when, per synced collection. */
  const tombstones = new Map<SyncedCollectionName, Map<string, number>>();
  const tombstonesOf = (collection: SyncedCollectionName) => {
    let deleted = tombstones.get(collection);
    if (deleted === undefined) {
      deleted = new Map();
      tombstones.set(collection, deleted);
    }
    return deleted;
  };
  /** Stores an already-copied record and removes its key's tombstone. */
  const put = <T>(
    collection: SyncedCollectionName,
    records: Map<string, T>,
    key: string,
    record: T,
  ) => {
    records.set(key, record);
    tombstonesOf(collection).delete(key);
  };
  const remove = (
    collection: SyncedCollectionName,
    records: Map<string, unknown>,
    key: string,
    deletedAt: number,
  ) => {
    records.delete(key);
    tombstonesOf(collection).set(key, deletedAt);
  };

  function keyed<T>(
    collection: SyncedCollectionName,
    keyOf: (record: T) => string,
    records = new Map<string, T>(),
  ): Collection<T> {
    return {
      save: (record) =>
        run({ operation: "save", collection, id: keyOf(record) }, () => {
          put(collection, records, keyOf(record), structuredClone(record));
        }),
      load: (key) =>
        run({ operation: "load", collection, id: key }, () =>
          records.get(key),
        ).andThen((record) =>
          record === undefined
            ? errAsync(notFound(collection, key))
            : okAsync(structuredClone(record)),
        ),
      list: () =>
        run({ operation: "list", collection }, () =>
          structuredClone(sorted(records)),
        ),
      delete: (key) =>
        run({ operation: "delete", collection, id: key }, () => {
          remove(collection, records, key, Date.now());
        }),
      listTombstones: () =>
        run({ operation: "list", collection }, () =>
          [...tombstonesOf(collection).entries()]
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([key, deletedAt]): Tombstone => ({ key, deletedAt })),
        ),
    };
  }

  const documentRecords = new Map<string, StoredDocument>();
  const worldEntryRecords = new Map<string, WorldEntry>();
  const requestRecords = new Map<string, StoredRequest>();
  const outlineRecords = new Map<string, StoredOutline>();
  const timelineRecords = new Map<string, StoredTimeline>();
  const storyRecords = new Map<string, StoredStoryRecord>();
  const agentRecordMap = new Map<string, StoredAgentRecord>();
  const agentStore = keyed<StoredAgentRecord>(
    "agentRecords",
    (record) => record.id,
    agentRecordMap,
  );
  const agentRecords: AgentRecordCollection = {
    ...agentStore,
    listForSession: (sessionId) =>
      agentStore
        .list()
        .map((all) => all.filter((record) => record.sessionId === sessionId)),
  };
  const annotationRecords = new Map<string, AnnotationRecord>();
  const annotationStore = keyed<AnnotationRecord>(
    "annotations",
    (record) => record.id,
    annotationRecords,
  );
  const annotations: AnnotationCollection = {
    ...annotationStore,
    listForDocument: (documentId) =>
      annotationStore
        .list()
        .map((all) => all.filter((record) => record.documentId === documentId)),
  };

  const snapshotRecords = new Map<number, Snapshot>();
  let nextSnapshotId = 1;
  /** Stores an already-copied snapshot. */
  const addSnapshot = (input: NewSnapshot) => {
    const snapshot: Snapshot = {
      ...input,
      id: nextSnapshotId,
      createdAt: Date.now(),
    };
    snapshotRecords.set(snapshot.id, snapshot);
    nextSnapshotId += 1;
    return snapshotInfo(snapshot);
  };
  const snapshots: SnapshotCollection = {
    save: (input) =>
      run(
        { operation: "save", collection: "snapshots", id: input.documentId },
        () => addSnapshot(structuredClone(input)),
      ),
    list: (documentId) =>
      run({ operation: "list", collection: "snapshots", id: documentId }, () =>
        [...snapshotRecords.values()]
          .filter((snapshot) => snapshot.documentId === documentId)
          .sort((a, b) => a.id - b.id)
          .map(snapshotInfo),
      ),
    load: (id) =>
      run({ operation: "load", collection: "snapshots", id }, () =>
        snapshotRecords.get(id),
      ).andThen((snapshot) =>
        snapshot === undefined
          ? errAsync(notFound("snapshots", id))
          : okAsync(structuredClone(snapshot)),
      ),
  };

  return {
    documents: keyed("documents", (record) => record.id, documentRecords),
    worldEntries: keyed(
      "worldEntries",
      (record) => record.documentId,
      worldEntryRecords,
    ),
    annotations,
    requests: keyed("requests", (record) => record.id, requestRecords),
    snapshots,
    outlines: keyed("outlines", (record) => record.id, outlineRecords),
    timelines: keyed("timelines", (record) => record.id, timelineRecords),
    storyRecords: keyed("storyRecords", (record) => record.id, storyRecords),
    agentRecords,
    batch: (writes) =>
      run(batchContext(writes), () => {
        // Copy every value before changing anything, so a value that can't
        // be stored fails the batch with nothing written.
        const copies = structuredClone(writes);
        const saved: SnapshotInfo[] = [];
        const now = Date.now();
        for (const write of copies) {
          switch (write.kind) {
            case "saveDocument":
              put("documents", documentRecords, write.record.id, write.record);
              break;
            case "saveAnnotation":
              put(
                "annotations",
                annotationRecords,
                write.record.id,
                write.record,
              );
              break;
            case "saveSnapshot":
              saved.push(addSnapshot(write.snapshot));
              break;
            case "saveStoryRecord":
              put("storyRecords", storyRecords, write.record.id, write.record);
              break;
            case "deleteStoryRecord":
              remove("storyRecords", storyRecords, write.id, now);
              break;
            case "saveAgentRecord":
              put(
                "agentRecords",
                agentRecordMap,
                write.record.id,
                write.record,
              );
              break;
          }
        }
        return saved;
      }),
    dump: () =>
      run({ operation: "list" }, () =>
        structuredClone({
          documents: sorted(documentRecords),
          worldEntries: sorted(worldEntryRecords),
          annotations: sorted(annotationRecords),
          requests: sorted(requestRecords),
          snapshots: [...snapshotRecords.values()].sort((a, b) => a.id - b.id),
          outlines: sorted(outlineRecords),
          timelines: sorted(timelineRecords),
          storyRecords: sorted(storyRecords),
          agentRecords: sorted(agentRecordMap),
        } satisfies WorldRecords),
      ),
    restore: (records) =>
      run(restoreContext(records), () => {
        // Copy everything first, so a value that can't be stored fails the
        // restore with nothing written.
        const copy = structuredClone(records);
        const putAll = <T>(
          collection: SyncedCollectionName,
          target: Map<string, T>,
          list: readonly T[],
          keyOf: (record: T) => string,
        ) => {
          for (const record of list) {
            put(collection, target, keyOf(record), record);
          }
        };
        putAll("documents", documentRecords, copy.documents, (r) => r.id);
        putAll(
          "worldEntries",
          worldEntryRecords,
          copy.worldEntries,
          (r) => r.documentId,
        );
        putAll("annotations", annotationRecords, copy.annotations, (r) => r.id);
        putAll("requests", requestRecords, copy.requests, (r) => r.id);
        putAll("outlines", outlineRecords, copy.outlines, (r) => r.id);
        putAll("timelines", timelineRecords, copy.timelines, (r) => r.id);
        putAll("storyRecords", storyRecords, copy.storyRecords, (r) => r.id);
        putAll("agentRecords", agentRecordMap, copy.agentRecords, (r) => r.id);
        for (const snapshot of copy.snapshots) {
          snapshotRecords.set(snapshot.id, snapshot);
          nextSnapshotId = Math.max(nextSnapshotId, snapshot.id + 1);
        }
      }),
    close: () => {
      closed = true;
    },
  };
}
