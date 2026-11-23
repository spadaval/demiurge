/**
 * The sync protocol between a browser profile and the sync Worker
 * (`src/worker/`). One world syncs as a set of records keyed by
 * `(collection, key)` across every synced `StorageAdapter` collection;
 * snapshots stay on the device.
 *
 * The Worker gives every accepted write or delete a `serverRev`, the next
 * value of one counter per world. So a record's revisions only go up, and the
 * highest revision a device has pulled is its cursor: pulling `since` that
 * cursor returns every record changed after it. Client clocks never order
 * anything; `updatedAt` and `deletedAt` travel as data only.
 *
 * A push carries, for each record or tombstone, the `baseRev` it was edited
 * from: the `serverRev` the device last pulled or pushed for it, or 0 for a
 * record the server has never sent it. The Worker accepts it only when
 * `baseRev` is the record's current `serverRev` (0 when the server has no
 * record), and otherwise answers `conflict` with what it holds, so a device
 * that was offline cannot overwrite a newer edit or delete.
 *
 * Routes, under Cloudflare Access: `POST /api/sync/<worldId>/pull` with a
 * `PullRequest` answers a `PullResponse`; `POST /api/sync/<worldId>/push`
 * with a `PushRequest` answers a `PushResponse`.
 */

import { err, ok, type Result } from "neverthrow";
import {
  COLLECTION_NAMES,
  type CollectionRecords,
  type JsonValue,
  SYNC_FIELDS,
  type SyncedCollectionName,
} from "../storage/types";

export const SYNC_API_PREFIX = "/api/sync/";

/** Every collection that syncs, in `COLLECTION_NAMES` order. */
export const SYNCED_COLLECTIONS: readonly SyncedCollectionName[] =
  COLLECTION_NAMES.filter(
    (name): name is SyncedCollectionName => name !== "snapshots",
  );

/** The most changes one pull answers with, and one push may carry. */
export const MAX_PULL_CHANGES = 200;
export const MAX_PUSH_CHANGES = 100;
/**
 * Largest record, as JSON characters, the Worker keeps: a Durable Object's
 * SQLite row holds at most 2 MB.
 */
export const MAX_RECORD_LENGTH = 1_900_000;
/** Longest record key the Worker accepts. */
export const MAX_KEY_LENGTH = 1024;
/** World IDs are path segments, so they are kept to a safe alphabet. */
export const WORLD_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** A synced record of any collection. */
export type SyncedRecord = CollectionRecords[SyncedCollectionName];

/** A record or tombstone as the Worker holds it. */
export interface ServerChange {
  readonly collection: SyncedCollectionName;
  readonly key: string;
  readonly serverRev: number;
  /** Epoch milliseconds by the Worker's clock, when it accepted the write. */
  readonly syncedAt: number;
  /** The record, or null when the key was deleted. */
  readonly record: SyncedRecord | null;
  /** The deleting device's `deletedAt` when `record` is null. Data only. */
  readonly deletedAt: number | null;
}

export interface PullRequest {
  /** The highest `serverRev` already pulled; 0 for everything. */
  readonly since: number;
}

export interface PullResponse {
  /** Changes with `serverRev > since`, ascending by `serverRev`. */
  readonly changes: readonly ServerChange[];
  /** Pull again from here; equals `since` when nothing changed. */
  readonly cursor: number;
  /** True when more changes wait after `cursor`. */
  readonly more: boolean;
}

/** One record or tombstone a device asks the Worker to take. */
export interface PushChange {
  readonly collection: SyncedCollectionName;
  readonly key: string;
  readonly baseRev: number;
  /** The record, or null to delete the key. */
  readonly record: SyncedRecord | null;
  /** When the device deleted it, if `record` is null. Data only. */
  readonly deletedAt: number | null;
}

export interface PushRequest {
  readonly deviceId: string;
  readonly changes: readonly PushChange[];
}

export type PushResult =
  | {
      readonly status: "accepted";
      readonly collection: SyncedCollectionName;
      readonly key: string;
      readonly serverRev: number;
      readonly syncedAt: number;
    }
  | {
      readonly status: "conflict";
      readonly collection: SyncedCollectionName;
      readonly key: string;
      /** What the Worker holds instead, newer than the push's `baseRev`. */
      readonly current: ServerChange;
    }
  | {
      /** The Worker can't keep this record (too large). Nothing changed. */
      readonly status: "rejected";
      readonly collection: SyncedCollectionName;
      readonly key: string;
      readonly reason: string;
    };

export interface PushResponse {
  /** One result per pushed change, in order. */
  readonly results: readonly PushResult[];
}

// ------------------------------------------------------------------ checks

/** A message that isn't the protocol: `path` locates the problem. */
export interface ProtocolError {
  readonly path: string;
  readonly reason: string;
}

type Check<T> = Result<T, ProtocolError>;

const invalid = (path: string, reason: string): Check<never> =>
  err({ path, reason });

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isRev = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const isTime = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function isSyncedCollection(value: unknown): value is SyncedCollectionName {
  return SYNCED_COLLECTIONS.some((name) => name === value);
}

/** Whether `value` is any JSON value; a parsed body always is. */
function isJson(value: unknown): value is JsonValue {
  if (value === null) return true;
  switch (typeof value) {
    case "boolean":
    case "string":
      return true;
    case "number":
      return Number.isFinite(value);
    case "object":
      return Array.isArray(value)
        ? value.every(isJson)
        : Object.values(value).every(isJson);
    default:
      return false;
  }
}

/**
 * Checks that `record` is a record of `collection` whose key field is `key`
 * and whose change time is a number: the fields sync relies on. The fields a
 * device stores are checked by `checkStoredRecord` before it stores them.
 */
export function checkRecordKey(
  collection: SyncedCollectionName,
  key: string,
  record: unknown,
  path: string,
): Check<SyncedRecord> {
  if (!isObject(record) || !isJson(record)) {
    return invalid(path, "expected a JSON object");
  }
  const fields = SYNC_FIELDS[collection];
  if (record[fields.key] !== key) {
    return invalid(`${path}.${fields.key}`, `expected the key ${key}`);
  }
  if (!isTime(record[fields.changedAt])) {
    return invalid(`${path}.${fields.changedAt}`, "expected a finite number");
  }
  // The key and change time were checked above; the device checks the rest
  // with `checkStoredRecord` before it stores the record.
  return ok(record as unknown as SyncedRecord);
}

function checkKey(value: unknown, path: string): Check<string> {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_KEY_LENGTH
    ? ok(value)
    : invalid(path, `expected a string of 1 to ${MAX_KEY_LENGTH} characters`);
}

function checkRecordOrTombstone(
  value: Record<string, unknown>,
  collection: SyncedCollectionName,
  key: string,
  path: string,
): Check<{ record: SyncedRecord | null; deletedAt: number | null }> {
  if (value.record === null) {
    return isTime(value.deletedAt)
      ? ok({ record: null, deletedAt: value.deletedAt })
      : invalid(`${path}.deletedAt`, "expected a finite number");
  }
  if (value.deletedAt !== null) {
    return invalid(`${path}.deletedAt`, "expected null beside a record");
  }
  return checkRecordKey(collection, key, value.record, `${path}.record`).map(
    (record) => ({ record, deletedAt: null }),
  );
}

function checkTarget(
  value: unknown,
  path: string,
): Check<{
  fields: Record<string, unknown>;
  collection: SyncedCollectionName;
  key: string;
}> {
  if (!isObject(value)) return invalid(path, "expected an object");
  if (!isSyncedCollection(value.collection)) {
    return invalid(`${path}.collection`, "expected a synced collection");
  }
  const collection = value.collection;
  return checkKey(value.key, `${path}.key`).map((key) => ({
    fields: value,
    collection,
    key,
  }));
}

export function checkServerChange(
  value: unknown,
  path = "change",
): Check<ServerChange> {
  return checkTarget(value, path).andThen(({ fields, collection, key }) => {
    if (!isRev(fields.serverRev) || fields.serverRev === 0) {
      return invalid(`${path}.serverRev`, "expected a positive integer");
    }
    if (!isTime(fields.syncedAt)) {
      return invalid(`${path}.syncedAt`, "expected a finite number");
    }
    const { serverRev, syncedAt } = fields;
    return checkRecordOrTombstone(fields, collection, key, path).map(
      ({ record, deletedAt }) => ({
        collection,
        key,
        serverRev,
        syncedAt,
        record,
        deletedAt,
      }),
    );
  });
}

function checkList<T>(
  value: unknown,
  path: string,
  max: number,
  item: (value: unknown, path: string) => Check<T>,
): Check<T[]> {
  if (!Array.isArray(value)) return invalid(path, "expected an array");
  if (value.length > max) return invalid(path, `expected at most ${max}`);
  const items: T[] = [];
  for (const [i, entry] of value.entries()) {
    const checked = item(entry, `${path}[${i}]`);
    if (checked.isErr()) return err(checked.error);
    items.push(checked.value);
  }
  return ok(items);
}

export function checkPullRequest(value: unknown): Check<PullRequest> {
  if (!isObject(value)) return invalid("(root)", "expected an object");
  return isRev(value.since)
    ? ok({ since: value.since })
    : invalid("since", "expected a non-negative integer");
}

export function checkPullResponse(value: unknown): Check<PullResponse> {
  if (!isObject(value)) return invalid("(root)", "expected an object");
  if (!isRev(value.cursor)) {
    return invalid("cursor", "expected a non-negative integer");
  }
  if (typeof value.more !== "boolean") {
    return invalid("more", "expected a boolean");
  }
  const { cursor, more } = value;
  return checkList(
    value.changes,
    "changes",
    MAX_PULL_CHANGES,
    checkServerChange,
  ).map((changes) => ({ changes, cursor, more }));
}

export function checkPushChange(
  value: unknown,
  path = "change",
): Check<PushChange> {
  return checkTarget(value, path).andThen(({ fields, collection, key }) => {
    if (!isRev(fields.baseRev)) {
      return invalid(`${path}.baseRev`, "expected a non-negative integer");
    }
    const baseRev = fields.baseRev;
    return checkRecordOrTombstone(fields, collection, key, path).map(
      ({ record, deletedAt }) => ({
        collection,
        key,
        baseRev,
        record,
        deletedAt,
      }),
    );
  });
}

export function checkPushRequest(value: unknown): Check<PushRequest> {
  if (!isObject(value)) return invalid("(root)", "expected an object");
  const deviceId = checkKey(value.deviceId, "deviceId");
  if (deviceId.isErr()) return err(deviceId.error);
  return checkList(
    value.changes,
    "changes",
    MAX_PUSH_CHANGES,
    checkPushChange,
  ).map((changes) => ({ deviceId: deviceId.value, changes }));
}

function checkPushResult(value: unknown, path: string): Check<PushResult> {
  return checkTarget(value, path).andThen(
    ({ fields, collection, key }): Check<PushResult> => {
      if (fields.status === "accepted") {
        if (!isRev(fields.serverRev) || fields.serverRev === 0) {
          return invalid(`${path}.serverRev`, "expected a positive integer");
        }
        if (!isTime(fields.syncedAt)) {
          return invalid(`${path}.syncedAt`, "expected a finite number");
        }
        return ok({
          status: "accepted",
          collection,
          key,
          serverRev: fields.serverRev,
          syncedAt: fields.syncedAt,
        });
      }
      if (fields.status === "conflict") {
        return checkServerChange(fields.current, `${path}.current`).andThen(
          (current) =>
            current.collection === collection && current.key === key
              ? ok({ status: "conflict" as const, collection, key, current })
              : invalid(`${path}.current`, "expected the same record"),
        );
      }
      if (fields.status === "rejected") {
        return typeof fields.reason === "string"
          ? ok({
              status: "rejected" as const,
              collection,
              key,
              reason: fields.reason,
            })
          : invalid(`${path}.reason`, "expected a string");
      }
      return invalid(
        `${path}.status`,
        "expected accepted, conflict or rejected",
      );
    },
  );
}

export function checkPushResponse(
  value: unknown,
  pushed: readonly PushChange[],
): Check<PushResponse> {
  if (!isObject(value)) return invalid("(root)", "expected an object");
  return checkList(
    value.results,
    "results",
    MAX_PUSH_CHANGES,
    checkPushResult,
  ).andThen((results) => {
    if (results.length !== pushed.length) {
      return invalid("results", `expected ${pushed.length} results`);
    }
    for (const [i, result] of results.entries()) {
      const change = pushed[i];
      if (
        change === undefined ||
        result.collection !== change.collection ||
        result.key !== change.key
      ) {
        return invalid(`results[${i}]`, "expected the pushed record's result");
      }
    }
    return ok({ results });
  });
}
