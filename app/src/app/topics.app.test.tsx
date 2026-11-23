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
  queryAll(".turns > .turn").map((turn) => ({
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
  expect(text(".ledger-group")).toBe("Resolved1");
  expect(text(".ledger-lead")).toBe("The log and the storm disagree");

  // Reopen, then archive.
  await click(query(".ledger-link"));
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
    secondary: row.querySelector(".ledger-secondary")?.textContent,
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

  await click(query(".ledger-link"));
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
