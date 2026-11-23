/**
 * Syncs one world's `StorageAdapter` with the sync Worker
 * (`src/sync/protocol.ts`): pull every change since the cursor, then push
 * every record edited or deleted here since it last synced.
 *
 * Which side wins. The server's revision is newer than this device's when
 * another device pushed since this one last synced the record; then:
 * - a record not edited here takes the server's revision;
 * - a document edited here also takes it, after its local content is saved
 *   as a `sync_conflict` snapshot, so neither device's prose is lost;
 * - any other record edited here takes the server's revision, and the local
 *   edit is dropped (reported in `SyncReport.conflicts`).
 * A server delete is a revision like any other: a record edited here does
 * not come back, and only a save after the delete has synced recreates it.
 * Pull finds most of these. A push the Worker refuses as stale (another
 * device pushed between this pull and this push) is followed by a second
 * pull, which brings the newer revision and ends the same way.
 *
 * Client clocks decide nothing: `updatedAt` and `deletedAt` are data.
 */

import { err, ok, type Result, ResultAsync } from "neverthrow";
import type {
  Collection,
  StorageAdapter,
  StorageError,
  SyncedCollectionName,
} from "~/storage/types";
import { SYNC_FIELDS } from "~/storage/types";
import { checkStoredRecord, type WorldFileError } from "~/storage/world-file";
import {
  MAX_PUSH_CHANGES,
  type ProtocolError,
  type PullRequest,
  type PullResponse,
  type PushChange,
  type PushRequest,
  type PushResponse,
  type ServerChange,
  SYNCED_COLLECTIONS,
  type SyncedRecord,
} from "./protocol";
import {
  DELETED_HASH,
  hashRecord,
  type RecordSyncState,
  recordId,
  type SyncState,
  type SyncStateStore,
} from "./state";

/** How a device reaches the Worker. */
export interface SyncTransport {
  pull(request: PullRequest): ResultAsync<PullResponse, SyncError>;
  push(request: PushRequest): ResultAsync<PushResponse, SyncError>;
}

export type SyncError =
  /** The Worker could not be reached. */
  | { readonly kind: "network"; readonly message: string }
  /** The Access session has ended; signing in again (a reload) fixes it. */
  | { readonly kind: "signed_out" }
  | { readonly kind: "http"; readonly status: number; readonly message: string }
  /** The Worker answered something that isn't the protocol. */
  | { readonly kind: "protocol"; readonly error: ProtocolError }
  /** A record from the Worker doesn't have its collection's fields. */
  | { readonly kind: "invalid_record"; readonly error: WorldFileError }
  | { readonly kind: "storage"; readonly error: StorageError }
  /** The sync state could not be saved. */
  | { readonly kind: "state"; readonly message: string };

/** A record edited here that took another device's newer revision. */
export interface SyncConflict {
  readonly collection: SyncedCollectionName;
  readonly key: string;
  /** The server revision it took; `record` null when that was a delete. */
  readonly serverRev: number;
  readonly deleted: boolean;
  /** The ID of the snapshot keeping the local prose, for documents. */
  readonly snapshotId: number | null;
}

export interface SyncReport {
  /** Server changes written here. */
  readonly pulled: number;
  /** Local changes the Worker took. */
  readonly pushed: number;
  readonly conflicts: readonly SyncConflict[];
  /** Local changes the Worker could not keep, with why. */
  readonly rejected: readonly {
    readonly collection: SyncedCollectionName;
    readonly key: string;
    readonly reason: string;
  }[];
}

export interface SyncOptions {
  readonly storage: StorageAdapter;
  readonly transport: SyncTransport;
  readonly state: SyncStateStore;
  readonly deviceId: string;
}

/**
 * Most JSON characters one push carries, so the Worker holds a bounded
 * amount at once (as `MAX_PULL_BYTES` bounds a pull).
 */
const MAX_PUSH_LENGTH = 8_000_000;

type Local =
  | {
      readonly kind: "record";
      readonly record: SyncedRecord;
      readonly hash: string;
    }
  | { readonly kind: "deleted"; readonly deletedAt: number }
  | { readonly kind: "absent" };

const hashOfLocal = (local: Local): string | null =>
  local.kind === "record"
    ? local.hash
    : local.kind === "deleted"
      ? DELETED_HASH
      : null;

/** The collection operations sync needs, for any synced collection. */
type SyncCollection = Pick<
  Collection<SyncedRecord>,
  "load" | "list" | "delete" | "listTombstones"
>;

const collectionOf = (
  storage: StorageAdapter,
  name: SyncedCollectionName,
): SyncCollection => storage[name];

/** Checks a record from the Worker and saves it to its collection. */
function saveChecked(
  storage: StorageAdapter,
  collection: SyncedCollectionName,
  value: SyncedRecord,
): Result<ResultAsync<void, StorageError>, WorldFileError> {
  const path = `${collection}.record`;
  switch (collection) {
    case "documents":
      return checkStoredRecord(collection, value, path).map((record) =>
        storage.documents.save(record),
      );
    case "worldEntries":
      return checkStoredRecord(collection, value, path).map((record) =>
        storage.worldEntries.save(record),
      );
    case "annotations":
      return checkStoredRecord(collection, value, path).map((record) =>
        storage.annotations.save(record),
      );
    case "requests":
      return checkStoredRecord(collection, value, path).map((record) =>
        storage.requests.save(record),
      );
    case "outlines":
      return checkStoredRecord(collection, value, path).map((record) =>
        storage.outlines.save(record),
      );
    case "timelines":
      return checkStoredRecord(collection, value, path).map((record) =>
        storage.timelines.save(record),
      );
    case "storyRecords":
      return checkStoredRecord(collection, value, path).map((record) =>
        storage.storyRecords.save(record),
      );
    case "agentRecords":
      return checkStoredRecord(collection, value, path).map((record) =>
        storage.agentRecords.save(record),
      );
    case "talkRecords":
      return checkStoredRecord(collection, value, path).map((record) =>
        storage.talkRecords.save(record),
      );
  }
}

const storageError = (error: StorageError): SyncError => ({
  kind: "storage",
  error,
});

/** Pulls, then pushes, one world. */
export function syncWorld(
  options: SyncOptions,
): ResultAsync<SyncReport, SyncError> {
  return new ResultAsync(runSync(options));
}

async function runSync({
  storage,
  transport,
  state: stateStore,
  deviceId,
}: SyncOptions): Promise<Result<SyncReport, SyncError>> {
  let state: SyncState = stateStore.load();
  const records: Record<string, RecordSyncState> = { ...state.records };
  let pulled = 0;
  let pushed = 0;
  const conflicts: SyncConflict[] = [];
  const rejected: {
    collection: SyncedCollectionName;
    key: string;
    reason: string;
  }[] = [];

  const persist = (cursor: number): Result<void, SyncError> => {
    state = { cursor, records: { ...records } };
    return stateStore
      .save(state)
      .mapErr((message): SyncError => ({ kind: "state", message }));
  };

  const loadLocal = async (
    collection: SyncedCollectionName,
    key: string,
  ): Promise<Result<Local, SyncError>> => {
    const loaded = await collectionOf(storage, collection).load(key);
    if (loaded.isOk()) {
      return ok({
        kind: "record",
        record: loaded.value,
        hash: await hashRecord(loaded.value),
      });
    }
    if (loaded.error.kind !== "not_found")
      return err(storageError(loaded.error));
    const tombstones = await collectionOf(storage, collection).listTombstones();
    if (tombstones.isErr()) return err(storageError(tombstones.error));
    const tombstone = tombstones.value.find((t) => t.key === key);
    return ok(
      tombstone
        ? { kind: "deleted", deletedAt: tombstone.deletedAt }
        : { kind: "absent" },
    );
  };

  /**
   * Writes the server's `change` here unless this device already has it,
   * first keeping a document's local edit as a snapshot. Counts a conflict
   * when the local record was edited since it last synced.
   */
  const adopt = async (
    change: ServerChange,
  ): Promise<Result<boolean, SyncError>> => {
    const { collection, key } = change;
    const id = recordId(collection, key);
    const known = records[id];
    if (known !== undefined && change.serverRev <= known.rev) return ok(false);
    const serverHash =
      change.record === null ? DELETED_HASH : await hashRecord(change.record);
    const localResult = await loadLocal(collection, key);
    if (localResult.isErr()) return err(localResult.error);
    const local = localResult.value;
    const localHash = hashOfLocal(local);
    if (localHash === serverHash) {
      // Already the same here (an earlier sync wrote it, or both devices
      // made the same change): only the revision is news.
      records[id] = { rev: change.serverRev, hash: serverHash };
      return ok(false);
    }
    const edited =
      local.kind === "record"
        ? known === undefined || known.hash !== local.hash
        : local.kind === "deleted" &&
          known !== undefined &&
          known.hash !== DELETED_HASH;

    let snapshotId: number | null = null;
    if (edited && collection === "documents" && local.kind === "record") {
      const kept = await keepLocalProse(storage, local.record, change);
      if (kept.isErr()) return err(kept.error);
      snapshotId = kept.value;
    } else if (change.record === null) {
      if (local.kind === "record") {
        const deleted = await collectionOf(storage, collection).delete(key);
        if (deleted.isErr()) return err(storageError(deleted.error));
      }
    } else {
      const save = saveChecked(storage, collection, change.record);
      if (save.isErr())
        return err({ kind: "invalid_record", error: save.error });
      const saved = await save.value;
      if (saved.isErr()) return err(storageError(saved.error));
    }
    records[id] = { rev: change.serverRev, hash: serverHash };
    if (edited) {
      conflicts.push({
        collection,
        key,
        serverRev: change.serverRev,
        deleted: change.record === null,
        snapshotId,
      });
    }
    return ok(true);
  };

  let cursor = state.cursor;
  /** Pulls every page after the cursor, adopting each change. */
  const pullAll = async (): Promise<Result<void, SyncError>> => {
    for (;;) {
      const page = await transport.pull({ since: cursor });
      if (page.isErr()) return err(page.error);
      for (const change of page.value.changes) {
        const adopted = await adopt(change);
        if (adopted.isErr()) return err(adopted.error);
        if (adopted.value) pulled++;
      }
      cursor = Math.max(cursor, page.value.cursor);
      const saved = persist(cursor);
      if (saved.isErr()) return err(saved.error);
      if (!page.value.more) return ok(undefined);
    }
  };

  const firstPull = await pullAll();
  if (firstPull.isErr()) return err(firstPull.error);

  // Push.
  const outgoing = await localChanges(storage, records);
  if (outgoing.isErr()) return err(outgoing.error);
  let refused = false;
  for (const batch of batches(outgoing.value)) {
    const response = await transport.push({
      deviceId,
      changes: batch.map(({ change }) => change),
    });
    if (response.isErr()) return err(response.error);
    for (const [i, result] of response.value.results.entries()) {
      const sent = batch[i];
      if (sent === undefined) continue;
      const id = recordId(result.collection, result.key);
      if (result.status === "accepted") {
        records[id] = { rev: result.serverRev, hash: sent.hash };
        pushed++;
      } else if (result.status === "conflict") {
        // Another device pushed since the pull above; the pull below brings
        // its revision, and `adopt` keeps this device's prose first.
        refused = true;
      } else {
        rejected.push({
          collection: result.collection,
          key: result.key,
          reason: result.reason,
        });
      }
    }
    const saved = persist(cursor);
    if (saved.isErr()) return err(saved.error);
  }

  if (refused) {
    const secondPull = await pullAll();
    if (secondPull.isErr()) return err(secondPull.error);
  }

  return ok({ pulled, pushed, conflicts, rejected });
}

/**
 * Saves `local`'s content as a `sync_conflict` snapshot, then writes the
 * server's revision of the document (or deletes it). The snapshot and a
 * saved document are one write; a delete follows the snapshot.
 */
async function keepLocalProse(
  storage: StorageAdapter,
  local: SyncedRecord,
  change: ServerChange,
): Promise<Result<number, SyncError>> {
  const document = checkStoredRecord("documents", local);
  if (document.isErr())
    return err({ kind: "invalid_record", error: document.error });
  const snapshot = {
    kind: "saveSnapshot" as const,
    snapshot: {
      documentId: document.value.id,
      reason: "sync_conflict" as const,
      content: document.value.content,
    },
  };
  if (change.record === null) {
    const saved = await storage.batch([snapshot]);
    if (saved.isErr()) return err(storageError(saved.error));
    const deleted = await storage.documents.delete(change.key);
    if (deleted.isErr()) return err(storageError(deleted.error));
    return ok(saved.value[0]?.id ?? 0);
  }
  const server = checkStoredRecord("documents", change.record);
  if (server.isErr())
    return err({ kind: "invalid_record", error: server.error });
  const saved = await storage.batch([
    snapshot,
    { kind: "saveDocument", record: server.value },
  ]);
  if (saved.isErr()) return err(storageError(saved.error));
  return ok(saved.value[0]?.id ?? 0);
}

interface Outgoing {
  readonly change: PushChange;
  readonly hash: string;
  readonly length: number;
}

/**
 * Every record saved or deleted here since it last synced. A delete of a
 * record the server never had is left out: after a pull, a key the server
 * holds has sync state, so one without it is news to nobody.
 */
async function localChanges(
  storage: StorageAdapter,
  records: Readonly<Record<string, RecordSyncState>>,
): Promise<Result<Outgoing[], SyncError>> {
  const outgoing: Outgoing[] = [];
  for (const collection of SYNCED_COLLECTIONS) {
    const store = collectionOf(storage, collection);
    const listed = await store.list();
    if (listed.isErr()) return err(storageError(listed.error));
    for (const record of listed.value) {
      const key = keyOf(collection, record);
      const known = records[recordId(collection, key)];
      const hash = await hashRecord(record);
      if (known?.hash === hash) continue;
      const change: PushChange = {
        collection,
        key,
        baseRev: known?.rev ?? 0,
        record,
        deletedAt: null,
      };
      outgoing.push({ change, hash, length: JSON.stringify(change).length });
    }
    const tombstones = await store.listTombstones();
    if (tombstones.isErr()) return err(storageError(tombstones.error));
    for (const { key, deletedAt } of tombstones.value) {
      const known = records[recordId(collection, key)];
      if (known === undefined || known.hash === DELETED_HASH) continue;
      const change: PushChange = {
        collection,
        key,
        baseRev: known.rev,
        record: null,
        deletedAt,
      };
      outgoing.push({
        change,
        hash: DELETED_HASH,
        length: JSON.stringify(change).length,
      });
    }
  }
  return ok(outgoing);
}

function keyOf(collection: SyncedCollectionName, record: SyncedRecord): string {
  const key: unknown = (record as unknown as Record<string, unknown>)[
    SYNC_FIELDS[collection].key
  ];
  // `SyncedCollectionsAreSyncReady` (storage/types.ts) holds every synced
  // record type to a string key field.
  return String(key);
}

/** Splits pushes by count and size; an oversized record goes alone. */
function batches(outgoing: readonly Outgoing[]): Outgoing[][] {
  const out: Outgoing[][] = [];
  let current: Outgoing[] = [];
  let length = 0;
  for (const item of outgoing) {
    if (
      current.length > 0 &&
      (current.length >= MAX_PUSH_CHANGES ||
        length + item.length > MAX_PUSH_LENGTH)
    ) {
      out.push(current);
      current = [];
      length = 0;
    }
    current.push(item);
    length += item.length;
  }
  if (current.length > 0) out.push(current);
  return out;
}
