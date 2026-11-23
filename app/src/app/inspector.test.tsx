import { afterEach, describe, expect, test } from "bun:test";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { errAsync } from "neverthrow";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryStorage } from "~/storage/memory";
import type { StorageAdapter, StoredDocument } from "~/storage/types";
import documentsFile from "~/story/fixtures/lighthouse.documents.json";
import { loadStory, saveStory } from "~/story/store";
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
/** The storage the last `setup` made, for tests that change it behind the app. */
let storage: StorageAdapter = createMemoryStorage();

async function setup(story: Story = lighthouse, readOnly = false) {
  storage = createMemoryStorage();
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
    readOnly,
    saveDelayMs: 60_000,
  });
  (await workspace.refreshDocuments())._unsafeUnwrap();
  if (readOnly) return workspace;
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
  return { view, router, services };
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
  // The ledger as it reads: direct-edit controls are left out.
  return [...(section?.querySelectorAll(".ledger-rows > li") ?? [])].map(
    (li) => {
      const read = li.cloneNode(true) as Element;
      for (const control of read.querySelectorAll(
        ".edit-actions, .edit-action, .edit-form",
      )) {
        control.remove();
      }
      return read.textContent ?? "";
    },
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

describe("the World inspector, in review", () => {
  test("story time is said in the clock's own unit", async () => {
    // The fixture's world clock counts days.
    const { view } = await render(await setup(), "/world?at=event:storm");
    const field = (label: string) =>
      [...view.querySelectorAll(".record-field")]
        .find((f) => f.querySelector("dt")?.textContent === label)
        ?.querySelector("dd")?.textContent;
    expect(field("Story time")).toBe('day 3 to 6, noted "day"');
    act(() => root?.unmount());
    container?.remove();

    // A year clock is said in dates.
    const inYears: Story = {
      ...lighthouse,
      timeline: {
        ...lighthouse.timeline,
        worldUnit: "year",
        positions: lighthouse.timeline.positions.map((p) =>
          p.event === "storm"
            ? { ...p, start: 1203, end: 1204, precision: null }
            : p,
        ),
      },
    };
    const years = await render(await setup(inYears), "/world?at=event:storm");
    expect(
      [...years.view.querySelectorAll(".record-field")]
        .find((f) => f.querySelector("dt")?.textContent === "Story time")
        ?.querySelector("dd")?.textContent,
    ).toBe("year 1203");
  });

  test("memberships keep the events they hold from and to", async () => {
    const story: Story = {
      ...lighthouse,
      memberships: [
        ...lighthouse.memberships,
        // Mara joins the guild for good, from the start.
        { id: "mara-in-guild", member: "mara", group: "guild" },
      ],
    };
    const { view } = await render(await setup(story), "/world?at=actor:ivo");
    const field = (label: string) =>
      [...view.querySelectorAll(".record-field")]
        .find((f) => f.querySelector("dt")?.textContent === label)
        ?.querySelectorAll("li");
    expect(
      [...(field("Belongs to") ?? [])].map((li) => li.textContent),
    ).toEqual(["Kestrel Guild · from The storm · until The wreck"]);
    await follow(view, "The storm", ".record-fields");
    expect(title(view)).toBe("The storm");
    act(() => root?.unmount());
    container?.remove();

    const guild = await render(await setup(story), "/world?at=actor:guild");
    const members = [...guild.view.querySelectorAll(".record-field")]
      .find((f) => f.querySelector("dt")?.textContent === "Members")
      ?.querySelectorAll("li");
    // In story order: from the start first.
    expect([...(members ?? [])].map((li) => li.textContent)).toEqual([
      "Mara · from the start · still",
      "Ivo · from The storm · until The wreck",
    ]);
  });

  test("choosing a view in the rail drawer closes the drawer", async () => {
    const { view } = await render(await setup(), "/world?at=cast");
    const workspace = () => view.querySelector(".workspace");
    await act(async () =>
      view.querySelector<HTMLButtonElement>(".rail-toggle")?.click(),
    );
    expect(workspace()?.hasAttribute("data-rail-open")).toBe(true);
    await follow(view, "Open Questions0", ".rail");
    expect(title(view)).toBe("Open Questions");
    expect(workspace()?.hasAttribute("data-rail-open")).toBe(false);
  });

  test("the open inspector follows the bible as a command changes it", async () => {
    const { view, services } = await render(await setup(), "/world?at=cast");
    const cast = () =>
      [...view.querySelectorAll(".inspect-row")]
        .find((row) => row.firstChild?.textContent === "Cast & Drives")
        ?.querySelector(".inspect-count")?.textContent;
    expect(cast()).toBe("3");
    // Written through the app's bible storage, as an agent's tool calls are.
    (
      await services.bible.execute({
        type: "addActor",
        id: "brine",
        kind: "person",
        name: "Brine",
        notes: "",
      })
    )._unsafeUnwrap();
    await until(() => cast() === "4");
    await until(
      () =>
        view.querySelector(".page")?.textContent?.includes("Brine") === true,
    );
  });

  test("a failed read of the bible is a notice, until a read succeeds", async () => {
    const { view, services } = await render(await setup(), "/world?at=cast");
    const notice = () => view.querySelector(".notices .notice-error");
    expect(notice()).toBeNull();
    const good = (await storage.storyRecords.load("story"))._unsafeUnwrap();
    // Something writes a bible this build can't read.
    (
      await storage.storyRecords.save({
        ...good,
        data: { version: 1, premise: 5 },
      })
    )._unsafeUnwrap();
    await act(() => services.bible.refresh());
    expect(notice()?.textContent).toContain(
      "The story bible could not be read",
    );
    expect(notice()?.textContent).toContain(
      "The World inspector shows the bible as last read.",
    );
    // The last good read stays on the sheet.
    expect(title(view)).toBe("Cast & Drives");

    (await storage.storyRecords.save(good))._unsafeUnwrap();
    await act(async () =>
      [...view.querySelectorAll<HTMLButtonElement>(".notices button")]
        .find((b) => b.textContent === "Try again")
        ?.click(),
    );
    await until(() => notice() === null);
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

describe("direct edits in the World inspector", () => {
  const stored = async () => (await loadStory(storage))._unsafeUnwrap();

  /** The button named `name` (its label, or else its text). */
  const button = (view: HTMLElement, name: string) => {
    const found = [
      ...view.querySelectorAll<HTMLButtonElement>(".page button"),
    ].find((b) => (b.getAttribute("aria-label") ?? b.textContent) === name);
    if (!found) throw new Error(`no button "${name}"`);
    return found;
  };

  const field = <T extends HTMLInputElement | HTMLSelectElement>(
    view: HTMLElement,
    label: string,
  ) => {
    const found = [
      ...view.querySelectorAll<T>(".page input, .page select"),
    ].find((f) => f.getAttribute("aria-label") === label);
    if (!found) throw new Error(`no field "${label}"`);
    return found;
  };

  /** Sets a field's value the way React notices. */
  async function type(
    target: HTMLInputElement | HTMLSelectElement,
    value: string,
  ) {
    const setter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(target),
      "value",
    )?.set;
    await act(async () => {
      setter?.call(target, value);
      target.dispatchEvent(
        new Event(target instanceof HTMLSelectElement ? "change" : "input", {
          bubbles: true,
        }),
      );
    });
  }

  const report = (view: HTMLElement) =>
    view.querySelector(".edit-report")?.textContent ?? "";

  /** Clicks, then waits for the edit's report and the bible to show it. */
  async function edit(view: HTMLElement, target: HTMLElement) {
    await act(async () => target.click());
    await until(() => report(view) !== "");
    await settle();
  }

  const rail = (view: HTMLElement, name: string) =>
    [...view.querySelectorAll(".inspect-row")]
      .find((row) => row.firstChild?.textContent === name)
      ?.querySelector(".inspect-count")?.textContent;

  test("choosing a candidate answers the question, with what may now be stale", async () => {
    const { view } = await render(await setup(), "/world?at=questions");
    await edit(view, button(view, "Choose “He wanted adventure.”"));
    const question = (await stored()).openQuestions.find(
      (q) => q.id === "why-leave",
    );
    expect(question?.answer).toBe("wanderlust");
    expect(rows(view, "Questions")).toContain(
      "ChosenHe wanted adventure.touches 0",
    );
    expect(report(view)).toStartWith("Chose “He wanted adventure.”.");
    // The trace the agent gets: the prose that reveals the old answer,
    // linked to its document.
    expect(report(view)).toContain(
      "May still state the old “Why did Ivo leave the guild?”",
    );
    const prose = [...view.querySelectorAll(".edit-report a")].find(
      (a) => a.getAttribute("href") === "/doc/doc-confession",
    );
    expect(prose).toBeDefined();
  });

  test("rejecting asks why; reopening puts it back, or reopens the question", async () => {
    const { view } = await render(await setup(), "/world?at=questions");
    expect(rail(view, "Open Questions")).toBe("0");
    await act(async () =>
      button(view, "Reject “He wanted adventure.”").click(),
    );
    await type(field(view, "Why reject “He wanted adventure.”?"), "Not him.");
    await edit(view, button(view, "Reject"));
    const candidate = () =>
      stored().then((story) =>
        story.openQuestions
          .find((q) => q.id === "why-leave")
          ?.candidates.find((c) => c.id === "wanderlust"),
      );
    expect((await candidate())?.rejected).toBe("Not him.");
    expect(rows(view, "Questions")).toContain(
      "He wanted adventure.Rejected · Not him.touches 0",
    );
    expect(view.querySelector(".edit-form")).toBeNull();

    await edit(view, button(view, "Reopen “He wanted adventure.”"));
    expect((await candidate())?.rejected).toBeUndefined();

    await edit(
      view,
      button(
        view,
        "Reopen the question answered by “He owes the guild a ship.”",
      ),
    );
    const story = await stored();
    const question = story.openQuestions.find((q) => q.id === "why-leave");
    expect(question?.answer).toBeUndefined();
    expect(rows(view, "Questions")[0]).toBe("Why did Ivo leave the guild?open");
    // The rail counts it undecided again.
    expect(rail(view, "Open Questions")).toBe("1");
  });

  test("a scene moves one place in the telling order", async () => {
    const { view } = await render(await setup(), "/world?at=reader-order");
    await edit(view, button(view, "Move “Confession” earlier"));
    expect((await stored()).scenes.map((s) => s.id)).toEqual([
      "arrival",
      "confession",
      "storm-night",
    ]);
    expect(rows(view, "Reading order")).toEqual([
      "1Arrivaltouches 63",
      "2Confessiontouches 5",
      "3The night the light failedtouches 6",
    ]);
    expect(report(view)).toStartWith("Moved “Confession” to 2.");
  });

  test("a scene's viewpoint is chosen from the cast", async () => {
    const { view } = await render(await setup(), "/world?at=scene:storm-night");
    const viewpoint = () =>
      [...view.querySelectorAll(".record-field")].find(
        (f) => f.querySelector("dt")?.textContent === "Viewpoint",
      );
    expect(viewpoint()?.querySelector(".gap")?.textContent).toBe("not set");
    const select = field<HTMLSelectElement>(
      view,
      "Viewpoint of “The night the light failed”",
    );
    await type(select, "ivo");
    await until(() => report(view) !== "");
    await settle();
    const scene = (await stored()).scenes.find((s) => s.id === "storm-night");
    expect(scene?.viewpoint).toBe("ivo");
    expect(viewpoint()?.querySelector("a")?.textContent).toBe("Ivo");
    expect(report(view)).toStartWith(
      "Told “The night the light failed” through “Ivo”.",
    );
  });

  test("a count's value is set at an event, and a contradiction it makes is kept and said", async () => {
    const { view } = await render(await setup(), "/world?at=count:oil");
    await type(field(view, "Value"), "5");
    await type(field<HTMLSelectElement>(view, "At event"), "tide");
    await edit(view, button(view, "Set"));
    const oil = (await stored()).counts.find((c) => c.id === "oil");
    expect(oil?.values.find((v) => v.at === "tide")?.value).toBe(5);
    expect(report(view)).toContain(
      'Count: "Barrels of oil" rises from 1 at "The wreck" to 5 at "The spring tide", though it only falls.',
    );
    expect(rail(view, "Contradictions")).toBe("2");
    // The field is cleared for the next value.
    expect(field<HTMLInputElement>(view, "Value").value).toBe("");
  });

  test("a gap is marked deliberate with a reason, and unmarked", async () => {
    const { view } = await render(
      await setup(),
      "/world?at=drive:leave-island",
    );
    const gaps = () =>
      [...view.querySelectorAll(".record-gaps li .gap")].map(
        (g) => g.textContent,
      );
    expect(gaps()).toEqual([
      'Nobody holds the drive "Leave the island" yet.',
      'Nothing opposes the drive "Leave the island" yet.',
    ]);
    const marks = [
      ...view.querySelectorAll<HTMLButtonElement>(".record-gaps button"),
    ];
    await act(async () => marks[1]?.click());
    await type(
      field(
        view,
        'Why is it fine that nothing opposes the drive "Leave the island" yet?',
      ),
      "Only the sea is against it.",
    );
    await edit(view, button(view, "Keep the gap"));
    expect(gaps()).toEqual([
      'Nobody holds the drive "Leave the island" yet.',
      "gap kept · Only the sea is against it.",
    ]);
    const marked = (await stored()).deliberateGaps;
    expect(JSON.stringify(marked)).toContain("Only the sea is against it.");

    await edit(
      view,
      button(view, "Unmark the kept gap: Only the sea is against it."),
    );
    expect(gaps()).toEqual([
      'Nobody holds the drive "Leave the island" yet.',
      'Nothing opposes the drive "Leave the island" yet.',
    ]);
  });

  test("an edit says which scenes' prose its trace couldn't read", async () => {
    const workspace = await setup();
    // Confession's document is gone, and the storm's isn't valid content.
    (await storage.documents.delete("doc-confession"))._unsafeUnwrap();
    (
      await storage.documents.save({
        id: "doc-storm-night",
        title: "The night the light failed",
        content: [{ type: "p" }],
        updatedAt: 2,
      })
    )._unsafeUnwrap();
    const { view } = await render(workspace, "/world?at=questions");
    await edit(view, button(view, "Choose “He wanted adventure.”"));
    const unread = [...view.querySelectorAll(".edit-report-unread li")].map(
      (li) => [
        li.querySelector("a")?.textContent,
        li.querySelector(".touch-how")?.textContent,
      ],
    );
    expect(unread[0]).toEqual([
      "2 The night the light failed",
      expect.stringMatching(/^document doc-storm-night is not valid content: /),
    ]);
    expect(unread[1]).toEqual([
      "3 Confession",
      "document doc-confession does not exist",
    ]);
  });

  test("an edit that saved reads as saved when its prose can't be read after", async () => {
    const { view } = await render(await setup(), "/world?at=questions");
    // Reads of documents fail from here, and the workspace's reconnect
    // after the failure doesn't close the adapter, so what was saved can be
    // read. Its fields are read-only in its type, not in memory.
    const documents = storage.documents;
    Object.assign(storage, {
      close: () => {},
      documents: {
        ...documents,
        load: () =>
          errAsync({
            kind: "failure",
            operation: "load",
            message: "disk gone",
            cause: null,
          }),
      },
    });
    await edit(view, button(view, "Choose “He wanted adventure.”"));
    Object.assign(storage, { documents });
    expect(report(view)).toStartWith("Chose “He wanted adventure.”.");
    expect(view.querySelector(".edit-report")?.hasAttribute("data-error")).toBe(
      false,
    );
    expect(view.querySelector(".edit-report-unread")?.textContent).toContain(
      // The workspace's reconnect after the failure is what fails last.
      "3 Confessiondocument doc-confession could not be read: no reopen",
    );
    const question = (await stored()).openQuestions.find(
      (q) => q.id === "why-leave",
    );
    expect(question?.answer).toBe("wanderlust");
  });

  test("a refused edit says why, and changes nothing", async () => {
    const { view } = await render(await setup(), "/world?at=questions");
    // Removed behind the app's back, so the sheet still offers it.
    const { applyStoryCommand } = await import("~/story/commands");
    const removed = applyStoryCommand(await stored(), {
      type: "removeCandidate",
      questionId: "why-leave",
      id: "wanderlust",
    })._unsafeUnwrap().story;
    (await saveStory(storage, removed, 2))._unsafeUnwrap();
    await edit(view, button(view, "Choose “He wanted adventure.”"));
    expect(report(view)).toStartWith(
      "Not changed: candidate wanderlust does not exist.",
    );
    expect(view.querySelector(".edit-report")?.hasAttribute("data-error")).toBe(
      true,
    );
  });

  test("a read-only tab shows no controls", async () => {
    const { view } = await render(
      await setup(lighthouse, true),
      "/world?at=questions",
    );
    expect(view.querySelector(".edit-action")).toBeNull();
    await follow(view, "Reader-Order3", ".rail");
    expect(view.querySelector(".edit-action")).toBeNull();
  });
});
