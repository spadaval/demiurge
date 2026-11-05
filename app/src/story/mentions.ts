/**
 * Where a story's free text mentions a record, so that after a change a team
 * can find the summaries, stakes, wants, facts and candidates that still state
 * the old version (docs/rebuild/story-model.md, Fluidity). `whatThisTouches`
 * follows declared links; this reads the text they leave out.
 *
 * It informs and never edits: matching is plain, case-insensitive and whole
 * words, with no guessing at meaning, so it can miss a paraphrase and list a
 * coincidence. Whoever reads the list decides what to reword.
 */

import { err, ok, type Result } from "neverthrow";
import { WORLD_FRAME } from "../time/timeline";
import { describeSpan } from "./calendar";
import { describeRef, type Ref, refExists, type Story } from "./story";
import {
  refLabel,
  TOUCH_KINDS,
  type UnknownRef,
  whatThisTouches,
} from "./touches";

/** One piece of a record's text that mentions the subject. */
export type Mention = {
  /** The record whose text it is. */
  ref: Ref;
  label: string;
  /** The field the text is in, as the file names it: `summary`, `stakes`. */
  field: string;
  /** The matching text, as written. */
  text: string;
  /** Why it was listed: `names it`, `states its year 17`. */
  how: string;
  /**
   * How closely it states the record: `direct` names it or states its year,
   * `holder` names a drive's holder, and `near` is a span or season in text
   * near an event. Mentions are listed in that order.
   */
  match: MentionMatch;
};

export type MentionMatch = "direct" | "holder" | "near";

const MATCH_ORDER: readonly MentionMatch[] = ["direct", "holder", "near"];

/** A record's free text, field by field. */
export type Text = { ref: Ref; field: string; value: string };

/** What to look for, and the field it came from, which isn't searched for it. */
export type Term = {
  pattern: RegExp;
  how: string;
  match: MentionMatch;
  from?: { ref: Ref; field: string };
};

/**
 * The text in `story` that mentions `ref`: its name or label, a drive's
 * holder by name, and an event's year as the story writes it. For an event,
 * also any span or season ("twenty years ago", "spring") in its own text and
 * the text of records `whatThisTouches` reaches from it, since that text may
 * state when it happened.
 *
 * The names and years looked for are those `was` gives the record, so passing
 * the story from before a change finds text that still states the old
 * version. It defaults to `story`.
 */
export function whatMentions(
  story: Story,
  ref: Ref,
  was: Story = story,
): Result<Mention[], UnknownRef> {
  if (!refExists(story, ref) || !refExists(was, ref)) {
    return err({
      kind: "unknown_ref",
      message: `${describeRef(ref)} does not exist`,
    });
  }
  const texts = storyTexts(story);
  const mentions: Mention[] = [];
  const seen = new Set<string>();
  const add = (text: Text, found: string, how: string, match: MentionMatch) => {
    const key = JSON.stringify([refKey(text.ref), text.field, found, how]);
    if (seen.has(key)) return;
    seen.add(key);
    mentions.push({
      ref: text.ref,
      label: refLabel(story, text.ref),
      field: text.field,
      text: found,
      how,
      match,
    });
  };

  for (const term of terms(was, ref)) {
    for (const text of texts) {
      const { from } = term;
      if (
        from !== undefined &&
        refKey(from.ref) === refKey(text.ref) &&
        from.field === text.field
      ) {
        continue;
      }
      for (const found of text.value.match(term.pattern) ?? []) {
        add(text, found, term.how, term.match);
      }
    }
  }

  if (ref.kind === "event") {
    const touched = whatThisTouches(story, ref).map((t) =>
      [t.direct, t.further].flatMap((groups) =>
        TOUCH_KINDS.flatMap((kind) => groups[kind].map((touch) => touch.ref)),
      ),
    );
    const near = new Set([ref, ...touched.unwrapOr([])].map((r) => refKey(r)));
    for (const text of texts) {
      if (!near.has(refKey(text.ref))) continue;
      for (const found of text.value.match(TIME_PHRASE) ?? []) {
        add(text, found, "may state when this happened", "near");
      }
    }
  }

  return ok(sortedByMatch(texts, mentions));
}

const refKey = (ref: Ref) =>
  JSON.stringify([
    ref.kind,
    ref.kind === "candidate" ? ref.questionId : "",
    ref.id,
  ]);

/**
 * Closest matches first (`MATCH_ORDER`), so a list cut short keeps the text
 * that states the record itself; within each, in the order `storyTexts`
 * lists records and fields.
 */
function sortedByMatch(texts: readonly Text[], mentions: Mention[]): Mention[] {
  const order = new Map(
    texts.map((text, i) => [JSON.stringify([refKey(text.ref), text.field]), i]),
  );
  const rank = (m: Mention) =>
    order.get(JSON.stringify([refKey(m.ref), m.field])) ?? 0;
  return mentions
    .map((mention, i) => ({ mention, i }))
    .sort(
      (a, b) =>
        MATCH_ORDER.indexOf(a.mention.match) -
          MATCH_ORDER.indexOf(b.mention.match) ||
        rank(a.mention) - rank(b.mention) ||
        a.i - b.i,
    )
    .map(({ mention }) => mention);
}

/** Every record's free text, records in `TOUCH_KINDS` order. */
export function storyTexts(story: Story): Text[] {
  const texts: Text[] = [];
  const add = (ref: Ref, fields: Record<string, string>) => {
    for (const [field, value] of Object.entries(fields)) {
      if (value.trim() !== "") texts.push({ ref, field, value });
    }
  };
  for (const a of story.actors) {
    add({ kind: "actor", id: a.id }, { name: a.name, notes: a.notes });
  }
  for (const d of story.drives) {
    add(
      { kind: "drive", id: d.id },
      { want: d.want, stakes: d.stakes, method: d.method },
    );
  }
  for (const e of story.timeline.events) {
    add({ kind: "event", id: e.id }, { label: e.label, summary: e.summary });
  }
  for (const s of story.scenes) {
    add({ kind: "scene", id: s.id }, { title: s.title, summary: s.summary });
  }
  for (const f of story.facts)
    add({ kind: "fact", id: f.id }, { text: f.text });
  for (const q of story.readerQuestions) {
    add({ kind: "readerQuestion", id: q.id }, { question: q.question });
  }
  for (const q of story.openQuestions) {
    add(
      { kind: "openQuestion", id: q.id },
      { question: q.question, leftOpen: q.leftOpen ?? "" },
    );
  }
  for (const q of story.openQuestions) {
    for (const c of q.candidates) {
      add(
        { kind: "candidate", questionId: q.id, id: c.id },
        { answer: c.answer, rejected: c.rejected ?? "" },
      );
    }
  }
  for (const v of story.versions) {
    add({ kind: "version", id: v.id }, { text: v.text });
  }
  for (const o of story.objects) {
    add({ kind: "object", id: o.id }, { name: o.name, notes: o.notes });
  }
  for (const c of story.counts) {
    add(
      { kind: "count", id: c.id },
      {
        label: c.label,
        notes: c.notes,
        ...Object.fromEntries(
          c.values.map(({ at, note }) => [`note at ${at}`, note]),
        ),
      },
    );
  }
  for (const d of story.drives) {
    add(
      { kind: "drive", id: d.id },
      Object.fromEntries(
        d.turns.map((turn, i) => [`turn ${i + 1} note`, turn.note]),
      ),
    );
  }
  return texts;
}

/** The field that names a record, and its text. */
function nameOf(story: Story, ref: Ref): { field: string; value: string } {
  const find = <T extends { id: string }>(items: readonly T[]) =>
    items.find((item) => item.id === ref.id);
  switch (ref.kind) {
    case "actor":
      return { field: "name", value: find(story.actors)?.name ?? "" };
    case "drive":
      return { field: "want", value: find(story.drives)?.want ?? "" };
    case "fact":
      return { field: "text", value: find(story.facts)?.text ?? "" };
    case "readerQuestion":
      return {
        field: "question",
        value: find(story.readerQuestions)?.question ?? "",
      };
    case "event":
      return {
        field: "label",
        value: find(story.timeline.events)?.label ?? "",
      };
    case "scene":
      return { field: "title", value: find(story.scenes)?.title ?? "" };
    case "openQuestion":
      return {
        field: "question",
        value: find(story.openQuestions)?.question ?? "",
      };
    case "version":
      return { field: "text", value: find(story.versions)?.text ?? "" };
    // Knowledge has no text of its own to look for.
    case "knowledge":
      return { field: "", value: "" };
    case "object":
      return { field: "name", value: find(story.objects)?.name ?? "" };
    case "count":
      return { field: "label", value: find(story.counts)?.label ?? "" };
    case "candidate":
      return {
        field: "answer",
        value:
          story.openQuestions
            .find((q) => q.id === ref.questionId)
            ?.candidates.find((c) => c.id === ref.id)?.answer ?? "",
      };
  }
}

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `text` as a whole word or phrase, in any case. */
const wordsPattern = (text: string) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped(text.trim())}(?![\\p{L}\\p{N}])`,
    "giu",
  );

/** A number as written, not part of a longer one: 17 but not 117 or 17.5. */
const numberPattern = (value: number) =>
  new RegExp(`(?<![\\d.])${escaped(String(value))}(?!\\d|\\.\\d)`, "g");

/** What names `ref` in `story`. */
export function terms(story: Story, ref: Ref): Term[] {
  const name = nameOf(story, ref);
  const found: Term[] = [];
  if (name.value.trim() !== "") {
    found.push({
      pattern: wordsPattern(name.value),
      how: "names it",
      match: "direct",
      from: { ref, field: name.field },
    });
  }
  if (ref.kind === "drive") {
    const holder = story.drives.find((d) => d.id === ref.id)?.actorId;
    const actor = story.actors.find((a) => a.id === holder);
    if (actor !== undefined && actor.name.trim() !== "") {
      found.push({
        pattern: wordsPattern(actor.name),
        how: `names its holder ${actor.name}`,
        match: "holder",
        from: { ref: { kind: "actor", id: actor.id }, field: "name" },
      });
    }
  }
  if (ref.kind === "event") {
    const position = story.timeline.positions.find(
      (p) => p.event === ref.id && p.frame === WORLD_FRAME,
    );
    // A date is stored as a fractional year, and text states its year: a
    // range's end is exclusive, so a range ending at a new year is in the last.
    const years =
      position === undefined
        ? []
        : describeSpan(position) !== undefined
          ? [Math.floor(position.start)]
          : Number.isInteger(position.start) && Number.isInteger(position.end)
            ? [...new Set([position.start, position.end])]
            : [
                ...new Set([
                  Math.floor(position.start),
                  Math.ceil(position.end) - 1,
                ]),
              ];
    for (const year of years) {
      found.push({
        pattern: numberPattern(year),
        how: `states its ${story.timeline.worldUnit} ${year}`,
        match: "direct",
      });
    }
  }
  if (ref.kind === "count") {
    const count = story.counts.find((c) => c.id === ref.id);
    for (const value of new Set(count?.values.map((v) => v.value))) {
      found.push({
        pattern: numberPattern(value),
        how: `states its value ${value}`,
        match: "direct",
      });
    }
  }
  return found;
}

const COUNT =
  "(?:\\d+(?:\\.\\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|few|several|many|some|half)";
const UNIT =
  "(?:years?|months?|weeks?|days?|nights?|hours?|decades?|generations?|centur(?:y|ies)|seasons?|winters?|summers?|springs?|autumns?)";
const TAIL =
  "(?:\\s+(?:ago|later|earlier|before|after|since|on|old|dead|gone|back|away))?";

/**
 * Text that states a span or a season: "twenty years ago", "three years
 * dead", "months", "spring", "the following winter".
 */
export const TIME_PHRASE = new RegExp(
  [
    `\\b(?:${COUNT}[\\s-]+){1,3}${UNIT}${TAIL}\\b`,
    `\\b(?:last|next|that|this|the same|the following|the previous|the next) (?:year|month|week|season|spring|summer|autumn|winter)\\b`,
    `\\b(?:years|months|weeks|decades|generations|centuries|seasons)${TAIL}\\b`,
    "\\b(?:spring|summer|autumn|winter|midwinter|midsummer)\\b",
    "\\blong ago\\b",
  ].join("|"),
  "gi",
);
