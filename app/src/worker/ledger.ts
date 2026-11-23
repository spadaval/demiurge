/**
 * One world's synced records as the sync Worker keeps them: a SQLite table in
 * the world's Durable Object (`index.ts`), one row per `(collection, key)`
 * holding the newest record or tombstone. The protocol is in
 * `src/sync/protocol.ts`.
 *
 * `serverRev` is one counter per world, so it is unique, only grows for each
 * record, and orders every change: a row's `rev` is the counter's value when
 * its last write was accepted, and a pull is a range scan over `rev`.
 */

import type { SyncedCollectionName } from "../storage/types";
import {
  MAX_PULL_BYTES,
  MAX_PULL_CHANGES,
  MAX_RECORD_BYTES,
  type PullRequest,
  type PullResponse,
  type PushChange,
  type PushRequest,
  type PushResponse,
  type PushResult,
  type ServerChange,
  type SyncedRecord,
} from "../sync/protocol";

export type SqlValue = string | number | null;

/**
 * The part of a SQLite connection the ledger uses: a Durable Object's
 * `ctx.storage.sql`, or `bun:sqlite` in tests.
 */
export interface SqlRunner {
  exec(
    query: string,
    ...bindings: SqlValue[]
  ): Iterable<Record<string, unknown>>;
}

export interface Ledger {
  pull(request: PullRequest): PullResponse;
  push(request: PushRequest): PushResponse;
}

export interface LedgerOptions {
  readonly sql: SqlRunner;
  /** Runs `work` as one SQLite transaction: all its writes or none. */
  readonly transaction: <T>(work: () => T) => T;
  /** The Worker's clock, for `syncedAt`. */
  readonly now: () => number;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS counter (
     id INTEGER PRIMARY KEY CHECK (id = 0),
     rev INTEGER NOT NULL
   )`,
  `INSERT OR IGNORE INTO counter (id, rev) VALUES (0, 0)`,
  `CREATE TABLE IF NOT EXISTS records (
     collection TEXT NOT NULL,
     key TEXT NOT NULL,
     rev INTEGER NOT NULL UNIQUE,
     synced_at INTEGER NOT NULL,
     device_id TEXT NOT NULL,
     record TEXT,
     deleted_at REAL,
     PRIMARY KEY (collection, key)
   )`,
];

/** Opens the ledger in `sql`, creating its tables if they are missing. */
export function openLedger({ sql, transaction, now }: LedgerOptions): Ledger {
  transaction(() => {
    for (const statement of SCHEMA) [...sql.exec(statement)];
  });

  /** The revision held for a key, without reading its record. */
  const currentRev = (
    collection: SyncedCollectionName,
    key: string,
  ): number | null => {
    const [row] = [
      ...sql.exec(
        `SELECT rev FROM records WHERE collection = ? AND key = ?`,
        collection,
        key,
      ),
    ];
    return row === undefined ? null : integer(row.rev);
  };

  const nextRev = (): number => {
    const [row] = [
      ...sql.exec(
        `UPDATE counter SET rev = rev + 1 WHERE id = 0 RETURNING rev`,
      ),
    ];
    return integer(row?.rev);
  };

  const apply = (
    deviceId: string,
    change: PushChange,
    syncedAt: number,
  ): PushResult => {
    const { collection, key } = change;
    const json = change.record === null ? null : JSON.stringify(change.record);
    const bytes = json === null ? 0 : utf8Bytes(json);
    if (bytes > MAX_RECORD_BYTES) {
      return {
        status: "rejected",
        collection,
        key,
        reason: `the record is ${bytes} bytes of JSON; the most is ${MAX_RECORD_BYTES}`,
      };
    }
    const heldRev = currentRev(collection, key);
    // With nothing held, any `baseRev` is taken: a device holding a
    // revision this ledger never gave out (the ledger was reset) has nothing
    // newer to lose, and refusing would strand its edit.
    if (heldRev !== null && heldRev !== change.baseRev) {
      return { status: "conflict", collection, key, serverRev: heldRev };
    }
    const serverRev = nextRev();
    [
      ...sql.exec(
        `INSERT INTO records
           (collection, key, rev, synced_at, device_id, record, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (collection, key) DO UPDATE SET
           rev = excluded.rev, synced_at = excluded.synced_at,
           device_id = excluded.device_id, record = excluded.record,
           deleted_at = excluded.deleted_at`,
        collection,
        key,
        serverRev,
        syncedAt,
        deviceId,
        json,
        change.record === null ? change.deletedAt : null,
      ),
    ];
    return { status: "accepted", collection, key, serverRev, syncedAt };
  };

  return {
    pull: ({ since }) => {
      // Rows are read one at a time and the page stops at its count or
      // size limit, so a page of large records never sits in memory whole.
      const changes: ServerChange[] = [];
      let bytes = 0;
      let more = false;
      for (const row of sql.exec(
        `SELECT collection, key, rev, synced_at, record, deleted_at
           FROM records WHERE rev > ? ORDER BY rev LIMIT ?`,
        since,
        MAX_PULL_CHANGES + 1,
      )) {
        const size = typeof row.record === "string" ? utf8Bytes(row.record) : 0;
        if (
          changes.length === MAX_PULL_CHANGES ||
          (changes.length > 0 && bytes + size > MAX_PULL_BYTES)
        ) {
          more = true;
          break;
        }
        changes.push(toChange(row));
        bytes += size;
      }
      return { changes, cursor: changes.at(-1)?.serverRev ?? since, more };
    },
    push: ({ deviceId, changes }) =>
      transaction(() => {
        const syncedAt = now();
        return { results: changes.map((c) => apply(deviceId, c, syncedAt)) };
      }),
  };
}

const encoder = new TextEncoder();

/** The length of `text` as UTF-8, which is what SQLite and the wire hold. */
function utf8Bytes(text: string): number {
  return encoder.encode(text).byteLength;
}

function integer(value: unknown): number {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "bigint") return Number(value);
  throw new Error(`the ledger holds ${String(value)} where an integer belongs`);
}

function toChange(row: Record<string, unknown>): ServerChange {
  const record =
    typeof row.record === "string"
      ? // Only records that passed `checkPushChange` are written.
        (JSON.parse(row.record) as SyncedRecord)
      : null;
  const deletedAt = row.deleted_at;
  return {
    // Only synced collection names pass `checkPushChange`.
    collection: row.collection as SyncedCollectionName,
    key: String(row.key),
    serverRev: integer(row.rev),
    syncedAt: integer(row.synced_at),
    record,
    deletedAt:
      record === null && typeof deletedAt === "number" ? deletedAt : null,
  };
}
