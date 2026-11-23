import { expect, test } from "bun:test";
import { ninefoldStory } from "~/demo/ninefold-story";
import { createMemoryStorage } from "~/storage/memory";
import { saveStory } from "~/story/store";
import { type BibleState, createBible } from "./bible";

/** Waits until the bible's state passes `check`. */
async function until(
  state: () => BibleState,
  check: (state: BibleState) => boolean,
) {
  for (let i = 0; i < 50 && !check(state()); i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  expect(check(state())).toBe(true);
}

const actors = (state: BibleState) =>
  state.kind === "ready" ? state.story.actors.map((a) => a.id) : [];

test("loads the stored bible, and an empty store as an empty story", async () => {
  const storage = createMemoryStorage();
  const bible = createBible(storage);
  expect(bible.state.get().kind).toBe("loading");
  await bible.refresh();
  expect(bible.state.get()).toMatchObject({ kind: "ready" });
  expect(actors(bible.state.get())).toEqual([]);
});

test("any write of story records through its storage reloads it", async () => {
  const bible = createBible(createMemoryStorage());
  await bible.refresh();
  // A whole save, as the story store batches it.
  await saveStory(bible.storage, ninefoldStory(), 1);
  await until(bible.state.get, (s) => actors(s).includes("kesh"));
  // A command.
  const added = await bible.execute({
    type: "addActor",
    id: "brine",
    kind: "person",
    name: "Brine",
    notes: "",
  });
  expect(added.isOk()).toBe(true);
  await until(bible.state.get, (s) => actors(s).includes("brine"));
  // A single record deleted directly.
  await bible.storage.storyRecords.delete("actor/brine");
  await until(bible.state.get, (s) => !actors(s).includes("brine"));
});

test("writes to other collections leave it alone", async () => {
  const storage = createMemoryStorage();
  const bible = createBible(storage);
  await bible.refresh();
  const before = bible.state.get();
  await bible.storage.batch([
    {
      kind: "saveDocument",
      record: { id: "d", title: "D", content: [], updatedAt: 1 },
    },
  ]);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(bible.state.get()).toBe(before);
});

test("a bible that doesn't load says why", async () => {
  const storage = createMemoryStorage();
  await storage.storyRecords.save({
    id: "actor/x",
    kind: "actor",
    data: "not an actor",
    updatedAt: 1,
  });
  const bible = createBible(storage);
  await bible.refresh();
  const state = bible.state.get();
  expect(state.kind).toBe("error");
  expect(state.kind === "error" && state.message).toStartWith(
    "The story bible could not be read",
  );
});
