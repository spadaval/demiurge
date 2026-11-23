import type { SnapshotInfo, SnapshotReason } from "./types";

/**
 * Proposed snapshot thinning (worldcrafter-my9t). Nothing calls this to
 * delete yet: removing snapshots waits for Sumeet's sign-off, and storage has
 * no snapshot delete. The rule lives here, pure and tested, so the decision
 * is concrete and the later change only adds the delete and its trigger.
 *
 * What is always kept:
 * - every snapshot whose reason isn't `periodic`. Accepting AI text
 *   (`accepted_ai_change`), repairs on load (`repaired_on_load`), and any
 *   reason added later, such as sync's pre-overwrite snapshots, are kept
 *   unless this rule is changed to name them;
 * - the newest snapshot of each document, of any reason, including a
 *   deleted document's;
 * - every snapshot younger than `keepAllMs`.
 *
 * Older `periodic` snapshots are thinned to the newest one per day until
 * `dailyMs`, then the newest one per week.
 */
export interface RetentionPolicy {
  /** Below this age every snapshot is kept. */
  readonly keepAllMs: number;
  /** Below this age (and above `keepAllMs`), one per day is kept. */
  readonly dailyMs: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export const PROPOSED_RETENTION: RetentionPolicy = {
  keepAllMs: 14 * DAY_MS,
  dailyMs: 90 * DAY_MS,
};

/** The reasons thinning may remove. Every other reason is kept. */
const THINNABLE: ReadonlySet<SnapshotReason> = new Set(["periodic"]);

export interface ThinningPlan {
  /** IDs to keep, ascending. */
  readonly keep: readonly number[];
  /** IDs the rule would remove, ascending. */
  readonly remove: readonly number[];
}

/**
 * Splits `snapshots` (of any number of documents) into those the policy
 * keeps and those it would remove, as of `now`. Days and weeks are counted
 * from the epoch in UTC, so the buckets don't move as time passes and
 * planning again on what was kept removes nothing more.
 */
export function planSnapshotThinning(
  snapshots: readonly SnapshotInfo[],
  now: number,
  policy: RetentionPolicy = PROPOSED_RETENTION,
): ThinningPlan {
  const newest = new Map<string, number>();
  for (const snapshot of snapshots) {
    const current = newest.get(snapshot.documentId);
    if (current === undefined || snapshot.id > current) {
      newest.set(snapshot.documentId, snapshot.id);
    }
  }

  /** The newest thinnable snapshot of each document per bucket. */
  const bucketNewest = new Map<string, number>();
  const bucketOf = (snapshot: SnapshotInfo): string | null => {
    const age = now - snapshot.createdAt;
    if (age < policy.keepAllMs) return null;
    const size = age < policy.dailyMs ? DAY_MS : WEEK_MS;
    const index = Math.floor(snapshot.createdAt / size);
    return JSON.stringify([snapshot.documentId, size, index]);
  };
  const thinnable = (snapshot: SnapshotInfo) =>
    THINNABLE.has(snapshot.reason) &&
    newest.get(snapshot.documentId) !== snapshot.id;

  for (const snapshot of snapshots) {
    if (!thinnable(snapshot)) continue;
    const bucket = bucketOf(snapshot);
    if (bucket === null) continue;
    const current = bucketNewest.get(bucket);
    if (current === undefined || snapshot.id > current) {
      bucketNewest.set(bucket, snapshot.id);
    }
  }

  const keep: number[] = [];
  const remove: number[] = [];
  for (const snapshot of snapshots) {
    const bucket = thinnable(snapshot) ? bucketOf(snapshot) : null;
    if (bucket === null || bucketNewest.get(bucket) === snapshot.id) {
      keep.push(snapshot.id);
    } else {
      remove.push(snapshot.id);
    }
  }
  const ascending = (a: number, b: number) => a - b;
  return { keep: keep.sort(ascending), remove: remove.sort(ascending) };
}
