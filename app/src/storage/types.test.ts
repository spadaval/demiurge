import { expect, test } from "bun:test";
import type { SyncReady } from "./types";

// `SyncedCollectionsAreSyncReady` in `types.ts` is the real check; these pin
// down what `SyncReady` accepts, so that check can't pass vacuously.
const accepts: SyncReady<{ id: string; updatedAt: number }, "id", "updatedAt"> =
  true;
const createdAt: SyncReady<
  { id: string; createdAt: number },
  "id",
  "createdAt"
> = true;
// @ts-expect-error: no change time.
const noChangeTime: SyncReady<{ id: string }, "id", "updatedAt"> = true;
// @ts-expect-error: the key is not a string.
const numericKey: SyncReady<
  { id: number; updatedAt: number },
  "id",
  "updatedAt"
> = true;
// @ts-expect-error: `never` (a member that is not a collection) is not ready.
const notACollection: SyncReady<never, "id", "updatedAt"> = true;

test("SyncReady is checked at compile time", () => {
  expect([
    accepts,
    createdAt,
    noChangeTime,
    numericKey,
    notACollection,
  ]).toEqual([true, true, true, true, true]);
});
