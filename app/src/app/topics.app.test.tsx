/**
 * The Topics view in the running app, against a stub OpenAI-compatible
 * server: the rail's World inbox and open topics, starting a topic from
 * "New topic", multi-turn agent turns with tool calls signed by the model,
 * resolving, archiving and reopening, the World inbox and resolved-and-
 * archived sheets, and a failed turn tried again.
 */

import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { errAsync } from "neverthrow";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  failure,
  startStubLlm,
  streamed,
  streamedToolCalls,
} from "~/agent/stub-llm";
import type { BackendProfile } from "~/llm/types";
import { createMemoryStorage } from "~/storage/memory";
import type { StorageAdapter, StoredDocument } from "~/storage/types";
import { storyContradictions } from "~/story/contradictions";
import documentsFile from "~/story/fixtures/lighthouse.documents.json";
import { saveStory } from "~/story/store";
import { parseStory, type Story } from "~/story/story";
import { listTopics, loadTopic } from "~/talk/records";
import { createTalk } from "~/talk/talk";
import { createStorageConnection } from "~/workspace/connection";
import type { KeyValueStore } from "~/workspace/tabs";
import { createWorkspace, type Workspace } from "~/workspace/workspace";
import { AppProviders, type AppServices } from "./hooks";
import { createLayerSource } from "./layers";
import { createAppRouter } from "./router";
import { createAppServices } from "./services";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const fixture: Story = parseStory(
  await Bun.file(
    new URL("../story/fixtures/lighthouse.story.json", import.meta.url),
  ).text(),
)._unsafeUnwrap();
const documents: StoredDocument[] = documentsFile;

const stub = startStubLlm();
afterAll(() => stub.stop());

const PROFILE: BackendProfile = {
  name: "stub",
  label: "Planner",
  kind: "generic",
  baseUrl: stub.url,
  model: "reasoner",
  sampler: { temperature: 0.3 },
};

let root: Root | undefined;
let container: HTMLElement | undefined;
let storage: StorageAdapter;
let workspace: Workspace;
let services: AppServices;

beforeEach(async () => {
  stub.reset();
  storage = createMemoryStorage();
  (await saveStory(storage, fixture, 1000))._unsafeUnwrap();
  (
    await storage.batch(
      documents.map((record) => ({ kind: "saveDocument" as const, record })),
    )
  )._unsafeUnwrap();
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

const keyValueStore = (initial: Record<string, string> = {}): KeyValueStore => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
};

const withProfile = () =>
  keyValueStore({
    "worldcrafter:w1:backend-profile": JSON.stringify(PROFILE),
  });

async function render(path: string, keyValue = withProfile()) {
  workspace = createWorkspace({
    worldId: "w1",
    connection: createStorageConnection(storage, () =>
      errAsync({
        kind: "failure",
        operation: "open",
        message: "no reopen",
        cause: null,
      }),
    ),
    tabStore: keyValue,
    readOnly: false,
    saveDelayMs: 60_000,
  });
  (await workspace.refreshDocuments())._unsafeUnwrap();
  services = await createAppServices({
    workspace,
    keyValue,
    layerSource: createLayerSource(),
    environment: {
      role: "writer",
      persistence: "granted",
      storage: "indexeddb",
      worldName: null,
    },
  });
  const router = createAppRouter(
    workspace,
    createMemoryHistory({ initialEntries: [path] }),
  );
  container = document.createElement("div");
  document.body.append(container);
  const target = createRoot(container);
  root = target;
  await act(async () => {
    target.render(
      <AppProviders services={services}>
        <RouterProvider router={router} />
      </AppProviders>,
    );
  });
  await settle();
  return router;
}

const query = <E extends Element = HTMLElement>(selector: string) =>
  container?.querySelector<E>(selector) ?? null;
const queryAll = (selector: string) => [
  ...(container?.querySelectorAll<HTMLElement>(selector) ?? []),
];
const text = (selector: string) => query(selector)?.textContent ?? "";

async function settle() {
  await act(() => new Promise((resolve) => setTimeout(resolve, 5)));
}

async function until(condition: () => boolean, what = "condition") {
  for (let i = 0; i < 400 && !condition(); i++) {
    await act(() => new Promise((resolve) => setTimeout(resolve, 5)));
  }
  if (!condition()) throw new Error(`timed out waiting for ${what}`);
}

const click = async (element: Element | null) => {
  if (!element) throw new Error("nothing to click");
  await act(async () => (element as HTMLElement).click());
};

/** The button or link whose text is `label`, inside `scope`. */
const control = (label: string, scope = ""): HTMLElement | null =>
  [
    ...(container?.querySelectorAll<HTMLElement>(
      `${scope} button, ${scope} a`,
    ) ?? []),
  ].find((b) => b.textContent === label) ?? null;

async function type(
  field: HTMLTextAreaElement | HTMLInputElement | null,
  value: string,
) {
  if (!field) throw new Error("no field to type in");
  const setter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(field),
    "value",
  )?.set;
  await act(async () => {
    setter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const turns = () =>
  queryAll(".turns > .turn-entry > .turn").map((turn) => ({
    author: turn.querySelector(".turn-author")?.textContent,
    body: turn.querySelector(".turn-body")?.textContent ?? "",
    model: turn.classList.contains("turn-model"),
    calls: turn.querySelector(".turn-calls summary")?.textContent ?? null,
  }));

const send = () => control("Send", ".composer") as HTMLButtonElement | null;

/** A model-raised topic, stored as the agent would raise it. */
async function raise(title: string) {
  const talk = createTalk({ storage, model: () => null });
  return (
    await talk.raise({
      title,
      scope: { kind: "scene", scene: "storm-night" },
      body: "The log says calm; the scene says gale.",
      author: {
        kind: "model",
        profile: "Planner",
        model: "reasoner",
        session: null,
        requestId: null,
        trace: [],
      },
    })
  )._unsafeUnwrap();
}

test("the rail's Topics view lists the World inbox, then open topics by scope", async () => {
  await raise("The log and the storm disagree");
  await render("/inbox");
  await click(query("#rail-tab-topics"));

  const contradictions = storyContradictions(fixture);
  const inbox = query('[aria-labelledby="rail-inbox"]');
  expect(inbox?.querySelector(".rail-count")?.textContent).toBe(
    String(1 + contradictions.length),
  );
  const rows = [...(inbox?.querySelectorAll(".topic-row") ?? [])].map((row) => [
    row.querySelector(".topic-title")?.textContent,
    row.querySelector(".topic-about")?.textContent,
  ]);
  expect(rows[0]).toEqual([
    "The log and the storm disagree",
    "Scene · 2 The night the light failed · raised by model",
  ]);
  expect(rows[1]?.[1]).toStartWith("Contradiction · ");
  expect(rows.length).toBeLessThanOrEqual(3);
  expect(control("Open the inbox")).not.toBeNull();

  // Open topics by scope: the raised one under Scenes.
  expect(text("#rail-topics-scene")).toBe("Scenes");
  expect(
    query('[aria-labelledby="rail-topics-scene"] .topic-about')?.textContent,
  ).toBe("Scene · 2 The night the light failed · raised by model");
  expect(control("New topic", ".rail")).not.toBeNull();
  expect(control("Resolved and archived")).not.toBeNull();
  // The rail foot's inbox line is a reference to the inbox sheet.
  expect(text(".rail-foot")).toContain(
    `${1 + contradictions.length} items in the world inbox`,
  );
});

test("new topic: name it, send, and the model's turn runs with tool calls, signed", async () => {
  const router = await render("/inbox");
  await click(query("#rail-tab-topics"));
  await click(control("New topic", ".rail"));
  await until(() => query(".topic-sheet") !== null, "the topic sheet");

  // A new topic: the scope, an empty title in focus, no turns, and Send waiting.
  expect(router.state.location.pathname).toStartWith("/topic/");
  expect(text(".topic-scope")).toBe("World");
  const title = query<HTMLInputElement>(".topic-title-field");
  expect(title?.value).toBe("");
  expect(title?.placeholder).toBe("Name this topic");
  expect(document.activeElement).toBe(title);
  expect(text(".topic-status")).toBe("Open");
  expect(text(".turns-empty")).toBe(
    "No turns yet. Say what this topic should settle.",
  );
  const composer = query<HTMLTextAreaElement>(".composer textarea");
  await type(composer, "Who lit the lamp on the storm night?");
  expect(send()?.disabled).toBe(true);
  // Nothing is stored before the first Send.
  expect((await listTopics(storage))._unsafeUnwrap()).toEqual([]);

  await type(title, "Who lit the lamp?");
  expect(send()?.disabled).toBe(false);
  stub.script(
    streamedToolCalls({ name: "show", args: { ref: "scene:storm-night" } }),
    streamed(["Mara lit it, ", "by the log."]),
  );
  await click(send());
  await until(() => turns().length === 2 && !query("[aria-busy]"), "the turn");

  expect(turns()).toEqual([
    {
      author: "You",
      body: "Who lit the lamp on the storm night?",
      model: false,
      calls: null,
    },
    {
      author: "Model · Planner",
      body: "Mara lit it, by the log.",
      model: true,
      calls: "1 tool call · show",
    },
  ]);
  // The tab strip shows the topic under the Topics crumb.
  expect(text(".tab[data-active='true']")).toContain("Topics › ");
  expect(text(".tab[data-active='true'] .tab-title")).toBe("Who lit the lamp?");

  // Stored, signed with the stored request and the run's trace.
  const [topic] = (await listTopics(storage))._unsafeUnwrap();
  if (topic === undefined) throw new Error("no topic stored");
  expect(topic).toMatchObject({ title: "Who lit the lamp?", status: "open" });
  const { messages } = (await loadTopic(storage, topic.id))._unsafeUnwrap();
  expect(messages[1]?.author).toMatchObject({
    kind: "model",
    profile: "Planner",
    model: "reasoner",
    requestId: `talk-${topic.id}/step/000002`,
    trace: [`talk-${topic.id}/step/000001`, `talk-${topic.id}/step/000002`],
  });

  // The next turn carries the conversation.
  stub.script(streamed(["On the stair, at midnight."]));
  await type(
    query<HTMLTextAreaElement>(".composer textarea"),
    "Where was she?",
  );
  await click(send());
  await until(
    () => turns().length === 4 && !query("[aria-busy]"),
    "the second turn",
  );
  expect(turns().map((t) => t.body)).toEqual([
    "Who lit the lamp on the storm night?",
    "Mara lit it, by the log.",
    "Where was she?",
    "On the stair, at midnight.",
  ]);
  const third = stub.received[2];
  expect(
    (third?.messages as { role: string }[]).filter(
      (m) => m.role === "assistant",
    ),
  ).toHaveLength(2);

  // The topic is listed in the rail under World, in the active tab.
  const row = query('[aria-labelledby="rail-topics-world"] .topic-row');
  expect(row?.querySelector(".topic-title")?.textContent).toBe(
    "Who lit the lamp?",
  );
  expect(row?.getAttribute("aria-current")).toBe("page");
});

test("closing a new topic's tab before Send discards it", async () => {
  const router = await render("/inbox");
  await click(query("#rail-tab-topics"));
  await click(control("New topic", ".rail"));
  await until(() => query(".topic-sheet") !== null, "the topic sheet");
  await type(query<HTMLInputElement>(".topic-title-field"), "Never sent");
  const tabs = () => workspace.tabs.get().open;
  expect(tabs()).toHaveLength(2);
  await click(query(".tab[data-active='true'] .tab-close"));
  await until(() => tabs().length === 1, "the tab to close");
  expect(router.state.location.pathname).toBe("/inbox");
  expect(services.talk.drafts.get().size).toBe(0);
  expect((await listTopics(storage))._unsafeUnwrap()).toEqual([]);
});

test("resolve and archive close a topic to turns; reopen brings the composer back", async () => {
  const { topic } = await raise("The log and the storm disagree");
  await render(`/topic/${topic.id}`);
  await until(() => query(".topic-sheet") !== null, "the topic sheet");
  expect(text(".topic-started")).toContain("Raised by the model (Planner)");
  expect(turns()[0]).toMatchObject({ author: "Model · Planner", model: true });

  await click(control("Resolve", ".topic-head"));
  await until(() => text(".topic-status") === "Resolved", "resolved");
  expect(query(".composer")).toBeNull();
  expect(text(".topic-closed")).toStartWith("Resolved on ");
  expect(control("Reopen", ".topic-head")).not.toBeNull();
  // A resolved topic leaves the inbox and is listed with the rest.
  const contradictions = storyContradictions(fixture).length;
  expect(services.talk.topics.get()[0]?.status).toBe("resolved");
  await click(query("#rail-tab-topics"));
  expect(text('[aria-labelledby="rail-inbox"] .rail-count')).toBe(
    String(contradictions),
  );
  await click(control("Resolved and archived"));
  await until(() => query(".ledger-sheet") !== null, "the closed sheet");
  expect(text(".ledger-label")).toBe("Resolved1");
  expect(text(".ledger-lead")).toBe("The log and the storm disagree");

  // Reopen, then archive.
  await click(query(".ledger-lead a"));
  await until(() => query(".topic-sheet") !== null, "the topic sheet");
  await click(control("Reopen", ".topic-head"));
  await until(() => query(".composer") !== null, "the composer");
  await click(control("Archive", ".topic-head"));
  await until(() => text(".topic-status") === "Archived", "archived");
  expect(text(".topic-closed")).toStartWith("Archived on ");
  expect(
    (await loadTopic(storage, topic.id))._unsafeUnwrap().topic.status,
  ).toBe("archived");
});

test("the World inbox sheet lists raised topics and kept contradictions", async () => {
  const { topic } = await raise("The log and the storm disagree");
  const router = await render("/inbox");
  await until(() => query(".ledger-sheet") !== null, "the inbox sheet");
  const contradictions = storyContradictions(fixture);
  const rows = queryAll(".ledger-row").map((row) => ({
    kind: row.querySelector(".ledger-kind")?.textContent,
    lead: row.querySelector(".ledger-lead")?.textContent,
    secondary: row.querySelector(".ledger-line")?.textContent,
    meta: row.querySelector(".ledger-meta")?.textContent,
  }));
  expect(rows[0]).toMatchObject({
    kind: "Topic",
    lead: "The log and the storm disagree",
    secondary: "Scene · 2 The night the light failed",
  });
  expect(rows[0]?.meta).toStartWith("Model · Planner, ");
  expect(rows.slice(1).map((r) => [r.kind, r.lead])).toEqual(
    contradictions.map((c) => ["Contradiction", c.message]),
  );
  expect(text(".tab[data-active='true'] .tab-title")).toBe("World inbox");
  // A contradiction opens the inspector's Contradictions view.
  expect(
    queryAll(".ledger-row")[1]
      ?.querySelector(".ledger-lead a")
      ?.getAttribute("href"),
  ).toBe("/world?at=contradictions");

  await click(query(".ledger-lead a"));
  await until(() => query(".topic-sheet") !== null, "the topic sheet");
  expect(router.state.location.pathname).toBe(`/topic/${topic.id}`);
});

test("a failed turn shows its error in the turn, and Try again answers it", async () => {
  const { topic } = await raise("The log and the storm disagree");
  await render(`/topic/${topic.id}`);
  await until(() => query(".composer") !== null, "the composer");
  stub.script(failure(503, "overloaded"));
  await type(query<HTMLTextAreaElement>(".composer textarea"), "Which is it?");
  await click(send());
  await until(() => query(".turn-failure") !== null, "the failure");
  expect(text(".turn-failure")).toContain("overloaded");
  expect(turns().map((t) => t.author)).toEqual([
    "Model · Planner",
    "You",
    "Model",
  ]);

  stub.script(streamed(["The scene is right; the log lies."]));
  await click(control("Try again", ".turn-failure"));
  await until(
    () => query(".turn-failure") === null && !query("[aria-busy]"),
    "the answer",
  );
  expect(turns().at(-1)).toMatchObject({
    author: "Model · Planner",
    body: "The scene is right; the log lies.",
  });
});

test("without a model, Send says so and keeps what the writer wrote", async () => {
  const { topic } = await raise("The log and the storm disagree");
  await render(`/topic/${topic.id}`, keyValueStore());
  await until(() => query(".composer") !== null, "the composer");
  await type(query<HTMLTextAreaElement>(".composer textarea"), "Which is it?");
  await click(send());
  await until(() => query(".topic-error") !== null, "the error");
  expect(text(".topic-error")).toContain("No model is set up");
  expect(query<HTMLTextAreaElement>(".composer textarea")?.value).toBe(
    "Which is it?",
  );
  expect(stub.received).toEqual([]);
});

test("unsent writing survives moving to another tab and back", async () => {
  const router = await render("/inbox");
  await click(query("#rail-tab-topics"));
  await click(control("New topic", ".rail"));
  await until(() => query(".topic-sheet") !== null, "the topic sheet");
  const path = router.state.location.pathname;
  await type(query<HTMLInputElement>(".topic-title-field"), "My unsent title");
  await type(
    query<HTMLTextAreaElement>(".composer textarea"),
    "My unsent message",
  );
  await act(() => router.navigate({ to: "/inbox" }));
  await until(() => query(".ledger-sheet") !== null, "the inbox");
  await act(() => router.navigate({ to: path }));
  await until(() => query(".topic-sheet") !== null, "the topic again");
  expect(query<HTMLInputElement>(".topic-title-field")?.value).toBe(
    "My unsent title",
  );
  expect(query<HTMLTextAreaElement>(".composer textarea")?.value).toBe(
    "My unsent message",
  );
  // Nothing is stored for it meanwhile.
  expect((await listTopics(storage))._unsafeUnwrap()).toEqual([]);

  // A stored topic's composer keeps its text too, until it is sent.
  const { topic } = await raise("The log and the storm disagree");
  await act(() =>
    router.navigate({ to: "/topic/$topicId", params: { topicId: topic.id } }),
  );
  await until(() => query(".composer") !== null, "the stored topic");
  await type(
    query<HTMLTextAreaElement>(".composer textarea"),
    "Half a thought",
  );
  await act(() => router.navigate({ to: "/inbox" }));
  await until(() => query(".ledger-sheet") !== null, "the inbox");
  await act(() =>
    router.navigate({ to: "/topic/$topicId", params: { topicId: topic.id } }),
  );
  await until(() => query(".composer") !== null, "the stored topic again");
  expect(query<HTMLTextAreaElement>(".composer textarea")?.value).toBe(
    "Half a thought",
  );
  stub.script(streamed(["Noted."]));
  await click(send());
  await until(() => turns().length === 3 && !query("[aria-busy]"), "the turn");
  expect(query<HTMLTextAreaElement>(".composer textarea")?.value).toBe("");
  expect(turns().map((t) => t.body)).toEqual([
    "The log says calm; the scene says gale.",
    "Half a thought",
    "Noted.",
  ]);
});

test("the writer's message shows while the model's turn runs", async () => {
  const { topic } = await raise("The log and the storm disagree");
  await render(`/topic/${topic.id}`);
  await until(() => query(".composer") !== null, "the composer");
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  stub.script(async (body) => {
    await held;
    return streamed(["Answered."])(body);
  });
  await type(query<HTMLTextAreaElement>(".composer textarea"), "Which is it?");
  await click(send());
  await until(() => query("[aria-busy]") !== null, "the running turn");
  expect(turns().map((t) => [t.author, t.body])).toEqual([
    ["Model · Planner", "The log says calm; the scene says gale."],
    ["You", "Which is it?"],
    ["Model · Planner", ""],
  ]);
  expect(query<HTMLTextAreaElement>(".composer textarea")?.value).toBe("");
  release();
  await until(() => !query("[aria-busy]"), "the answer");
  expect(turns().at(-1)?.body).toBe("Answered.");
});

/** Holds the next model reply until `release` is called. */
function heldReply(text: string) {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  stub.script(async (body) => {
    await held;
    return streamed([text])(body);
  });
  return () => release();
}

test("text typed during a new topic's first turn stays in the composer", async () => {
  await render("/inbox");
  await click(query("#rail-tab-topics"));
  await click(control("New topic", ".rail"));
  await until(() => query(".topic-sheet") !== null, "the topic sheet");
  await type(query<HTMLInputElement>(".topic-title-field"), "Lamp");
  await type(
    query<HTMLTextAreaElement>(".composer textarea"),
    "First question",
  );
  const release = heldReply("First answer.");
  await click(send());
  await until(() => query("[aria-busy]") !== null, "the running turn");
  await type(
    query<HTMLTextAreaElement>(".composer textarea"),
    "My next thought while I wait",
  );
  release();
  await until(
    () => !query("[aria-busy]") && turns().length === 2,
    "the first answer",
  );
  expect(query<HTMLTextAreaElement>(".composer textarea")?.value).toBe(
    "My next thought while I wait",
  );
  expect(query<HTMLInputElement>(".topic-title-field")?.value).toBe("Lamp");
});

test("going away and back during a turn shows the writer's message once", async () => {
  const { topic } = await raise("The log and the storm disagree");
  const router = await render(`/topic/${topic.id}`);
  await until(() => query(".composer") !== null, "the composer");
  const release = heldReply("Answered.");
  await type(query<HTMLTextAreaElement>(".composer textarea"), "Which is it?");
  await click(send());
  await until(() => query("[aria-busy]") !== null, "the running turn");
  await act(() => router.navigate({ to: "/inbox" }));
  await until(() => query(".ledger-sheet") !== null, "the inbox");
  await act(() =>
    router.navigate({ to: "/topic/$topicId", params: { topicId: topic.id } }),
  );
  await until(
    () => query("[aria-busy]") !== null && turns().length >= 3,
    "the running topic",
  );
  // Let the reload of the stored writer message land.
  await settle();
  await settle();
  expect(turns().map((t) => [t.author, t.body])).toEqual([
    ["Model · Planner", "The log says calm; the scene says gale."],
    ["You", "Which is it?"],
    ["Model · Planner", ""],
  ]);
  release();
  await until(() => !query("[aria-busy]"), "the answer");
  expect(turns().map((t) => t.body)).toEqual([
    "The log says calm; the scene says gale.",
    "Which is it?",
    "Answered.",
  ]);
});

test("an edit the model makes in a topic shows in the bible at once", async () => {
  const { topic } = await raise("The log and the storm disagree");
  await render(`/topic/${topic.id}`);
  await until(() => query(".composer") !== null, "the composer");
  stub.script(
    streamedToolCalls({
      name: "describeEvent",
      args: { id: "storm", summary: "One night of gale." },
    }),
    streamed(["Done."]),
  );
  await type(
    query<HTMLTextAreaElement>(".composer textarea"),
    "Make it one night.",
  );
  await click(send());
  await until(() => !query("[aria-busy]") && turns().length === 3, "the turn");
  const summary = () => {
    const state = services.bible.state.get();
    return state.kind === "ready"
      ? state.story.timeline.events.find((e) => e.id === "storm")?.summary
      : undefined;
  };
  await until(() => summary() === "One night of gale.", "the bible to update");
});

// ------------------------------------------------------------- agent slip

/** Starts a world topic from "New topic", sends `message`, and waits. */
async function newTopic(title: string, message: string) {
  await click(control("New topic", ".rail"));
  await until(() => query(".topic-title-field") !== null, "the new topic");
  await type(query<HTMLInputElement>(".topic-title-field"), title);
  await type(query<HTMLTextAreaElement>(".composer textarea"), message);
  const before = turns().length;
  await click(send());
  await until(
    () => turns().length === before + 2 && !query("[aria-busy]"),
    "the first turn",
  );
}

/** Sends `message` in the open topic and waits for the model's answer. */
async function say(message: string) {
  const before = turns().length;
  await type(query<HTMLTextAreaElement>(".composer textarea"), message);
  await click(send());
  await until(
    () => turns().length === before + 2 && !query("[aria-busy]"),
    "the turn",
  );
}

const entries = () => queryAll(".turns > .turn-entry");
const slip = () => query(".topic-slip");
const slipField = (label: string) =>
  query<HTMLTextAreaElement>(`.topic-slip textarea[aria-label="${label}"]`);
const sentPart = (label: string) =>
  query(`.topic-slip [aria-label="${label}"]`)?.textContent ?? "";
const chat = (index: number) =>
  (stub.received[index]?.messages ?? []) as { role: string; content: string }[];
const lastRequest = () => stub.received.length - 1;

test("a model turn's Request opens its agent slip beside the turn", async () => {
  await render("/inbox");
  await click(query("#rail-tab-topics"));
  stub.script(
    streamedToolCalls({ name: "show", args: { ref: "scene:storm-night" } }),
    streamed(["Mara lit it."]),
  );
  await newTopic("Who lit the lamp?", "Who lit the lamp on the storm night?");

  // Only the model's turn has a request to read.
  const [writer, model] = entries();
  expect(control("Request", ".turns > .turn-entry:first-child")).toBeNull();
  expect(writer?.querySelector(".turn-head button")).toBeNull();
  const request = model?.querySelector<HTMLElement>(".turn-head button");
  expect(request?.textContent).toBe("Request");
  await click(request ?? null);
  await until(() => slip()?.querySelector(".agent-slip") != null, "the slip");

  // The slip is in the model turn's entry, beside it, and nowhere else.
  expect(queryAll(".topic-slip")).toHaveLength(1);
  expect(model?.querySelector(".topic-slip")).toBe(slip());
  expect(request?.getAttribute("aria-expanded")).toBe("true");
  expect(text(".topic-slip .request-slip-title")).toBe("Turn 1");

  // What the first model call sent: its system prompt, parameters and packet.
  const system = chat(0)[0];
  expect(system?.role).toBe("system");
  expect(sentPart("System prompt")).toBe(system?.content ?? "missing");
  expect(sentPart("System prompt")).toContain(
    'Its topic is "Who lit the lamp?"',
  );
  const model0 = JSON.parse(sentPart("Model"));
  expect(model0).toMatchObject({
    model: "reasoner",
    temperature: 0.3,
    max_tokens: 2000,
    stream: true,
  });
  const writerMessage = chat(0).at(-1)?.content ?? "";
  expect(writerMessage).toStartWith(sentPart("Context packet"));
  expect(sentPart("Context packet")).not.toBe("");

  // Its tool calls, as made.
  const calls = queryAll(".topic-slip .slip-trace > li");
  expect(calls).toHaveLength(1);
  expect(text(".topic-slip .slip-call-name")).toBe("show");
  expect(text(".topic-slip .slip-call-args")).toBe("ref: scene:storm-night");

  // A record: no Send, and nothing in vermilion.
  expect(control("Send", ".topic-slip")).toBeNull();
  expect(query(".topic-slip .ai-segment")).toBeNull();

  await click(control("Close", ".topic-slip"));
  expect(slip()).toBeNull();
  expect(request?.getAttribute("aria-expanded")).toBe("false");
});

test("Context opens the next turn's slip; the composer's Send sends its edits", async () => {
  const keyValue = withProfile();
  await render("/inbox", keyValue);
  await click(query("#rail-tab-topics"));
  stub.script(streamed(["Mara lit it."]));
  await newTopic("Who lit the lamp?", "Who lit the lamp on the storm night?");

  // From the masthead: the next turn's slip, beside the composer.
  const masthead = control("Context", ".masthead");
  await click(masthead);
  await until(() => slipField("System prompt") !== null, "the next slip");
  expect(query(".composer-entry > .topic-slip")).toBe(slip());
  expect(text(".topic-slip .request-slip-title")).toBe("Next turn");
  expect(text(".topic-slip")).toContain("Sent with your next message.");
  // Its Send is the composer's.
  expect(control("Send", ".topic-slip")).toBeNull();
  // The masthead puts it away; the composer's Context brings it back.
  await click(control("Context", ".masthead"));
  expect(slip()).toBeNull();
  await click(control("Context", ".composer"));
  await until(() => slipField("System prompt") !== null, "the next slip");

  // Discard edits drops them.
  const prompt = slipField("System prompt")?.value ?? "";
  expect(prompt).toBe(chat(0)[0]?.content ?? "missing");
  await type(slipField("System prompt"), "Answer in one line.");
  expect(control("Context · edited", ".composer")).not.toBeNull();
  await click(control("Discard edits", ".topic-slip"));
  expect(slipField("System prompt")?.value).toBe(prompt);
  expect(control("Context", ".composer")).not.toBeNull();

  // A sampler that isn't a JSON object holds Send.
  const sampler = () =>
    query<HTMLTextAreaElement>('.topic-slip [data-role="model"] textarea');
  await type(
    query<HTMLTextAreaElement>(".composer textarea"),
    "And the keeper?",
  );
  await type(sampler(), "{");
  expect(send()?.disabled).toBe(true);
  expect(send()?.title).toBe("Fix the next turn's request first.");

  // A sampler for this session and an edited packet, sent with the message.
  await type(sampler(), '{ "temperature": 0.9 }');
  await type(slipField("Context packet"), "Only the storm matters.");
  expect(send()?.disabled).toBe(false);
  stub.script(streamed(["Ivo kept the log."]));
  await click(send());
  await until(
    () => turns().length === 4 && !query("[aria-busy]"),
    "the second turn",
  );
  const sent = stub.received[lastRequest()];
  expect(sent?.temperature).toBe(0.9);
  expect(chat(lastRequest()).at(-1)?.content).toBe(
    "Only the storm matters.\n\n# The writer says\n\nAnd the keeper?",
  );

  // The slip starts again from what the session now sends.
  await until(
    () => control("Context", ".composer") !== null,
    "the edits to be sent",
  );
  expect(JSON.parse(sampler()?.value ?? "null")).toEqual({ temperature: 0.9 });
  expect(slipField("Context packet")?.value).not.toBe(
    "Only the storm matters.",
  );
  // "This session" saved no profile default.
  expect(keyValue.getItem("worldcrafter:w1:agent-defaults")).toBeNull();

  // The packet edit was for that turn only.
  stub.script(streamed(["Yes."]));
  await say("Was it windy?");
  expect(chat(lastRequest()).at(-1)?.content).not.toStartWith(
    "Only the storm matters.",
  );
  expect(stub.received[lastRequest()]?.temperature).toBe(0.9);
});

test("a profile-default prompt edit reaches the next new topic", async () => {
  const keyValue = withProfile();
  await render("/inbox", keyValue);
  await click(query("#rail-tab-topics"));
  stub.script(streamed(["Mara lit it."]));
  await newTopic("Who lit the lamp?", "Who lit the lamp on the storm night?");

  await click(control("Context", ".composer"));
  await until(() => slipField("System prompt") !== null, "the next slip");
  const prompt = slipField("System prompt")?.value ?? "";
  const topicPart = prompt.slice(prompt.indexOf("\n\n# This talk page\n"));
  expect(topicPart).toContain("Who lit the lamp?");
  await type(
    slipField("System prompt"),
    `Answer as the lighthouse keeper would.${topicPart}`,
  );
  await click(
    queryAll(".topic-slip input[type=radio]").find(
      (input) => input.parentElement?.textContent === "Profile default",
    ) ?? null,
  );
  expect(text(".topic-slip")).toContain(
    "Changes the prompt for every new session with this profile.",
  );
  stub.script(streamed(["As you say."]));
  await say("Go on.");
  // This topic sends it, with its own part.
  expect(chat(lastRequest())[0]?.content).toBe(
    `Answer as the lighthouse keeper would.${topicPart}`,
  );

  // A new topic starts from the default, with its own part and not this one's.
  await click(control("New topic", ".rail"));
  await until(
    () => query<HTMLInputElement>(".topic-title-field")?.value === "",
    "a new topic",
  );
  await type(
    query<HTMLInputElement>(".topic-title-field"),
    "Who keeps the log?",
  );
  // Its next-turn slip shows it before the first Send, title and all.
  await click(control("Context", ".composer"));
  await until(
    () =>
      slipField("System prompt")?.value.includes("Who keeps the log?") ?? false,
    "the new topic's slip",
  );
  expect(slipField("System prompt")?.value).toStartWith(
    "Answer as the lighthouse keeper would.\n\n# This talk page\n",
  );
  stub.script(streamed(["Ivo does."]));
  await type(query<HTMLTextAreaElement>(".composer textarea"), "Who?");
  await click(send());
  await until(() => turns().length === 2 && !query("[aria-busy]"), "the turn");
  const system = chat(lastRequest())[0]?.content ?? "";
  expect(system).toStartWith(
    "Answer as the lighthouse keeper would.\n\n# This talk page\n",
  );
  expect(system).toContain('Its topic is "Who keeps the log?"');
  expect(system).not.toContain("Who lit the lamp?");
  expect(system.split("# This talk page")).toHaveLength(2);
});

test("following a reference in a turn's slip opens its record, and the slip stays open", async () => {
  const router = await render("/inbox");
  await click(query("#rail-tab-topics"));
  stub.script(
    streamedToolCalls({ name: "show", args: { ref: "actor:mara" } }),
    streamed(["Mara is the keeper's daughter."]),
  );
  await newTopic("Who is Mara?", "Tell me about Mara.");
  const topicPath = router.state.location.pathname;
  await click(entries()[1]?.querySelector(".turn-head button") ?? null);
  await until(() => query(".topic-slip .slip-reference") !== null, "the slip");

  const reference = query(".topic-slip .slip-reference");
  expect(reference?.textContent).toBe("Mara");
  await click(reference);
  await until(
    () => router.state.location.pathname === "/world",
    "the World tab",
  );
  expect(router.state.location.search).toEqual({ at: "actor:mara" });
  await until(() => text(".sheet-title") === "Mara", "Mara's detail");

  // Back on the topic, its slip is still open on the same turn.
  await act(() => router.navigate({ to: topicPath }));
  await until(() => query(".topic-slip .agent-slip") !== null, "the slip");
  expect(text(".topic-slip .request-slip-title")).toBe("Turn 1");
  expect(entries()[1]?.querySelector(".topic-slip")).not.toBeNull();
});
