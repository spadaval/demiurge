/**
 * The world file: a whole world as one JSON document, the exact export and
 * import of docs/rebuild/data-model-boundaries.md (Boundary 3). It holds
 * every record of every `StorageAdapter` collection as storage keeps it, so
 * importing a file into an empty store and exporting again gives the same
 * file: block IDs, annotations, snapshot IDs and times, story-bible records
 * and all.
 *
 *     {
 *       "format": "demiurge-world",
 *       "version": 2,
 *       "records": { "documents": [...], ..., "agentRecords": [...] }
 *     }
 *
 * `records` has one array per collection (`COLLECTION_NAMES`), in the shape
 * of `WorldRecords`. `version` is the version of this file format, not of the
 * database (`DB_VERSION`): bump it when the shape of a record changes, and
 * teach `parseWorldFile` to read the older version.
 *
 * Import checks the file's structure: every record has exactly its storage
 * fields with the right types, and no two records of a collection share a
 * key. It does not check what lives in the JSON fields (content trees, facts,
 * story data, timelines): the modules that own those check them on load, as
 * they do for stored data. A stored document may be outside the content
 * schema on purpose, and so may a `repaired_on_load` snapshot.
 *
 * The readable, one-way export of a document is `exportReadableMarkdown` in
 * `content/markdown.ts`.
 */

import { err, errAsync, ok, type Result, type ResultAsync } from "neverthrow";
import {
  type AnnotationRecord,
  COLLECTION_NAMES,
  type CollectionName,
  type CollectionRecords,
  type OutlineBook,
  type OutlineChapter,
  type Snapshot,
  type SnapshotReason,
  type StorageAdapter,
  type StorageError,
  type StoredAgentRecord,
  type StoredDocument,
  type StoredOutline,
  type StoredRequest,
  type StoredStoryRecord,
  type StoredTimeline,
  type WorldEntry,
  type WorldRecords,
} from "./types";

export const WORLD_FILE_FORMAT = "demiurge-world";
/**
 * 1: every collection up to `storyRecords`. 2: adds `agentRecords`; a version
 * 1 file reads as having none.
 */
export const WORLD_FILE_VERSION = 2;

/** The collections a file of each version holds. */
const VERSION_COLLECTIONS: Record<number, readonly CollectionName[]> = {
  1: COLLECTION_NAMES.filter((name) => name !== "agentRecords"),
  2: COLLECTION_NAMES,
};

/** A world file that can't be read: `path` locates the problem, e.g. `records.documents[2].title`. */
export type WorldFileError =
  | { readonly kind: "invalid_world_file"; path: string; reason: string }
  /** A newer (or unknown) file format version than this build reads. */
  | { readonly kind: "unsupported_world_version"; version: unknown };

export type WorldImportError =
  | WorldFileError
  /** Import only fills an empty store; this collection already has records. */
  | { readonly kind: "store_not_empty"; collection: CollectionName }
  | StorageError;

/** Every record of the world in `storage`, as world-file JSON. */
export function exportWorld(
  storage: StorageAdapter,
): ResultAsync<string, StorageError> {
  return storage.dump().map(serializeWorldFile);
}

/** `records` as world-file JSON. */
export function serializeWorldFile(records: WorldRecords): string {
  return JSON.stringify({
    format: WORLD_FILE_FORMAT,
    version: WORLD_FILE_VERSION,
    records,
  });
}

/**
 * Writes the world in `text` into `storage`, which must be empty, as one
 * atomic step. Resolves with the records written.
 */
export function importWorld(
  storage: StorageAdapter,
  text: string,
): ResultAsync<WorldRecords, WorldImportError> {
  const parsed = parseWorldFile(text);
  if (parsed.isErr()) return errAsync(parsed.error);
  const records = parsed.value;
  return storage
    .dump()
    .mapErr((error): WorldImportError => error)
    .andThen((existing) => {
      const filled = COLLECTION_NAMES.find((name) => existing[name].length > 0);
      return filled === undefined
        ? storage.restore(records).map(() => records)
        : errAsync({ kind: "store_not_empty" as const, collection: filled });
    });
}

/** Reads and checks world-file JSON. */
export function parseWorldFile(
  text: string,
): Result<WorldRecords, WorldFileError> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (cause) {
    return err({
      kind: "invalid_world_file",
      path: "(root)",
      reason: `not JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
    });
  }
  if (!isRecord(value) || value.format !== WORLD_FILE_FORMAT) {
    return invalid("format", `expected "${WORLD_FILE_FORMAT}"`);
  }
  const names =
    typeof value.version === "number"
      ? VERSION_COLLECTIONS[value.version]
      : undefined;
  if (names === undefined) {
    return err({ kind: "unsupported_world_version", version: value.version });
  }
  const keys = checkKeys(value, ["format", "version", "records"], "");
  if (keys.isErr()) return err(keys.error);
  return checkRecords(value.records, names);
}

// ------------------------------------------------------------------ checks

type Check<T> = Result<T, WorldFileError>;

const invalid = (path: string, reason: string): Check<never> =>
  err({ kind: "invalid_world_file", path, reason });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Refuses properties outside `allowed`, so imported records keep storage's shape. */
function checkKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): Check<void> {
  for (const key of allowed) {
    if (!(key in value)) return invalid(join(path, key), "missing");
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      return invalid(join(path, key), "not a field of this record");
    }
  }
  return ok(undefined);
}

const join = (path: string, key: string) =>
  path === "" ? key : `${path}.${key}`;

/** Checks one value; `path` locates it in the file. */
type Checker<T = unknown> = (value: unknown, path: string) => Check<T>;

/** A record's fields by name, each with a check of its value. */
type Fields = Record<string, Checker>;

const expect =
  (test: (value: unknown) => boolean, reason: string): Checker =>
  (value, path) =>
    test(value) ? ok(value) : invalid(path, reason);

const string = expect((v) => typeof v === "string", "expected a string");
const nullableString = expect(
  (v) => v === null || typeof v === "string",
  "expected a string or null",
);
const time = expect(
  (v) => typeof v === "number" && Number.isFinite(v),
  "expected a finite number",
);
/** Any JSON value: the file was parsed from JSON, so everything is one. */
const json: Checker = (value) => ok(value);
const snapshotId = expect(
  (v) => typeof v === "number" && Number.isSafeInteger(v) && v > 0,
  "expected a positive integer",
);
const SNAPSHOT_REASONS: readonly SnapshotReason[] = [
  "accepted_ai_change",
  "periodic",
  "repaired_on_load",
];
const snapshotReason = expect(
  (v) => SNAPSHOT_REASONS.some((reason) => reason === v),
  `expected one of ${SNAPSHOT_REASONS.join(", ")}`,
);

/** A record with exactly `fields`, each passing its check. */
const shape =
  <T>(fields: Fields): Checker<T> =>
  (value, path) => {
    if (!isRecord(value)) return invalid(path, "expected an object");
    const keys = checkKeys(value, Object.keys(fields), path);
    if (keys.isErr()) return err(keys.error);
    for (const [name, check] of Object.entries(fields)) {
      const checked = check(value[name], join(path, name));
      if (checked.isErr()) return err(checked.error);
    }
    // Every field was checked above and no other field is present.
    return ok(value as T);
  };

const arrayOf =
  <T>(item: Checker<T>): Checker<T[]> =>
  (value, path) => {
    if (!Array.isArray(value)) return invalid(path, "expected an array");
    const items: T[] = [];
    for (const [i, entry] of value.entries()) {
      const checked = item(entry, `${path}[${i}]`);
      if (checked.isErr()) return err(checked.error);
      items.push(checked.value);
    }
    return ok(items);
  };

const chapter = shape<OutlineChapter>({
  id: string,
  title: string,
  scenes: arrayOf(string),
});
const book = shape<OutlineBook>({
  id: string,
  title: string,
  chapters: arrayOf(chapter),
});

/** Each collection's record check and key. */
const COLLECTIONS: {
  readonly [Name in CollectionName]: {
    readonly check: Checker<CollectionRecords[Name]>;
    readonly key: (record: CollectionRecords[Name]) => string | number;
  };
} = {
  documents: {
    check: shape<StoredDocument>({
      id: string,
      title: string,
      content: json,
      updatedAt: time,
    }),
    key: (record) => record.id,
  },
  worldEntries: {
    check: shape<WorldEntry>({
      documentId: string,
      facts: json,
      updatedAt: time,
    }),
    key: (record) => record.documentId,
  },
  annotations: {
    check: shape<AnnotationRecord>({
      id: string,
      documentId: string,
      kind: string,
      data: json,
      updatedAt: time,
    }),
    key: (record) => record.id,
  },
  requests: {
    check: shape<StoredRequest>({
      id: string,
      documentId: nullableString,
      request: json,
      createdAt: time,
    }),
    key: (record) => record.id,
  },
  snapshots: {
    check: shape<Snapshot>({
      id: snapshotId,
      documentId: string,
      reason: snapshotReason,
      createdAt: time,
      content: json,
    }),
    key: (record) => record.id,
  },
  outlines: {
    check: shape<StoredOutline>({
      id: string,
      books: arrayOf(book),
      updatedAt: time,
    }),
    key: (record) => record.id,
  },
  timelines: {
    check: shape<StoredTimeline>({
      id: string,
      timeline: json,
      updatedAt: time,
    }),
    key: (record) => record.id,
  },
  storyRecords: {
    check: shape<StoredStoryRecord>({
      id: string,
      kind: string,
      data: json,
      updatedAt: time,
    }),
    key: (record) => record.id,
  },
  agentRecords: {
    check: shape<StoredAgentRecord>({
      id: string,
      sessionId: string,
      kind: string,
      data: json,
      updatedAt: time,
    }),
    key: (record) => record.id,
  },
};

function checkCollection<Name extends CollectionName>(
  name: Name,
  value: unknown,
): Check<CollectionRecords[Name][]> {
  const path = `records.${name}`;
  const { check, key } = COLLECTIONS[name];
  const records = arrayOf(check)(value, path);
  if (records.isErr()) return records;
  const seen = new Set<string | number>();
  for (const [i, record] of records.value.entries()) {
    const id = key(record);
    if (seen.has(id)) {
      return invalid(
        `${path}[${i}]`,
        `a second record with key ${JSON.stringify(id)}`,
      );
    }
    seen.add(id);
  }
  return records;
}

/** The records of a file holding the collections `names`; the rest are empty. */
function checkRecords(
  value: unknown,
  names: readonly CollectionName[],
): Check<WorldRecords> {
  if (!isRecord(value)) return invalid("records", "expected an object");
  const keys = checkKeys(value, names, "records");
  if (keys.isErr()) return err(keys.error);
  const records: Partial<Record<CollectionName, unknown[]>> = {};
  for (const name of COLLECTION_NAMES) {
    if (!names.includes(name)) {
      records[name] = [];
      continue;
    }
    const checked = checkCollection(name, value[name]);
    if (checked.isErr()) return err(checked.error);
    records[name] = checked.value;
  }
  // Every collection was filled above with its own record type.
  return ok(records as unknown as WorldRecords);
}
