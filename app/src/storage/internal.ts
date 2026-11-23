import {
  type BatchWrite,
  COLLECTION_NAMES,
  type CollectionName,
  type NotFoundError,
  type Snapshot,
  type SnapshotInfo,
  type StorageFailure,
  type StorageOperation,
  type WorldRecords,
} from "./types";

export function notFound(
  collection: CollectionName,
  id: string | number,
): NotFoundError {
  return { kind: "not_found", collection, id: String(id) };
}

export interface FailureContext {
  readonly operation: StorageOperation;
  readonly collection?: CollectionName;
  readonly id?: string | number;
}

export function failure(
  context: FailureContext,
  cause: unknown,
): StorageFailure {
  const reason = cause instanceof Error ? cause.message : String(cause);
  const target = [context.collection, context.id].filter(
    (part) => part !== undefined,
  );
  const where = target.length > 0 ? ` ${target.join("/")}` : "";
  return {
    kind: "failure",
    operation: context.operation,
    ...(context.collection === undefined
      ? {}
      : { collection: context.collection }),
    ...(context.id === undefined ? {} : { id: String(context.id) }),
    message: `Storage ${context.operation}${where} failed: ${reason}`,
    cause,
  };
}

export function snapshotInfo(snapshot: Snapshot): SnapshotInfo {
  return {
    id: snapshot.id,
    documentId: snapshot.documentId,
    reason: snapshot.reason,
    createdAt: snapshot.createdAt,
  };
}

/** Where a batch failure is reported: its first write's collection and key. */
export function batchContext(writes: readonly BatchWrite[]): FailureContext {
  const first = writes[0];
  if (first === undefined) return { operation: "save" };
  switch (first.kind) {
    case "saveDocument":
      return {
        operation: "save",
        collection: "documents",
        id: first.record.id,
      };
    case "saveAnnotation":
      return {
        operation: "save",
        collection: "annotations",
        id: first.record.id,
      };
    case "saveSnapshot":
      return {
        operation: "save",
        collection: "snapshots",
        id: first.snapshot.documentId,
      };
    case "saveStoryRecord":
      return {
        operation: "save",
        collection: "storyRecords",
        id: first.record.id,
      };
    case "deleteStoryRecord":
      return {
        operation: "delete",
        collection: "storyRecords",
        id: first.id,
      };
  }
}

/** Where a restore failure is reported: the first collection with a record. */
export function restoreContext(records: WorldRecords): FailureContext {
  const collection = COLLECTION_NAMES.find((name) => records[name].length > 0);
  return collection === undefined
    ? { operation: "save" }
    : { operation: "save", collection };
}
