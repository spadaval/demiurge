import { describe, expect, test } from "bun:test";
import {
  canonicalJson,
  EMPTY_SYNC_STATE,
  hashRecord,
  keyValueSyncState,
  loadDeviceId,
} from "./state";

function memoryKeyValue() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

describe("sync state", () => {
  test("a device ID is minted once per browser profile and kept", () => {
    const store = memoryKeyValue();
    let minted = 0;
    const mint = () => `id-${++minted}`;
    expect(loadDeviceId(store, mint)).toBe("id-1");
    expect(loadDeviceId(store, mint)).toBe("id-1");
    expect(minted).toBe(1);
  });

  test("a device ID still works when storage refuses it", () => {
    const store = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(loadDeviceId(store, () => "temp")).toBe("temp");
  });

  test("a world's state round-trips, apart from other worlds and from the records", () => {
    const store = memoryKeyValue();
    const one = keyValueSyncState(store, "one");
    const state = {
      cursor: 7,
      records: { "documents:d1": { rev: 7, hash: "abc" } },
    };
    expect(one.save(state).isOk()).toBe(true);
    expect(one.load()).toEqual(state);
    expect(keyValueSyncState(store, "two").load()).toEqual(EMPTY_SYNC_STATE);
    expect([...store.items.keys()]).toEqual(["worldcrafter:one:sync"]);
  });

  test("unreadable state reads as empty, and bad entries are dropped", () => {
    const store = memoryKeyValue();
    const state = keyValueSyncState(store, "w");
    store.setItem("worldcrafter:w:sync", "{not json");
    expect(state.load()).toEqual(EMPTY_SYNC_STATE);
    store.setItem(
      "worldcrafter:w:sync",
      JSON.stringify({
        cursor: 3,
        records: { a: { rev: 1, hash: "h" }, b: { rev: -1, hash: "h" } },
      }),
    );
    expect(state.load()).toEqual({
      cursor: 3,
      records: { a: { rev: 1, hash: "h" } },
    });
  });

  test("a failed save is reported", () => {
    const state = keyValueSyncState(
      {
        getItem: () => null,
        setItem: () => {
          throw new Error("full");
        },
      },
      "w",
    );
    expect(state.save(EMPTY_SYNC_STATE)._unsafeUnwrapErr()).toBe("full");
  });

  test("records hash the same whatever their key order", async () => {
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: null }] })).toBe(
      '{"a":[{"c":null,"d":2}],"b":1}',
    );
    expect(await hashRecord({ id: "x", n: 1 })).toBe(
      await hashRecord({ n: 1, id: "x" }),
    );
    expect(await hashRecord({ id: "x", n: 1 })).not.toBe(
      await hashRecord({ id: "x", n: 2 }),
    );
  });
});
