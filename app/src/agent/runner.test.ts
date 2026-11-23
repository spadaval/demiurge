import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import type { ResultAsync } from "neverthrow";
import { checkRequest } from "../llm/client";
import type {
  BackendProfile,
  ChatMessage,
  JsonObject,
  LlmRequest,
  ToolCallMessage,
} from "../llm/types";
import { createMemoryStorage } from "../storage/memory";
import type { StorageAdapter } from "../storage/types";
import { loadStory, saveStory } from "../story/store";
import { parseStory, type Story } from "../story/story";
import { buildContextPacket, packetText } from "./context";
import { sessionTurns, turnTrace } from "./inspect";
import type { ProfileBindings } from "./profiles";
import { loadSessionLog } from "./records";
import { replayModel, replayOptions } from "./replay";
import {
  type AgentEvent,
  type AgentRunner,
  createAgentRunner,
  type RunOptions,
} from "./runner";
import {
  failure,
  hanging,
  reply,
  startStubLlm,
  streamed,
  toolCalls,
} from "./stub-llm";

const fixture: Story = parseStory(
  await Bun.file(
    new URL("../story/fixtures/lighthouse.story.json", import.meta.url),
  ).text(),
)._unsafeUnwrap();

async function value<T, E>(result: ResultAsync<T, E>): Promise<T> {
  return (await result)._unsafeUnwrap();
}

const stub = startStubLlm();
afterAll(() => stub.stop());

const profile: BackendProfile = {
  name: "stub",
  kind: "generic",
  baseUrl: stub.url,
  model: "m",
  sampler: {},
};

let storage: StorageAdapter;
let clock: number;
const now = () => {
  clock += 1;
  return clock;
};

function runner(bindings: Partial<ProfileBindings> = {}): AgentRunner {
  return createAgentRunner({
    storage,
    bindings: {
      plan: { profile },
      prose: { profile },
      ...bindings,
    },
    now,
  });
}

beforeEach(async () => {
  stub.reset();
  clock = 5000;
  storage = createMemoryStorage();
  await value(saveStory(storage, fixture, 1000));
});

const world = { kind: "world" } as const;
const messages = (body: JsonObject | undefined) =>
  (body?.messages ?? []) as ChatMessage[];
const toolResults = (body: JsonObject | undefined) =>
  messages(body).flatMap((m) =>
    m.role === "tool" ? [JSON.parse(m.content)] : [],
  );
const actorIds = async () =>
  (await value(loadStory(storage))).actors.map((a) => a.id);

/** Each request as the server got it passes the client's own check. */
function wellFormed(body: JsonObject | undefined) {
  const request: LlmRequest = {
    profile: "stub",
    endpoint: "chat",
    url: `${stub.url}/chat/completions`,
    body: body ?? {},
  };
  return checkRequest(profile, request).isOk();
}

const addActor = (id: string) => ({
  name: "addActor",
  args: { id, name: id, kind: "person", notes: "" },
});
const show = { name: "show", args: { ref: "actor:mara" } };

async function started(options: Parameters<AgentRunner["start"]>[0]) {
  const r = runner();
  await value(r.start(options));
  return r;
}

describe("starting a session", () => {
  test("refuses a scope the bible doesn't have", async () => {
    const r = runner();
    for (const scope of [
      { kind: "scene", scene: "nowhere" } as const,
      { kind: "record", ref: "drive:nothing" } as const,
      { kind: "record", ref: "not a ref" } as const,
    ]) {
      expect(
        (await r.start({ role: "plan", scope }))._unsafeUnwrapErr(),
      ).toMatchObject({ kind: "invalid_scope" });
    }
    expect(await value(storage.agentRecords.list())).toEqual([]);
  });

  test("keeps the system prompt it is given, and refuses a taken ID", async () => {
    const r = runner();
    const session = await value(
      r.start({
        id: "s",
        role: "plan",
        scope: { kind: "record", ref: "drive:keep-light" },
        systemPrompt: "Be brief.",
      }),
    );
    expect(session.messages).toEqual([
      { role: "system", content: "Be brief." },
    ]);
    expect(
      (
        await r.start({ id: "s", role: "plan", scope: world })
      )._unsafeUnwrapErr(),
    ).toMatchObject({ kind: "not_ready", id: "s" });
    stub.script(reply("Fine."));
    await value(r.send("s", "Hello"));
    expect(messages(stub.received[0])[0]).toEqual({
      role: "system",
      content: "Be brief.",
    });
    expect(messages(stub.received[0])[1]?.content).toContain(
      "# Context: drive:keep-light",
    );
  });

  test("a message to a session that doesn't exist is refused", async () => {
    expect((await runner().send("none", "Hi"))._unsafeUnwrapErr()).toEqual({
      kind: "no_session",
      id: "none",
    });
  });
});

describe("guardrails", () => {
  test("stops at the step limit, and resume goes on", async () => {
    const r = await started({
      id: "s",
      role: "plan",
      scope: world,
      maxSteps: 2,
    });
    stub.script(toolCalls(show), toolCalls(show), reply("Done."));
    const first = await value(r.send("s", "Look around."));
    expect(first.status).toBe("stopped");
    expect(first.session).toMatchObject({
      stopped: "step_limit",
      next: "model",
    });
    expect(stub.received).toHaveLength(2);

    // A fresh runner picks the session up from storage.
    const second = await value(runner().resume("s"));
    expect(second.status).toBe("done");
    expect(second.session).toMatchObject({ stopped: null, next: "user" });
    expect(stub.received).toHaveLength(3);
    expect(stub.received.every(wellFormed)).toBe(true);
  });

  test("pauses when asked, before the next model call or tool call", async () => {
    const r = await started({ id: "s", role: "plan", scope: world });
    stub.script(toolCalls(addActor("a"), addActor("b")), reply("Done."));
    let pause = false;
    const options: RunOptions = {
      shouldPause: () => pause,
      onEvent: (event) => {
        // Pause once the first call has run.
        if (event.kind === "call") pause = true;
      },
    };
    const paused = await value(r.send("s", "Add two.", options));
    expect(paused.status).toBe("stopped");
    expect(paused.session).toMatchObject({ stopped: "paused", next: "tools" });
    expect(await actorIds()).toContain("a");
    expect(await actorIds()).not.toContain("b");

    // A message can't jump the calls still waiting.
    expect((await r.send("s", "Wait."))._unsafeUnwrapErr()).toMatchObject({
      kind: "not_ready",
    });

    const resumed = await value(r.resume("s"));
    expect(resumed.status).toBe("done");
    expect(await actorIds()).toContain("b");
    // The step that made the calls holds both, though two runs answered them.
    const { steps } = await value(loadSessionLog(storage, "s"));
    expect(steps[0]?.calls.map((c) => c.call.function.name)).toEqual([
      "addActor",
      "addActor",
    ]);
    expect(steps).toHaveLength(2);
    expect(stub.received.every(wellFormed)).toBe(true);
  });

  test("asks before editing when the session says so", async () => {
    const r = await started({
      id: "s",
      role: "plan",
      scope: world,
      approveMutations: true,
    });
    // Queries alone don't wait.
    stub.script(toolCalls(show), toolCalls(addActor("x")));
    const asked = await value(r.send("s", "Add x."));
    expect(asked.session).toMatchObject({ stopped: "approval", next: "tools" });
    expect(stub.received).toHaveLength(2);
    expect(await actorIds()).not.toContain("x");

    // Declined: nothing is written, and the model hears why.
    stub.script(toolCalls(addActor("y")));
    const declined = await value(r.resume("s", { decline: "Not yet." }));
    expect(declined.session.stopped).toBe("approval");
    expect(declined.steps.map((s) => s.index)).toEqual([2, 3]);
    expect(declined.steps[0]?.calls[0]?.result).toMatchObject({
      error: { code: "declined" },
    });
    expect(await actorIds()).not.toContain("x");
    expect(toolResults(stub.received[2]).at(-1)).toMatchObject({
      ok: false,
      tool: "addActor",
      error: {
        kind: "refused",
        code: "declined",
        message: "The writer declined this call: Not yet.",
      },
    });

    // Approved: it runs.
    stub.script(reply("Added y."));
    expect((await value(r.resume("s"))).status).toBe("done");
    expect(await actorIds()).toContain("y");
    expect(await actorIds()).not.toContain("x");
  });

  test("a failed model call stops the run, and resume tries it again", async () => {
    const r = await started({ id: "s", role: "plan", scope: world });
    stub.script(failure(503, "overloaded"));
    const failed = await value(r.send("s", "Hi"));
    expect(failed.session).toMatchObject({
      stopped: "model_error",
      next: "model",
    });
    expect(failed.steps[0]?.response).toMatchObject({
      ok: false,
      error: { kind: "http", status: 503 },
    });
    expect(JSON.stringify(failed.steps[0]?.response)).toContain("overloaded");
    stub.script(reply("Hello."));
    const retried = await value(r.resume("s"));
    expect(retried.status).toBe("done");
    expect(retried.steps.map((s) => s.index)).toEqual([2]);
    // The retry sent the same conversation.
    expect(stub.received[1]?.messages).toEqual(stub.received[0]?.messages);
  });

  test("a second run of a session while one is going is refused", async () => {
    const r = await started({ id: "s", role: "plan", scope: world });
    stub.script(reply("One."));
    const first = r.send("s", "One");
    expect((await r.send("s", "Two"))._unsafeUnwrapErr()).toEqual({
      kind: "busy",
      id: "s",
    });
    expect((await first).isOk()).toBe(true);
  });
});

describe("cancelling", () => {
  test("drops the model call in flight; the session waits for the writer", async () => {
    const r = runner({ plan: { profile, stream: true } });
    await value(r.start({ id: "s", role: "plan", scope: world }));
    const { reply: stuck, started: begun } = hanging("I was say");
    stub.script(stuck);
    const controller = new AbortController();
    const deltas: string[] = [];
    const running = r.send("s", "Talk.", {
      signal: controller.signal,
      onEvent: (event) => {
        if (event.kind === "delta") deltas.push(event.delta.text);
      },
    });
    await begun;
    await Bun.sleep(5);
    controller.abort();
    const cancelled = await value(running);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.session).toMatchObject({ next: "user", stopped: null });
    expect(cancelled.steps[0]?.response).toMatchObject({
      ok: false,
      error: { kind: "aborted" },
    });
    expect(deltas).toEqual(["I was say"]);
    // The half answer is not in the conversation, and the next message works.
    expect(cancelled.session.messages.at(-1)?.role).toBe("user");
    stub.script(streamed(["Hello again."]));
    expect((await value(r.send("s", "Again."))).status).toBe("done");
    expect(wellFormed(stub.received[1])).toBe(true);
  });

  test("answers the calls not yet run as cancelled", async () => {
    const r = await started({ id: "s", role: "plan", scope: world });
    stub.script(toolCalls(addActor("a"), addActor("b")));
    const controller = new AbortController();
    const cancelled = await value(
      r.send("s", "Add two.", {
        signal: controller.signal,
        onEvent: (event) => {
          if (event.kind === "call") controller.abort();
        },
      }),
    );
    expect(cancelled.status).toBe("cancelled");
    expect(await actorIds()).toContain("a");
    expect(await actorIds()).not.toContain("b");
    const results = cancelled.session.messages.filter((m) => m.role === "tool");
    expect(results.map((m) => JSON.parse(m.content as string).ok)).toEqual([
      true,
      false,
    ]);
    expect(JSON.parse(results[1]?.content as string)).toMatchObject({
      error: { kind: "refused", code: "cancelled" },
    });
    expect(cancelled.steps[0]?.calls).toHaveLength(2);
    stub.script(reply("Ok."));
    await value(r.send("s", "Go on."));
    expect(wellFormed(stub.received[1])).toBe(true);
  });
});

describe("tools", () => {
  test("a session with read-only tools refuses an edit it wasn't offered", async () => {
    const r = runner({ prose: { profile, tools: "queries" } });
    await value(r.start({ id: "s", role: "prose", scope: world }));
    stub.script(toolCalls(addActor("z"), show), reply("Ok."));
    await value(r.send("s", "Try."));
    const offered = (
      stub.received[0]?.tools as { function: { name: string } }[]
    ).map((t) => t.function.name);
    expect(offered).toContain("readerOrder");
    expect(offered).not.toContain("addActor");
    const [edit, query] = toolResults(stub.received[1]);
    expect(edit).toMatchObject({
      ok: false,
      error: { kind: "unknown_tool" },
    });
    expect(query).toMatchObject({ ok: true, kind: "query" });
    expect(await actorIds()).not.toContain("z");
  });

  test("a session with no tools sends none and refuses any call", async () => {
    const r = await started({ id: "s", role: "prose", scope: world });
    stub.script(toolCalls(show), reply("Ok."));
    await value(r.send("s", "Write."));
    expect(stub.received[0]?.tools).toBeUndefined();
    expect(toolResults(stub.received[1])).toEqual([
      expect.objectContaining({
        ok: false,
        error: {
          kind: "unknown_tool",
          message:
            "show is not a tool of this session. This session offers no tools.",
        },
      }),
    ]);
  });

  test("keeps call ids unique across steps when the provider repeats them", async () => {
    const r = await started({ id: "s", role: "plan", scope: world });
    // No ids: the client makes up call_0 each time.
    stub.script(
      toolCalls({ ...show, id: null }),
      toolCalls({ ...show, id: null }),
      reply("Ok."),
    );
    await value(r.send("s", "Look twice."));
    const ids = messages(stub.received[2]).flatMap((m) =>
      m.role === "assistant" && "tool_calls" in m
        ? (m as ToolCallMessage).tool_calls.map((c) => c.id)
        : [],
    );
    expect(ids).toEqual(["call_0", "call_0~2"]);
    expect(
      messages(stub.received[2]).flatMap((m) =>
        m.role === "tool" ? [m.tool_call_id] : [],
      ),
    ).toEqual(["call_0", "call_0~2"]);
    expect(stub.received.every(wellFormed)).toBe(true);
  });

  test("sends broken arguments back as {} and tells the model what was wrong", async () => {
    const r = await started({ id: "s", role: "plan", scope: world });
    stub.script(
      toolCalls({ name: "addActor", args: '{"id": "q", "name": ' }),
      reply("Sorry."),
    );
    await value(r.send("s", "Add q."));
    const turn = messages(stub.received[1]).find(
      (m): m is ToolCallMessage => m.role === "assistant" && "tool_calls" in m,
    );
    expect(turn?.tool_calls[0]?.function.arguments).toBe("{}");
    expect(toolResults(stub.received[1])[0]).toMatchObject({
      ok: false,
      error: { kind: "invalid_arguments" },
    });
    expect(toolResults(stub.received[1])[0].error.message).toContain(
      "not valid JSON",
    );
    // The step keeps what the model wrote.
    const { steps } = await value(loadSessionLog(storage, "s"));
    const recorded = steps[0]?.response;
    expect(
      recorded?.ok === true &&
        recorded.completion.toolCalls[0]?.function.arguments,
    ).toBe('{"id": "q", "name": ');
  });

  test("reports each step and call as it is saved", async () => {
    const r = await started({ id: "s", role: "plan", scope: world });
    stub.script(toolCalls(addActor("e")), reply("Ok."));
    const events: AgentEvent[] = [];
    await value(r.send("s", "Add e.", { onEvent: (e) => events.push(e) }));
    expect(events.map((e) => e.kind)).toEqual(["step", "call", "step"]);
    const call = events[1];
    expect(call?.kind === "call" && call.call.changes[0]?.id).toBe("actor/e");
  });
});

describe("editing a session", () => {
  test("configure changes the prompt and sampler the next calls send", async () => {
    const r = runner({ plan: { profile, sampler: { temperature: 0.2 } } });
    await value(
      r.start({
        id: "s",
        role: "plan",
        scope: world,
        systemPrompt: "One.",
        sampler: { top_p: 0.5 },
      }),
    );
    stub.script(reply("A."), reply("B."), reply("C."));
    await value(r.send("s", "First."));
    expect(stub.received[0]).toMatchObject({ temperature: 0.2, top_p: 0.5 });

    const changed = await value(
      r.configure("s", {
        systemPrompt: "Two.",
        sampler: { temperature: 0.9 },
      }),
    );
    expect(changed).toMatchObject({
      systemPrompt: "Two.",
      sampler: { temperature: 0.9 },
    });
    // A fresh runner reads the change from the record.
    const fresh = runner({ plan: { profile, sampler: { temperature: 0.2 } } });
    await value(fresh.send("s", "Second."));
    expect(messages(stub.received[1])[0]).toEqual({
      role: "system",
      content: "Two.",
    });
    expect(stub.received[1]?.temperature).toBe(0.9);
    expect(stub.received[1]?.top_p).toBeUndefined();

    // Dropping the session's sampler goes back to the binding's.
    await value(fresh.configure("s", { sampler: null }));
    await value(fresh.send("s", "Third."));
    expect(stub.received[2]?.temperature).toBe(0.2);

    // The first step keeps the prompt it sent.
    const { steps } = await value(loadSessionLog(storage, "s"));
    expect(messages(steps[0]?.request.body)[0]?.content).toBe("One.");
    expect(stub.received.every(wellFormed)).toBe(true);
  });

  test("configure is refused while the session runs", async () => {
    const r = await started({ id: "s", role: "plan", scope: world });
    stub.script(reply("One."));
    const running = r.send("s", "One");
    expect(
      (await r.configure("s", { systemPrompt: "x" }))._unsafeUnwrapErr(),
    ).toEqual({ kind: "busy", id: "s" });
    await running;
  });

  test("an edited context is sent, and kept on the run beside the packet it came from", async () => {
    const r = await started({ id: "s", role: "plan", scope: world });
    const packet = await value(buildContextPacket(storage, world));
    stub.script(reply("A."), reply("B."));
    const edited = `${packetText(packet)}\n\nThe writer's note: the lamp is out.`;
    const first = await value(
      r.send("s", "Look.", { context: { packet, text: edited } }),
    );
    expect(first.session.runs[0]).toMatchObject({
      context: packet,
      editedContext: edited,
    });
    expect(messages(stub.received[0])[1]?.content).toBe(
      `${edited}\n\n# The writer says\n\nLook.`,
    );

    // The packet as shown, unedited, is sent and records no edit.
    const second = await value(
      r.send("s", "Again.", {
        context: { packet, text: packetText(packet) },
      }),
    );
    expect(second.session.runs[1]?.editedContext).toBeUndefined();
    expect(messages(stub.received[1])[3]?.content).toContain(
      packetText(packet),
    );
  });

  test("a context for another scope is refused", async () => {
    const r = await started({ id: "s", role: "plan", scope: world });
    const packet = await value(
      buildContextPacket(storage, { kind: "scene", scene: "arrival" }),
    );
    expect(
      (
        await r.send("s", "Look.", { context: { packet, text: "x" } })
      )._unsafeUnwrapErr(),
    ).toMatchObject({ kind: "not_ready" });
    expect(stub.received).toHaveLength(0);
  });

  test("a replay sends an edited context as it was sent", async () => {
    const r = await started({ id: "s", role: "plan", scope: world });
    const packet = await value(buildContextPacket(storage, world));
    stub.script(reply("A."));
    await value(
      r.send("s", "Look.", { context: { packet, text: "Only this." } }),
    );
    const recorded = await value(loadSessionLog(storage, "s"));
    const copy = createMemoryStorage();
    await value(saveStory(copy, fixture, 1000));
    const replayed = createAgentRunner({
      storage: copy,
      bindings: { plan: { profile }, prose: { profile } },
      now,
      complete: replayModel(recorded.steps),
    });
    await value(replayed.start({ id: "s", role: "plan", scope: world }));
    const [run] = recorded.session.runs;
    if (run === undefined) throw new Error("no run");
    const outcome = await value(
      replayed.send("s", run.message, replayOptions(run)),
    );
    expect(outcome.status).toBe("done");
    expect(outcome.session.runs[0]?.editedContext).toBe("Only this.");
  });
});

describe("timing", () => {
  test("a call's duration is its own, though the writer paused before the next", async () => {
    const r = await started({ id: "s", role: "plan", scope: world });
    stub.script(toolCalls(show, show), reply("Done."));
    let pause = false;
    await value(
      r.send("s", "Look twice.", {
        shouldPause: () => pause,
        onEvent: (event) => {
          if (event.kind === "call") pause = true;
        },
      }),
    );
    const [paused] = sessionTurns(await value(loadSessionLog(storage, "s")));
    if (paused === undefined) throw new Error("no turn");
    const before = turnTrace(paused);
    const ms = (trace: typeof before) =>
      trace.map((c) => (c.state.kind === "answered" ? c.state.ms : null));
    expect(ms(before)).toEqual([1, null]);

    clock += 3_600_000;
    await value(r.resume("s"));
    const [turn] = sessionTurns(await value(loadSessionLog(storage, "s")));
    if (turn === undefined) throw new Error("no turn");
    expect(ms(turnTrace(turn))).toEqual([1, 1]);
  });
});
