/**
 * A topic's scope against the story bible: what the model is given for it
 * (an agent scope), whether the bible has it, and how the app names it.
 */

import type { AgentScope } from "../agent/context";
import type { JsonValue } from "../storage/types";
import { formatRef, parseRef } from "../story/refs";
import { type Ref, refExists, type Story } from "../story/story";
import { refLabel } from "../story/touches";
import { contentBlocks, passageSpans } from "./passage";
import type {
  PassageScope,
  Topic,
  TopicScope,
  TopicScopeKind,
} from "./records";

/**
 * The agent scope a topic's turns run in. A passage topic's model sees its
 * scene, and the passage is quoted in the topic's prompt.
 */
export function agentScope(scope: TopicScope): AgentScope {
  switch (scope.kind) {
    case "world":
      return { kind: "world" };
    case "scene":
    case "passage":
      return { kind: "scene", scene: scope.scene };
    case "record":
      return { kind: "record", ref: scope.ref };
  }
}

/** The Label a scope kind is listed under in the rail. */
export const SCOPE_GROUPS: Record<TopicScopeKind, string> = {
  world: "World",
  scene: "Scenes",
  passage: "Passages",
  record: "Records",
};

/** A record kind as a scope line names it: `Drive`, `Open question`. */
const RECORD_KINDS: Record<Ref["kind"], string> = {
  actor: "Actor",
  drive: "Drive",
  fact: "Fact",
  readerQuestion: "Reader question",
  event: "Event",
  scene: "Scene",
  openQuestion: "Open question",
  candidate: "Candidate",
  version: "Version",
  knowledge: "Knowledge",
  object: "Object",
  count: "Count",
};

/** A scope as the app names it: its kind, then the thing itself. */
export type ScopeName = {
  /** `World`, `Scene`, `Passage`, `Drive`… */
  kind: string;
  /** `4 The Ferry`, `Ardelia wants the Ninefold`; empty for the world. */
  name: string;
  /** The bible no longer has the scene or record. */
  removed: boolean;
};

function sceneName(story: Story, scene: string): Omit<ScopeName, "kind"> {
  const at = story.scenes.findIndex((s) => s.id === scene);
  const found = story.scenes[at];
  return found === undefined
    ? { name: scene, removed: true }
    : { name: `${at + 1} ${found.title}`, removed: false };
}

export function scopeName(story: Story, scope: TopicScope): ScopeName {
  switch (scope.kind) {
    case "world":
      return { kind: "World", name: "", removed: false };
    case "scene":
      return { kind: "Scene", ...sceneName(story, scope.scene) };
    case "passage":
      return { kind: "Passage", ...sceneName(story, scope.scene) };
    case "record": {
      const ref = parseRef(scope.ref);
      if (ref.isErr())
        return { kind: "Record", name: scope.ref, removed: true };
      const exists = refExists(story, ref.value);
      const label = exists ? refLabel(story, ref.value) : "";
      return {
        kind: RECORD_KINDS[ref.value.kind],
        name: label === "" ? ref.value.id : label,
        removed: !exists,
      };
    }
  }
}

/** `Scene · 4 The Ferry`, `World`. */
export function scopeLine(story: Story, scope: TopicScope): string {
  const { kind, name } = scopeName(story, scope);
  return name === "" ? kind : `${kind} · ${name}`;
}

/**
 * Why `scope` can't start a topic in `story`, if it can't: a scene or record
 * the bible doesn't have.
 */
export function topicScopeProblem(
  story: Story,
  scope: TopicScope,
): string | undefined {
  switch (scope.kind) {
    case "world":
      return undefined;
    case "scene":
    case "passage":
      if (scope.kind === "passage" && scope.quote.trim() === "") {
        return "A passage topic quotes the words it is about";
      }
      return story.scenes.some((s) => s.id === scope.scene)
        ? undefined
        : `The story has no scene ${scope.scene}`;
    case "record": {
      const ref = parseRef(scope.ref);
      if (ref.isErr()) return ref.error;
      return refExists(story, ref.value)
        ? undefined
        : `The story has no ${scope.ref}`;
    }
  }
}

/** What a topic adds to the agent's system prompt: what the page is about. */
export function topicPrompt(
  story: Story,
  title: string,
  scope: TopicScope,
): string {
  const about =
    scope.kind === "world"
      ? "the story as a whole"
      : scopeLine(story, scope).replace(" · ", " ");
  const lines = [
    "# This talk page",
    "",
    `You are a participant on a talk page about ${about}. Its topic is "${title}". The writer started it to settle that question; keep to it. Your turns are signed as the model's and kept with the page.`,
  ];
  if (scope.kind === "passage") {
    lines.push(
      "",
      "The passage the topic is about:",
      "",
      ...scope.quote.split("\n").map((line) => `> ${line}`.trimEnd()),
    );
  }
  return lines.join("\n");
}

/**
 * Whether a passage topic's anchor has gone stale in `content`, its scene's
 * document now: its words are no longer all there (`passageSpans`).
 */
export function passageStale(content: JsonValue, scope: PassageScope): boolean {
  return passageSpans(contentBlocks(content), scope) === null;
}

/** Whether two scopes are about the same thing, a passage's words included. */
export function sameScope(a: TopicScope, b: TopicScope): boolean {
  switch (a.kind) {
    case "world":
      return b.kind === "world";
    case "scene":
      return b.kind === "scene" && a.scene === b.scene;
    case "passage":
      return (
        b.kind === "passage" &&
        a.scene === b.scene &&
        a.documentId === b.documentId &&
        a.blockId === b.blockId &&
        a.quote === b.quote &&
        (a.occurrence ?? 0) === (b.occurrence ?? 0) &&
        a.through === b.through
      );
    case "record":
      return b.kind === "record" && a.ref === b.ref;
  }
}

/**
 * The scope of a topic about the bible record `ref`. A scene record's topic
 * is about the scene, as one started from its prose is, so the model sees
 * the scene's packet and the topic is listed with the scene's.
 */
export function recordTopicScope(ref: Ref): TopicScope {
  return ref.kind === "scene"
    ? { kind: "scene", scene: ref.id }
    : { kind: "record", ref: formatRef(ref) };
}

/** What anchored topics are listed on: a scene sheet, or a record's detail. */
export type TopicTarget =
  | { kind: "scene"; scene: string }
  | { kind: "record"; ref: string };

/**
 * The open topics on `target`, in the order given: a scene's own and its
 * passages', or a record's.
 */
export function openTopicsOn(
  topics: readonly Topic[],
  target: TopicTarget,
): Topic[] {
  return topics.filter(({ status, scope }) => {
    if (status !== "open") return false;
    if (target.kind === "record") {
      return scope.kind === "record" && scope.ref === target.ref;
    }
    return (
      (scope.kind === "scene" || scope.kind === "passage") &&
      scope.scene === target.scene
    );
  });
}
