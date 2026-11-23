/**
 * What a talk page keeps (`docs/rebuild/talk-pages.md`), in the
 * `talkRecords` collection: one record per topic, and one per message (turn)
 * in it.
 *
 *     <topic>/topic                Topic
 *     <topic>/message/000001       TalkMessage
 *
 * A topic is about exactly one thing, its scope: the world, a scene, a
 * passage of a scene, or one bible record. A message is signed by its author:
 * the writer, or a model, with the profile and model it ran on, the stored
 * request its answer came from (an agent step record, `agent/records.ts`),
 * and the steps of the run that made it (its tool-call trace).
 */

import {
  err,
  errAsync,
  ok,
  okAsync,
  type Result,
  type ResultAsync,
} from "neverthrow";
import type {
  JsonValue,
  StorageAdapter,
  StorageError,
  StoredTalkRecord,
} from "../storage/types";

export const TALK_RECORD_VERSION = 1;

/** What a topic is about. Scenes and records are named as the bible names them. */
export type TopicScope =
  | { kind: "world" }
  | { kind: "scene"; scene: string }
  /**
   * A passage of a scene: the block it starts in, in the scene's document,
   * and its text when the topic was started. When its words are no longer
   * there, the topic follows the scene.
   */
  | {
      kind: "passage";
      scene: string;
      documentId: string;
      blockId: string;
      /**
       * The selected words. A passage over several blocks has each block's
       * part, joined by a blank line (`PASSAGE_BREAK`).
       */
      quote: string;
      /**
       * Which occurrence of the quote (its first block's part) in the block
       * it starts in, from 0; absent for the first.
       */
      occurrence?: number;
      /** The block it ends in, when that isn't the one it starts in. */
      through?: string;
    }
  /** A bible record by ref: `drive:keep-light`. */
  | { kind: "record"; ref: string };

export type TopicScopeKind = TopicScope["kind"];

export type PassageScope = Extract<TopicScope, { kind: "passage" }>;

/** What joins the parts of a passage over several blocks in its quote. */
export const PASSAGE_BREAK = "\n\n";

export const TOPIC_STATUSES = ["open", "resolved", "archived"] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

/** A model as an author, and where to read what it was asked. */
export type ModelAuthor = {
  kind: "model";
  /** The backend profile's label when it wrote (`Model · <profile>`). */
  profile: string;
  /** The model ID the profile named. */
  model: string;
  /** The agent session the turn ran in, if it ran in one. */
  session: string | null;
  /**
   * The stored request the message answers: the agent step record whose
   * response it is (`<session>/step/000003`). Null for a message that came
   * from no stored request.
   */
  requestId: string | null;
  /**
   * The tool-call trace: every agent step record of the run that made the
   * message, in order. The request is the last of them.
   */
  trace: string[];
};

export type TalkAuthor = { kind: "human" } | ModelAuthor;

/** One tool call a model made in a turn, as the turn's fold line lists it. */
export type TurnCall = {
  name: string;
  ok: boolean;
  /** One line: the answer's first line, or why it was refused. */
  summary: string;
};

export type Topic = {
  version: typeof TALK_RECORD_VERSION;
  id: string;
  title: string;
  scope: TopicScope;
  status: TopicStatus;
  /** Who started it: the writer, or a model that raised it. */
  startedBy: TalkAuthor;
  /** The agent session its model turns run in, once a turn has run. */
  session: string | null;
  /** How many messages it holds; the next message's index is one more. */
  messages: number;
  /**
   * The last agent run (writer message, from 1) whose answer is recorded as
   * a message; 0 before any. A finished run above it still needs its answer
   * recorded, which `talk.ts` does from the run's stored steps.
   */
  answered: number;
  createdAt: number;
  updatedAt: number;
  /** When it was resolved or archived; null while open. */
  closedAt: number | null;
};

export type TalkMessage = {
  version: typeof TALK_RECORD_VERSION;
  /** `<topic>/message/000001`. */
  id: string;
  topic: string;
  /** From 1, in the order the turns were taken. */
  index: number;
  author: TalkAuthor;
  /** Markdown. */
  body: string;
  /** The tool calls a model made in this turn, in order. */
  calls: TurnCall[];
  createdAt: number;
};

export const topicRecordId = (topic: string) => `${topic}/topic`;

export const messageRecordId = (topic: string, index: number) =>
  `${topic}/message/${String(index).padStart(6, "0")}`;

const toJson = (value: unknown): JsonValue => JSON.parse(JSON.stringify(value));

export function topicRecord(topic: Topic): StoredTalkRecord {
  return {
    id: topicRecordId(topic.id),
    topicId: topic.id,
    kind: "topic",
    data: toJson(topic),
    updatedAt: topic.updatedAt,
  };
}

export function messageRecord(message: TalkMessage): StoredTalkRecord {
  return {
    id: message.id,
    topicId: message.topic,
    kind: "message",
    data: toJson(message),
    updatedAt: message.createdAt,
  };
}

/** Saves `topic`, and `messages` with it, as one write. */
export function saveTalk(
  storage: StorageAdapter,
  topic: Topic,
  messages: readonly TalkMessage[] = [],
): ResultAsync<void, StorageError> {
  return storage
    .batch([
      { kind: "saveTalkRecord", record: topicRecord(topic) },
      ...messages.map((message) => ({
        kind: "saveTalkRecord" as const,
        record: messageRecord(message),
      })),
    ])
    .map(() => undefined);
}

/** A stored talk record that isn't what its kind says. */
export type TalkRecordError = {
  kind: "invalid_talk_record";
  id: string;
  message: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";

function scopeProblem(value: unknown): string | undefined {
  if (!isObject(value)) return "no scope";
  switch (value.kind) {
    case "world":
      return undefined;
    case "scene":
      return isString(value.scene) ? undefined : "a scene scope with no scene";
    case "passage":
      if (
        ![value.scene, value.documentId, value.blockId, value.quote].every(
          isString,
        )
      ) {
        return "a passage scope missing its scene, document, block or quote";
      }
      return (value.occurrence === undefined ||
        (Number.isInteger(value.occurrence) &&
          typeof value.occurrence === "number" &&
          value.occurrence >= 0)) &&
        (value.through === undefined || isString(value.through))
        ? undefined
        : "a passage scope with a bad occurrence or end block";
    case "record":
      return isString(value.ref) ? undefined : "a record scope with no ref";
    default:
      return `unknown scope ${String(value.kind)}`;
  }
}

function authorProblem(value: unknown): string | undefined {
  if (!isObject(value)) return "no author";
  if (value.kind === "human") return undefined;
  if (value.kind !== "model") return `unknown author ${String(value.kind)}`;
  const nullableString = (v: unknown) => v === null || isString(v);
  return isString(value.profile) &&
    isString(value.model) &&
    nullableString(value.session) &&
    nullableString(value.requestId) &&
    Array.isArray(value.trace) &&
    value.trace.every(isString)
    ? undefined
    : "a model author missing its profile, model, request or trace";
}

/** A stored topic, checked as far as the app relies on it. */
export function readTopic(
  record: StoredTalkRecord,
): Result<Topic, TalkRecordError> {
  const invalid = (message: string) =>
    err<Topic, TalkRecordError>({
      kind: "invalid_talk_record",
      id: record.id,
      message,
    });
  const data = record.data;
  if (record.kind !== "topic" || !isObject(data)) {
    return invalid("not a topic record");
  }
  if (data.version !== TALK_RECORD_VERSION) {
    return invalid(`topic record version ${String(data.version)}`);
  }
  if (!isString(data.id) || !isString(data.title)) {
    return invalid("no ID or title");
  }
  if (!TOPIC_STATUSES.some((status) => status === data.status)) {
    return invalid(`unknown status ${String(data.status)}`);
  }
  const problem = scopeProblem(data.scope) ?? authorProblem(data.startedBy);
  if (problem !== undefined) return invalid(problem);
  if (
    !(data.session === null || isString(data.session)) ||
    typeof data.messages !== "number" ||
    typeof data.answered !== "number" ||
    typeof data.createdAt !== "number" ||
    typeof data.updatedAt !== "number" ||
    !(data.closedAt === null || typeof data.closedAt === "number")
  ) {
    return invalid("no session, message or answer count, or times");
  }
  // The fields the app reads were checked above.
  return ok(data as unknown as Topic);
}

/** A stored message, checked as far as the app relies on it. */
export function readMessage(
  record: StoredTalkRecord,
): Result<TalkMessage, TalkRecordError> {
  const invalid = (message: string) =>
    err<TalkMessage, TalkRecordError>({
      kind: "invalid_talk_record",
      id: record.id,
      message,
    });
  const data = record.data;
  if (record.kind !== "message" || !isObject(data)) {
    return invalid("not a message record");
  }
  if (data.version !== TALK_RECORD_VERSION) {
    return invalid(`message record version ${String(data.version)}`);
  }
  const problem = authorProblem(data.author);
  if (problem !== undefined) return invalid(problem);
  if (
    !isString(data.id) ||
    !isString(data.topic) ||
    typeof data.index !== "number" ||
    !isString(data.body) ||
    typeof data.createdAt !== "number"
  ) {
    return invalid("no ID, topic, index, body or time");
  }
  if (
    !Array.isArray(data.calls) ||
    !data.calls.every(
      (call) =>
        isObject(call) &&
        isString(call.name) &&
        typeof call.ok === "boolean" &&
        isString(call.summary),
    )
  ) {
    return invalid("no tool calls");
  }
  // The fields the app reads were checked above.
  return ok(data as unknown as TalkMessage);
}

/** The stored topic `id` without its messages, or null when there is none. */
export function loadTopicRecord(
  storage: StorageAdapter,
  id: string,
): ResultAsync<Topic | null, StorageError | TalkRecordError> {
  return storage.talkRecords
    .load(topicRecordId(id))
    .map((record): StoredTalkRecord | null => record)
    .orElse((error) =>
      error.kind === "not_found" ? okAsync(null) : errAsync(error),
    )
    .mapErr((error): StorageError | TalkRecordError => error)
    .andThen((record) => (record === null ? ok(null) : readTopic(record)));
}

/** Every stored topic, newest first. */
export function listTopics(
  storage: StorageAdapter,
): ResultAsync<Topic[], StorageError | TalkRecordError> {
  return storage.talkRecords
    .listOfKind("topic")
    .mapErr((error): StorageError | TalkRecordError => error)
    .andThen((records) => {
      const topics: Topic[] = [];
      for (const record of records) {
        const topic = readTopic(record);
        if (topic.isErr()) return err(topic.error);
        topics.push(topic.value);
      }
      topics.sort(
        (a, b) => b.createdAt - a.createdAt || (a.id < b.id ? -1 : 1),
      );
      return ok(topics);
    });
}

/** A topic with its messages, in order. */
export type TopicLog = { topic: Topic; messages: TalkMessage[] };

export type LoadTopicError =
  | StorageError
  | TalkRecordError
  | { kind: "no_topic"; id: string };

/** The topic `id` and its messages, as stored. */
export function loadTopic(
  storage: StorageAdapter,
  id: string,
): ResultAsync<TopicLog, LoadTopicError> {
  return storage.talkRecords
    .listForTopic(id)
    .mapErr((error): LoadTopicError => error)
    .andThen((records) => {
      const head = records.find((r) => r.id === topicRecordId(id));
      if (head === undefined) {
        return err<TopicLog, LoadTopicError>({ kind: "no_topic", id });
      }
      const topic = readTopic(head);
      if (topic.isErr()) return err(topic.error);
      const messages: TalkMessage[] = [];
      for (const record of records) {
        if (record.kind !== "message") continue;
        const message = readMessage(record);
        if (message.isErr()) return err(message.error);
        messages.push(message.value);
      }
      messages.sort((a, b) => a.index - b.index);
      return ok({ topic: topic.value, messages });
    });
}
