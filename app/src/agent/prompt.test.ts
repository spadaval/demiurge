import { expect, test } from "bun:test";
import { STORY_TOOLS } from "../story/tools";
import {
  CRAFT_GUIDANCE,
  defaultSystemPrompt,
  PROSE_GUIDANCE,
  TOOL_MECHANICS,
} from "./prompt";

test("the craft guidance is craft.md, word for word", async () => {
  const craft = await Bun.file(
    new URL("../../../.agents/skills/story-sketch/craft.md", import.meta.url),
  ).text();
  expect(CRAFT_GUIDANCE).toBe(craft);
});

test("the planning prompt is the craft guidance, then the tool mechanics", () => {
  const prompt = defaultSystemPrompt("plan");
  const craftAt = prompt.indexOf(CRAFT_GUIDANCE.trim());
  expect(craftAt).toBeGreaterThan(0);
  expect(prompt.indexOf(TOOL_MECHANICS)).toBeGreaterThan(craftAt);
  expect(prompt.endsWith(TOOL_MECHANICS)).toBe(true);
});

test("the prose prompt is the drafting guidance", () => {
  const prompt = defaultSystemPrompt("prose");
  expect(prompt.endsWith(PROSE_GUIDANCE)).toBe(true);
  expect(prompt).not.toContain(CRAFT_GUIDANCE.trim());
});

test("every tool the mechanics name is a story tool", () => {
  const names = new Set(STORY_TOOLS.map((tool) => tool.name));
  // Tool names are the camelCase words; `kind:id` refs are not.
  const named = [
    ...new Set(TOOL_MECHANICS.match(/\b[a-z]+[A-Z][A-Za-z]*\b/g) ?? []),
  ];
  expect(named.length).toBeGreaterThan(10);
  expect(named.filter((name) => !names.has(name))).toEqual([]);
  for (const query of [
    "touches",
    "trace",
    "gaps",
    "contradictions",
    "readerOrder",
  ]) {
    expect(names.has(query)).toBe(true);
    expect(TOOL_MECHANICS).toContain(query);
  }
});
