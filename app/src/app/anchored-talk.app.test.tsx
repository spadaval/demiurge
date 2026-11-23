/**
 * Talk anchored where the writer is, in the running app against a stub
 * OpenAI-compatible server: "Talk about this scene" and "Talk about this
 * passage" on a scene sheet, "Talk about this record" on a record's detail,
 * each opening a topic in that scope whose turns carry the target's context
 * packet; and the open topics shown back on the scene (Talk notes on the
 * Notes layer) and on the record.
 */

import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { errAsync } from "neverthrow";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { startStubLlm, streamed } from "~/agent/stub-llm";
import type { BackendProfile } from "~/llm/types";
import { createMemoryStorage } from "~/storage/memory";
import type { StorageAdapter, StoredDocument } from "~/storage/types";
import documentsFile from "~/story/fixtures/lighthouse.documents.json";
import { saveStory } from "~/story/store";
import { parseStory, type Story } from "~/story/story";
import { listTopics, type TopicScope } from "~/talk/records";
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

const keyValueStore = (): KeyValueStore => {
  const data = new Map([
    ["worldcrafter:w1:backend-profile", JSON.stringify(PROFILE)],
  ]);
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
};

async function render(path: string, readOnly = false) {
  const keyValue = keyValueStore();
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
    readOnly,
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

/** Names the open topic sheet, says `message`, and waits for the answer. */
async function startTopic(title: string, message: string) {
  await until(() => query(".topic-sheet") !== null, "the topic sheet");
  await type(query<HTMLInputElement>(".topic-title-field"), title);
  await type(query<HTMLTextAreaElement>(".composer textarea"), message);
  stub.script(streamed(["Noted."]));
  await click(control("Send", ".composer"));
  await until(
    () => queryAll(".turns > .turn").length === 2 && !query("[aria-busy]"),
    "the model's turn",
  );
}

type Message = { role: string; content: string };

/** The system prompt and the writer's message (with its packet) last sent. */
function lastRequest() {
  const messages = stub.received.at(-1)?.messages as Message[] | undefined;
  return {
    system: messages?.find((m) => m.role === "system")?.content ?? "",
    user: messages?.filter((m) => m.role === "user").at(-1)?.content ?? "",
  };
}

async function storedScopes(): Promise<TopicScope[]> {
  return (await listTopics(storage))._unsafeUnwrap().map((t) => t.scope);
}

/** Opens the scene's prose and waits for its talk action. */
async function openScene(documentId = "doc-storm-night") {
  const router = await render(`/doc/${documentId}`);
  await until(() => query(".scene-talk") !== null, "the scene's talk action");
  return router;
}

test("a scene sheet talks about its scene, and its topic carries the scene's packet", async () => {
  const router = await openScene();
  await click(control("Talk about this scene", ".scene-talk"));
  await until(() => query(".topic-sheet") !== null, "the topic sheet");
  expect(router.state.location.pathname).toStartWith("/topic/");
  expect(text(".topic-scope")).toBe("Scene · 2 The night the light failed");
  expect(text(".composer-sees")).toContain("what it touches");
  const drafted = router.state.location.pathname;

  // The same action again, before anything is sent, comes back to that draft.
  await act(() =>
    router.navigate({
      to: "/doc/$documentId",
      params: { documentId: "doc-storm-night" },
    }),
  );
  await until(() => query(".scene-talk") !== null, "the scene again");
  await click(control("Talk about this scene", ".scene-talk"));
  await until(() => query(".topic-sheet") !== null, "the topic sheet again");
  expect(router.state.location.pathname).toBe(drafted);
  expect(services.talk.drafts.get().size).toBe(1);

  await startTopic("Is the storm too early?", "Does this land too soon?");
  expect(await storedScopes()).toEqual([
    { kind: "scene", scene: "storm-night" },
  ]);
  const { system, user } = lastRequest();
  expect(system).toContain(
    "You are a participant on a talk page about Scene 2 The night the light failed",
  );
  // The scene's packet: the record, reader-order --before, and its touches.
  expect(user).toStartWith("# Context: scene:storm-night");
  expect(user).toContain("## What the reader has been told before it");
  expect(user).toContain("## What it touches\n\nscene:storm-night");
  expect(user).toEndWith("# The writer says\n\nDoes this land too soon?");

  // Back on the scene, the open topic is a Talk note on the Notes layer.
  await act(() =>
    router.navigate({
      to: "/doc/$documentId",
      params: { documentId: "doc-storm-night" },
    }),
  );
  await until(() => query('.gloss-note[data-layer="notes"]') !== null, "note");
  const note = query('.gloss-note[data-layer="notes"]');
  expect(note?.querySelector(".gloss-head")?.textContent).toContain("Talk");
  expect(note?.querySelector(".gloss-authority")?.textContent).toBe("yours");
  expect(note?.querySelector(".gloss-body")?.textContent).toBe(
    "Is the storm too early?",
  );
  // Paint only: it shows when Notes is on.
  expect(note?.getAttribute("data-visible")).toBe("false");
  await click(query('.layer-toggles [data-layer="notes"]'));
  await until(
    () => note?.getAttribute("data-visible") === "true",
    "the note to show",
  );
  const [topic] = (await listTopics(storage))._unsafeUnwrap();
  await click(control("Open", '.gloss-note[data-layer="notes"]'));
  await until(
    () => router.state.location.pathname === `/topic/${topic?.id}`,
    "the topic to open",
  );
});

test("selected words talk about their passage, quoted, and the note sits on them", async () => {
  const router = await openScene();
  const session = workspace.session("doc-storm-night");
  if (!session) throw new Error("no session");
  // "took the shutters", in the scene's first paragraph.
  await act(async () => {
    session.editor.tf.select({
      anchor: { path: [0, 0], offset: 9 },
      focus: { path: [0, 0], offset: 26 },
    });
  });
  await until(
    () => control("Talk about this passage", ".scene-talk") !== null,
    "the passage action",
  );
  await click(control("Talk about this passage", ".scene-talk"));
  await until(() => query(".topic-sheet") !== null, "the topic sheet");
  expect(text(".topic-scope")).toBe("Passage · 2 The night the light failed");
  expect(text(".topic-head .excerpt")).toBe("took the shutters");

  await startTopic("Which shutters?", "Name them.");
  expect(await storedScopes()).toEqual([
    {
      kind: "passage",
      scene: "storm-night",
      documentId: "doc-storm-night",
      blockId: "b_storm1",
      quote: "took the shutters",
    },
  ]);
  const { system, user } = lastRequest();
  expect(system).toContain("> took the shutters");
  expect(user).toStartWith("# Context: scene:storm-night");
  expect(user).toContain("## What it touches");

  // On the scene, the note is keyed to the quoted words.
  await act(() =>
    router.navigate({
      to: "/doc/$documentId",
      params: { documentId: "doc-storm-night" },
    }),
  );
  await until(() => query(".lm-talk") !== null, "the passage's mark");
  expect(
    queryAll(".lm-talk")
      .map((mark) => mark.textContent)
      .join(""),
  ).toBe("took the shutters");
  const key = query(".lm-key[data-key-layer='notes']");
  expect(key?.textContent?.endsWith("s")).toBe(true);
  expect(
    query('.gloss-note[data-layer="notes"] .gloss-body')?.textContent,
  ).toBe("Which shutters?");
});

test("a record's detail talks about the record, and lists its open topics", async () => {
  const router = await render("/world?at=drive:keep-light");
  await until(() => query(".record-talk") !== null, "the record's talk");
  expect(query(".record-talk .record-list")).toBeNull();
  await click(control("Talk about this record", ".record-talk"));
  await until(() => query(".topic-sheet") !== null, "the topic sheet");
  expect(text(".topic-scope")).toBe("Drive · Keep the lamp lit");
  expect(text(".composer-sees")).toContain("what it touches");

  await startTopic("Why keep it?", "What does the lamp cost her?");
  expect(await storedScopes()).toEqual([
    { kind: "record", ref: "drive:keep-light" },
  ]);
  // The record's packet: the record, what it touches, the scenes that do.
  const { user } = lastRequest();
  expect(user).toStartWith(
    "# Context: drive:keep-light\n\n## drive:keep-light",
  );
  expect(user).toContain("## What it touches\n\ndrive:keep-light");
  expect(user).toContain("## Scenes that touch it");

  // The record lists it, a reference to its sheet.
  await act(() =>
    router.navigate({ to: "/world", search: { at: "drive:keep-light" } }),
  );
  await until(
    () => query(".record-talk .record-list") !== null,
    "the record's topics",
  );
  const [topic] = (await listTopics(storage))._unsafeUnwrap();
  const link = query(".record-talk .record-list a");
  expect(link?.textContent).toBe("Why keep it?");
  expect(link?.getAttribute("href")).toBe(`/topic/${topic?.id}`);
  // Another topic about it starts afresh.
  await click(control("Talk about this record", ".record-talk"));
  await until(() => query(".topic-title-field") !== null, "a new topic");
  expect(router.state.location.pathname).not.toBe(`/topic/${topic?.id}`);
  expect(query<HTMLInputElement>(".topic-title-field")?.value).toBe("");
});

test("a scene's record talks about the scene, and lists the topics its prose started", async () => {
  await render("/world?at=scene:storm-night");
  await until(() => query(".record-talk") !== null, "the scene's talk");
  expect(control("Talk about this scene", ".record-talk")).not.toBeNull();
  await click(control("Talk about this scene", ".record-talk"));
  await until(() => query(".topic-sheet") !== null, "the topic sheet");
  expect(text(".topic-scope")).toBe("Scene · 2 The night the light failed");
});

test("a topic the model raised about a record shows on it and in the World inbox", async () => {
  const talk = createTalk({ storage, model: () => null });
  (
    await talk.raise({
      title: "Does she still want this?",
      scope: { kind: "record", ref: "drive:keep-light" },
      body: "Scene 3 reads as if she has given up on the lamp.",
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
  await render("/inbox");
  await until(() => query(".ledger-sheet") !== null, "the inbox");
  const row = queryAll(".ledger-row")[0];
  expect(row?.querySelector(".ledger-lead")?.textContent).toBe(
    "Does she still want this?",
  );
  expect(row?.querySelector(".ledger-line")?.textContent).toBe(
    "Drive · Keep the lamp lit",
  );

  act(() => root?.unmount());
  container?.remove();
  await render("/world?at=drive:keep-light");
  await until(() => query(".record-talk .record-list") !== null, "the topic");
  expect(text(".record-talk .record-list li")).toBe(
    "Does she still want this?raised by model",
  );
});

test("a read-only tab offers no talk actions", async () => {
  await render("/doc/doc-storm-night", true);
  await until(() => query(".sheet") !== null, "the scene");
  expect(query(".scene-talk")).toBeNull();
  act(() => root?.unmount());
  container?.remove();
  await render("/world?at=drive:keep-light", true);
  await until(() => query(".record-fields") !== null, "the record");
  expect(query(".record-talk")).toBeNull();
});
