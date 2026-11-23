import { afterEach, describe, expect, test } from "bun:test";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { errAsync } from "neverthrow";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryStorage } from "~/storage/memory";
import type { StorageAdapter, StoredDocument } from "~/storage/types";
import documentsFile from "~/story/fixtures/lighthouse.documents.json";
import { saveStory } from "~/story/store";
import { parseStory, type Story } from "~/story/story";
import { createStorageConnection } from "~/workspace/connection";
import type { KeyValueStore } from "~/workspace/tabs";
import { createWorkspace, type Workspace } from "~/workspace/workspace";
import { AppProviders } from "./hooks";
import { parseAt, recordTouches } from "./inspector-model";
import { createLayerSource } from "./layers";
import { createAppRouter } from "./router";
import { createAppServices } from "./services";
import { createAppWorldStore } from "./world";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** The committed fixture: every story record kind, with linked scene prose. */
const lighthouse: Story = parseStory(
  await Bun.file(
    new URL("../story/fixtures/lighthouse.story.json", import.meta.url),
  ).text(),
)._unsafeUnwrap();
const documents: StoredDocument[] = documentsFile;

let root: Root | undefined;
let container: HTMLElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

const keyValue = (): KeyValueStore => {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
};

/**
 * A world holding the fixture's bible and scene documents, and an entry
 * document for Mara, as an actor's entry.
 */
async function setup(story: Story = lighthouse) {
  const storage: StorageAdapter = createMemoryStorage();
  for (const document of documents) {
    (await storage.documents.save(document))._unsafeUnwrap();
  }
  (
    await storage.documents.save({
      id: "entry-mara",
      title: "Mara",
      content: [{ type: "p", id: "m1", children: [{ text: "Keeper." }] }],
      updatedAt: 1,
    })
  )._unsafeUnwrap();
  (await saveStory(storage, story, 1))._unsafeUnwrap();
  const workspace = createWorkspace({
    worldId: "w1",
    connection: createStorageConnection(storage, () =>
      errAsync({
        kind: "failure",
        operation: "open",
        message: "no reopen",
        cause: null,
      }),
    ),
    tabStore: keyValue(),
    readOnly: false,
    saveDelayMs: 60_000,
  });
  (await workspace.refreshDocuments())._unsafeUnwrap();
  (
    await createAppWorldStore(workspace).execute({
      name: "attachEntry",
      payload: { documentId: "entry-mara", kind: "person" },
    })
  )._unsafeUnwrap();
  return workspace;
}

const settle = () => act(() => new Promise((r) => setTimeout(r, 5)));

async function render(workspace: Workspace, path: string) {
  const services = await createAppServices({
    workspace,
    keyValue: keyValue(),
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
  const view = container;
  await until(() => view.querySelector(".inspector-sheet, .prose") !== null);
  return { view, router };
}

async function until(done: () => boolean) {
  for (let i = 0; i < 40 && !done(); i++) await settle();
  if (!done()) throw new Error("timed out waiting for the view");
}

const title = (view: HTMLElement) =>
  view.querySelector(".sheet-title")?.textContent;

/** Clicks the first link under `scope` whose text is `text`, and waits. */
async function follow(view: HTMLElement, text: string, scope = ".page") {
  const link = [...view.querySelectorAll<HTMLAnchorElement>(`${scope} a`)].find(
    (a) => a.textContent === text,
  );
  if (!link) throw new Error(`no link "${text}" in ${scope}`);
  const before = view.querySelector(".page")?.innerHTML;
  await act(async () => link.click());
  await until(() => view.querySelector(".page")?.innerHTML !== before);
  await settle();
}

const rows = (view: HTMLElement, group: string) => {
  const section = [...view.querySelectorAll(".ledger-group")].find(
    (s) => s.querySelector("h2")?.textContent === group,
  );
  return [...(section?.querySelectorAll(".ledger-rows > li") ?? [])].map(
    (li) => li.textContent ?? "",
  );
};

const touchList = (view: HTMLElement, heading: string) => {
  const section = [...view.querySelectorAll(".touch-section")].find(
    (s) => s.querySelector("h2")?.textContent === heading,
  );
  return [...(section?.querySelectorAll(".touch-group") ?? [])].map(
    (group) => ({
      kind: group.querySelector("h3")?.firstChild?.textContent?.trim(),
      refs: [...group.querySelectorAll("a, .ref-removed")].map(
        (a) => a.textContent,
      ),
    }),
  );
};

describe("the World inspector", () => {
  test("the rail lists the five views with their counts", async () => {
    const { view } = await render(await setup(), "/world?at=cast");
    const inspect = [...view.querySelectorAll(".inspect-row")].map((row) => [
      row.firstChild?.textContent,
      row.querySelector(".inspect-count")?.textContent,
    ]);
    // 3 actors; no undecided question (one answered, one left open); the
    // storm is the one event placed on the world clock; 3 scenes; and the
    // fixture's placement of a scene with no event, kept.
    expect(inspect).toEqual([
      ["Cast & Drives", "3"],
      ["Open Questions", "0"],
      ["Timeline & Counts", "1"],
      ["Reader-Order", "3"],
      ["Contradictions", "1"],
    ]);
    expect(
      view.querySelector(".inspect-row[aria-current='page']")?.textContent,
    ).toContain("Cast & Drives");
  });

  test("an inspector sheet shows in the World tab, without scene controls", async () => {
    const { view } = await render(await setup(), "/world?at=cast");
    const tab = view.querySelector(".tab[data-active='true']");
    expect(tab?.textContent).toBe("World › Cast & Drives");
    expect(view.querySelector(".layer-toggles")).toBeNull();
    expect(view.querySelector(".stamp")).toBeNull();
    expect(view.querySelector(".button-primary")).toBeNull();
  });

  test("Cast & Drives groups actors with their drives and gaps", async () => {
    const { view } = await render(await setup(), "/world?at=cast");
    expect(title(view)).toBe("Cast & Drives");
    expect(view.querySelector(".inspector-lede")?.textContent).toBe(
      "3 actors, 3 drives. 1 actor has no drive yet.",
    );
    const characters = rows(view, "Characters");
    expect(characters).toEqual([
      "Ivo1 membershipno drive yet",
      "Mara1 relation · 1 turn",
      "Keep the lamp litShips founder on the reef · Rations the oilfrom The storm · opposes Sell the light to the crown · flips into Leave the island at The wreck",
    ]);
    expect(rows(view, "Organisations")[1]).toContain(
      "gap kept · The guild has always wanted it.",
    );
    expect(rows(view, "Drives with no actor yet")[0]).toContain(
      "Leave the island",
    );
  });

  test("a record's detail splits its touches, and its references cross the bible", async () => {
    const { view, router } = await render(await setup(), "/world?at=cast");
    await follow(view, "Keep the lamp lit");
    expect(title(view)).toBe("Keep the lamp lit");
    expect(view.querySelector(".inspector-kind")?.textContent).toBe("Drive");
    expect(view.querySelector(".tab[data-active='true']")?.textContent).toBe(
      "World › Keep the lamp lit",
    );
    expect(touchList(view, "Touches")).toEqual([
      { kind: "Actors", refs: ["Mara"] },
      {
        kind: "Drives",
        refs: ["Sell the light to the crown", "Leave the island"],
      },
      { kind: "Events", refs: ["The storm", "The wreck"] },
    ]);
    // Mara is its actor, but her record doesn't name it: only Touches.
    expect(touchList(view, "Touched by")).toEqual([
      { kind: "Scenes", refs: ["1 Arrival 3", "2 The night the light failed"] },
    ]);

    // To an event, and from it to a scene, which opens its prose tab.
    await follow(view, "The wreck", ".record-touches");
    expect(title(view)).toBe("The wreck");
    expect(view.querySelector(".inspector-kind")?.textContent).toBe("Event");
    // Its survivor and the constraint "the wreck during the storm" are its own.
    expect(touchList(view, "Touches")).toEqual([
      { kind: "Actors", refs: ["Ivo"] },
      { kind: "Events", refs: ["The storm"] },
    ]);
    expect(touchList(view, "Touched by")).toContainEqual({
      kind: "Drives",
      refs: ["Leave the island", "Keep the lamp lit"],
    });
    await follow(view, "2 The night the light failed", ".record-touches");
    expect(router.state.location.pathname).toBe("/doc/doc-storm-night");
    await until(() => view.querySelector(".prose") !== null);
    // The World tab stays, showing what it last showed.
    const worldTab = [...view.querySelectorAll(".tab")].find((t) =>
      t.textContent?.includes("The wreck"),
    );
    expect(worldTab?.getAttribute("data-active")).toBe("false");

    // Back returns to the record the reference came from.
    await act(async () => router.history.back());
    await until(() => title(view) === "The wreck");
    expect(router.state.location.search).toEqual({ at: "event:wreck" });
  });

  test("an actor's detail links to its entry, and to the groups it joins", async () => {
    const { view, router } = await render(await setup(), "/world?at=actor:ivo");
    expect(title(view)).toBe("Ivo");
    expect(view.querySelector(".inspector-kind")?.textContent).toBe(
      "Character",
    );
    expect(touchList(view, "Touches")).toEqual([
      { kind: "Actors", refs: ["Kestrel Guild"] },
    ]);
    await follow(view, "Kestrel Guild", ".record-fields");
    expect(title(view)).toBe("Kestrel Guild");
    expect(view.querySelector(".inspector-kind")?.textContent).toBe(
      "Organisation",
    );
    await act(async () =>
      router.navigate({ to: "/world", search: { at: "actor:mara" } }),
    );
    await until(() => title(view) === "Mara");
    await follow(view, "Open entry");
    expect(router.state.location.pathname).toBe("/doc/entry-mara");
  });

  test("Open Questions shows candidates, rejections, history and questions left open", async () => {
    const { view } = await render(await setup(), "/world?at=questions");
    expect(title(view)).toBe("Open Questions");
    expect(rows(view, "Questions")).toEqual([
      "Why did Ivo leave the guild?answered",
      "ChosenHe owes the guild a ship.touches 1",
      "His brother drowned on the reef.Rejected · Too neat.touches 0",
      "He wanted adventure.touches 0",
      "› 1 supersededHe wanted adventure. replaced by He owes the guild a ship.",
    ]);
    expect(rows(view, "Left open")).toEqual([
      "Who relit the lamp on the last night?Left open · The reader decides.no candidates yetleft open",
    ]);
    const rejected = view.querySelector("[data-candidate='rejected']");
    expect(rejected?.textContent).toContain("Rejected · Too neat.");

    // A candidate's reach opens its detail; from there, what it touches.
    await follow(view, "touches 1");
    expect(title(view)).toBe("He owes the guild a ship.");
    expect(view.querySelector(".inspector-kind")?.textContent).toBe(
      "Candidate answer",
    );
    expect(touchList(view, "Touches")).toEqual([
      { kind: "Drives", refs: ["Sell the light to the crown"] },
      { kind: "Open questions", refs: ["Why did Ivo leave the guild?"] },
    ]);
    expect(touchList(view, "Touched by")).toContainEqual({
      kind: "Knowledge",
      refs: ["Mara knows: He owes the guild a ship."],
    });
    await follow(view, "Why did Ivo leave the guild?", ".record-fields");
    expect(view.querySelector(".inspector-kind")?.textContent).toBe(
      "Open question",
    );
  });

  test("Timeline & Counts lists events in story order and counts' values", async () => {
    const { view } = await render(await setup(), "/world?at=timeline");
    expect(title(view)).toBe("Timeline & Counts");
    const placed = view.querySelectorAll(".ledger-group")[0];
    expect(placed?.querySelector(".ledger-number.time")?.textContent).toBe("3");
    expect(rows(view, "Timeline")[0]).toContain("depicted in 1 Arrival 3");
    expect(rows(view, "Not placed in time")).toEqual([
      "The wreckdepicted in 2 The night the light failed · caused by The storm",
      "The spring tide",
    ]);
    expect(rows(view, "Counts")).toEqual([
      "Berths3 at The storm3",
      "Hands at the light2 of 3, reaching more than half (2) at The storm2 of 3",
      "Barrels of oil9 of 12, reaching 2 at The storm · 1 of 12, 1 short of 2 at The wreck1 of 12",
    ]);
    await follow(view, "Barrels of oil");
    expect(view.querySelector(".inspector-kind")?.textContent).toBe("Count");
  });

  test("Reader-Order lists scenes, their years and the reader questions", async () => {
    const { view } = await render(await setup(), "/world?at=reader-order");
    expect(title(view)).toBe("Reader-Order");
    expect(rows(view, "Reading order")).toEqual([
      "1Arrivaltouches 63",
      "2The night the light failedtouches 6",
      "3Confessiontouches 5",
    ]);
    expect(view.querySelector(".sheet-spark circle")).not.toBeNull();
    expect(rows(view, "Reader questions")).toEqual([
      "Will the light go out?never opens · not answered",
      "Why does Ivo come back?opens in 1 · answered in 3",
    ]);
    // A scene's title opens its prose; its reach opens its bible record.
    await follow(view, "touches 5");
    expect(title(view)).toBe("3 Confession");
    expect(view.querySelector(".inspector-kind")?.textContent).toBe("Scene");
    expect(touchList(view, "Touches")).toContainEqual({
      kind: "Objects",
      refs: ["The lamp"],
    });
    expect(view.querySelector(".record-actions a")?.textContent).toBe(
      "Open prose",
    );
  });

  test("a question answered before it opens is a break", async () => {
    const story: Story = {
      ...lighthouse,
      readerQuestions: [
        {
          id: "early",
          question: "Who rows in?",
          opensAt: "confession",
          answeredAt: "arrival",
        },
      ],
    };
    const { view } = await render(await setup(story), "/world?at=reader-order");
    expect(rows(view, "Breaks")).toEqual([
      "Answered in 1 before it opens in 3Who rows in?",
    ]);
  });

  test("Contradictions are kept as story material, linked to their records", async () => {
    const story: Story = {
      ...lighthouse,
      // The wreck caused the storm too: a circle of causes.
      causes: [...lighthouse.causes, { cause: "wreck", effect: "storm" }],
    };
    const { view } = await render(
      await setup(story),
      "/world?at=contradictions",
    );
    expect(title(view)).toBe("Contradictions");
    const kept = rows(view, "Kept");
    expect(kept).toHaveLength(2);
    expect(kept[1]).toBe(
      `Circle of causesThese events are recorded as causing each other, in a circle: "The storm"; "The wreck".About The storm and The wreckkept`,
    );
    expect(view.querySelector(".inspector-sheet .notice-error")).toBeNull();

    // An event in a kept contradiction says so, and links back here.
    await follow(view, "The storm");
    // The rail row reads its view's name, then its count.
    await follow(view, "Timeline & Counts1", ".rail");
    expect(rows(view, "Timeline")[0]).toContain("1 contradiction");
    await follow(view, "1 contradiction");
    expect(title(view)).toBe("Contradictions");
  });

  test("a removed record reads as removed, and the World tab closes", async () => {
    const { view, router } = await render(
      await setup(),
      "/world?at=drive:gone",
    );
    expect(title(view)).toBe("Removed record");
    const close = view.querySelector<HTMLButtonElement>(
      ".tab[data-active='true'] .tab-close",
    );
    await act(async () => close?.click());
    await until(() => router.state.location.pathname === "/");
    expect(view.querySelector(".tab")).toBeNull();
  });
});

describe("record touches", () => {
  test("split by which record names which", () => {
    const touches = recordTouches(lighthouse, {
      kind: "drive",
      id: "sell-light",
    });
    const refs = (list: NonNullable<typeof touches>["touches"]) =>
      list.flatMap((g) => g.touches.map((t) => `${t.ref.kind}:${t.ref.id}`));
    if (!touches) throw new Error("expected the drive");
    // It names its actor; the drives related to it, the scene that
    // presses it and the candidate that would touch it name it.
    expect(refs(touches.touches)).toEqual(["actor:guild"]);
    expect(refs(touches.touchedBy)).toEqual([
      "drive:keep-light",
      "drive:leave-island",
      "scene:storm-night",
      "candidate:debt",
    ]);
  });

  test("the World tab's place parses views and refs", () => {
    expect(parseAt(undefined)).toEqual({ kind: "view", view: "cast" });
    expect(parseAt("timeline")).toEqual({ kind: "view", view: "timeline" });
    expect(parseAt("candidate:why-leave/debt")).toEqual({
      kind: "record",
      ref: { kind: "candidate", questionId: "why-leave", id: "debt" },
    });
    expect(parseAt("nonsense")).toEqual({ kind: "unknown", text: "nonsense" });
  });
});
