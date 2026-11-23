/**
 * The story bible's apparatus for one scene (`DESIGN.md`, Gloss Note): what
 * the bible knows about the scene whose prose is a document, as gloss notes
 * and marks for the layers.
 *
 * - Time: when the scene is, how long after the scene before it, and when
 *   each event it shows happens (`span`'s day counts).
 * - World: each count's value as the scene opens and as it changes during
 *   it, and each version of an event set beside what really happened.
 * - Subtext: what the scene plants and pays off, the viewpoint's dramatic
 *   irony (what the reader has been told that the viewpoint doesn't know, as
 *   `reader-order --before` marks it), and what is still held back.
 *
 * A note attaches to words in the prose where the prose names its record
 * (`terms`: a name, a label, a stated year or count value): a mark anchored
 * by `TextAnchor` carries its key. A note whose record the prose doesn't
 * name is about the scene as a whole and follows its last line. Anchors are
 * found again whenever the text changes (`bibleLayers`), so a note moves to
 * the scene's end when its words are edited away, and back when they return.
 *
 * Everything here is computed from the bible; nothing is stored.
 */

import {
  describeBetween,
  describeSpanRange,
  describeWhen,
  spanRange,
} from "~/story/calendar";
import { countSeries, stepsAround, stepText } from "~/story/counts";
import {
  sceneNow,
  sceneSpan,
  type Telling,
  type TellingHow,
  toldBefore,
  viewpointGap,
  viewpointTurns,
} from "~/story/learning";
import { numberPattern, numberWordsPattern, terms } from "~/story/mentions";
import { formatRef } from "~/story/refs";
import type { Ref, Scene, Story } from "~/story/story";
import { refLabel } from "~/story/touches";
import { type Position, WORLD_FRAME } from "~/time/timeline";
import {
  type GlossNote,
  type LayerMark,
  locate,
  type MarkStyle,
  NO_SCENE_LAYERS,
  type NoteRun,
  type SceneLayers,
  type TextAnchor,
} from "./model";

/** The scene's story time, for the masthead stamp. */
export interface BibleStamp {
  readonly text: string;
  readonly inferred: boolean;
}

/** A bible note before its words are looked for in the prose. */
export interface BibleNote {
  /** The note as it shows beside its words. */
  readonly note: GlossNote;
  /** The same note when the prose doesn't name its record. */
  readonly atScene: GlossNote;
  /** Words that name what the note is about, tried in order. */
  readonly names: readonly RegExp[];
  /** How its words are marked. */
  readonly style: MarkStyle;
}

/** What the bible says about the scene whose prose is one document. */
export interface BibleScene {
  readonly sceneId: string;
  /** In telling order, from 1. */
  readonly position: number;
  /** When the scene is (its latest placed event); null when unplaced. */
  readonly stamp: BibleStamp | null;
  readonly notes: readonly BibleNote[];
}

/** A text block of the document: its ID and its text. */
export interface TextBlock {
  readonly id: string;
  readonly text: string;
}

const AUTHORITY = "story bible" as const;

const scenes = new WeakMap<Story, Map<string, BibleScene | null>>();

/**
 * The bible's view of the scene that `documentId` holds the prose of, or
 * null when no scene does. The same story gives the same result object, so
 * views that read it from one bible share its notes.
 */
export function bibleScene(
  story: Story,
  documentId: string,
): BibleScene | null {
  let byDocument = scenes.get(story);
  if (byDocument === undefined) {
    byDocument = new Map();
    scenes.set(story, byDocument);
  }
  const known = byDocument.get(documentId);
  if (known !== undefined) return known;
  const computed = computeScene(story, documentId);
  byDocument.set(documentId, computed);
  return computed;
}

function computeScene(story: Story, documentId: string): BibleScene | null {
  const index = story.scenes.findIndex((s) => s.documentId === documentId);
  const scene = story.scenes[index];
  if (scene === undefined) return null;
  const now = sceneNow(story, scene);
  return {
    sceneId: scene.id,
    position: index + 1,
    stamp: now === undefined ? null : stampOf(story, now),
    notes: [
      ...sinceNotes(story, index),
      ...eventNotes(story, scene, now),
      ...countNotes(story, scene),
      ...versionNotes(story, scene),
      ...plantNotes(story, index),
      ...ironyNotes(story, index),
      ...withheldNotes(story, index),
    ],
  };
}

/**
 * The scene's layers from its bible notes, anchored to the first words in
 * `blocks` that name each note's record. A key sits on its words' last
 * character, and two keys on one character would hide one of the notes, so
 * a note never takes a place another bible note or a keyed mark in
 * `others` (the scene's other layers) holds: it tries the next match. A
 * note with no free words found is about the scene.
 */
export function bibleLayers(
  notes: readonly BibleNote[],
  blocks: readonly TextBlock[],
  others: readonly LayerMark[] = [],
): SceneLayers {
  if (notes.length === 0) return NO_SCENE_LAYERS;
  const taken = new Set<string>();
  for (const mark of others) {
    if (mark.noteId === undefined) continue;
    const block = blocks.find((b) => b.id === mark.anchor.blockId);
    const span = block === undefined ? null : locate(block.text, mark.anchor);
    if (span !== null) taken.add(keyPlace(mark.anchor.blockId, span.end));
  }
  const marks: LayerMark[] = [];
  const placed: GlossNote[] = [];
  for (const { note, atScene, names, style } of notes) {
    const anchor = findAnchor(names, blocks, taken);
    if (anchor === null) {
      placed.push(atScene);
      continue;
    }
    marks.push({ id: `${note.id}/words`, anchor, style, noteId: note.id });
    placed.push(note);
  }
  return { speakers: [], cues: new Map(), marks, notes: placed };
}

/** Whether two results of `bibleLayers` draw the same. */
export function sameBibleLayers(a: SceneLayers, b: SceneLayers): boolean {
  return (
    a.notes.length === b.notes.length &&
    a.notes.every((note, i) => note === b.notes[i]) &&
    a.marks.length === b.marks.length &&
    a.marks.every((mark, i) => {
      const other = b.marks[i];
      return (
        other !== undefined &&
        mark.id === other.id &&
        mark.anchor.blockId === other.anchor.blockId &&
        mark.anchor.quote === other.anchor.quote &&
        mark.anchor.occurrence === other.anchor.occurrence
      );
    })
  );
}

function findAnchor(
  names: readonly RegExp[],
  blocks: readonly TextBlock[],
  taken: Set<string>,
): TextAnchor | null {
  for (const name of names) {
    const flags = name.flags.includes("g") ? name.flags : `${name.flags}g`;
    for (const block of blocks) {
      for (const match of block.text.matchAll(new RegExp(name.source, flags))) {
        const quote = match[0];
        if (quote.trim() === "") continue;
        // A key sits on its words' last character: one key to a place.
        const place = keyPlace(block.id, match.index + quote.length);
        if (taken.has(place)) continue;
        taken.add(place);
        return {
          blockId: block.id,
          quote,
          occurrence: occurrenceAt(block.text, quote, match.index),
        };
      }
    }
  }
  return null;
}

/** Where a key whose words end at `end` in a block sits. */
const keyPlace = (blockId: string, end: number) => `${blockId} ${end}`;

/** Which occurrence of `quote` starts at `at`, counted as `locate` counts. */
function occurrenceAt(text: string, quote: string, at: number): number {
  let n = 0;
  for (let from = text.indexOf(quote); from !== -1 && from < at; n++) {
    from = text.indexOf(quote, from + 1);
  }
  return n;
}

function note(
  id: string,
  layer: GlossNote["layer"],
  heading: string,
  body: NoteRun[],
  options: {
    names?: readonly RegExp[];
    style?: MarkStyle;
    authority?: GlossNote["authority"];
  } = {},
): BibleNote {
  const made: GlossNote = {
    id: `bible/${id}`,
    layer,
    heading,
    authority: options.authority ?? AUTHORITY,
    body,
    actions: [],
  };
  return {
    note: made,
    atScene: { ...made, placement: "scene" },
    names: options.names ?? [],
    style: options.style ?? { kind: "record" },
  };
}

const strong = (text: string): NoteRun => ({ text, strong: true });

/** Words in the prose that name `ref`: its name, label or text. */
const namesOf = (story: Story, ref: Ref): RegExp[] =>
  terms(story, ref)
    .filter((term) => term.match === "direct" && term.from !== undefined)
    .map((term) => term.pattern);

/**
 * A number the prose may state, in digits or words. Small numbers are
 * everywhere in prose, so only values from `least` up anchor a note.
 */
const numberNames = (value: number, least: number): RegExp[] =>
  Number.isInteger(value) && value >= least && value < 1e6
    ? [numberPattern(value), numberWordsPattern(value)]
    : [];

/** The full stop `text` needs to end a sentence: none if it has one. */
const stop = (text: string): string =>
  /[.?!…]["”’)]?$/.test(text.trim()) ? "" : ".";

/** `text`, ending a sentence. */
const sentence = (text: string): string => `${text}${stop(text)}`;

/** A record's label, to set inside a sentence: without a closing full stop. */
const labelOf = (story: Story, ref: Ref): string => {
  const label = refLabel(story, ref)
    .trim()
    .replace(/(?<!\.)\.$/, "");
  return label === "" ? ref.id : label;
};

const eventLabel = (story: Story, id: string) =>
  labelOf(story, { kind: "event", id });

const sameRef = (a: Ref, b: Ref) => formatRef(a) === formatRef(b);

const positionOf = (story: Story, id: string): Position | undefined =>
  story.timeline.positions.find(
    (p) => p.event === id && p.frame === WORLD_FRAME,
  );

/** `12 October 1954 · night`, or `day 3 to 6` in another world unit. */
function whenText(story: Story, position: Position): string {
  const { worldUnit } = story.timeline;
  const when =
    worldUnit === "year"
      ? describeWhen(position)
      : position.start === position.end
        ? `${worldUnit} ${position.start}`
        : `${worldUnit} ${position.start} to ${position.end}`;
  const precision = position.precision?.trim() ?? "";
  return precision === "" || when.includes(precision)
    ? when
    : `${when} · ${precision}`;
}

function stampOf(story: Story, event: string): BibleStamp | null {
  const position = positionOf(story, event);
  return position === undefined
    ? null
    : {
        text: whenText(story, position),
        inferred: position.authority.level === "inferred",
      };
}

/**
 * The time from one placed event to another, as `span` says it: start to
 * start (`3 days`), or as a range when either is placed by a month or more
 * (`0.5 to 1.5 months`). `later` says which way it runs; it is undefined when
 * the two may fall either way round. Undefined when either is unplaced or
 * they start together.
 */
function between(
  story: Story,
  from: string,
  to: string,
): { text: string; later?: boolean } | undefined {
  const a = positionOf(story, from);
  const b = positionOf(story, to);
  if (a === undefined || b === undefined) return undefined;
  const { worldUnit } = story.timeline;
  if (worldUnit === "year") {
    const range = spanRange(a, b);
    if (range !== undefined) {
      const said = describeSpanRange(range);
      return said === undefined
        ? { text: "around the same time" }
        : { text: said, later: range.max > 0 };
    }
    return a.start === b.start
      ? undefined
      : { text: describeBetween(a.start, b.start), later: b.start > a.start };
  }
  if (a.start === b.start) return undefined;
  const amount = Math.abs(b.start - a.start);
  return {
    text: `${amount} ${worldUnit}${amount === 1 ? "" : "s"}`,
    later: b.start > a.start,
  };
}

/** A scene by its title, as the reader meets it: `“Night Market”`. */
const sceneTitle = (story: Story, index: number) =>
  `“${labelOf(story, { kind: "scene", id: story.scenes[index]?.id ?? "" })}”`;

const TOLD_WORDS: Record<TellingHow, string> = {
  shows: "shown",
  reveals: "revealed",
  implies: "implied",
  withholds: "withheld",
  plants: "planted",
  paysOff: "paid off",
};

/** `planted in “Arrival”, revealed and paid off in “Confession”`. */
function tellingsText(story: Story, tellings: readonly Telling[]): string {
  return [...new Set(tellings.map((t) => t.index))]
    .map(
      (at) =>
        `${tellings
          .filter((t) => t.index === at)
          .map((t) => TOLD_WORDS[t.how])
          .join(" and ")} in ${sceneTitle(story, at)}`,
    )
    .join(", ");
}

/** How long after the scene before it in telling order (or before, told out of order). */
function sinceNotes(story: Story, index: number): BibleNote[] {
  const scene = story.scenes[index];
  if (scene === undefined) return [];
  const now = sceneNow(story, scene);
  if (now === undefined) return [];
  for (let i = index - 1; i >= 0; i--) {
    const earlier = story.scenes[i];
    const then = earlier === undefined ? undefined : sceneNow(story, earlier);
    if (earlier === undefined || then === undefined) continue;
    const gap = between(story, then, now);
    const title = sceneTitle(story, i);
    return [
      note(
        "since",
        "time",
        "Time",
        gap === undefined
          ? [{ text: "At the same time as " }, strong(title), { text: "." }]
          : gap.later === undefined
            ? [
                { text: "Around the same time as " },
                strong(title),
                { text: ", either way round." },
              ]
            : [
                strong(gap.text),
                {
                  text: gap.later
                    ? ` after ${title}.`
                    : ` before ${title}, told after it.`,
                },
              ],
        { style: { kind: "time" } },
      ),
    ];
  }
  return [];
}

/** When each event the scene shows happens, and how far a flashback goes back. */
function eventNotes(
  story: Story,
  scene: Scene,
  now: string | undefined,
): BibleNote[] {
  return scene.depicts.map((id) => {
    const ref: Ref = { kind: "event", id };
    const position = positionOf(story, id);
    const gap =
      now === undefined || now === id ? undefined : between(story, id, now);
    const body: NoteRun[] = [
      strong(eventLabel(story, id)),
      {
        text: ` · ${position === undefined ? "not placed in time" : whenText(story, position)}`,
      },
      ...(gap?.later === undefined
        ? []
        : [
            {
              text: `, ${gap.text} ${gap.later ? "before" : "after"} the scene's latest event`,
            },
          ]),
      { text: "." },
    ];
    const year =
      position !== undefined && story.timeline.worldUnit === "year"
        ? numberNames(Math.floor(position.start), 100)
        : [];
    return note(`event/${id}`, "time", "Event", body, {
      names: [...namesOf(story, ref), ...year],
      style: { kind: "time" },
      ...(position?.authority.level === "inferred"
        ? { authority: "inferred" as const }
        : {}),
    });
  });
}

/** Each count's value as the scene opens, then each change during it. */
function countNotes(story: Story, scene: Scene): BibleNote[] {
  if (scene.depicts.length === 0) return [];
  return story.counts.flatMap((count) => {
    const { entering, during } = stepsAround(
      story,
      countSeries(story, count),
      scene.depicts,
    );
    if (entering === undefined && during.length === 0) return [];
    const label = labelOf(story, { kind: "count", id: count.id });
    const body: NoteRun[] = [
      { text: `${label}: ` },
      entering === undefined
        ? { text: "none yet" }
        : strong(stepText(count, entering)),
      { text: " as the scene opens" },
      ...during.flatMap((step): NoteRun[] => [
        { text: "; then " },
        strong(stepText(count, step)),
        { text: ` at ${eventLabel(story, step.at)}` },
      ]),
      { text: "." },
    ];
    return [
      note(`count/${count.id}`, "world", "Count", body, {
        names: [
          ...namesOf(story, { kind: "count", id: count.id }),
          ...[entering, ...during].flatMap((step) =>
            step === undefined ? [] : numberNames(step.value, 10),
          ),
        ],
      }),
    ];
  });
}

/**
 * Each version of an event the scene shows or links, set beside the event's
 * summary, which is what really happened.
 */
function versionNotes(story: Story, scene: Scene): BibleNote[] {
  const linked = (ref: Ref) =>
    (["reveals", "implies", "withholds", "plants", "paysOff"] as const).some(
      (how) => scene[how].some((r) => sameRef(r, ref)),
    );
  return story.versions
    .filter(
      (v) =>
        scene.depicts.includes(v.event) ||
        linked({ kind: "version", id: v.id }) ||
        linked({ kind: "event", id: v.event }),
    )
    .map((version) => {
      const event = story.timeline.events.find((e) => e.id === version.event);
      const truth = event?.summary.trim() || "";
      const tellers = version.by.map((id) =>
        labelOf(story, { kind: "actor", id }),
      );
      const body: NoteRun[] = [
        {
          text: `${tellers.length === 0 ? "Told" : `${tellers.join(" and ")} ${tellers.length === 1 ? "tells" : "tell"}`} of ${eventLabel(story, version.event)}: `,
        },
        strong(`“${version.text.trim()}”`),
        {
          text:
            truth === ""
              ? " What really happened isn't recorded yet."
              : ` What really happened: ${sentence(truth)}`,
        },
      ];
      return note(`version/${version.id}`, "world", "Version", body, {
        names: namesOf(story, { kind: "version", id: version.id }),
      });
    });
}

/** What the scene plants, with where it pays off, and what it pays off. */
function plantNotes(story: Story, index: number): BibleNote[] {
  const scene = story.scenes[index];
  if (scene === undefined) return [];
  const where = (found: number) => sceneTitle(story, found);
  const planted = scene.plants.map((ref) => {
    const later = story.scenes.findIndex(
      (s, i) => i > index && s.paysOff.some((r) => sameRef(r, ref)),
    );
    return note(
      `plants/${formatRef(ref)}`,
      "subtext",
      "Planted",
      [
        strong(labelOf(story, ref)),
        {
          text:
            later === -1
              ? " · not paid off yet."
              : ` · pays off in ${where(later)}.`,
        },
      ],
      { names: namesOf(story, ref), style: { kind: "subtext" } },
    );
  });
  const paid = scene.paysOff.map((ref) => {
    let earlier = -1;
    for (let i = index - 1; i >= 0 && earlier === -1; i--) {
      if (story.scenes[i]?.plants.some((r) => sameRef(r, ref))) earlier = i;
    }
    return note(
      `pays-off/${formatRef(ref)}`,
      "subtext",
      "Pays off",
      [
        strong(labelOf(story, ref)),
        {
          text:
            earlier === -1
              ? " · planted in no earlier scene."
              : ` · planted in ${where(earlier)}.`,
        },
      ],
      { names: namesOf(story, ref), style: { kind: "subtext" } },
    );
  });
  return [...planted, ...paid];
}

/**
 * Dramatic irony: what the scenes before this one have told the reader and
 * the viewpoint doesn't hold as the scene opens, with what the viewpoint
 * believes instead and what changes for them during the scene.
 */
function ironyNotes(story: Story, index: number): BibleNote[] {
  const scene = story.scenes[index];
  if (scene?.viewpoint === undefined) return [];
  const actor = scene.viewpoint;
  const name = labelOf(story, { kind: "actor", id: actor });
  const opens = sceneSpan(story, scene)?.opens;
  return toldBefore(story, index).told.flatMap(({ ref, tellings }) => {
    const gap = viewpointGap(story, actor, ref, opens, index);
    const turns = viewpointTurns(story, actor, ref, scene);
    if (gap === undefined && turns.length === 0) return [];
    const how =
      gap === undefined
        ? undefined
        : gap.later
          ? "doesn't know it yet"
          : gap.ended === undefined
            ? "doesn't know it"
            : `no longer ${gap.ended === "knows" ? "knows" : "believes"} it`;
    const believes =
      gap === undefined || gap.believes.length === 0
        ? ""
        : `, and believes ${gap.believes.map((r) => `“${labelOf(story, r)}”`).join(" and ")}`;
    const body: NoteRun[] = [
      { text: "The reader knows " },
      strong(labelOf(story, ref)),
      { text: ` (${tellingsText(story, tellings)})` },
      ...(how === undefined
        ? [{ text: "." }]
        : [
            { text: "; " },
            strong(`${name} ${how}`),
            { text: believes === "" ? "." : sentence(believes) },
          ]),
      ...turns.map(
        (turn): NoteRun => ({
          text: ` ${name} ${turn.how === "knows" ? "knows" : "believes"} ${sameRef(turn.what, ref) ? "it" : `“${labelOf(story, turn.what)}”`} ${turn.turn === "starts" ? "from" : "until"} ${eventLabel(story, turn.event)}, in this scene.`,
        }),
      ),
    ];
    return [
      note(
        `irony/${formatRef(ref)}`,
        "subtext",
        how === undefined ? "Viewpoint" : "Irony",
        body,
        { names: namesOf(story, ref), style: { kind: "subtext" } },
      ),
    ];
  });
}

/** What the scenes before this one held back and none has told yet. */
function withheldNotes(story: Story, index: number): BibleNote[] {
  const { withheld } = toldBefore(story, index);
  const last = withheld[withheld.length - 1];
  if (last === undefined) return [];
  return [
    note(
      "withheld",
      "subtext",
      "Withheld",
      [
        { text: "Still held back from the reader: " },
        ...withheld.flatMap((ref, i): NoteRun[] => [
          ...(i === 0 ? [] : [{ text: "; " }]),
          strong(labelOf(story, ref)),
        ]),
        { text: stop(labelOf(story, last)) },
      ],
      { style: { kind: "subtext" } },
    ),
  ];
}
