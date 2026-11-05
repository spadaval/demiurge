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
import { describeSpan, isYear } from "./calendar";
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
 * version. It defaults to `story`. With `approximate`, a count's values are
 * also looked for rounded (`terms`).
 */
export function whatMentions(
  story: Story,
  ref: Ref,
  was: Story = story,
  approximate = false,
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

  for (const term of terms(was, ref, approximate)) {
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

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

/**
 * A whole number from 0 to 999,999 in English words, as a regular
 * expression: `five hundred (and) forty`, `twenty-six`, `a thousand`, and
 * `fourteen hundred (and) sixty` beside `one thousand four hundred …`.
 */
function numberWords(n: number): string {
  const and = "(?:,?\\s+and)?\\s+";
  const under100 = (x: number) =>
    x < 20
      ? (ONES[x] ?? "")
      : `${TENS[Math.floor(x / 10)] ?? ""}${x % 10 === 0 ? "" : `[\\s-]${ONES[x % 10] ?? ""}`}`;
  const lead = (x: number) => (x === 1 ? "(?:a|one)" : under100(x));
  const under1000 = (x: number): string => {
    if (x < 100) return under100(x);
    const rest = x % 100;
    return `${lead(Math.floor(x / 100))}\\s+hundred${rest === 0 ? "" : `${and}${under100(rest)}`}`;
  };
  if (n < 1000) return under1000(n);
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const big = `${thousands === 1 ? "(?:a|one)" : under1000(thousands)}\\s+thousand${rest === 0 ? "" : `${rest < 100 ? and : ",?\\s+"}${under1000(rest)}`}`;
  // 1100 to 9999 also read as hundreds: "fourteen hundred and sixty".
  const hundreds = Math.floor(n / 100);
  return n < 10000 && hundreds % 10 !== 0
    ? `(?:${big}|${under100(hundreds)}\\s+hundred${n % 100 === 0 ? "" : `${and}${under100(n % 100)}`})`
    : big;
}

/** A number written in words, not part of a longer one. */
const numberWordsPattern = (value: number) =>
  new RegExp(
    `(?<![\\p{L}-])${numberWords(value)}(?![\\p{L}-]|,?\\s+(?:and\\s+)?(?:${[...ONES.slice(1), ...TENS.slice(2), "hundred", "thousand"].join("|")})\\b)`,
    "giu",
  );

/** The text in `text` that states `value`, in digits or words, if any. */
export function statedNumber(text: string, value: number): string | undefined {
  const whole = Number.isInteger(value) && value >= 0 && value < 1e6;
  return (
    text.match(numberPattern(value))?.[0] ??
    (whole ? text.match(numberWordsPattern(value))?.[0] : undefined)
  );
}

/**
 * The round numbers a text might state `value` as ("over five hundred" for
 * 540): it rounded down and to nearest, to each power of ten from 100 up
 * to it. Small values aren't rounded, since "ten" or "twenty" in prose is
 * too common to suggest a count (finding worldcrafter-a6my).
 */
function roundings(value: number): number[] {
  const found = new Set<number>();
  for (let size = 100; size <= Math.abs(value); size *= 10) {
    for (const r of [
      Math.floor(value / size) * size,
      Math.round(value / size) * size,
    ]) {
      if (r !== value && r !== 0) found.add(r);
    }
  }
  return [...found];
}

/**
 * What names `ref` in `story`. With `approximate`, a count's values are also
 * looked for rounded, since text often states a number roughly.
 */
export function terms(story: Story, ref: Ref, approximate = false): Term[] {
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
        : describeSpan(position) !== undefined || isYear(position)
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
      const whole = Number.isInteger(value) && value >= 0 && value < 1e6;
      // "One" or "two" in words is everywhere; look for small values in
      // words only for a value a change took away.
      const inWords = whole && (value >= 10 || (approximate && value >= 2));
      found.push(
        {
          pattern: numberPattern(value),
          how: `states its value ${value}`,
          match: "direct",
        },
        ...(inWords
          ? [
              {
                pattern: numberWordsPattern(value),
                how: `states its value ${value}`,
                match: "direct" as const,
              },
            ]
          : []),
        ...(whole && approximate
          ? roundings(value).flatMap((r) => [
              {
                pattern: numberPattern(r),
                how: `may state its value ${value} roughly`,
                match: "near" as const,
              },
              {
                pattern: numberWordsPattern(r),
                how: `may state its value ${value} roughly`,
                match: "near" as const,
              },
            ])
          : []),
      );
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
