import { describe, expect, test } from "bun:test";
import { PROPOSED_RETENTION, planSnapshotThinning } from "./retention";
import type { SnapshotInfo, SnapshotReason } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1000 * DAY;

/** Builds snapshots with ascending IDs, as the store assigns them. */
function history(
  entries: readonly {
    readonly ageDays: number;
    readonly reason?: SnapshotReason;
    readonly documentId?: string;
  }[],
): SnapshotInfo[] {
  return entries.map((entry, index) => ({
    id: index + 1,
    documentId: entry.documentId ?? "doc1",
    reason: entry.reason ?? "periodic",
    createdAt: NOW - entry.ageDays * DAY,
  }));
}

/** Several periodic snapshots a day, every day, for a year. */
const year = history(
  Array.from({ length: 365 * 4 }, (_, i) => ({ ageDays: 365 - i / 4 })),
);

describe("snapshot thinning (proposed, not enabled)", () => {
  test("never removes the newest snapshot of a document", () => {
    const old = history([
      { ageDays: 400 },
      { ageDays: 399 },
      { ageDays: 300, documentId: "deleted" },
    ]);
    const plan = planSnapshotThinning(old, NOW);
    expect(plan.keep).toContain(2);
    expect(plan.keep).toContain(3);
    expect(planSnapshotThinning(year, NOW).keep).toContain(year.length);
  });

  test("never removes an AI-accept or repair snapshot, however old", () => {
    const snapshots = history([
      { ageDays: 500, reason: "repaired_on_load" },
      { ageDays: 500 },
      { ageDays: 500, reason: "accepted_ai_change" },
      { ageDays: 500, reason: "accepted_ai_change" },
      { ageDays: 500 },
      { ageDays: 0 },
    ]);
    const plan = planSnapshotThinning(snapshots, NOW);
    expect(plan.keep).toEqual([1, 3, 4, 5, 6]);
    expect(plan.remove).toEqual([2]);
  });

  test("keeps every snapshot of the last two weeks", () => {
    const recent = history(
      Array.from({ length: 50 }, (_, i) => ({ ageDays: 13.9 - i * 0.2 })),
    );
    expect(planSnapshotThinning(recent, NOW).remove).toEqual([]);
  });

  test("thins a year of saving to one a day, then one a week", () => {
    const plan = planSnapshotThinning(year, NOW);
    const kept = year.filter((s) => plan.keep.includes(s.id));
    const age = (s: SnapshotInfo) => (NOW - s.createdAt) / DAY;
    const days = (from: number, to: number) =>
      new Set(
        kept
          .filter((s) => age(s) >= from && age(s) < to)
          .map((s) => Math.floor(s.createdAt / DAY)),
      );
    // Under two weeks: all of them, four a day.
    const young = (s: SnapshotInfo) => age(s) < 14;
    expect(kept.filter(young)).toEqual(year.filter(young));
    // Two weeks to 90 days: one per calendar day.
    const daily = kept.filter((s) => age(s) >= 15 && age(s) < 89);
    expect(daily).toHaveLength(days(15, 89).size);
    // Beyond 90 days: about one a week.
    const weekly = kept.filter((s) => age(s) >= 91);
    expect(weekly.length).toBeGreaterThanOrEqual(38);
    expect(weekly.length).toBeLessThanOrEqual(41);
    expect(plan.keep.length).toBeLessThan(year.length / 6);
  });

  test("keeps the newest of each day, so each day's last state survives", () => {
    const day = history([{ ageDays: 30.9 }, { ageDays: 30.5 }, { ageDays: 0 }]);
    // Both are in the same UTC day: NOW is a whole number of days.
    expect(planSnapshotThinning(day, NOW).remove).toEqual([1]);
  });

  test("documents are thinned apart", () => {
    const two = history([
      { ageDays: 30.5, documentId: "a" },
      { ageDays: 30.4, documentId: "b" },
      { ageDays: 0, documentId: "a" },
      { ageDays: 0, documentId: "b" },
    ]);
    expect(planSnapshotThinning(two, NOW).remove).toEqual([]);
  });

  test("planning again on what was kept removes nothing more", () => {
    const first = planSnapshotThinning(year, NOW);
    const kept = year.filter((s) => first.keep.includes(s.id));
    expect(planSnapshotThinning(kept, NOW).remove).toEqual([]);
  });

  test("every snapshot is either kept or removed", () => {
    const plan = planSnapshotThinning(year, NOW, PROPOSED_RETENTION);
    expect([...plan.keep, ...plan.remove].sort((a, b) => a - b)).toEqual(
      year.map((s) => s.id),
    );
  });

  test("a snapshot dated in the future (clock moved back) is kept", () => {
    const skewed = history([{ ageDays: -5 }, { ageDays: 0 }]);
    expect(planSnapshotThinning(skewed, NOW).remove).toEqual([]);
  });
});
