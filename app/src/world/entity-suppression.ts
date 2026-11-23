/**
 * Remembered dismissals of entity suggestions, ported from the old app's
 * `src/lib/entity-suppression.ts`. A dismissal is keyed by document, by
 * paragraph (its path plus a hash of its text, so editing the paragraph
 * forgets it), and by the suggested span and kind. Entries expire after a
 * week and each document keeps at most 1000.
 *
 * The store is passed in (localStorage in the browser), as `workspace/tabs.ts`
 * does, so tests and non-browser callers need no global `window`.
 */

import type { Kind } from "./kinds";

/** The subset of `Storage` (localStorage) used to persist suppressions. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// The old app's key, kept so dismissals recorded there are not stranded.
export const SUPPRESSION_STORAGE_KEY = "entitySuppressionStore";
const SUPPRESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES_PER_DOCUMENT = 1000;

export interface SuppressionSignature {
  end: number;
  kind: Kind;
  normalizedSpanText: string;
  start: number;
}

interface SuppressionEntry {
  key: string;
  lastSeenAt: number;
  paragraphKey: string;
  recordedAt: number;
  signature: SuppressionSignature;
}

type SuppressionStore = Record<string, SuppressionEntry[]>;

function normalizeSpanText(text: string): string {
  return text.trim().toLocaleLowerCase();
}

function hashText(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function createParagraphSuppressionKey(
  docId: string,
  paragraphPath: readonly number[],
  paragraphText: string,
): string {
  return `${docId}|${paragraphPath.join(".")}|${hashText(paragraphText)}`;
}

export function createSuppressionSignature(input: {
  end: number;
  kind: Kind;
  spanText: string;
  start: number;
}): SuppressionSignature {
  return {
    end: input.end,
    kind: input.kind,
    normalizedSpanText: normalizeSpanText(input.spanText),
    start: input.start,
  };
}

function toEntryKey(signature: SuppressionSignature): string {
  return [
    signature.kind,
    signature.start,
    signature.end,
    signature.normalizedSpanText,
  ].join("|");
}

/** Anything unreadable counts as no suppressions: this is a cache only. */
function readStore(store: KeyValueStore): SuppressionStore {
  try {
    const raw = store.getItem(SUPPRESSION_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const result: SuppressionStore = {};
    for (const [docId, entries] of Object.entries(parsed)) {
      if (Array.isArray(entries)) {
        result[docId] = entries.filter(isEntry);
      }
    }
    return result;
  } catch {
    return {};
  }
}

function isEntry(value: unknown): value is SuppressionEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.key === "string" &&
    typeof entry.paragraphKey === "string" &&
    typeof entry.lastSeenAt === "number" &&
    typeof entry.recordedAt === "number" &&
    typeof entry.signature === "object" &&
    entry.signature !== null
  );
}

function writeStore(store: KeyValueStore, value: SuppressionStore): void {
  try {
    store.setItem(SUPPRESSION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Best-effort cache only; a lost dismissal just shows the suggestion again.
  }
}

function pruneStore(value: SuppressionStore): SuppressionStore {
  const now = Date.now();
  const next: SuppressionStore = {};

  for (const [docId, entries] of Object.entries(value)) {
    const unexpired = entries.filter(
      (entry) => now - entry.recordedAt <= SUPPRESSION_TTL_MS,
    );
    if (!unexpired.length) continue;

    unexpired.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    next[docId] = unexpired.slice(0, MAX_ENTRIES_PER_DOCUMENT);
  }

  return next;
}

export function pruneSuppressionStore(store: KeyValueStore): void {
  writeStore(store, pruneStore(readStore(store)));
}

export function recordSuppression(
  store: KeyValueStore,
  docId: string,
  paragraphKey: string,
  signature: SuppressionSignature,
): void {
  const value = pruneStore(readStore(store));
  const docEntries = [...(value[docId] ?? [])];
  const now = Date.now();
  const key = toEntryKey(signature);

  const existing = docEntries.find(
    (entry) => entry.paragraphKey === paragraphKey && entry.key === key,
  );

  if (existing) {
    existing.lastSeenAt = now;
    existing.recordedAt = now;
  } else {
    docEntries.push({
      key,
      lastSeenAt: now,
      paragraphKey,
      recordedAt: now,
      signature,
    });
  }

  docEntries.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  value[docId] = docEntries.slice(0, MAX_ENTRIES_PER_DOCUMENT);
  writeStore(store, value);
}

export function isSuppressed(
  store: KeyValueStore,
  docId: string,
  paragraphKey: string,
  signature: SuppressionSignature,
): boolean {
  const value = pruneStore(readStore(store));
  const key = toEntryKey(signature);

  const entry = (value[docId] ?? []).find(
    (item) => item.paragraphKey === paragraphKey && item.key === key,
  );

  if (entry) entry.lastSeenAt = Date.now();
  writeStore(store, value);
  return entry !== undefined;
}

export function clearParagraphSuppressions(
  store: KeyValueStore,
  docId: string,
  paragraphKey: string,
): void {
  const value = pruneStore(readStore(store));
  const next = (value[docId] ?? []).filter(
    (entry) => entry.paragraphKey !== paragraphKey,
  );

  if (next.length === 0) {
    delete value[docId];
  } else {
    value[docId] = next;
  }

  writeStore(store, value);
}
