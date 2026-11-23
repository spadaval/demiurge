/**
 * A topic's scope against the story bible: what the model is given for it
 * (an agent scope), whether the bible has it, and how the app names it.
 */

import type { AgentScope } from "../agent/context";
import { parseRef } from "../story/refs";
import { type Ref, refExists, type Story } from "../story/story";
import { refLabel } from "../story/touches";
import type { TopicScope, TopicScopeKind } from "./records";

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
    lines.push("", "The passage the topic is about:", "", `> ${scope.quote}`);
  }
  return lines.join("\n");
}
