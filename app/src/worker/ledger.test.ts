import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import {
  MAX_PULL_BYTES,
  MAX_PULL_CHANGES,
  MAX_RECORD_BYTES,
  type PushChange,
} from "../sync/protocol";
import { openLedger } from "./ledger";
import { sqliteState } from "./testing";

function ledger(db = new Database(":memory:"), clock = { now: 1000 }) {
  const { storage } = sqliteState(db);
  return openLedger({
    sql: storage.sql,
    transaction: (work) => storage.transactionSync(work),
    now: () => clock.now,
  });
}

const doc = (id: string, text: string, updatedAt = 1): PushChange => ({
  collection: "documents",
  key: id,
  baseRev: 0,
  record: { id, title: text, content: [], updatedAt },
  deletedAt: null,
});

describe("ledger", () => {
  test("accepts new records and gives each write the next revision", () => {
    const l = ledger();
    const { results } = l.push({
      deviceId: "a",
      changes: [doc("d1", "one"), doc("d2", "two")],
    });
    expect(results.map((r) => r.status)).toEqual(["accepted", "accepted"]);
    expect(
      results.map((r) => (r.status === "accepted" ? r.serverRev : 0)),
    ).toEqual([1, 2]);
    const again = l.push({
      deviceId: "a",
      changes: [{ ...doc("d1", "uno"), baseRev: 1 }],
    });
    expect(again.results[0]).toMatchObject({
      status: "accepted",
      serverRev: 3,
    });
  });

  test("refuses a stale base revision and answers with what it holds", () => {
    const l = ledger();
    l.push({ deviceId: "a", changes: [doc("d1", "one")] });
    l.push({ deviceId: "a", changes: [{ ...doc("d1", "newer"), baseRev: 1 }] });
    const stale = l.push({
      deviceId: "b",
      changes: [{ ...doc("d1", "stale"), baseRev: 1 }],
    });
    expect(stale.results[0]).toMatchObject({
      status: "conflict",
      serverRev: 2,
    });
    const fresh = l.push({ deviceId: "b", changes: [doc("d1", "also new")] });
    expect(fresh.results[0]?.status).toBe("conflict");
  });

  test("a tombstone is a revision: a stale edit after it conflicts", () => {
    const l = ledger();
    l.push({ deviceId: "a", changes: [doc("d1", "one")] });
    const del = l.push({
      deviceId: "a",
      changes: [{ ...doc("d1", ""), baseRev: 1, record: null, deletedAt: 5 }],
    });
    expect(del.results[0]).toMatchObject({ status: "accepted", serverRev: 2 });
    const stale = l.push({
      deviceId: "b",
      changes: [{ ...doc("d1", "edit"), baseRev: 1 }],
    });
    expect(stale.results[0]).toMatchObject({
      status: "conflict",
      serverRev: 2,
    });
    const recreate = l.push({
      deviceId: "b",
      changes: [{ ...doc("d1", "again"), baseRev: 2 }],
    });
    expect(recreate.results[0]).toMatchObject({
      status: "accepted",
      serverRev: 3,
    });
  });

  test("pull returns changes after the cursor, newest write per record, in revision order", () => {
    const l = ledger();
    l.push({ deviceId: "a", changes: [doc("d1", "one"), doc("d2", "two")] });
    l.push({ deviceId: "a", changes: [{ ...doc("d1", "uno"), baseRev: 1 }] });
    const all = l.pull({ since: 0 });
    expect(all.changes.map((c) => [c.key, c.serverRev])).toEqual([
      ["d2", 2],
      ["d1", 3],
    ]);
    expect(all).toMatchObject({ cursor: 3, more: false });
    expect(l.pull({ since: 3 })).toEqual({
      changes: [],
      cursor: 3,
      more: false,
    });
  });

  test("pull pages through many changes", () => {
    const l = ledger();
    const keys = Array.from(
      { length: MAX_PULL_CHANGES + 5 },
      (_, i) => `k${i}`,
    );
    for (let i = 0; i < keys.length; i += 100) {
      l.push({
        deviceId: "a",
        changes: keys.slice(i, i + 100).map((k) => doc(k, k)),
      });
    }
    const first = l.pull({ since: 0 });
    expect(first.changes).toHaveLength(MAX_PULL_CHANGES);
    expect(first.more).toBe(true);
    const second = l.pull({ since: first.cursor });
    expect(second.changes).toHaveLength(5);
    expect(second.more).toBe(false);
  });

  test("stamps syncedAt with its own clock, not the record's", () => {
    const clock = { now: 50_000 };
    const l = ledger(new Database(":memory:"), clock);
    l.push({ deviceId: "a", changes: [doc("d1", "x", 9_999_999_999_999)] });
    expect(l.pull({ since: 0 }).changes[0]).toMatchObject({
      syncedAt: 50_000,
      record: { updatedAt: 9_999_999_999_999 },
    });
  });

  test("rejects a record too large to keep, and writes nothing for it", () => {
    const l = ledger();
    const big = doc("big", "x".repeat(MAX_RECORD_BYTES));
    const { results } = l.push({
      deviceId: "a",
      changes: [big, doc("d1", "ok")],
    });
    expect(results[0]?.status).toBe("rejected");
    expect(results[1]).toMatchObject({ status: "accepted", serverRev: 1 });
    expect(l.pull({ since: 0 }).changes.map((c) => c.key)).toEqual(["d1"]);
  });

  test("measures a record in UTF-8 bytes, not characters", () => {
    const l = ledger();
    // Under the limit in characters, over it in bytes (3 bytes each).
    const text = "—".repeat(Math.ceil(MAX_RECORD_BYTES / 2));
    const { results } = l.push({ deviceId: "a", changes: [doc("d", text)] });
    expect(results[0]?.status).toBe("rejected");
  });

  test("bounds a pull page by size, and catches up through several pages without skipping", () => {
    const l = ledger();
    // Each record is legal alone; together they are far over one page.
    const big = "x".repeat(Math.floor(MAX_RECORD_BYTES * 0.9));
    const keys = Array.from({ length: 12 }, (_, i) => `big${i}`);
    for (const key of keys) {
      const { results } = l.push({ deviceId: "a", changes: [doc(key, big)] });
      expect(results[0]?.status).toBe("accepted");
    }
    const seen: number[] = [];
    let since = 0;
    let pages = 0;
    for (;;) {
      const page = l.pull({ since });
      pages++;
      expect(page.changes.length).toBeGreaterThan(0);
      const bytes = page.changes.reduce(
        (sum, c) => sum + JSON.stringify(c.record).length,
        0,
      );
      expect(bytes).toBeLessThanOrEqual(MAX_PULL_BYTES);
      seen.push(...page.changes.map((c) => c.serverRev));
      since = page.cursor;
      if (!page.more) break;
    }
    expect(pages).toBeGreaterThan(2);
    expect(seen).toEqual(keys.map((_, i) => i + 1));
  });

  test("any legal record fits in a page, so every pull makes progress", () => {
    expect(MAX_RECORD_BYTES).toBeLessThan(MAX_PULL_BYTES);
  });

  test("a push of many stale edits gets a small answer, however large the records it lost to", () => {
    const l = ledger();
    const big = "x".repeat(Math.floor(MAX_RECORD_BYTES * 0.9));
    const keys = Array.from({ length: 20 }, (_, i) => `d${i}`);
    for (const key of keys)
      l.push({ deviceId: "a", changes: [doc(key, "v1")] });
    for (const [i, key] of keys.entries()) {
      l.push({
        deviceId: "a",
        changes: [{ ...doc(key, big), baseRev: i + 1 }],
      });
    }
    const stale = l.push({
      deviceId: "b",
      changes: keys.map((key, i) => ({ ...doc(key, "tiny"), baseRev: i + 1 })),
    });
    expect(stale.results.map((r) => r.status)).toEqual(
      keys.map(() => "conflict"),
    );
    expect(stale.results[0]).toEqual({
      status: "conflict",
      collection: "documents",
      key: "d0",
      serverRev: 21,
    });
    expect(JSON.stringify(stale).length).toBeLessThan(5_000);
  });

  test("keeps its records when reopened", () => {
    const db = new Database(":memory:");
    ledger(db).push({ deviceId: "a", changes: [doc("d1", "one")] });
    const reopened = ledger(db);
    expect(reopened.pull({ since: 0 }).changes).toHaveLength(1);
    const next = reopened.push({ deviceId: "a", changes: [doc("d2", "two")] });
    expect(next.results[0]).toMatchObject({ serverRev: 2 });
  });
});
