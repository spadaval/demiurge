import { describe, expect, test } from "bun:test";
import type { KeyValueStore } from "../workspace/tabs";
import { createAgentDefaultsStore } from "./defaults";
import { defaultSystemPrompt } from "./prompt";

function memory(): KeyValueStore & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

describe("agent defaults", () => {
  test("start from the built-in prompt and no sampler", () => {
    const store = createAgentDefaultsStore(memory(), "w");
    expect(store.get("p", "plan")).toEqual({
      systemPrompt: defaultSystemPrompt("plan"),
    });
  });

  test("keep what was saved per profile and role, field by field", () => {
    const kv = memory();
    const store = createAgentDefaultsStore(kv, "w");
    store.save("p", "plan", { systemPrompt: "Plan briefly." })._unsafeUnwrap();
    store.save("p", "plan", { sampler: { temperature: 0.3 } })._unsafeUnwrap();
    expect(store.get("p", "plan")).toEqual({
      systemPrompt: "Plan briefly.",
      sampler: { temperature: 0.3 },
    });
    expect(store.get("p", "prose").systemPrompt).toBe(
      defaultSystemPrompt("prose"),
    );
    expect(store.get("other", "plan").systemPrompt).toBe(
      defaultSystemPrompt("plan"),
    );
    // Another world's store doesn't see them; a fresh one for this world does.
    expect(createAgentDefaultsStore(kv, "v").get("p", "plan").sampler).toBe(
      undefined,
    );
    expect(
      createAgentDefaultsStore(kv, "w").get("p", "plan").systemPrompt,
    ).toBe("Plan briefly.");
  });

  test("read past what isn't in the right shape", () => {
    const kv = memory();
    kv.setItem(
      "worldcrafter:w:agent-defaults",
      JSON.stringify({ p: { plan: { systemPrompt: 4, sampler: [] } } }),
    );
    expect(createAgentDefaultsStore(kv, "w").get("p", "plan")).toEqual({
      systemPrompt: defaultSystemPrompt("plan"),
    });
    kv.setItem("worldcrafter:w:agent-defaults", "{not json");
    expect(
      createAgentDefaultsStore(kv, "w").get("p", "plan").systemPrompt,
    ).toBe(defaultSystemPrompt("plan"));
  });

  test("say so when the browser refuses to store them", () => {
    const store = createAgentDefaultsStore(
      {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
      },
      "w",
    );
    expect(
      store.save("p", "plan", { systemPrompt: "x" })._unsafeUnwrapErr(),
    ).toContain("quota");
  });
});
