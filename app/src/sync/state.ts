/**
 * What a browser profile remembers about sync, outside the world's records:
 * its device ID, and per world the pull cursor and, for each record the
 * server has sent or taken, the `serverRev` it was at and a hash of its
 * content then. A record is dirty (edited since it last synced) when its
 * content no longer matches that hash, so saving and deleting need no sync
 * hook: sync compares when it runs.
 *
 * Kept in a key-value store (localStorage in the browser), like the tabs.
 * The keys keep the old product name, as `workspace/tabs.ts` does.
 */

import { err, ok, type Result } from "neverthrow";
import type { SyncedCollectionName } from "~/storage/types";
import type { KeyValueStore } from "~/workspace/tabs";

/** The hash a deleted record syncs as. */
export const DELETED_HASH = "deleted";

export interface RecordSyncState {
  /** The `serverRev` this device last pulled or pushed for the record. */
  readonly rev: number;
  /** `hashRecord` of its content then, or `DELETED_HASH`. */
  readonly hash: string;
}

export interface SyncState {
  /** The highest `serverRev` pulled; the next pull starts after it. */
  readonly cursor: number;
  /** By `recordId`. */
  readonly records: Readonly<Record<string, RecordSyncState>>;
}

export const EMPTY_SYNC_STATE: SyncState = { cursor: 0, records: {} };

/** A record's ID in `SyncState.records`. Collection names have no colon. */
export const recordId = (collection: SyncedCollectionName, key: string) =>
  `${collection}:${key}`;

/** Where a world's sync state is kept. */
export interface SyncStateStore {
  load(): SyncState;
  save(state: SyncState): Result<void, string>;
}

const DEVICE_ID_KEY = "worldcrafter:device-id";
const stateKey = (worldId: string) => `worldcrafter:${worldId}:sync`;

/**
 * This browser profile's device ID, minted on first use. If the store can't
 * keep it, the ID lasts until the page closes.
 */
export function loadDeviceId(
  store: KeyValueStore,
  mint: () => string = () => crypto.randomUUID(),
): string {
  const known = store.getItem(DEVICE_ID_KEY);
  if (known) return known;
  const id = mint();
  try {
    store.setItem(DEVICE_ID_KEY, id);
  } catch {
    // Storage is full or blocked; sync still works with this ID for now.
  }
  return id;
}

function isRecordState(value: unknown): value is RecordSyncState {
  if (typeof value !== "object" || value === null) return false;
  const { rev, hash } = value as Record<string, unknown>;
  return (
    typeof rev === "number" &&
    Number.isSafeInteger(rev) &&
    rev >= 0 &&
    typeof hash === "string"
  );
}

/**
 * A world's sync state in `store`. Anything unreadable reads as empty, which
 * is safe: the next sync pulls everything again and, where a local record
 * differs from the server's, keeps the local one only as a snapshot
 * (documents) or takes the server's (everything else).
 */
export function keyValueSyncState(
  store: KeyValueStore,
  worldId: string,
): SyncStateStore {
  const key = stateKey(worldId);
  return {
    load: () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(store.getItem(key) ?? "null");
      } catch {
        return EMPTY_SYNC_STATE;
      }
      if (typeof parsed !== "object" || parsed === null) {
        return EMPTY_SYNC_STATE;
      }
      const { cursor, records } = parsed as Record<string, unknown>;
      if (
        typeof cursor !== "number" ||
        !Number.isSafeInteger(cursor) ||
        cursor < 0 ||
        typeof records !== "object" ||
        records === null
      ) {
        return EMPTY_SYNC_STATE;
      }
      const kept: Record<string, RecordSyncState> = {};
      for (const [id, value] of Object.entries(records)) {
        if (isRecordState(value))
          kept[id] = { rev: value.rev, hash: value.hash };
      }
      return { cursor, records: kept };
    },
    save: (state) => {
      try {
        store.setItem(key, JSON.stringify(state));
        return ok(undefined);
      } catch (cause) {
        return err(cause instanceof Error ? cause.message : String(cause));
      }
    },
  };
}

/** A sync state held in memory, for tests. */
export function memorySyncState(initial = EMPTY_SYNC_STATE): SyncStateStore {
  let state = initial;
  return {
    load: () => state,
    save: (next) => {
      state = next;
      return ok(undefined);
    },
  };
}

/** `value` as JSON with every object's keys sorted, so equal values match. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
      .filter(([, field]) => field !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(
        ([name, field]) => `${JSON.stringify(name)}:${canonicalJson(field)}`,
      );
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** The first 128 bits of a SHA-256 of a record's canonical JSON, as hex. */
export async function hashRecord(record: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalJson(record)),
  );
  return [...new Uint8Array(digest, 0, 16)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
