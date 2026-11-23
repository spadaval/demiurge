/**
 * The context packet: what the story agent is told about the bible at the
 * start of each writer message, assembled from the store for the session's
 * scope. It is deterministic: the same bible and prose give the same packet,
 * byte for byte, so a session can be replayed and two packets compared.
 *
 * Every section is the output of a story query (`story/queries.ts`), the same
 * lines the CLI prints, so the model reads what a writer using the CLI would.
 *
 * - World: the premise, the scenes in telling order, the open questions and
 *   the contradictions.
 * - Scene: the scene record, `reader-order --before` the scene (what the
 *   reader has been told and what is held back, the viewpoint character's
 *   marks, and each count as the scene opens and as it changes), each event
 *   it depicts, each person in it, and its prose so far.
 * - Record: the record, what it touches, and the scenes that touch it.
 */

import { errAsync, type Result, type ResultAsync } from "neverthrow";
import type { StorageAdapter, StorageError } from "../storage/types";
import {
  contradictionsQuery,
  listQuery,
  readerOrderQuery,
  scenesQuery,
  showQuery,
  touchesQuery,
} from "../story/queries";
import { formatRef, parseRef } from "../story/refs";
import { loadStory, type StoryStoreError } from "../story/store";
import { type StoredProse, storedProse } from "../story/stored-prose";
import { type Ref, refExists, type Story } from "../story/story";

/** What a session works on: the whole story, one scene, or one record. */
export type AgentScope =
  | { kind: "world" }
  | { kind: "scene"; scene: string }
  /** A bible record by ref: `drive:keep-light`, `candidate:who/ferryman`. */
  | { kind: "record"; ref: string };

export type ContextSection = { title: string; lines: string[] };

export type ContextPacket = {
  scope: AgentScope;
  sections: ContextSection[];
};

/** The scope names a scene or record the bible doesn't have. */
export type ScopeError = { kind: "invalid_scope"; message: string };

export type ContextError = ScopeError | StoryStoreError | StorageError;

/** The packet for `scope` from the bible and prose in `storage` now. */
export function buildContextPacket(
  storage: StorageAdapter,
  scope: AgentScope,
): ResultAsync<ContextPacket, ContextError> {
  return loadStory(storage)
    .mapErr((error): ContextError => error)
    .andThen((story) => {
      const problem = scopeProblem(story, scope);
      if (problem !== undefined) return errAsync(problem);
      return storedProse(storage, story)
        .mapErr((error): ContextError => error)
        .map((prose) => ({
          scope,
          sections: sections(story, prose, scope),
        }));
    });
}

/** Why `scope` doesn't fit `story`, if it doesn't. */
export function scopeProblem(
  story: Story,
  scope: AgentScope,
): ScopeError | undefined {
  const invalid = (message: string): ScopeError => ({
    kind: "invalid_scope",
    message,
  });
  if (scope.kind === "scene") {
    return story.scenes.some((scene) => scene.id === scope.scene)
      ? undefined
      : invalid(`The story has no scene ${scope.scene}`);
  }
  if (scope.kind === "record") {
    const ref = parseRef(scope.ref);
    if (ref.isErr()) return invalid(ref.error);
    return refExists(story, ref.value)
      ? undefined
      : invalid(`The story has no ${scope.ref}`);
  }
  return undefined;
}

/** The packet as the text that opens a writer's message. */
export function packetText(packet: ContextPacket): string {
  return [
    `# Context: ${scopeName(packet.scope)}`,
    ...packet.sections.map(
      ({ title, lines }) => `## ${title}\n\n${lines.join("\n")}`,
    ),
  ].join("\n\n");
}

export function scopeName(scope: AgentScope): string {
  switch (scope.kind) {
    case "world":
      return "the whole story";
    case "scene":
      return `scene:${scope.scene}`;
    case "record":
      return scope.ref;
  }
}

/** A query's lines; a query the checked scope still can't answer says so. */
const linesOf = (result: Result<{ lines: string[] }, { message: string }>) =>
  result.match(
    (found) => found.lines,
    (error) => [`(not available: ${error.message})`],
  );

function sections(
  story: Story,
  prose: StoredProse,
  scope: AgentScope,
): ContextSection[] {
  switch (scope.kind) {
    case "world":
      return worldSections(story);
    case "scene":
      return sceneSections(story, prose, scope.scene);
    case "record":
      return recordSections(story, prose, scope.ref);
  }
}

const orNone = (lines: string[]) => (lines.length === 0 ? ["(none)"] : lines);

function worldSections(story: Story): ContextSection[] {
  return [
    { title: "Premise", lines: [story.premise.trim() || "(none yet)"] },
    {
      title: "Scenes in telling order",
      lines: orNone(listQuery(story, "scene").lines),
    },
    {
      title: "Open questions",
      lines: orNone(listQuery(story, "open-question").lines),
    },
    { title: "Contradictions", lines: contradictionsQuery(story).lines },
  ];
}

function sceneSections(
  story: Story,
  prose: StoredProse,
  id: string,
): ContextSection[] {
  const scene = story.scenes.find((s) => s.id === id);
  if (scene === undefined) return [];
  const show = (ref: Ref) => linesOf(showQuery(story, ref, prose));
  const people = [
    ...scene.actors,
    ...(scene.viewpoint === undefined || scene.actors.includes(scene.viewpoint)
      ? []
      : [scene.viewpoint]),
  ];
  const text = prose.prose.find((p) => p.scene === id)?.text;
  const notRead = prose.notRead.find((n) => n.scene === id);
  return [
    { title: "The scene", lines: show({ kind: "scene", id }) },
    {
      title: "What the reader has been told before it",
      lines: linesOf(readerOrderQuery(story, id)),
    },
    {
      title: "Events it depicts",
      lines: orNone(
        scene.depicts.flatMap((event, i) => [
          ...(i === 0 ? [] : [""]),
          ...show({ kind: "event", id: event }),
        ]),
      ),
    },
    {
      title: "People in it",
      lines: orNone(
        people.flatMap((actor, i) => [
          ...(i === 0 ? [] : [""]),
          ...show({ kind: "actor", id: actor }),
        ]),
      ),
    },
    {
      title: "Its prose so far",
      lines: [
        notRead !== undefined
          ? `(could not be read: ${notRead.message})`
          : text === undefined || text.trim() === ""
            ? "(not written yet)"
            : text.trimEnd(),
      ],
    },
  ];
}

function recordSections(
  story: Story,
  prose: StoredProse,
  text: string,
): ContextSection[] {
  const parsed = parseRef(text);
  if (parsed.isErr()) return [];
  const ref = parsed.value;
  return [
    { title: formatRef(ref), lines: linesOf(showQuery(story, ref, prose)) },
    { title: "What it touches", lines: linesOf(touchesQuery(story, ref)) },
    {
      title: "Scenes that touch it",
      lines: linesOf(scenesQuery(story, ref)),
    },
  ];
}
