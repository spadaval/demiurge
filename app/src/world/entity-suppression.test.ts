import { beforeEach, describe, expect, it } from "bun:test";
import {
  clearParagraphSuppressions,
  createParagraphSuppressionKey,
  createSuppressionSignature,
  isSuppressed,
  type KeyValueStore,
  pruneSuppressionStore,
  recordSuppression,
  SUPPRESSION_STORAGE_KEY,
} from "./entity-suppression";

function memoryStore(): KeyValueStore {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

describe("entity-suppression", () => {
  let store: KeyValueStore;

  beforeEach(() => {
    store = memoryStore();
  });

  it("records and reads suppression entries", () => {
    const docId = "doc-1";
    const paragraphKey = createParagraphSuppressionKey(
      docId,
      [2],
      "Aria lives in Sol",
    );
    const signature = createSuppressionSignature({
      end: 4,
      kind: "person",
      spanText: "Aria",
      start: 0,
    });

    recordSuppression(store, docId, paragraphKey, signature);

    expect(isSuppressed(store, docId, paragraphKey, signature)).toBe(true);
  });

  it("matches the span case- and whitespace-insensitively", () => {
    const paragraphKey = createParagraphSuppressionKey("doc-1", [0], "Sol");
    recordSuppression(
      store,
      "doc-1",
      paragraphKey,
      createSuppressionSignature({
        end: 3,
        kind: "place",
        spanText: "Sol",
        start: 0,
      }),
    );

    const same = createSuppressionSignature({
      end: 3,
      kind: "place",
      spanText: " SOL ",
      start: 0,
    });
    const otherKind = createSuppressionSignature({
      end: 3,
      kind: "person",
      spanText: "Sol",
      start: 0,
    });
    expect(isSuppressed(store, "doc-1", paragraphKey, same)).toBe(true);
    expect(isSuppressed(store, "doc-1", paragraphKey, otherKind)).toBe(false);
  });

  it("invalidates suppression when paragraph text hash changes", () => {
    const docId = "doc-1";
    const oldKey = createParagraphSuppressionKey(
      docId,
      [2],
      "Aria lives in Sol",
    );
    const newKey = createParagraphSuppressionKey(
      docId,
      [2],
      "Aria moved to Sol",
    );
    const signature = createSuppressionSignature({
      end: 4,
      kind: "person",
      spanText: "Aria",
      start: 0,
    });

    recordSuppression(store, docId, oldKey, signature);

    expect(isSuppressed(store, docId, newKey, signature)).toBe(false);
  });

  it("clears suppression entries for a paragraph key", () => {
    const docId = "doc-2";
    const paragraphKey = createParagraphSuppressionKey(
      docId,
      [4],
      "House Ravenfall",
    );
    const signature = createSuppressionSignature({
      end: 16,
      kind: "organization",
      spanText: "House Ravenfall",
      start: 0,
    });

    recordSuppression(store, docId, paragraphKey, signature);
    clearParagraphSuppressions(store, docId, paragraphKey);

    expect(isSuppressed(store, docId, paragraphKey, signature)).toBe(false);
  });

  it("prunes expired entries", () => {
    const now = Date.now();
    const expiredAgeMs = 8 * 24 * 60 * 60 * 1000;

    store.setItem(
      SUPPRESSION_STORAGE_KEY,
      JSON.stringify({
        "doc-expired": [
          {
            key: "person|0|4|aria",
            lastSeenAt: now - expiredAgeMs,
            paragraphKey: "doc-expired|0|abc",
            recordedAt: now - expiredAgeMs,
            signature: {
              end: 4,
              kind: "person",
              normalizedSpanText: "aria",
              start: 0,
            },
          },
        ],
      }),
    );

    pruneSuppressionStore(store);

    expect(store.getItem(SUPPRESSION_STORAGE_KEY)).toBe("{}");
  });

  it("treats unreadable stored data as no suppressions", () => {
    store.setItem(SUPPRESSION_STORAGE_KEY, "not json");
    const paragraphKey = createParagraphSuppressionKey("doc", [0], "Aria");
    const signature = createSuppressionSignature({
      end: 4,
      kind: "person",
      spanText: "Aria",
      start: 0,
    });

    expect(isSuppressed(store, "doc", paragraphKey, signature)).toBe(false);
  });

  it("caps document entries at 1000", () => {
    const docId = "doc-cap";
    for (let i = 0; i < 1005; i += 1) {
      const paragraphKey = createParagraphSuppressionKey(
        docId,
        [i],
        `Name ${i}`,
      );
      recordSuppression(
        store,
        docId,
        paragraphKey,
        createSuppressionSignature({
          end: i + 1,
          kind: "person",
          spanText: `Name ${i}`,
          start: i,
        }),
      );
    }

    const raw = store.getItem(SUPPRESSION_STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw ?? "{}") as Record<string, unknown[]>;
    expect(parsed[docId]?.length).toBe(1000);
  });
});
