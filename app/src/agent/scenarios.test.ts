/**
 * End-to-end sessions of the story agent runner against a stub
 * OpenAI-compatible server and the memory adapter: a multi-turn outline and
 * rework session with the story tools, its replay, and a prose turn on one
 * scene with its context packet.
 */

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import type { ResultAsync } from "neverthrow";
import type {
  BackendProfile,
  ChatMessage,
  JsonObject,
  ToolCallMessage,
} from "../llm/types";
import { createMemoryStorage } from "../storage/memory";
import type {
  StorageAdapter,
  StoredDocument,
  WorldRecords,
} from "../storage/types";
import documentsFile from "../story/fixtures/lighthouse.documents.json";
import { readerOrderQuery } from "../story/queries";
import { loadStory, saveStory } from "../story/store";
import { parseStory, type Story } from "../story/story";
import { STORY_TOOLS } from "../story/tools";
import { buildContextPacket, packetText } from "./context";
import type { ProfileBindings } from "./profiles";
import { defaultSystemPrompt } from "./prompt";
import { loadSessionLog } from "./records";
import { replayModel, sameRequest } from "./replay";
import { type AgentEvent, createAgentRunner } from "./runner";
import { reply, startStubLlm, streamed, toolCalls } from "./stub-llm";

const fixture: Story = parseStory(
  await Bun.file(
    new URL("../story/fixtures/lighthouse.story.json", import.meta.url),
  ).text(),
)._unsafeUnwrap();
const documents: StoredDocument[] = documentsFile;

async function value<T, E>(result: ResultAsync<T, E>): Promise<T> {
  return (await result)._unsafeUnwrap();
}

const stub = startStubLlm();
afterAll(() => stub.stop());

const planner: BackendProfile = {
  name: "planner",
  kind: "openrouter",
  baseUrl: stub.url,
  apiKey: "sk-secret-planner",
  model: "reasoner",
  sampler: { temperature: 0.3, max_tokens: 4000 },
};
const drafter: BackendProfile = {
  name: "drafter",
  kind: "llamacpp",
  baseUrl: stub.url,
  model: "prose-finetune",
  sampler: { temperature: 0.9 },
};
const bindings: ProfileBindings = {
  plan: { profile: planner },
  prose: { profile: drafter, sampler: { min_p: 0.05 }, stream: true },
};

let storage: StorageAdapter;
let initial: WorldRecords;
let clock: number;
const now = () => {
  clock += 1;
  return clock;
};

beforeEach(async () => {
  stub.reset();
  clock = 1000;
  storage = createMemoryStorage();
  await value(saveStory(storage, fixture, 1000));
  await value(
    storage.batch(
      documents.map((record) => ({ kind: "saveDocument" as const, record })),
    ),
  );
  initial = await value(storage.dump());
});

const messages = (body: JsonObject) => body.messages as ChatMessage[];
const lastOf = (body: JsonObject, role: ChatMessage["role"]) =>
  [...messages(body)].reverse().find((m) => m.role === role);
const userText = (body: JsonObject) => lastOf(body, "user")?.content ?? "";

describe("a multi-turn outline and rework session", () => {
  const OUTLINE =
    "Outline a scene after the confession where Mara relights the lamp.";
  const REWORK = "Make the storm a single night, and follow it through.";

  /** Scripts the model's side of both runs. */
  function scriptModel() {
    stub.script(
      // Run 1, step 1: an edit, a query, and a call with a mistake.
      toolCalls(
        {
          name: "addEvent",
          args: {
            id: "relight",
            label: "The relighting",
            summary: "Mara relights the lamp with the last barrel.",
          },
        },
        {
          name: "addScene",
          args: {
            id: "relight",
            title: "Relit",
            summary: "Mara climbs to the lamp.",
          },
        },
        { name: "readerOrder", args: { before: "confession" } },
        { name: "setSceneEvents", args: { id: "relight" } },
      ),
      // Run 1, step 2: fixes the mistake.
      toolCalls({
        name: "setSceneEvents",
        args: { id: "relight", depicts: ["relight"] },
      }),
      // Run 1, step 3: done.
      reply("Added the relighting and its scene, after the confession."),
      // Run 2, step 4: the rework.
      toolCalls({
        name: "describeEvent",
        args: { id: "storm", summary: "One night of gale." },
      }),
      // Run 2, step 5: done.
      reply("The storm is one night now."),
    );
  }

  async function runSession(runner: ReturnType<typeof createAgentRunner>) {
    await value(
      runner.start({ id: "s1", role: "plan", scope: { kind: "world" } }),
    );
    const first = await value(runner.send("s1", OUTLINE));
    const second = await value(runner.send("s1", REWORK));
    return { first, second };
  }

  test("runs both runs, editing the bible through the tools", async () => {
    scriptModel();
    const runner = createAgentRunner({ storage, bindings, now });
    const { first, second } = await runSession(runner);
    expect(stub.pending()).toBe(0);
    expect(first.status).toBe("done");
    expect(first.steps.map((s) => s.index)).toEqual([1, 2, 3]);
    expect(second.status).toBe("done");
    expect(second.steps.map((s) => s.index)).toEqual([4, 5]);

    // The bible has the outline and the rework.
    const story = await value(loadStory(storage));
    expect(story.scenes.map((s) => s.id)).toEqual([
      "arrival",
      "storm-night",
      "confession",
      "relight",
    ]);
    expect(story.scenes.at(-1)?.depicts).toEqual(["relight"]);
    expect(story.timeline.events.find((e) => e.id === "storm")?.summary).toBe(
      "One night of gale.",
    );

    // The first request: the plan profile, every tool, the default prompt,
    // and the writer's message under the world's context.
    const [request1, request2, request3, request4, request5] = stub.received;
    if (request1 === undefined || request5 === undefined) {
      throw new Error("expected five requests");
    }
    expect(request1).toMatchObject({
      model: "reasoner",
      temperature: 0.3,
      max_tokens: 4000,
      stream: false,
    });
    expect(
      (request1.tools as { function: { name: string } }[]).map(
        (t) => t.function.name,
      ),
    ).toEqual(STORY_TOOLS.map((t) => t.name));
    expect(messages(request1)[0]).toEqual({
      role: "system",
      content: defaultSystemPrompt("plan"),
    });
    const before = createMemoryStorage();
    await value(before.restore(initial));
    const context1 = packetText(
      await value(buildContextPacket(before, { kind: "world" })),
    );
    expect(first.session.runs[0]?.context).toEqual(
      await value(buildContextPacket(before, { kind: "world" })),
    );
    expect(userText(request1)).toBe(
      `${context1}\n\n# The writer says\n\n${OUTLINE}`,
    );
    expect(context1).toContain("## Scenes in telling order");
    expect(context1).not.toContain("relight");

    // Each later request carries the calls and their results.
    const calls = messages(request2 ?? {}).find(
      (m): m is ToolCallMessage => m.role === "assistant" && "tool_calls" in m,
    );
    expect(calls?.tool_calls.map((c) => c.function.name)).toEqual([
      "addEvent",
      "addScene",
      "readerOrder",
      "setSceneEvents",
    ]);
    const results = messages(request2 ?? {}).filter((m) => m.role === "tool");
    expect(results.map((m) => JSON.parse(m.content as string).ok)).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(JSON.parse(results[3]?.content as string)).toMatchObject({
      error: { kind: "invalid_arguments" },
    });
    expect(messages(request3 ?? {})).toHaveLength(
      messages(request2 ?? {}).length + 2,
    );

    // The second run's context is assembled afresh and sees the outline.
    const run2 = userText(request4 ?? {});
    expect(run2).toContain('4. scene:relight ("Relit")');
    expect(run2.endsWith(`# The writer says\n\n${REWORK}`)).toBe(true);
    // The whole conversation so far goes with it.
    expect(
      messages(request4 ?? {}).slice(0, messages(request3 ?? {}).length + 1),
    ).toEqual([
      ...messages(request3 ?? {}),
      {
        role: "assistant",
        content: "Added the relighting and its scene, after the confession.",
      },
    ]);
    // The rework's result is the edit's whole report.
    const rework = JSON.parse(
      (lastOf(request5, "tool")?.content ?? "{}") as string,
    );
    expect(rework).toMatchObject({ ok: true, kind: "mutation" });
    expect(rework.warnings).toMatchObject({ contradictions: [], stale: null });

    // No API key reaches a request body or the log.
    const log = await value(loadSessionLog(storage, "s1"));
    expect(JSON.stringify(log)).not.toContain("sk-secret");
    expect(JSON.stringify(stub.received)).not.toContain("sk-secret");
  });

  test("records every step: request, output, calls, results and edits", async () => {
    scriptModel();
    const runner = createAgentRunner({ storage, bindings, now });
    await runSession(runner);
    const { session, steps } = await value(loadSessionLog(storage, "s1"));

    expect(session).toMatchObject({
      role: "plan",
      scope: { kind: "world" },
      next: "user",
      stopped: null,
      steps: 5,
    });
    expect(session.runs.map((r) => [r.index, r.message])).toEqual([
      [1, OUTLINE],
      [2, REWORK],
    ]);
    expect(steps.map((s) => [s.index, s.run, s.calls.length])).toEqual([
      [1, 1, 4],
      [2, 1, 1],
      [3, 1, 0],
      [4, 2, 1],
      [5, 2, 0],
    ]);
    // Each step's request is the one the server got.
    for (const [i, step] of steps.entries()) {
      expect(step.request.body).toEqual(stub.received[i] ?? {});
      expect(step.request.profile).toBe("planner");
    }
    const [step1, , step3, step4] = steps;
    if (!step1?.response.ok || !step3?.response.ok) {
      throw new Error("expected the steps to have answers");
    }
    expect(step1.response.completion.toolCalls).toHaveLength(4);
    expect(step3.response.completion.text).toBe(
      "Added the relighting and its scene, after the confession.",
    );

    // The edits each call made, record by record.
    const [addEvent, addScene, readerOrder, refused] = step1.calls;
    expect(addEvent?.changes).toEqual([
      {
        id: "event/relight",
        kind: "event",
        before: null,
        after: {
          id: "relight",
          label: "The relighting",
          summary: "Mara relights the lamp with the last barrel.",
        },
      },
    ]);
    expect(addScene?.changes.map((c) => c.id).sort()).toEqual([
      "scene/relight",
      "sceneOrder",
    ]);
    expect(readerOrder?.result).toMatchObject({ ok: true, kind: "query" });
    expect(readerOrder?.changes).toEqual([]);
    expect(refused?.result).toMatchObject({ ok: false });
    expect(refused?.changes).toEqual([]);
    expect(step4?.calls[0]?.changes).toEqual([
      expect.objectContaining({
        id: "event/storm",
        before: expect.objectContaining({ summary: "Three days of gale." }),
        after: expect.objectContaining({ summary: "One night of gale." }),
      }),
    ]);
  });

  test("replays from the log against a copy of the world as it started", async () => {
    scriptModel();
    const runner = createAgentRunner({ storage, bindings, now });
    await runSession(runner);
    const recorded = await value(loadSessionLog(storage, "s1"));
    const after = await value(loadStory(storage));

    const copy = createMemoryStorage();
    await value(copy.restore(initial));
    clock = 1000;
    const replayed = createAgentRunner({
      storage: copy,
      bindings,
      now,
      complete: replayModel(recorded.steps),
    });
    const sent = stub.received.length;
    await value(
      replayed.start({ id: "s1", role: "plan", scope: { kind: "world" } }),
    );
    for (const run of recorded.session.runs) {
      expect((await value(replayed.send("s1", run.message))).status).toBe(
        "done",
      );
    }
    // Nothing went to the server, and the replay made the same requests,
    // the same edits, and the same bible.
    expect(stub.received.length).toBe(sent);
    const again = await value(loadSessionLog(copy, "s1"));
    expect(again.steps.length).toBe(recorded.steps.length);
    for (const [i, step] of again.steps.entries()) {
      const original = recorded.steps[i];
      if (original === undefined) throw new Error("expected the step");
      expect(sameRequest(step.request, original.request)).toBe(true);
      expect(step.calls).toEqual(original.calls);
    }
    expect(await value(loadStory(copy))).toEqual(after);
  });

  test("a replay stops where the world it runs on differs", async () => {
    scriptModel();
    const runner = createAgentRunner({ storage, bindings, now });
    await runSession(runner);
    const recorded = await value(loadSessionLog(storage, "s1"));

    // The same session against the world after it ran: the first context
    // packet already differs.
    const replayed = createAgentRunner({
      storage,
      bindings,
      now,
      complete: replayModel(recorded.steps),
    });
    await value(
      replayed.start({ id: "s2", role: "plan", scope: { kind: "world" } }),
    );
    const outcome = await value(replayed.send("s2", OUTLINE));
    expect(outcome.status).toBe("stopped");
    expect(outcome.session.stopped).toBe("model_error");
    expect(outcome.steps[0]?.response).toEqual({
      ok: false,
      error: {
        kind: "malformed",
        message:
          "The replay's request for step 1 differs from the one recorded",
      },
    });
  });
});

describe("a prose turn on one scene", () => {
  test("sends the scene's context to the prose profile and streams the draft", async () => {
    const pieces = ["Ivo rowed ", "in at dusk", ", and the lamp was lit."];
    stub.script(streamed(pieces));
    const runner = createAgentRunner({ storage, bindings, now });
    await value(
      runner.start({
        id: "draft",
        role: "prose",
        scope: { kind: "scene", scene: "arrival" },
      }),
    );
    const events: AgentEvent[] = [];
    const outcome = await value(
      runner.send("draft", "Draft the scene.", {
        onEvent: (event) => events.push(event),
      }),
    );

    expect(outcome.status).toBe("done");
    const [request] = stub.received;
    if (request === undefined) throw new Error("expected a request");
    // The prose profile and its sampler, streamed, with no tools.
    expect(request).toMatchObject({
      model: "prose-finetune",
      temperature: 0.9,
      min_p: 0.05,
      stream: true,
    });
    expect(request.tools).toBeUndefined();
    expect(messages(request)[0]).toEqual({
      role: "system",
      content: defaultSystemPrompt("prose"),
    });

    // The context: the scene, what the reader knows before it with the
    // viewpoint and the counts as it opens, its events, people and prose.
    const text = userText(request);
    const story = await value(loadStory(storage));
    const told = readerOrderQuery(story, "arrival")._unsafeUnwrap().lines;
    expect(text).toContain(
      `## What the reader has been told before it\n\n${told.join("\n")}`,
    );
    expect(text).toContain("through the eyes of Mara");
    expect(text).toContain("Counts as the scene opens");
    expect(text).toContain(
      '- count:oil ("Barrels of oil"): none yet; then 9 of 12, reaching 2 at event:storm',
    );
    expect(text).toContain("## Events it depicts\n\nevent:storm\n");
    expect(text).toContain("## People in it\n\nactor:ivo\n");
    expect(text).toContain(
      "## Its prose so far\n\n## Arrival\n\nIvo rowed in at dusk",
    );
    expect(text.endsWith("# The writer says\n\nDraft the scene.")).toBe(true);
    const packet = await value(
      buildContextPacket(storage, { kind: "scene", scene: "arrival" }),
    );
    expect(text.startsWith(packetText(packet))).toBe(true);

    // The deltas came through as the model wrote them, and the step keeps
    // the whole draft.
    expect(
      events.flatMap((e) => (e.kind === "delta" ? [e.delta.text] : [])),
    ).toEqual(pieces);
    const { session, steps } = await value(loadSessionLog(storage, "draft"));
    expect(steps).toHaveLength(1);
    expect(steps[0]?.response).toMatchObject({
      ok: true,
      completion: { text: pieces.join("") },
    });
    expect(session.messages.at(-1)).toEqual({
      role: "assistant",
      content: pieces.join(""),
    });
    expect(session.next).toBe("user");
  });
});
