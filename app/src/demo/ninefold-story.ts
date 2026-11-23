/**
 * The Ninefold's story bible: the records behind the demo's scene apparatus
 * (`layers/bible.ts`). Each scene's prose is the demo document of the same
 * ID. 4.2 The Sealed Door, the scene the demo opens on, shows every kind of
 * bible note: its time and events, a count, a version against the truth, a
 * plant, dramatic irony for its viewpoint, and something still held back.
 */
import { parseWhen } from "~/story/calendar";
import {
  newStory,
  type Ref,
  type Scene,
  STORY_VERSION,
  type Story,
} from "~/story/story";
import type { Position, TimeEvent } from "~/time/timeline";

function at(event: string, when: string, precision?: string): Position {
  const span = parseWhen(when);
  if (span.isErr()) throw new Error(`The demo's time ${when}: ${span.error}`);
  return {
    event,
    frame: "world",
    ...span.value,
    precision: precision ?? null,
    authority: { level: "asserted" },
  };
}

function scene(
  id: string,
  title: string,
  fields: Partial<Omit<Scene, "id" | "title">> = {},
): Scene {
  return {
    id,
    title,
    summary: "",
    actors: [],
    documentId: id,
    depicts: [],
    pressures: [],
    reveals: [],
    implies: [],
    withholds: [],
    plants: [],
    paysOff: [],
    ...fields,
  };
}

const fact = (id: string): Ref => ({ kind: "fact", id });
const object = (id: string): Ref => ({ kind: "object", id });

const EVENTS: TimeEvent[] = [
  {
    id: "archive",
    label: "The drowned archive is read",
    summary: "Ardelia reads the archive's catalogue under a fathom of water.",
  },
  {
    id: "lowest-tide",
    label: "The lowest tide in forty years",
    summary: "The sea gives back a bell, a boot and a door key.",
  },
  {
    id: "sealing",
    label: "The sealing of the Salt Gate",
    summary:
      "Ardelia sealed the Salt Gate with her own hand, to keep the Undertow under the harbour.",
  },
  {
    id: "coronation",
    label: "Aldric's coronation",
    summary: "Aldric II is crowned king of the Ninefold.",
  },
  {
    id: "night-market",
    label: "Kesh's night market",
    summary: "Kesh sells lamp oil, and a secret.",
  },
  {
    id: "door-visit",
    label: "Ardelia returns to the sealed door",
    summary: "Ardelia lays her palm on the door she sealed.",
  },
  {
    id: "tide-turns",
    label: "The tide turned",
    summary:
      "The tide turns under the Salt Gate for the first time since the sealing.",
  },
  {
    id: "answer",
    label: "Aldric's answer",
    summary: "The king answers on blue paper: not yet.",
  },
  {
    id: "undertow",
    label: "The Undertow wakes",
    summary: "What sleeps under the harbour stops being patient.",
  },
];

export function ninefoldStory(): Story {
  const empty = newStory(
    "A keeper who sealed the sea gate three centuries ago comes back to the door.",
  );
  return {
    ...empty,
    version: STORY_VERSION,
    actors: [
      { id: "ardelia", kind: "person", name: "Ardelia Vane", notes: "" },
      { id: "kesh", kind: "person", name: "Kesh", notes: "" },
      { id: "aldric", kind: "person", name: "Aldric II", notes: "" },
    ],
    facts: [
      {
        id: "kesh-sold",
        text: "Kesh sold the secret of the seal to the king's man.",
        about: [{ kind: "actor", id: "kesh" }],
      },
      {
        id: "ardelia-sister",
        text: "Ardelia is Aldric's sister.",
        about: [
          { kind: "actor", id: "ardelia" },
          { kind: "actor", id: "aldric" },
        ],
      },
    ],
    objects: [
      {
        id: "sealed-door",
        name: "The sealed door",
        notes: "Iron, and it remembers the hand that sealed it.",
      },
      { id: "door-key", name: "The door key", notes: "Nobody owns it." },
    ],
    versions: [
      {
        id: "kings-account",
        event: "sealing",
        text: "The old king's masons sealed the gate, and no one has opened it since.",
        by: ["aldric"],
      },
    ],
    knowledge: [
      {
        id: "ardelia-learns",
        actor: "ardelia",
        how: "knows",
        what: fact("kesh-sold"),
        since: "answer",
      },
    ],
    counts: [
      {
        id: "lamps",
        label: "Lamps along the Salt Gate",
        notes: "",
        direction: "falls",
        values: [
          { at: "night-market", value: 40, note: "" },
          { at: "door-visit", value: 0, note: "Burned down to their wicks." },
        ],
      },
    ],
    scenes: [
      scene("scene-1-1", "The Drowned Archive", {
        actors: ["ardelia"],
        depicts: ["archive"],
      }),
      scene("scene-2-1", "Ardelia", { actors: ["ardelia"] }),
      scene("scene-3-1", "What the Tide Kept", {
        depicts: ["lowest-tide"],
        plants: [object("door-key")],
      }),
      scene("scene-3-2", "The Winter Seal", {
        actors: ["ardelia"],
        depicts: ["sealing", "coronation"],
        withholds: [fact("ardelia-sister")],
      }),
      scene("scene-4-1", "Night Market", {
        actors: ["kesh"],
        depicts: ["night-market"],
        reveals: [fact("kesh-sold")],
      }),
      scene("scene-4-2", "The Sealed Door", {
        actors: ["ardelia", "kesh"],
        viewpoint: "ardelia",
        depicts: ["door-visit", "tide-turns"],
        reveals: [{ kind: "event", id: "sealing" }],
        plants: [object("sealed-door")],
      }),
      scene("scene-4-3", "Aldric's Answer", {
        actors: ["aldric"],
        depicts: ["answer"],
      }),
      scene("scene-5-1", "Undertow", {
        depicts: ["undertow"],
        paysOff: [object("sealed-door")],
      }),
    ],
    timeline: {
      ...empty.timeline,
      worldUnit: "year",
      events: EVENTS,
      positions: [
        at("archive", "1196-11-03"),
        at("lowest-tide", "1201", "autumn"),
        at("sealing", "902-11-30", "night"),
        at("coronation", "902-11-30"),
        at("night-market", "1203-11-09", "evening"),
        at("door-visit", "1203-11-12 21:00"),
        at("tide-turns", "1203-11-12 23:00"),
        at("answer", "1203-11-14"),
        at("undertow", "1204"),
      ],
    },
  };
}
