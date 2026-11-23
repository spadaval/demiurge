/**
 * Persists a world's story bible through the storage adapter, one record per
 * item (`StorageAdapter.storyRecords`), and links scenes to the Plate
 * documents that hold their prose.
 *
 * Each record's ID is built from the item's own identity, so the same item
 * keeps the same ID on every device and a sync can merge the bible record by
 * record: `actor/mara`, `cause/storm/wreck`, `position/storm/world`. Parts
 * are URI-encoded, so a `/` inside an ID can't make two items collide.
 * Three records are singletons: `story` (version and premise), `timeline`
 * (its version and world unit) and `sceneOrder` (the scene IDs in telling
 * order, since scenes are kept one per record).
 *
 * Saving writes only the records whose content changed, with the caller's
 * time as `updatedAt`, and deletes the records of items the story no longer
 * has, all in one batch. Loading assembles the records into the story file's
 * shape and checks it with the same checks as a story file (`storyFromJson`),
 * so a stored bible is held to the file's rules.
 *
 * Commands on one adapter run one at a time, so each sees the previous one's
 * result. Other tabs are not coordinated: last write wins.
 */

import {
  err,
  errAsync,
  ok,
  okAsync,
  type Result,
  ResultAsync,
} from "neverthrow";
import { failure } from "../storage/internal";
import { createCommandQueue } from "../storage/queue";
import type {
  BatchWrite,
  JsonValue,
  StorageAdapter,
  StorageError,
  StoredDocument,
  StoredStoryRecord,
} from "../storage/types";
import { emptyTimeline } from "../time/timeline";
import {
  applyStoryCommand,
  type StoryChange,
  type StoryCommand,
} from "./commands";
import {
  newStory,
  type Ref,
  type Scene,
  STORY_VERSION,
  type Story,
  type StoryError,
  storyFromJson,
} from "./story";

export type StoryStoreError = StorageError | StoryError;

/** Every kind of story record, in the order a story lists them. */
export const STORY_RECORD_KINDS = [
  "story",
  "actor",
  "drive",
  "fact",
  "readerQuestion",
  "scene",
  "sceneOrder",
  "openQuestion",
  "cause",
  "deliberateGap",
  "version",
  "knowledge",
  "object",
  "participant",
  "count",
  "membership",
  "timeline",
  "event",
  "position",
  "constraint",
  "placement",
  "frame",
  "correspondence",
  "follow",
  "reveal",
] as const;

export type StoryRecordKind = (typeof STORY_RECORD_KINDS)[number];

/** A story record before storage stamps it with a time. */
export type StoryRecord = {
  id: string;
  kind: StoryRecordKind;
  data: JsonValue;
};

/** `kind/part/...`, each part URI-encoded. */
export function storyRecordId(
  kind: StoryRecordKind,
  ...parts: readonly string[]
): string {
  return [kind, ...parts.map(encodeURIComponent)].join("/");
}

const refParts = (ref: Ref): string[] =>
  ref.kind === "candidate"
    ? [ref.kind, ref.questionId, ref.id]
    : [ref.kind, ref.id];

/** A copy that is plain JSON: absent optional fields are dropped. */
const json = (value: unknown): JsonValue => JSON.parse(JSON.stringify(value));

/** JSON with object keys sorted, so equal values give equal text. */
function canonical(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((key) => {
      const item = value[key];
      return item === undefined
        ? ""
        : `${JSON.stringify(key)}:${canonical(item)}`;
    })
    .filter((part) => part !== "")
    .join(",")}}`;
}

/**
 * The story as records, one per item. Refuses a story with two items that
 * would share a record, such as two actors with one ID, since storing it
 * would keep only one of them.
 */
export function storyToRecords(
  story: Story,
): Result<StoryRecord[], StoryError> {
  const records: StoryRecord[] = [];
  const add = (kind: StoryRecordKind, parts: string[], data: unknown) => {
    records.push({ id: storyRecordId(kind, ...parts), kind, data: json(data) });
  };
  const each = <T>(
    kind: StoryRecordKind,
    items: readonly T[],
    parts: (item: T) => string[],
  ) => {
    for (const item of items) add(kind, parts(item), item);
  };
  const byId = ({ id }: { id: string }) => [id];
  const { timeline } = story;

  add("story", [], { version: story.version, premise: story.premise });
  each("actor", story.actors, byId);
  each("drive", story.drives, byId);
  each("fact", story.facts, byId);
  each("readerQuestion", story.readerQuestions, byId);
  each("scene", story.scenes, byId);
  add(
    "sceneOrder",
    [],
    story.scenes.map((scene) => scene.id),
  );
  each("openQuestion", story.openQuestions, byId);
  each("cause", story.causes, ({ cause, effect }) => [cause, effect]);
  each("deliberateGap", story.deliberateGaps, ({ gap, ref }) => [
    gap,
    ...(ref === null ? [] : refParts(ref)),
  ]);
  each("version", story.versions, byId);
  each("knowledge", story.knowledge, byId);
  each("object", story.objects, byId);
  each("participant", story.participants, ({ event, who }) => [
    event,
    ...refParts(who),
  ]);
  each("count", story.counts, byId);
  each("membership", story.memberships, byId);
  add("timeline", [], {
    version: timeline.version,
    worldUnit: timeline.worldUnit,
  });
  each("event", timeline.events, byId);
  each("position", timeline.positions, ({ event, frame }) => [event, frame]);
  each("constraint", timeline.constraints, byId);
  each("placement", timeline.placements, ({ scene }) => [scene]);
  each("frame", timeline.frames, byId);
  each("correspondence", timeline.correspondences, byId);
  each("follow", timeline.follows, ({ entity }) => [entity]);
  each("reveal", timeline.reveals, byId);

  const seen = new Set<string>();
  for (const { id } of records) {
    if (seen.has(id)) {
      return err({
        kind: "invalid_story",
        message: `two items would be stored as ${id}`,
      });
    }
    seen.add(id);
  }
  return ok(records);
}

const KIND_SET: ReadonlySet<string> = new Set(STORY_RECORD_KINDS);
const isKind = (kind: string): kind is StoryRecordKind => KIND_SET.has(kind);

const isRecord = (value: JsonValue): value is { [key: string]: JsonValue } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Assembles stored records into a story and checks it as a story file is
 * checked. No records at all is an empty story. A missing `story` or
 * `timeline` record reads as an empty premise or a new timeline's unit, and
 * the scene order lists any scene it doesn't name last, by ID, so a bible
 * whose records arrived apart (from a sync, say) still loads.
 */
export function storyFromRecords(
  records: readonly Pick<StoredStoryRecord, "id" | "kind" | "data">[],
): Result<Story, StoryError> {
  if (records.length === 0) return ok(newStory(""));
  const invalid = (message: string) =>
    err<never, StoryError>({ kind: "invalid_story", message });
  const lists = new Map<StoryRecordKind, JsonValue[]>(
    STORY_RECORD_KINDS.map((kind) => [kind, []]),
  );
  for (const record of records) {
    if (!isKind(record.kind)) {
      return invalid(`record ${record.id} has unknown kind ${record.kind}`);
    }
    lists.get(record.kind)?.push(record.data);
  }
  const all = (kind: StoryRecordKind) => lists.get(kind) ?? [];
  const single = (
    kind: StoryRecordKind,
  ): Result<JsonValue | null, StoryError> => {
    const found = all(kind);
    if (found.length > 1)
      return invalid(`there are ${found.length} ${kind} records`);
    return ok(found[0] ?? null);
  };

  return single("story").andThen((meta) =>
    single("timeline").andThen((timelineMeta) =>
      single("sceneOrder").andThen((order) => {
        if (meta !== null && !isRecord(meta)) {
          return invalid("record story must be an object");
        }
        if (timelineMeta !== null && !isRecord(timelineMeta)) {
          return invalid("record timeline must be an object");
        }
        if (
          order !== null &&
          !(Array.isArray(order) && order.every((id) => typeof id === "string"))
        ) {
          return invalid("record sceneOrder must be a list of scene IDs");
        }
        const scenes = inTellingOrder(all("scene"), order ?? []);
        return storyFromJson({
          version: meta?.version ?? STORY_VERSION,
          premise: meta?.premise ?? "",
          actors: all("actor"),
          drives: all("drive"),
          facts: all("fact"),
          readerQuestions: all("readerQuestion"),
          scenes,
          openQuestions: all("openQuestion"),
          causes: all("cause"),
          deliberateGaps: all("deliberateGap"),
          versions: all("version"),
          knowledge: all("knowledge"),
          objects: all("object"),
          participants: all("participant"),
          counts: all("count"),
          memberships: all("membership"),
          timeline: {
            version: timelineMeta?.version ?? emptyTimeline.version,
            worldUnit: timelineMeta?.worldUnit ?? emptyTimeline.worldUnit,
            events: all("event"),
            positions: all("position"),
            constraints: all("constraint"),
            placements: all("placement"),
            frames: all("frame"),
            correspondences: all("correspondence"),
            follows: all("follow"),
            reveals: all("reveal"),
          },
        });
      }),
    ),
  );
}

/**
 * Scenes in the order `order` names them; a name with no scene, or a repeat,
 * is skipped, and scenes it doesn't name follow, by ID.
 */
function inTellingOrder(
  scenes: readonly JsonValue[],
  order: readonly JsonValue[],
): JsonValue[] {
  const idOf = (scene: JsonValue) =>
    isRecord(scene) && typeof scene.id === "string" ? scene.id : undefined;
  const byId = new Map<string, JsonValue>();
  const rest: JsonValue[] = [];
  for (const scene of scenes) {
    const id = idOf(scene);
    // A scene without a string ID is left for the checks to name.
    if (id === undefined || byId.has(id)) rest.push(scene);
    else byId.set(id, scene);
  }
  const ordered: JsonValue[] = [];
  for (const id of order) {
    if (typeof id !== "string") continue;
    const scene = byId.get(id);
    if (scene === undefined) continue;
    ordered.push(scene);
    byId.delete(id);
  }
  const unnamed = [...byId.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, scene]) => scene);
  return [...ordered, ...unnamed, ...rest];
}

/** What a save wrote: the IDs of the records it saved and deleted. */
export interface StorySaved {
  readonly saved: readonly string[];
  readonly deleted: readonly string[];
}

/**
 * The writes that turn `stored` into `next`: a save for each record that is
 * new or whose content changed, stamped `now`, and a delete for each record
 * `next` doesn't have.
 */
export function storyWrites(
  stored: readonly StoredStoryRecord[],
  next: readonly StoryRecord[],
  now: number,
): BatchWrite[] {
  const before = new Map(stored.map((record) => [record.id, record]));
  const writes: BatchWrite[] = [];
  for (const record of next) {
    const old = before.get(record.id);
    before.delete(record.id);
    if (
      old !== undefined &&
      old.kind === record.kind &&
      canonical(old.data) === canonical(record.data)
    ) {
      continue;
    }
    writes.push({
      kind: "saveStoryRecord",
      record: { ...record, updatedAt: now },
    });
  }
  for (const id of before.keys()) {
    writes.push({ kind: "deleteStoryRecord", id });
  }
  return writes;
}

const serialised = createCommandQueue();

const onThrow = (cause: unknown) =>
  failure({ operation: "save", collection: "storyRecords" }, cause);

function loadNow(storage: StorageAdapter) {
  return storage.storyRecords
    .list()
    .andThen((records) => storyFromRecords(records));
}

function saveNow(storage: StorageAdapter, story: Story, now: number) {
  return storyToRecords(story)
    .asyncAndThen((next) =>
      storage.storyRecords
        .list()
        .map((stored) => storyWrites(stored, next, now)),
    )
    .andThen((writes) => {
      const saved = writes.flatMap((write) =>
        write.kind === "saveStoryRecord" ? [write.record.id] : [],
      );
      const deleted = writes.flatMap((write) =>
        write.kind === "deleteStoryRecord" ? [write.id] : [],
      );
      const done: StorySaved = { saved, deleted };
      return writes.length === 0
        ? okAsync(done)
        : storage.batch(writes).map(() => done);
    });
}

/** The world's story bible. An empty store holds an empty story. */
export function loadStory(storage: StorageAdapter) {
  return serialised(storage, () => loadNow(storage), onThrow);
}

/**
 * Stores `story` as the world's bible, replacing what was stored: records it
 * doesn't have are deleted. Only records that changed are written, stamped
 * `now`; saving an unchanged story writes nothing.
 */
export function saveStory(
  storage: StorageAdapter,
  story: Story,
  now: number = Date.now(),
) {
  return serialised(storage, () => saveNow(storage, story, now), onThrow);
}

/**
 * Applies `command` to the stored bible and saves the result, as one step
 * against other commands on this adapter.
 */
export function executeStoryCommand(
  storage: StorageAdapter,
  command: StoryCommand,
  now: number = Date.now(),
) {
  return serialised(
    storage,
    () =>
      loadNow(storage).andThen((story) =>
        saveAfter(storage, story, command, now),
      ),
    onThrow,
  );
}

function saveAfter(
  storage: StorageAdapter,
  story: Story,
  command: StoryCommand,
  now: number,
) {
  const change = applyStoryCommand(story, command);
  if (change.isErr()) {
    return errAsync<StoryChange, StoryStoreError>(change.error);
  }
  return saveNow(storage, change.value.story, now).map(() => change.value);
}

/** Where one scene's prose stands. */
export type SceneProse =
  | {
      readonly kind: "linked";
      readonly scene: Scene;
      readonly document: StoredDocument;
    }
  /** The scene names no document yet. */
  | { readonly kind: "unlinked"; readonly scene: Scene }
  /** The scene names a document the store doesn't have. */
  | {
      readonly kind: "missing";
      readonly scene: Scene;
      readonly documentId: string;
    };

export interface SceneDocuments {
  /** One per scene, in telling order. */
  readonly scenes: readonly SceneProse[];
  /** Documents more than one scene names, with those scenes in telling order. */
  readonly shared: readonly {
    readonly documentId: string;
    readonly scenes: readonly string[];
  }[];
}

/**
 * Each scene's prose document. A bible links cleanly when every scene is
 * `linked` and no document is shared.
 */
export function sceneDocuments(
  storage: StorageAdapter,
  story: Story,
): ResultAsync<SceneDocuments, StorageError> {
  const byDocument = new Map<string, string[]>();
  for (const scene of story.scenes) {
    if (scene.documentId === undefined) continue;
    const scenes = byDocument.get(scene.documentId) ?? [];
    scenes.push(scene.id);
    byDocument.set(scene.documentId, scenes);
  }
  const shared = [...byDocument.entries()]
    .filter(([, scenes]) => scenes.length > 1)
    .map(([documentId, scenes]) => ({ documentId, scenes }));
  return ResultAsync.combine(
    story.scenes.map((scene): ResultAsync<SceneProse, StorageError> => {
      const { documentId } = scene;
      if (documentId === undefined) return okAsync({ kind: "unlinked", scene });
      return storage.documents
        .load(documentId)
        .map((document): SceneProse => ({ kind: "linked", scene, document }))
        .orElse((error) =>
          error.kind === "not_found"
            ? okAsync<SceneProse, StorageError>({
                kind: "missing",
                scene,
                documentId,
              })
            : errAsync(error),
        );
    }),
  ).map((scenes) => ({ scenes, shared }));
}
