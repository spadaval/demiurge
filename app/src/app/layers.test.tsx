import { afterEach, expect, test } from "bun:test";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { okAsync } from "neverthrow";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createAgentRunner } from "~/agent/runner";
import { DEMO_SCENE, seedDemoWorld } from "~/demo/ninefold";
import { ninefoldStory } from "~/demo/ninefold-story";
import { mergeLayers, noteKey, type SceneLayers } from "~/layers/model";
import type { BackendProfile, Completion } from "~/llm/types";
import { saveStory } from "~/story/store";
import { createStorageConnection } from "~/workspace/connection";
import { createWorkspace } from "~/workspace/workspace";
import { AppProviders } from "./hooks";
import { createLayerSource } from "./layers";
import { createAppRouter } from "./router";
import { createAppServices } from "./services";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

/** The text of each run of adjacent decorated leaves matching `selector`. */
function runs(root: Element | null | undefined, selector: string): string[] {
  const found: string[] = [];
  let last: Element | null = null;
  for (const element of root?.querySelectorAll(selector) ?? []) {
    // Each decorated span sits in its own Slate leaf.
    const joined =
      last !== null &&
      last.parentElement?.nextSibling === element.parentElement &&
      found.length > 0;
    if (joined) found[found.length - 1] += element.textContent ?? "";
    else found.push(element.textContent ?? "");
    last = element;
  }
  return found;
}

const settle = () =>
  act(() => new Promise((resolve) => setTimeout(resolve, 10)));

async function renderDemo(
  allLayers = false,
  /** More layers for the demo scene, beside the demo's own. */
  extra?: SceneLayers,
) {
  const demo = await seedDemoWorld("w", { allLayers });
  const workspace = createWorkspace({
    worldId: "w",
    connection: createStorageConnection(demo.storage, () =>
      okAsync(demo.storage),
    ),
    tabStore: demo.tabStore,
    readOnly: false,
    saveDelayMs: 60_000,
  });
  (await workspace.refreshDocuments())._unsafeUnwrap();
  const services = await createAppServices({
    workspace,
    keyValue: demo.tabStore,
    layerSource:
      extra === undefined
        ? demo.layerSource
        : createLayerSource(
            new Map([
              [
                DEMO_SCENE,
                mergeLayers(demo.layerSource.scene(DEMO_SCENE), extra),
              ],
            ]),
            demo.layerSource.topics,
          ),
    environment: {
      role: "writer",
      persistence: "granted",
      storage: "memory",
      worldName: "The Ninefold",
    },
  });
  const router = createAppRouter(
    workspace,
    createMemoryHistory({ initialEntries: [`/doc/${DEMO_SCENE}`] }),
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
  for (let i = 0; i < 40 && !container.querySelector(".prose .lm-say"); i++) {
    await settle();
  }
  return { view: container, services };
}

test("the demo scene renders its marks, cues and keyed notes", async () => {
  const { view } = await renderDemo();
  const prose = view.querySelector(".prose");
  expect(prose?.querySelectorAll(".lm-say").length).toBeGreaterThan(0);
  // A key on a mention's last letter splits its leaf: read runs of leaves.
  expect(runs(prose, ".lm-entity")).toEqual([
    "the Salt Gate",
    "Ardelia",
    "Ardelia",
    "Aldric",
  ]);
  expect([...view.querySelectorAll(".cue")].map((c) => c.textContent)).toEqual([
    "Kesh",
    "Ardelia",
  ]);
  // The writer's note stays in the prose, brackets and all, painted as a note.
  expect(
    [...(prose?.querySelectorAll(".lm-note") ?? [])].map((n) => n.textContent),
  ).toEqual(["[[ does Kesh already ", "know? ]]"]);
  // Notes on words are lettered in the order of their words, the bible's
  // among the fixture's; the bible's notes about the whole scene follow.
  const keys = [...view.querySelectorAll(".lm-key")].map((k) =>
    k.getAttribute("data-key"),
  );
  expect(keys).toEqual(["a", "b", "c", "d", "e", "f", "g", "h", "i"]);
  expect(view.querySelector(".stamp")?.textContent).toBe(
    "Story time: 12 November 1203, 23:00",
  );
  // Speakers only by default: no notes showing, the hint instead.
  expect(
    view.querySelector(".sheet")?.hasAttribute("data-layer-speakers"),
  ).toBe(true);
  expect(view.querySelectorAll('.gloss-note[data-visible="true"]').length).toBe(
    0,
  );
  expect(view.querySelector(".gloss-hint")).not.toBeNull();
});

test("toggling a layer changes paint only: the prose DOM is untouched", async () => {
  const { view } = await renderDemo();
  const prose = view.querySelector(".prose");
  const before = prose?.innerHTML;
  for (const layer of ["world", "subtext", "time", "notes", "speakers"]) {
    const button = view.querySelector<HTMLButtonElement>(
      `.layer-toggles [data-layer="${layer}"]`,
    );
    await act(async () => button?.click());
    expect(prose?.innerHTML).toBe(before);
  }
  const sheet = view.querySelector(".sheet");
  expect(sheet?.hasAttribute("data-layer-time")).toBe(true);
  expect(sheet?.hasAttribute("data-layer-speakers")).toBe(false);
  expect(
    [...view.querySelectorAll('.gloss-note[data-visible="true"]')].map(
      (note) => note.querySelector(".gloss-key")?.textContent,
    ),
  ).toEqual([
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
  ]);
});

test("Subtext is opted into per scene", async () => {
  const { view, services } = await renderDemo();
  const subtext = () =>
    view.querySelector('.layer-toggles [data-layer="subtext"]');
  expect(subtext()?.getAttribute("aria-pressed")).toBe("false");
  await act(async () => (subtext() as HTMLButtonElement | null)?.click());
  expect(subtext()?.getAttribute("aria-pressed")).toBe("true");
  expect(services.layers.get().subtextScenes.has(DEMO_SCENE)).toBe(true);
  expect(services.layers.get().subtextScenes.has("scene-4-1")).toBe(false);
});

test("dismissing a note removes it and its marks; confirming keeps it", async () => {
  const { view } = await renderDemo(true);
  const note = (words: string) =>
    [...view.querySelectorAll(".gloss-note")].find((n) =>
      n.textContent?.includes(words),
    );
  const button = (words: string, label: string) =>
    [...(note(words)?.querySelectorAll("button") ?? [])].find(
      (b) => b.textContent === label,
    );
  await act(async () =>
    button("Three hundred years", "Keep as spoken")?.click(),
  );
  expect(
    note("Three hundred years")?.querySelector(".gloss-authority")?.textContent,
  ).toBe("confirmed");
  const marksBefore = view.querySelectorAll(".prose .lm-sub").length;
  await act(async () => button("Implication", "Not implied")?.click());
  for (let i = 0; i < 10; i++) await settle();
  expect(
    [...view.querySelectorAll(".gloss-note")].some((n) =>
      n.textContent?.includes("Implication"),
    ),
  ).toBe(false);
  expect(view.querySelectorAll(".prose .lm-sub").length).toBeLessThan(
    marksBefore,
  );
});

/** The text of the visible gloss note with `heading`, or undefined. */
const noteText = (view: HTMLElement, heading: string) =>
  [...view.querySelectorAll('.gloss-note[data-visible="true"]')]
    .find(
      (note) =>
        note.querySelector(".gloss-head span:nth-child(3)")?.textContent ===
        heading,
    )
    ?.querySelector(".gloss-body")?.textContent ?? undefined;

test("the bible's apparatus: scene notes head the gloss, notes on words are marked and keyed", async () => {
  const { view } = await renderDemo(true);
  await settle();
  const prose = view.querySelector(".prose");
  expect(runs(prose, ".lm-record")).toEqual(["lamps along the Salt Gate"]);
  expect(runs(prose, ".lm-time")).toContain("the tide turned");
  expect(runs(prose, ".lm-sub")).toContain("the sealed door");
  expect(noteText(view, "Count")).toBe(
    "Lamps along the Salt Gate: 40 as the scene opens; then 0 at Ardelia returns to the sealed door.",
  );
  expect(noteText(view, "Irony")).toBe(
    "The reader knows Kesh sold the secret of the seal to the king's man (revealed in “Night Market”); Ardelia Vane doesn't know it yet.",
  );
  expect(noteText(view, "Version")).toContain(
    "What really happened: Ardelia sealed the Salt Gate",
  );
  // The scene's own notes have no words, so no key in the text and no
  // leader to them: one leader to each of the nine notes on words. They
  // come after the notes on words, below the scene's last line.
  const notes = [...view.querySelectorAll<HTMLElement>(".gloss-note")];
  const scene = notes.slice(-5);
  expect(
    scene.map((note) => note.querySelector(".gloss-key")?.textContent),
  ).toEqual(["j", "k", "l", "m", "n"]);
  expect(view.querySelectorAll(".leaders line").length).toBe(9);
});

test("the apparatus follows the bible when a command changes it", async () => {
  const { view, services } = await renderDemo(true);
  await settle();
  const executed = await services.story.execute({
    type: "setCount",
    id: "lamps",
    at: "night-market",
    value: 41,
  });
  expect(executed.isOk()).toBe(true);
  for (let i = 0; i < 10 && !noteText(view, "Count")?.includes("41"); i++) {
    await settle();
  }
  expect(noteText(view, "Count")).toBe(
    "Lamps along the Salt Gate: 41 as the scene opens; then 0 at Ardelia returns to the sealed door.",
  );
});

test("the apparatus follows the bible when the agent changes it", async () => {
  const { view, services } = await renderDemo(true);
  await settle();
  const profile: BackendProfile = {
    name: "scripted",
    kind: "generic",
    baseUrl: "http://localhost/v1",
    model: "m",
    sampler: {},
  };
  const answers: Completion[] = [
    {
      text: "",
      logprobs: null,
      finishReason: "tool_calls",
      model: "m",
      toolCalls: [
        {
          id: "call-1",
          type: "function",
          function: {
            name: "setSceneViewpoint",
            arguments: JSON.stringify({ id: "scene-4-2", actor: "kesh" }),
          },
        },
      ],
    },
    {
      text: "Kesh's eyes now.",
      logprobs: null,
      finishReason: "stop",
      model: "m",
      toolCalls: [],
    },
  ];
  const runner = createAgentRunner({
    // The app's story storage: the agent's edits reach the open scene.
    storage: services.story.storage,
    bindings: { plan: { profile }, prose: { profile } },
    complete: () => {
      const answer = answers.shift();
      if (answer === undefined) throw new Error("no answer scripted");
      return okAsync(answer);
    },
  });
  expect(noteText(view, "Irony")).toContain("Ardelia Vane doesn't know it yet");
  await act(async () => {
    const started = await runner.start({
      id: "s",
      role: "plan",
      scope: { kind: "world" },
    });
    expect(started.isOk()).toBe(true);
    const outcome = await runner.send("s", "Tell it through Kesh.");
    expect(outcome.isOk() && outcome.value.status).toBe("done");
  });
  for (let i = 0; i < 10 && noteText(view, "Irony") !== undefined; i++) {
    await settle();
  }
  // Kesh sold the secret himself: through his eyes there is no irony in it.
  expect(noteText(view, "Irony")).toBeUndefined();
});

test("a bible note never hides another layer's note keyed on the same words", async () => {
  const { view } = await renderDemo(true, {
    speakers: [],
    cues: new Map(),
    marks: [
      {
        id: "m-turn",
        anchor: { blockId: "p-tide", quote: "the tide turned" },
        style: { kind: "time" },
        noteId: "n-turn",
      },
    ],
    notes: [
      {
        id: "n-turn",
        layer: "time",
        heading: "Turn",
        authority: "inferred",
        body: [{ text: "The first turn since the sealing." }],
        actions: [],
      },
    ],
  });
  await settle();
  expect(noteText(view, "Turn")).toBe("The first turn since the sealing.");
  // The bible's event, whose only words those are, is about the scene.
  expect(noteText(view, "Event")).toBeDefined();
  const anchors = [...view.querySelectorAll(".prose [data-anchor]")].map((a) =>
    a.getAttribute("data-anchor"),
  );
  expect(anchors).toContain("n-turn");
  expect(anchors).not.toContain("bible/event/tide-turns");
});

test("notes keep the order of their keys past z", async () => {
  const { view, services } = await renderDemo(true);
  await settle();
  const story = ninefoldStory();
  // Thirty objects the prose never names: thirty notes about the scene.
  const objects = Array.from({ length: 30 }, (_, i) => ({
    id: `thing-${i}`,
    name: `Thing number ${i}`,
    notes: "",
  }));
  const saved = await saveStory(
    services.story.storage,
    {
      ...story,
      objects: [...story.objects, ...objects],
      scenes: story.scenes.map((scene) =>
        scene.id === DEMO_SCENE
          ? {
              ...scene,
              plants: [
                ...scene.plants,
                ...objects.map((o) => ({ kind: "object" as const, id: o.id })),
              ],
            }
          : scene,
      ),
    },
    2,
  );
  expect(saved.isOk()).toBe(true);
  const keys = () =>
    [...view.querySelectorAll(".gloss-note .gloss-key")].map(
      (key) => key.textContent,
    );
  for (let i = 0; i < 20 && keys().length < 44; i++) await settle();
  expect(keys()).toEqual(Array.from({ length: 44 }, (_, i) => noteKey(i)));
  const planted = [...view.querySelectorAll(".gloss-note")]
    .map((note) => note.querySelector(".gloss-body")?.textContent ?? "")
    .filter((text) => text.startsWith("Thing number"))
    .map((text) => Number(text.split(" ")[2]));
  expect(planted).toEqual(objects.map((_, i) => i));
});
