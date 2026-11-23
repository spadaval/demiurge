/**
 * Stored generation requests: every assembled request is kept, with an ID, so
 * it can be shown and edited before sending, and so outputs can point back to
 * the request that produced them (`Provenance.requestId`).
 *
 * Requests are never changed in place. Editing one stores a new revision that
 * names its parent, so the request sent can always be told apart from the one
 * assembled. Only an assembled request has a breakdown: an edit can change
 * any part of the text, so a revision instead names the assembled request its
 * chain started from (`assembledFrom`), whose breakdown says how the original
 * was put together.
 *
 * Storage keeps the record in the `requests` collection; this module owns the
 * shape of its `request` JSON and checks it on load.
 */

import { err, ok, type Result, type ResultAsync } from "neverthrow";
import type {
  BackendKind,
  JsonObject,
  LlmRequest,
  ProfileTarget,
} from "../llm/types";
import type { JsonValue, StorageAdapter, StorageError } from "../storage/types";
import type {
  AssembledRequest,
  BibleBreakdown,
  CardChoice,
  CardReason,
  ContextBreakdown,
  WindowLimit,
} from "./builder";

type RequestCommon = {
  id: string;
  documentId: string;
  /** Epoch milliseconds. */
  createdAt: number;
  /** The exact request to send. */
  request: LlmRequest;
  /**
   * The top-level block the output goes after, where the request's story
   * window ends; `null` is the end of the document. Sending puts the output
   * there unless told otherwise. A revision keeps its parent's.
   */
  after: string | null;
  /**
   * The profile's server, kind and model when the request was assembled or
   * last retargeted; a writer's revision keeps its parent's. Absent on
   * requests stored before it was recorded.
   */
  madeFor?: ProfileTarget;
};

/** A request as the builder assembled it. */
export type AssembledRecord = RequestCommon & {
  origin: "assembled";
  breakdown: ContextBreakdown;
};

/** A writer's edit of another stored request. */
export type RevisionRecord = RequestCommon & {
  origin: "revision";
  /** The request this one was edited from. */
  parentId: string;
  /** The assembled request at the root of the chain of edits. */
  assembledFrom: string;
};

export type ContextRequest = AssembledRecord | RevisionRecord;

export type RequestStoreError =
  | StorageError
  /** A stored record is not in the expected shape. */
  | { kind: "invalid_request_record"; id: string; reason: string };

export interface RequestStore {
  /**
   * Stores an assembled request, continuing after block `after`, under a
   * new ID; `madeFor` is its profile's target as it was assembled.
   */
  save(
    assembled: AssembledRequest,
    after: string | null,
    madeFor?: ProfileTarget,
  ): ResultAsync<AssembledRecord, RequestStoreError>;
  load(id: string): ResultAsync<ContextRequest, RequestStoreError>;
  /**
   * Stores `request` as a new revision of `parentId`, which is kept as it
   * was. The revision belongs to the parent's document. It keeps the
   * parent's `madeFor` unless given another (a retargeted revision).
   */
  revise(
    parentId: string,
    request: LlmRequest,
    madeFor?: ProfileTarget,
  ): ResultAsync<RevisionRecord, RequestStoreError>;
}

export interface RequestStoreOptions {
  now?: () => number;
  newId?: () => string;
}

/**
 * Version of the `request` JSON this module writes. Versions 1 (revisions
 * copied their parent's breakdown) and 2 (no `after`) were never released:
 * nothing stored requests before generation was wired into the app. So
 * they aren't read.
 */
export const REQUEST_RECORD_VERSION = 3;

type Stored = "after" | "madeFor";
type Body =
  | Omit<AssembledRecord, Exclude<keyof RequestCommon, Stored>>
  | Omit<RevisionRecord, Exclude<keyof RequestCommon, Stored>>;

export function createRequestStore(
  storage: StorageAdapter,
  options: RequestStoreOptions = {},
): RequestStore {
  const now = options.now ?? Date.now;
  const newId = options.newId ?? (() => crypto.randomUUID());

  function store<T extends ContextRequest>(
    record: T,
  ): ResultAsync<T, RequestStoreError> {
    const { id, documentId, createdAt, madeFor, ...body } = record;
    return storage.requests
      .save({
        id,
        documentId,
        createdAt,
        request: {
          version: REQUEST_RECORD_VERSION,
          ...body,
          ...(madeFor ? { madeFor } : {}),
        },
      })
      .map(() => record);
  }

  const load = (id: string): ResultAsync<ContextRequest, RequestStoreError> =>
    storage.requests.load(id).andThen((record) => {
      const invalid = (reason: string): RequestStoreError => ({
        kind: "invalid_request_record",
        id,
        reason,
      });
      const { documentId } = record;
      if (documentId === null) return err(invalid("documentId is missing"));
      const common = { id: record.id, documentId, createdAt: record.createdAt };
      return parseRecordBody(record.request)
        .map(
          ({ request, body }): ContextRequest => ({
            ...common,
            request,
            ...body,
          }),
        )
        .mapErr(invalid);
    });

  return {
    save: ({ documentId, request, breakdown }, after, madeFor) =>
      store<AssembledRecord>({
        id: newId(),
        documentId,
        createdAt: now(),
        request,
        after,
        ...(madeFor ? { madeFor } : {}),
        origin: "assembled",
        breakdown,
      }),
    load,
    revise: (parentId, request, madeFor) =>
      load(parentId).andThen((parent) => {
        const target = madeFor ?? parent.madeFor;
        return store<RevisionRecord>({
          id: newId(),
          documentId: parent.documentId,
          createdAt: now(),
          request,
          after: parent.after,
          ...(target ? { madeFor: target } : {}),
          origin: "revision",
          parentId,
          assembledFrom:
            parent.origin === "assembled" ? parent.id : parent.assembledFrom,
        });
      }),
  };
}

// ---------------------------------------------------------------------------
// Parsing stored JSON

type Check<T> = Result<T, string>;

function isRecord(value: unknown): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";
const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);
const oneOf =
  <T extends string>(...values: T[]) =>
  (value: unknown): value is T =>
    values.some((v) => v === value);
const isReason = oneOf<CardReason>("pinned", "mentioned");
const isWindowLimit = oneOf<WindowLimit>("preferred", "budget", "document");

function parseRecordBody(
  value: JsonValue,
): Check<{ request: LlmRequest; body: Body }> {
  if (!isRecord(value)) return err("request record must be an object");
  if (value.version !== REQUEST_RECORD_VERSION) {
    return err(`unsupported request version ${JSON.stringify(value.version)}`);
  }
  const { after } = value;
  if (after !== null && !isString(after)) {
    return err("request record must have after, a block ID or null");
  }
  const target = parseTarget(value.madeFor);
  if (target.isErr()) return err(target.error);
  const madeFor = target.value ? { madeFor: target.value } : {};
  return parseLlmRequest(value.request).andThen((request) => {
    if (value.origin === "assembled") {
      return parseBreakdown(value.breakdown).map((breakdown) => ({
        request,
        body: { after, ...madeFor, origin: "assembled" as const, breakdown },
      }));
    }
    if (
      value.origin === "revision" &&
      isString(value.parentId) &&
      isString(value.assembledFrom)
    ) {
      return ok({
        request,
        body: {
          after,
          ...madeFor,
          origin: "revision" as const,
          parentId: value.parentId,
          assembledFrom: value.assembledFrom,
        },
      });
    }
    return err(
      "request record must be assembled with a breakdown, or a revision with parentId and assembledFrom",
    );
  });
}

/** A stored `madeFor`; null when absent (stored before it was recorded). */
function parseTarget(
  value: JsonValue | undefined,
): Check<ProfileTarget | null> {
  if (value === undefined) return ok(null);
  if (
    !isRecord(value) ||
    !isString(value.baseUrl) ||
    !oneOf<BackendKind>("llamacpp", "openrouter", "generic")(value.kind) ||
    (value.model !== null && !isString(value.model))
  ) {
    return err("madeFor must have a baseUrl, a kind and a model (or null)");
  }
  return ok({ baseUrl: value.baseUrl, kind: value.kind, model: value.model });
}

function parseLlmRequest(value: JsonValue | undefined): Check<LlmRequest> {
  if (
    !isRecord(value) ||
    !isString(value.profile) ||
    !oneOf("chat", "completion")(value.endpoint) ||
    !isString(value.url) ||
    !isRecord(value.body)
  ) {
    return err("request must have a profile, endpoint, url and body");
  }
  const body: JsonObject = value.body;
  return ok({
    profile: value.profile,
    endpoint: value.endpoint,
    url: value.url,
    body,
  });
}

function parseBreakdown(value: JsonValue | undefined): Check<ContextBreakdown> {
  if (!isRecord(value)) return err("breakdown must be an object");
  const { layout, position, window, instruction, cards, budget, bible } = value;
  if (!oneOf("chat", "completion")(layout)) {
    return err("breakdown.layout must be chat or completion");
  }
  let parsedPosition: ContextBreakdown["position"];
  if (isRecord(position) && position.kind === "none") {
    parsedPosition = { kind: "none" };
  } else if (
    isRecord(position) &&
    position.kind === "scene" &&
    isString(position.scene)
  ) {
    parsedPosition = { kind: "scene", scene: position.scene };
  } else {
    return err("breakdown.position must be a scene or none");
  }
  if (
    !isRecord(window) ||
    !isString(window.text) ||
    !isBoolean(window.truncated) ||
    !isStringList(window.excludedSegments) ||
    !isNumber(window.minimum) ||
    !isNumber(window.preferred) ||
    !isNumber(window.available) ||
    !isWindowLimit(window.limitedBy)
  ) {
    return err("breakdown.window is malformed");
  }
  if (
    !isRecord(instruction) ||
    !isString(instruction.text) ||
    (instruction.writer !== null && !isString(instruction.writer))
  ) {
    return err("breakdown.instruction is malformed");
  }
  if (
    !isRecord(budget) ||
    !isNumber(budget.limit) ||
    !isNumber(budget.used) ||
    !isString(budget.unit)
  ) {
    return err("breakdown.budget is malformed");
  }
  if (!Array.isArray(cards)) return err("breakdown.cards must be a list");
  const parsedCards: CardChoice[] = [];
  for (const [i, card] of cards.entries()) {
    const parsed = parseCard(card);
    if (parsed === null) return err(`breakdown.cards[${i}] is malformed`);
    parsedCards.push(parsed);
  }
  let parsedBible: BibleBreakdown | undefined;
  if (bible !== undefined) {
    const checked = parseBible(bible);
    if (checked === null) return err("breakdown.bible is malformed");
    parsedBible = checked;
  }
  return ok({
    layout,
    position: parsedPosition,
    window: {
      text: window.text,
      truncated: window.truncated,
      excludedSegments: window.excludedSegments,
      minimum: window.minimum,
      preferred: window.preferred,
      available: window.available,
      limitedBy: window.limitedBy,
    },
    instruction: { text: instruction.text, writer: instruction.writer },
    cards: parsedCards,
    ...(parsedBible === undefined ? {} : { bible: parsedBible }),
    budget: { limit: budget.limit, used: budget.used, unit: budget.unit },
  });
}

function parseBible(value: JsonValue): BibleBreakdown | null {
  if (
    !isRecord(value) ||
    !isString(value.scene) ||
    !Array.isArray(value.sections) ||
    !isStringList(value.cleared)
  ) {
    return null;
  }
  const sections: BibleBreakdown["sections"] = [];
  for (const section of value.sections) {
    if (
      !isRecord(section) ||
      !isString(section.title) ||
      !isString(section.text) ||
      !isNumber(section.size) ||
      !isBoolean(section.pinned) ||
      !isBoolean(section.excluded) ||
      !isBoolean(section.included)
    ) {
      return null;
    }
    sections.push({
      title: section.title,
      text: section.text,
      size: section.size,
      pinned: section.pinned,
      excluded: section.excluded,
      included: section.included,
    });
  }
  return { scene: value.scene, sections, cleared: value.cleared };
}

function parseCard(value: JsonValue): CardChoice | null {
  if (
    !isRecord(value) ||
    !isString(value.entry) ||
    !isString(value.title) ||
    !Array.isArray(value.reasons) ||
    !value.reasons.every(isReason) ||
    !isString(value.text) ||
    !isNumber(value.size) ||
    !isBoolean(value.included)
  ) {
    return null;
  }
  let mention: CardChoice["mention"] = null;
  if (value.mention !== null) {
    const { mention: stored } = value;
    if (
      !isRecord(stored) ||
      !isString(stored.name) ||
      !isNumber(stored.offset)
    ) {
      return null;
    }
    mention = { name: stored.name, offset: stored.offset };
  }
  return {
    entry: value.entry,
    title: value.title,
    reasons: value.reasons.filter(isReason),
    mention,
    text: value.text,
    size: value.size,
    included: value.included,
  };
}
