import { beforeEach, describe, expect, test } from "bun:test";
import type { ResultAsync } from "neverthrow";
import { createMemoryStorage } from "../storage/memory";
import type { StorageAdapter, StoredDocument } from "../storage/types";
import { exportWorld, importWorld } from "../storage/world-file";
import documentsFile from "../story/fixtures/lighthouse.documents.json";
import { readerOrderQuery } from "../story/queries";
import { executeStoryCommand, saveStory } from "../story/store";
import { parseStory, type Story } from "../story/story";
import {
  type AgentScope,
  buildContextPacket,
  type ContextPacket,
  packetText,
} from "./context";

const fixture: Story = parseStory(
  await Bun.file(
    new URL("../story/fixtures/lighthouse.story.json", import.meta.url),
  ).text(),
)._unsafeUnwrap();
const documents: StoredDocument[] = documentsFile;

async function value<T, E>(result: ResultAsync<T, E>): Promise<T> {
  return (await result)._unsafeUnwrap();
}

let storage: StorageAdapter;

beforeEach(async () => {
  storage = createMemoryStorage();
  await value(saveStory(storage, fixture, 1000));
  await value(
    storage.batch(
      documents.map((record) => ({ kind: "saveDocument" as const, record })),
    ),
  );
});

const packet = (scope: AgentScope, from: StorageAdapter = storage) =>
  value(buildContextPacket(from, scope));
const section = (found: ContextPacket, title: string) =>
  found.sections.find((s) => s.title === title)?.lines.join("\n");

const SCOPES: AgentScope[] = [
  { kind: "world" },
  { kind: "scene", scene: "arrival" },
  { kind: "scene", scene: "storm-night" },
  { kind: "scene", scene: "confession" },
  { kind: "record", ref: "drive:keep-light" },
  { kind: "record", ref: "candidate:why-leave/debt" },
];

test("is the same for the same world, and after the world round-trips", async () => {
  const copy = createMemoryStorage();
  await value(importWorld(copy, await value(exportWorld(storage))));
  for (const scope of SCOPES) {
    const first = await packet(scope);
    expect(await packet(scope)).toEqual(first);
    expect(packetText(await packet(scope, copy))).toBe(packetText(first));
  }
});

test("follows the bible as it changes", async () => {
  const before = await packet({ kind: "world" });
  await value(
    executeStoryCommand(
      storage,
      { type: "addScene", id: "after", title: "After", summary: "" },
      2000,
    ),
  );
  const after = await packet({ kind: "world" });
  expect(section(before, "Scenes in telling order")).not.toContain("after");
  expect(section(after, "Scenes in telling order")).toContain(
    '4. scene:after ("After")',
  );
});

describe("a world", () => {
  test("has the premise, the scenes, the open questions and the contradictions", async () => {
    const found = await packet({ kind: "world" });
    expect(found.sections.map((s) => s.title)).toEqual([
      "Premise",
      "Scenes in telling order",
      "Open questions",
      "Contradictions",
    ]);
    expect(section(found, "Premise")).toBe(fixture.premise);
    expect(section(found, "Open questions")).toContain(
      "open-question:why-leave",
    );
  });
});

describe("a scene", () => {
  test("has reader-order --before it, with the viewpoint's marks", async () => {
    const found = await packet({ kind: "scene", scene: "confession" });
    expect(found.sections.map((s) => s.title)).toEqual([
      "The scene",
      "What the reader has been told before it",
      "Events it depicts",
      "People in it",
      "Its prose so far",
    ]);
    expect(section(found, "What the reader has been told before it")).toBe(
      readerOrderQuery(fixture, "confession")._unsafeUnwrap().lines.join("\n"),
    );
    expect(section(found, "What the reader has been told before it")).toContain(
      "Ivo doesn't know, believes version:guild-account",
    );
    expect(section(found, "Events it depicts")).toBe("(none)");
    expect(section(found, "Its prose so far")).toBe(
      '"I owe them a ship," Ivo said.',
    );
  });

  test("has each count as it opens, and the events and people in it", async () => {
    const found = await packet({ kind: "scene", scene: "storm-night" });
    const told = section(found, "What the reader has been told before it");
    expect(told).toContain("Counts as the scene opens");
    expect(told).toContain(
      '- count:oil ("Barrels of oil"): 9 of 12, reaching 2, since event:storm',
    );
    expect(section(found, "Events it depicts")).toStartWith(
      "event:wreck\nlabel: The wreck",
    );
    expect(section(found, "People in it")).toStartWith("actor:mara\n");
    expect(section(found, "The scene")).toContain(
      'prose: document doc-storm-night "The night the light failed"',
    );
  });

  test("says when its prose isn't written or can't be read", async () => {
    await value(
      executeStoryCommand(
        storage,
        { type: "addScene", id: "blank", title: "Blank", summary: "" },
        2000,
      ),
    );
    await value(storage.documents.delete("doc-confession"));
    expect(
      section(
        await packet({ kind: "scene", scene: "blank" }),
        "Its prose so far",
      ),
    ).toBe("(not written yet)");
    expect(
      section(
        await packet({ kind: "scene", scene: "confession" }),
        "Its prose so far",
      ),
    ).toBe("(could not be read: document doc-confession does not exist)");
  });
});

describe("a record", () => {
  test("has the record, what it touches and the scenes that touch it", async () => {
    const found = await packet({ kind: "record", ref: "drive:keep-light" });
    expect(found.sections.map((s) => s.title)).toEqual([
      "drive:keep-light",
      "What it touches",
      "Scenes that touch it",
    ]);
    expect(section(found, "drive:keep-light")).toStartWith(
      "drive:keep-light\nwant: Keep the lamp lit",
    );
    expect(section(found, "Scenes that touch it")).toContain(
      "1. scene:arrival",
    );
  });
});

test("the text names the scope and each section", async () => {
  const text = packetText(await packet({ kind: "scene", scene: "arrival" }));
  expect(text).toStartWith(
    "# Context: scene:arrival\n\n## The scene\n\nscene:arrival\ntitle: Arrival",
  );
});
