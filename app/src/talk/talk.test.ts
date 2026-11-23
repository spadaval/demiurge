/**
 * Talk pages end to end against a stub OpenAI-compatible server and the
 * memory adapter: starting a topic, multi-turn agent turns with tool calls,
 * how model messages are signed, resolving and archiving, a failed turn
 * tried again, and the World inbox.
 */

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { errAsync, type ResultAsync } from "neverthrow";
import { readStep, stepRecordId } from "../agent/records";
import {
  failure,
  hanging,
  reply,
  startStubLlm,
  toolCalls,
} from "../agent/stub-llm";
import type { BackendProfile, ChatMessage, JsonObject } from "../llm/types";
import { createMemoryStorage } from "../storage/memory";
import type { StorageAdapter, StoredDocument } from "../storage/types";
import { storyContradictions } from "../story/contradictions";
import documentsFile from "../story/fixtures/lighthouse.documents.json";
import { saveStory } from "../story/store";
import { parseStory, type Story } from "../story/story";
import { worldInbox } from "./inbox";
import {
  listTopics,
  loadTopic,
  type ModelAuthor,
  readMessage,
  readTopic,
  topicRecord,
} from "./records";
import { scopeLine, topicPrompt } from "./scope";
import {
  createTalk,
  profilePrompt,
  type TalkModel,
  topicSessionId,
} from "./talk";

const fixture: Story = parseStory(
  await Bun.file(
    new URL("../story/fixtures/lighthouse.story.json", import.meta.url),
  ).text(),
)._unsafeUnwrap();
const documents: StoredDocument[] = documentsFile;

async function value<T, E>(result: ResultAsync<T, E>): Promise<T> {
  return (await result)._unsafeUnwrap();
}
async function failed<T, E>(result: ResultAsync<T, E>): Promise<E> {
  return (await result)._unsafeUnwrapErr();
}

const stub = startStubLlm();
afterAll(() => stub.stop());

const profile: BackendProfile = {
  name: "planner",
  kind: "openrouter",
  baseUrl: stub.url,
  apiKey: "sk-secret",
  model: "reasoner",
  sampler: { temperature: 0.3 },
};
const model: TalkModel = { binding: { profile }, label: "Planner" };

let storage: StorageAdapter;
let clock: number;
let ids: number;
let current: TalkModel | null;

function talk() {
  return createTalk({
    storage,
    model: () => current,
    now: () => {
      clock += 1;
      return clock;
    },
    newId: () => {
      ids += 1;
      return `t${ids}`;
    },
  });
}

beforeEach(async () => {
  stub.reset();
  clock = 1000;
  ids = 0;
  current = model;
  storage = createMemoryStorage();
  await value(saveStory(storage, fixture, 1000));
  await value(
    storage.batch(
      documents.map((record) => ({ kind: "saveDocument" as const, record })),
    ),
  );
});

const messages = (body: JsonObject) => body.messages as ChatMessage[];

describe("a topic with the model", () => {
  test("starting a topic stores it, runs a turn with tool calls, and signs the answer", async () => {
    stub.script(
      toolCalls(
        { name: "show", args: { ref: "scene:storm-night" } },
        { name: "readerOrder", args: { before: "storm-night" } },
      ),
      reply("Nobody but Mara could have lit it; the log says so."),
    );
    const outcome = await value(
      talk().start({
        title: "Who lit the lamp?",
        scope: { kind: "scene", scene: "storm-night" },
        message: "Could Ardelia have lit the lamp that night?",
      }),
    );
    expect(stub.pending()).toBe(0);
    expect(outcome.status).toBe("done");
    expect(outcome.stop).toBeNull();
    const { topic, messages: turns } = outcome.log;
    expect(topic).toMatchObject({
      id: "t1",
      title: "Who lit the lamp?",
      scope: { kind: "scene", scene: "storm-night" },
      status: "open",
      startedBy: { kind: "human" },
      session: topicSessionId("t1"),
      messages: 2,
      closedAt: null,
    });
    expect(turns.map((m) => m.author.kind)).toEqual(["human", "model"]);
    expect(turns[0]?.body).toBe("Could Ardelia have lit the lamp that night?");
    const answer = turns[1];
    expect(answer?.body).toBe(
      "Nobody but Mara could have lit it; the log says so.",
    );
    const session = topicSessionId("t1");
    expect(answer?.author).toEqual({
      kind: "model",
      profile: "Planner",
      model: "reasoner",
      session,
      requestId: stepRecordId(session, 2),
      trace: [stepRecordId(session, 1), stepRecordId(session, 2)],
    } satisfies ModelAuthor);
    expect(answer?.calls.map((c) => [c.name, c.ok])).toEqual([
      ["show", true],
      ["readerOrder", true],
    ]);
    expect(answer?.calls.every((c) => c.summary !== "")).toBe(true);

    // The stored request is the exact request that got the answer.
    const step = readStep(
      await value(storage.agentRecords.load(stepRecordId(session, 2))),
    )._unsafeUnwrap();
    expect(step.request.body).toEqual(stub.received[1] ?? {});
    expect(step.response.ok && step.response.completion.text).toBe(
      answer?.body ?? "",
    );

    // The model saw the scene's context and the topic, under its own prompt.
    const [first] = stub.received;
    if (first === undefined) throw new Error("no request");
    const system = messages(first)[0]?.content ?? "";
    expect(system).toContain('Its topic is "Who lit the lamp?"');
    expect(system).toContain("Scene 2 The night the light failed");
    expect(messages(first)[1]?.content).toContain(
      "# Context: scene:storm-night",
    );

    // What is stored reads back the same.
    expect(await value(loadTopic(storage, "t1"))).toEqual(outcome.log);
  });

  test("the next turn carries the conversation, and is signed with its own run", async () => {
    stub.script(
      reply("Mara, by the log."),
      toolCalls({ name: "show", args: { ref: "actor:mara" } }),
      reply("She was on the stair at midnight."),
    );
    const t = talk();
    await value(
      t.start({
        title: "Who lit the lamp?",
        scope: { kind: "world" },
        message: "Who lit it?",
      }),
    );
    const second = await value(t.send("t1", "Where was she at midnight?"));
    expect(second.status).toBe("done");
    const turns = second.log.messages;
    expect(turns.map((m) => [m.index, m.author.kind, m.body])).toEqual([
      [1, "human", "Who lit it?"],
      [2, "model", "Mara, by the log."],
      [3, "human", "Where was she at midnight?"],
      [4, "model", "She was on the stair at midnight."],
    ]);
    const session = topicSessionId("t1");
    expect(turns[3]?.author).toMatchObject({
      requestId: stepRecordId(session, 3),
      trace: [stepRecordId(session, 2), stepRecordId(session, 3)],
    });
    expect(turns[3]?.calls.map((c) => c.name)).toEqual(["show"]);
    // The third request holds the whole conversation so far.
    const third = stub.received[2];
    if (third === undefined) throw new Error("no third request");
    expect(
      messages(third)
        .filter((m) => m.role === "assistant")
        .map((m) => m.content),
    ).toEqual(["Mara, by the log.", null]);
    expect(second.log.topic.messages).toBe(4);
  });

  test("a turn records a refused tool call as failed", async () => {
    stub.script(
      toolCalls({ name: "show", args: { ref: "actor:nobody" } }),
      reply("There is no such person."),
    );
    const outcome = await value(
      talk().start({
        title: "Nobody",
        scope: { kind: "world" },
        message: "Who is nobody?",
      }),
    );
    expect(outcome.log.messages[1]?.calls).toEqual([
      { name: "show", ok: false, summary: expect.any(String) },
    ]);
  });

  test("nothing is stored for a topic without a title, a message, a model or a scope the bible has", async () => {
    const t = talk();
    const base = {
      title: "A topic",
      scope: { kind: "world" as const },
      message: "Go.",
    };
    expect(await failed(t.start({ ...base, title: "  " }))).toEqual({
      kind: "no_title",
    });
    expect(await failed(t.start({ ...base, message: "" }))).toEqual({
      kind: "empty_message",
    });
    expect(
      await failed(
        t.start({ ...base, scope: { kind: "scene", scene: "nowhere" } }),
      ),
    ).toMatchObject({ kind: "invalid_scope" });
    expect(
      await failed(
        t.start({ ...base, scope: { kind: "record", ref: "drive:nope" } }),
      ),
    ).toMatchObject({ kind: "invalid_scope" });
    current = null;
    expect(await failed(t.start(base))).toEqual({ kind: "no_model" });
    expect(await value(listTopics(storage))).toEqual([]);
    expect(await value(storage.agentRecords.list())).toEqual([]);
    expect(stub.received).toEqual([]);
  });

  test("a first turn whose topic failed to save can be sent again", async () => {
    // Storage refuses talk-record writes until told otherwise.
    const real = storage;
    let refuse = true;
    storage = Object.assign(Object.create(real), {
      batch: (writes: Parameters<StorageAdapter["batch"]>[0]) =>
        refuse && writes.some((w) => w.kind === "saveTalkRecord")
          ? errAsync({
              kind: "failure" as const,
              operation: "save" as const,
              message: "disk full",
              cause: null,
            })
          : real.batch(writes),
    });
    const t = talk();
    const spec = {
      id: "t9",
      title: "Ferry",
      scope: { kind: "world" as const },
      message: "Is it late?",
    };
    expect(await failed(t.start(spec))).toMatchObject({ kind: "failure" });
    expect(await value(listTopics(storage))).toEqual([]);
    refuse = false;
    stub.script(reply("Yes."));
    const outcome = await value(t.start(spec));
    expect(outcome.log.messages.map((m) => m.body)).toEqual([
      "Is it late?",
      "Yes.",
    ]);
  });

  test("a failed model call keeps the writer's message, and trying again answers it", async () => {
    stub.script(
      failure(503, "overloaded"),
      reply("Here is the answer after all."),
    );
    const t = talk();
    const first = await value(
      t.start({
        title: "Ferry",
        scope: { kind: "record", ref: "drive:keep-light" },
        message: "Why does she keep it lit?",
      }),
    );
    expect(first.status).toBe("stopped");
    expect(first.stop).toEqual({
      reason: "model_error",
      error: expect.stringContaining("overloaded"),
    });
    expect(first.log.messages.map((m) => m.author.kind)).toEqual(["human"]);
    expect((await value(t.load("t1"))).stop?.reason).toBe("model_error");
    // A new message waits for the stopped turn.
    expect(await failed(t.send("t1", "Hello?"))).toEqual({
      kind: "turn_stopped",
      id: "t1",
      reason: "model_error",
    });

    const again = await value(t.resume("t1"));
    expect(again.status).toBe("done");
    const answer = again.log.messages[1];
    expect(answer?.body).toBe("Here is the answer after all.");
    const session = topicSessionId("t1");
    // The failed step is part of the run's trace; the request is the last.
    expect(answer?.author).toMatchObject({
      requestId: stepRecordId(session, 2),
      trace: [stepRecordId(session, 1), stepRecordId(session, 2)],
    });
    expect((await value(t.load("t1"))).stop).toBeNull();
  });

  test("stopping a running turn cancels it and keeps the writer's message", async () => {
    const hang = hanging("Thinking");
    stub.script(hang.reply);
    current = { ...model, binding: { profile, stream: true } };
    const t = talk();
    const controller = new AbortController();
    const running = t.start(
      { title: "Ferry", scope: { kind: "world" }, message: "Go on." },
      { signal: controller.signal },
    );
    await hang.started;
    // Another turn can't start in the topic meanwhile.
    expect(await failed(t.send("t1", "And?"))).toEqual({
      kind: "turn_running",
      id: "t1",
    });
    controller.abort();
    const outcome = await value(running);
    expect(outcome.status).toBe("cancelled");
    expect(outcome.stop).toBeNull();
    expect(outcome.log.messages.map((m) => m.author.kind)).toEqual(["human"]);
  });
});

describe("review round 1", () => {
  const author: ModelAuthor = {
    kind: "model",
    profile: "Planner",
    model: "reasoner",
    session: null,
    requestId: null,
    trace: [],
  };

  test("replying to a raised topic gives the model its opening message", async () => {
    const t = talk();
    await value(
      t.raise({
        id: "r1",
        title: "A claim",
        scope: { kind: "world" },
        body: "The UNIQUE-CLAIM is wrong. Can you explain it?",
        author,
      }),
    );
    stub.script(reply("It contradicts the log."));
    const outcome = await value(t.send("r1", "What exactly is wrong?"));
    const sent = messages(stub.received[0] ?? {});
    expect(sent.map((m) => m.role)).toEqual(["system", "assistant", "user"]);
    expect(sent[1]?.content).toBe(
      "The UNIQUE-CLAIM is wrong. Can you explain it?",
    );
    expect(outcome.log.messages.map((m) => m.body)).toEqual([
      "The UNIQUE-CLAIM is wrong. Can you explain it?",
      "What exactly is wrong?",
      "It contradicts the log.",
    ]);
  });

  test("a rename while a turn runs is kept when the turn ends", async () => {
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let asked = () => {};
    const waiting = new Promise<void>((resolve) => {
      asked = resolve;
    });
    stub.script(async (body) => {
      asked();
      await held;
      return reply("Done.")(body);
    });
    const t = talk();
    const turn = t.start({
      id: "t1",
      title: "Lamp",
      scope: { kind: "world" },
      message: "Who lit it?",
    });
    await waiting;
    expect((await value(t.rename("t1", "New title"))).title).toBe("New title");
    release();
    const outcome = await value(turn);
    expect(outcome.log.topic.title).toBe("New title");
    expect(outcome.log.messages).toHaveLength(2);
    expect((await value(t.load("t1"))).topic.title).toBe("New title");
  });

  test("an answer whose save failed is recorded once, from its stored run", async () => {
    // Storage refuses the first write of a model-authored message.
    const real = storage;
    let refusals = 1;
    storage = Object.assign(Object.create(real), {
      batch: (writes: Parameters<StorageAdapter["batch"]>[0]) => {
        const answer = writes.some(
          (w) =>
            w.kind === "saveTalkRecord" &&
            w.record.kind === "message" &&
            JSON.stringify(w.record.data).includes('"kind":"model"'),
        );
        if (answer && refusals > 0) {
          refusals -= 1;
          return errAsync({
            kind: "failure" as const,
            operation: "save" as const,
            message: "disk full",
            cause: null,
          });
        }
        return real.batch(writes);
      },
    });
    stub.script(
      toolCalls({ name: "show", args: { ref: "scene:arrival" } }),
      reply("Mara arrives."),
    );
    const t = talk();
    expect(
      await failed(
        t.start({
          id: "t1",
          title: "Arrival",
          scope: { kind: "world" },
          message: "Who arrives?",
        }),
      ),
    ).toMatchObject({ kind: "failure" });

    // Reopening records it, signed with the stored run, without a model call.
    const reopened = await value(talk().load("t1"));
    const session = topicSessionId("t1");
    expect(reopened.messages.map((m) => m.body)).toEqual([
      "Who arrives?",
      "Mara arrives.",
    ]);
    expect(reopened.messages[1]?.author).toEqual({
      kind: "model",
      profile: "Planner",
      model: "reasoner",
      session,
      requestId: stepRecordId(session, 2),
      trace: [stepRecordId(session, 1), stepRecordId(session, 2)],
    });
    expect(reopened.messages[1]?.calls.map((c) => c.name)).toEqual(["show"]);
    expect(reopened.topic.answered).toBe(1);
    expect(stub.received).toHaveLength(2);

    // Loading, resuming and sending again record nothing twice.
    await value(t.load("t1"));
    expect((await value(t.resume("t1"))).log.messages).toHaveLength(2);
    stub.script(reply("Yes."));
    const next = await value(t.send("t1", "Alone?"));
    expect(next.log.messages.map((m) => m.body)).toEqual([
      "Who arrives?",
      "Mara arrives.",
      "Alone?",
      "Yes.",
    ]);
  });

  test("try again records an answer whose save failed", async () => {
    const real = storage;
    let refusals = 1;
    storage = Object.assign(Object.create(real), {
      batch: (writes: Parameters<StorageAdapter["batch"]>[0]) => {
        const answer = writes.some(
          (w) =>
            w.kind === "saveTalkRecord" &&
            JSON.stringify(w.record.data).includes('"kind":"model"'),
        );
        if (answer && refusals > 0) {
          refusals -= 1;
          return errAsync({
            kind: "failure" as const,
            operation: "save" as const,
            message: "disk full",
            cause: null,
          });
        }
        return real.batch(writes);
      },
    });
    stub.script(reply("Mara."));
    const t = talk();
    await failed(
      t.start({
        id: "t1",
        title: "Who",
        scope: { kind: "world" },
        message: "Who?",
      }),
    );
    const again = await value(t.resume("t1"));
    expect(again.status).toBe("done");
    expect(again.log.messages.map((m) => m.body)).toEqual(["Who?", "Mara."]);
    expect(stub.received).toHaveLength(1);
  });
});

describe("a topic's status", () => {
  async function started() {
    stub.script(reply("Noted."));
    const t = talk();
    await value(
      t.start({
        title: "Ferry",
        scope: { kind: "world" },
        message: "Is the ferry late?",
      }),
    );
    return t;
  }

  test("resolving closes it to turns, and reopening opens it again", async () => {
    const t = await started();
    const resolved = await value(t.setStatus("t1", "resolved"));
    expect(resolved).toMatchObject({ status: "resolved" });
    expect(resolved.closedAt).toBe(resolved.updatedAt);
    expect(await failed(t.send("t1", "One more thing"))).toEqual({
      kind: "topic_closed",
      id: "t1",
      status: "resolved",
    });
    expect(await failed(t.rename("t1", "New"))).toMatchObject({
      kind: "topic_closed",
    });

    const reopened = await value(t.setStatus("t1", "open"));
    expect(reopened).toMatchObject({ status: "open", closedAt: null });
    stub.script(reply("Yes, by an hour."));
    const outcome = await value(t.send("t1", "One more thing"));
    expect(outcome.log.messages.map((m) => m.body)).toEqual([
      "Is the ferry late?",
      "Noted.",
      "One more thing",
      "Yes, by an hour.",
    ]);
  });

  test("archiving keeps the topic and its turns", async () => {
    const t = await started();
    await value(t.setStatus("t1", "archived"));
    const log = await value(t.load("t1"));
    expect(log.topic.status).toBe("archived");
    expect(log.messages).toHaveLength(2);
    expect(await value(t.list())).toEqual([log.topic]);
  });

  test("renaming an open topic keeps its turns; a blank name is refused", async () => {
    const t = await started();
    expect((await value(t.rename("t1", "  Is it late?  "))).title).toBe(
      "Is it late?",
    );
    expect(await failed(t.rename("t1", " "))).toEqual({ kind: "no_title" });
    expect((await value(t.load("t1"))).messages).toHaveLength(2);
  });
});

describe("the World inbox", () => {
  const author: ModelAuthor = {
    kind: "model",
    profile: "Planner",
    model: "reasoner",
    session: null,
    requestId: null,
    trace: [],
  };

  test("lists open topics the model raised, newest first, then the kept contradictions", async () => {
    const t = talk();
    stub.script(reply("Noted."));
    await value(
      t.start({ title: "Mine", scope: { kind: "world" }, message: "Hi." }),
    );
    await value(
      t.raise({
        title: "The log and the storm disagree",
        scope: { kind: "scene", scene: "storm-night" },
        body: "The log says calm; the scene says gale.",
        author,
      }),
    );
    await value(
      t.raise({
        title: "Does Mara still want to leave?",
        scope: { kind: "record", ref: "drive:leave-island" },
        body: "Her drive has no turn after the confession.",
        author,
      }),
    );
    await value(
      t.raise({
        title: "Settled already",
        scope: { kind: "world" },
        body: "x",
        author,
      }),
    );
    await value(t.setStatus("t4", "resolved"));

    const topics = await value(t.list());
    const contradictions = storyContradictions(fixture);
    expect(contradictions.length).toBeGreaterThan(0);
    const inbox = worldInbox(topics, contradictions);
    expect(
      inbox.map((item) =>
        item.kind === "topic" ? item.topic.title : item.contradiction.message,
      ),
    ).toEqual([
      "Does Mara still want to leave?",
      "The log and the storm disagree",
      ...contradictions.map((c) => c.message),
    ]);

    const raised = await value(t.load("t3"));
    expect(raised.topic.startedBy).toEqual(author);
    expect(raised.messages[0]?.author).toEqual(author);
    expect(scopeLine(fixture, raised.topic.scope)).toBe(
      "Drive · Leave the island",
    );
  });
});

describe("stored talk records", () => {
  test("a topic or message that isn't what its kind says is refused", () => {
    const record = topicRecord({
      version: 1,
      id: "t1",
      title: "T",
      scope: { kind: "world" },
      status: "open",
      startedBy: { kind: "human" },
      session: null,
      messages: 0,
      answered: 0,
      createdAt: 1,
      updatedAt: 1,
      closedAt: null,
    });
    expect(readTopic(record).isOk()).toBe(true);
    expect(
      readTopic({ ...record, data: { ...Object(record.data), status: "x" } }),
    ).toMatchObject({ error: { kind: "invalid_talk_record" } });
    expect(
      readTopic({
        ...record,
        data: { ...Object(record.data), scope: { kind: "scene" } },
      }).isErr(),
    ).toBe(true);
    expect(readMessage(record).isErr()).toBe(true);
  });
});

describe("a topic prompt saved as the profile default", () => {
  test("drops the topic's own part, the last one, and keeps a prompt without one whole", () => {
    const topic = topicPrompt(fixture, "Who lit the lamp?", { kind: "world" });
    expect(profilePrompt(`Be terse.\n\n${topic}`)).toBe("Be terse.");
    // A writer's own heading earlier in the prompt stays.
    expect(
      profilePrompt(`Be terse.\n\n# This talk page\nMine.\n\n${topic}`),
    ).toBe("Be terse.\n\n# This talk page\nMine.");
    expect(profilePrompt("Be terse.")).toBe("Be terse.");
  });
});
