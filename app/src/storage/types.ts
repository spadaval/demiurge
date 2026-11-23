import type { ResultAsync } from "neverthrow";

/**
 * Any value that survives a JSON round trip. Document content is stored as
 * this type so storage stays independent of the content schema, which owns
 * the real node types.
 */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Every collection the adapter persists, in the order a world dump lists
 * them. Adding one here makes `WorldRecords` (and so `dump`, `restore` and the
 * world file) require it.
 */
export const COLLECTION_NAMES = [
  "documents",
  "worldEntries",
  "annotations",
  "requests",
  "snapshots",
  "outlines",
  "timelines",
  "storyRecords",
] as const;

/** Names a collection, for errors and for the world dump. */
export type CollectionName = (typeof COLLECTION_NAMES)[number];

export type StorageOperation = "open" | "save" | "load" | "list" | "delete";

/** A load asked for a record that does not exist. Expected, not exceptional. */
export interface NotFoundError {
  readonly kind: "not_found";
  readonly collection: CollectionName;
  readonly id: string;
}

/** The backing store failed (closed, quota, uncloneable value, blocked upgrade, …). */
export interface StorageFailure {
  readonly kind: "failure";
  readonly operation: StorageOperation;
  /** Absent only for failures opening the store as a whole. */
  readonly collection?: CollectionName;
  readonly id?: string;
  readonly message: string;
  readonly cause: unknown;
}

/**
 * A write refused because this tab is read-only (another tab is the world's
 * writer). Nothing was written. Expected, not exceptional: never retried.
 */
export interface ReadOnlyError {
  readonly kind: "read_only";
  readonly operation: "save" | "delete";
  readonly collection: CollectionName;
  /** The record's key; absent for a snapshot, whose ID the store assigns. */
  readonly id?: string;
}

export type StorageError = NotFoundError | StorageFailure | ReadOnlyError;

export interface StoredDocument {
  readonly id: string;
  readonly title: string;
  /** The content tree: an array of `{ type, id, children }` blocks. */
  readonly content: JsonValue;
  /** Epoch milliseconds, set by the caller. */
  readonly updatedAt: number;
}

/** Structured facts about the world, one record per document. */
export interface WorldEntry {
  readonly documentId: string;
  readonly facts: JsonValue;
  readonly updatedAt: number;
}

/**
 * An annotation or provenance record kept beside the content tree. `id` is the
 * block ID or AI segment ID it describes.
 */
export interface AnnotationRecord {
  readonly id: string;
  readonly documentId: string;
  readonly kind: string;
  readonly data: JsonValue;
  readonly updatedAt: number;
}

/**
 * A manuscript outline: ordered books of ordered chapters of scenes. Scenes
 * are references to documents by ID, never their content. The outline module
 * (`src/outline`) owns the invariants and the commands that edit it.
 */
export interface StoredOutline {
  readonly id: string;
  readonly books: readonly OutlineBook[];
  /** Epoch milliseconds, set by the caller. */
  readonly updatedAt: number;
}

export interface OutlineBook {
  readonly id: string;
  readonly title: string;
  readonly chapters: readonly OutlineChapter[];
}

export interface OutlineChapter {
  readonly id: string;
  readonly title: string;
  /** Document IDs of the chapter's scenes, in reading order. */
  readonly scenes: readonly string[];
}

/**
 * A world's story time: events, ordering constraints, frames and reveals. The
 * story-time module (`src/time`) owns its shape, checks it on load and owns
 * the commands that edit it; storage keeps it as JSON.
 */
export interface StoredTimeline {
  readonly id: string;
  readonly timeline: JsonValue;
  /** Epoch milliseconds, set by the caller. */
  readonly updatedAt: number;
}

/**
 * One record of a world's story bible: an actor, a drive, a scene, a timeline
 * event, and so on. The story module (`src/story/store.ts`) owns the kinds,
 * how `id` is built from a record's own identity, the shape of `data`, and the
 * checks on load; storage keeps `data` as JSON. A world has one bible, stored
 * one record per item so that devices can sync and merge it record by record.
 */
export interface StoredStoryRecord {
  /** `<kind>/<part>/...`, unique across the bible; see `src/story/store.ts`. */
  readonly id: string;
  readonly kind: string;
  readonly data: JsonValue;
  /** Epoch milliseconds, set by the caller when the record last changed. */
  readonly updatedAt: number;
}

/** An assembled LLM request, kept so it can be viewed and debugged. */
export interface StoredRequest {
  readonly id: string;
  readonly documentId: string | null;
  readonly request: JsonValue;
  readonly createdAt: number;
}

/**
 * `repaired_on_load`: the stored content was outside the content schema (for
 * example repeated block IDs) and the editor repaired it; the snapshot keeps
 * the original before the repaired version replaces it.
 */
export type SnapshotReason =
  | "accepted_ai_change"
  | "periodic"
  | "repaired_on_load";

export interface NewSnapshot {
  readonly documentId: string;
  readonly reason: SnapshotReason;
  readonly content: JsonValue;
}

/** A snapshot without its content, as returned by `list`. */
export interface SnapshotInfo {
  /** Assigned by the store; increases with every save, so it orders snapshots. */
  readonly id: number;
  readonly documentId: string;
  readonly reason: SnapshotReason;
  /** Epoch milliseconds, set by the store when saved. */
  readonly createdAt: number;
}

export interface Snapshot extends SnapshotInfo {
  readonly content: JsonValue;
}

/**
 * A keyed collection. `save` inserts or replaces (last write wins). `load` of
 * a missing key fails with `NotFoundError`. `list` is ascending by key.
 * `delete` of a missing key succeeds.
 */
export interface Collection<T> {
  save(record: T): ResultAsync<void, StorageError>;
  load(key: string): ResultAsync<T, StorageError>;
  list(): ResultAsync<T[], StorageError>;
  delete(key: string): ResultAsync<void, StorageError>;
}

export interface AnnotationCollection extends Collection<AnnotationRecord> {
  /** Annotations of one document, ascending by ID. */
  listForDocument(
    documentId: string,
  ): ResultAsync<AnnotationRecord[], StorageError>;
}

/**
 * Revision history of documents. Snapshots are append-only and kept on
 * purpose, including after their document is deleted, so it can be recovered.
 */
export interface SnapshotCollection {
  save(snapshot: NewSnapshot): ResultAsync<SnapshotInfo, StorageError>;
  /** Snapshots of one document, oldest first. */
  list(documentId: string): ResultAsync<SnapshotInfo[], StorageError>;
  load(id: number): ResultAsync<Snapshot, StorageError>;
}

/**
 * One write in a `StorageAdapter.batch`. The kinds are the ones accepting an
 * AI segment needs together (the document, its provenance record, and the
 * revision snapshot), and the story-bible record writes that saving a story
 * makes together; add a kind when another flow needs one.
 */
export type BatchWrite =
  | { readonly kind: "saveDocument"; readonly record: StoredDocument }
  | { readonly kind: "saveAnnotation"; readonly record: AnnotationRecord }
  | { readonly kind: "saveSnapshot"; readonly snapshot: NewSnapshot }
  | { readonly kind: "saveStoryRecord"; readonly record: StoredStoryRecord }
  | { readonly kind: "deleteStoryRecord"; readonly id: string };

/** The record type each collection holds; snapshots with their content. */
export interface CollectionRecords {
  readonly documents: StoredDocument;
  readonly worldEntries: WorldEntry;
  readonly annotations: AnnotationRecord;
  readonly requests: StoredRequest;
  readonly snapshots: Snapshot;
  readonly outlines: StoredOutline;
  readonly timelines: StoredTimeline;
  readonly storyRecords: StoredStoryRecord;
}

/**
 * Every record of a world, by collection. Keyed collections are ascending by
 * key, as `list` returns them; snapshots are ascending by ID and keep the ID
 * and `createdAt` the store gave them.
 */
export type WorldRecords = {
  readonly [Name in CollectionName]: readonly CollectionRecords[Name][];
};

/**
 * The only way the app persists data. Deleting a document does not delete its
 * world entry, annotations or requests; callers delete those explicitly. Its
 * snapshots are never deleted (see `SnapshotCollection`).
 */
export interface StorageAdapter {
  readonly documents: Collection<StoredDocument>;
  /** Keyed by `documentId`. */
  readonly worldEntries: Collection<WorldEntry>;
  readonly annotations: AnnotationCollection;
  readonly requests: Collection<StoredRequest>;
  readonly snapshots: SnapshotCollection;
  /** Keyed by `id`. A world has one outline, saved and loaded whole. */
  readonly outlines: Collection<StoredOutline>;
  /** Keyed by `id`. A world has one timeline, saved and loaded whole. */
  readonly timelines: Collection<StoredTimeline>;
  /**
   * Keyed by `id`. The world's story bible, one record per item; saved
   * through `src/story/store.ts`, which writes only the records that changed.
   */
  readonly storyRecords: Collection<StoredStoryRecord>;
  /**
   * Applies `writes` in order as one atomic step: either all take effect or
   * none does. Resolves with the info of each snapshot saved, in order. A
   * failure names the first write's collection.
   */
  batch(
    writes: readonly BatchWrite[],
  ): ResultAsync<SnapshotInfo[], StorageError>;
  /**
   * Every record in every collection, read as one consistent step: no write
   * lands part-way through. For the world file (`storage/world-file.ts`).
   */
  dump(): ResultAsync<WorldRecords, StorageError>;
  /**
   * Writes every record of `records` as one atomic step, inserting or
   * replacing by key. Snapshots keep their ID and `createdAt`, and later
   * snapshot saves get IDs above every restored one. Restoring a dump into an
   * empty store makes `dump` return it unchanged. A failure names the first
   * collection that has a record.
   */
  restore(records: WorldRecords): ResultAsync<void, StorageError>;
  /** Releases the store. Later operations fail with a `StorageFailure`. */
  close(): void;
}
