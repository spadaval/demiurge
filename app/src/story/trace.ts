/**
 * What may depend on a record, by meaning as well as by name: a first pass at
 * change tracing (docs/strategies/world-demo.md, Round 0). After a change, the
 * records and scene prose that still state the old version are what need
 * rereading, and many of them don't name it: a paraphrase, a span such as
 * "ten years ago", a consequence through a cause.
 *
 * It suspects and never decides. Each suspect comes with the reasons it was
 * suspected, ranked by how many and how strong, so whoever reads the list (a
 * writer, often an agent) judges what is really stale. Reasons are:
 *
 * - links (`whatThisTouches`): declared links, one step on, and through
 *   causes to what an effect reaches; versions and knowledge of a record and
 *   of its versions; the scenes that touch it (`scenesTouching`);
 * - mentions (`whatMentions`): its name, holder, year, and spans or seasons
 *   near an event;
 * - shared words: free text or prose that shares two or more of the
 *   record's distinctive words, weighted by how rare each is;
 * - prose: for a scene that touches the record, its prose file, and any span
 *   or season in it when the record is an event;
 * - a replaced answer: a scene that reveals an answer the question no longer
 *   has.
 *
 * Nothing here calls a model: the list is cheap, offline and deterministic.
 */

import { err, ok, type Result } from "neverthrow";
import {
  storyTexts,
  type Text,
  TIME_PHRASE,
  terms,
  whatMentions,
} from "./mentions";
import { scenesTouching } from "./scenes";
import {
  describeRef,
  isAnswered,
  type Ref,
  refExists,
  type Story,
} from "./story";
import { TOUCH_KINDS, type UnknownRef, whatThisTouches } from "./touches";

/** A scene's prose, as read from its file. */
export type Prose = { scene: string; text: string };

/** What is suspected: a record (and the field, when the reason is text) or a paragraph of prose. */
export type SuspectTarget =
  | { kind: "record"; ref: Ref }
  | {
      kind: "prose";
      scene: string;
      /** The paragraph's first line, counting from 1; 0 for the whole file. */
      line: number;
      text: string;
    };

export type Suspect = {
  target: SuspectTarget;
  /** Higher is likelier. Only the order means anything. */
  score: number;
  reasons: string[];
  /** Whether a reason is in its text, not only in its links. */
  inText: boolean;
};

const WEIGHT = {
  direct: 3,
  further: 1.5,
  mention: { direct: 3, holder: 2, near: 1 },
  scene: 2,
  replaced: 4,
} as const;

/** Shared words count only from this many. */
const MIN_SHARED = 2;

const STOPWORDS = new Set(
  (
    "about after again against also among because been before being between " +
    "both could does doing down during each even ever from have having into " +
    "just like made make many more most much must never only other over same " +
    "should since some such than that their them then there these they this " +
    "those though through under until upon very want wants were what when " +
    "where which while will with without would your yours"
  ).split(" "),
);

/** A word's stem, crudely: `burned`, `burning` and `burns` are all `burn`. */
function stem(word: string): string {
  for (const suffix of ["ings", "ing", "edly", "ed", "ies", "es", "ly", "s"]) {
    if (word.length - suffix.length >= 4 && word.endsWith(suffix)) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

/** The distinctive word stems of a text: four letters or more, not common words. */
export function contentStems(text: string): Set<string> {
  const words = text.toLowerCase().match(/\p{L}[\p{L}'’]*/gu) ?? [];
  return new Set(
    words
      .map((w) => w.replace(/['’]s?$/, ""))
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
      .map(stem),
  );
}

const refKey = (ref: Ref) =>
  JSON.stringify([
    ref.kind,
    ref.kind === "candidate" ? ref.questionId : "",
    ref.id,
  ]);

const sameRef = (a: Ref, b: Ref) => refKey(a) === refKey(b);

/** The text a record states, from `story`: what dependents would echo. */
function sourceText(story: Story, ref: Ref): string {
  const own = storyTexts(story)
    .filter((t) => sameRef(t.ref, ref))
    .map((t) => t.value);
  switch (ref.kind) {
    case "knowledge": {
      const k = story.knowledge.find((x) => x.id === ref.id);
      return k === undefined ? "" : sourceText(story, k.what);
    }
    case "openQuestion": {
      const q = story.openQuestions.find((x) => x.id === ref.id);
      const chosen = q?.candidates.find((c) => c.id === q.answer);
      return [...own, chosen?.answer ?? ""].join(" ");
    }
    default:
      return own.join(" ");
  }
}

/** A prose file's paragraphs, with the line each starts on. */
function paragraphs(prose: Prose): { line: number; text: string }[] {
  const found: { line: number; text: string }[] = [];
  let start = 0;
  let lines: string[] = [];
  const flush = () => {
    const text = lines.join(" ").trim();
    if (text !== "") found.push({ line: start, text });
    lines = [];
  };
  for (const [i, line] of prose.text.split("\n").entries()) {
    if (line.trim() === "") {
      flush();
      continue;
    }
    if (lines.length === 0) start = i + 1;
    lines.push(line.trim());
  }
  flush();
  return found;
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  hundred: 100,
};

/**
 * When a span such as "ten years since" states the time, in years, between
 * the event and another placed event, the other event and the gap:
 * `10 years between The wreck and The letter arrives`.
 */
function gapStated(
  story: Story,
  event: string,
  phrase: string,
): string | undefined {
  const match = /(\d+(?:\.\d+)?|[a-z]+)[\s-]+years?\b/i.exec(phrase);
  if (match === null) return undefined;
  const word = (match[1] ?? "").toLowerCase();
  const count = Number.isFinite(Number(word))
    ? Number(word)
    : NUMBER_WORDS[word];
  if (count === undefined) return undefined;
  const at = (id: string) =>
    story.timeline.positions.find((p) => p.event === id && p.frame === "world")
      ?.start;
  const here = at(event);
  if (here === undefined) return undefined;
  const label = (id: string) =>
    story.timeline.events.find((e) => e.id === id)?.label ?? id;
  const other = story.timeline.events.find((e) => {
    const there = at(e.id);
    return (
      e.id !== event &&
      there !== undefined &&
      Math.abs(Math.abs(there - here) - count) <= 0.5
    );
  });
  return other === undefined
    ? undefined
    : `${count} years between ${label(event)} and ${label(other.id)}`;
}

const targetKey = (target: SuspectTarget) =>
  target.kind === "record"
    ? `r${refKey(target.ref)}`
    : `p${JSON.stringify([target.scene, target.line])}`;

/**
 * What may depend on `ref`, likeliest first. `prose` is the scene files there
 * are. `was` is the story before a change: then only what the change took
 * away is looked for, the old name or year if those changed and the words the
 * old text had that the new one lacks, since text stating the new version
 * isn't stale. Without it, everything the record states is looked for.
 */
export function traceDependents(
  story: Story,
  ref: Ref,
  { was, prose = [] }: { was?: Story; prose?: readonly Prose[] } = {},
): Result<Suspect[], UnknownRef> {
  const before = was ?? story;
  const termKey = (s: Story) =>
    JSON.stringify(terms(s, ref).map((t) => [t.pattern.source, t.how]));
  const nameChanged = was === undefined || termKey(was) !== termKey(story);
  const position = (s: Story) =>
    JSON.stringify(
      s.timeline.positions.find(
        (p) => p.event === ref.id && p.frame === "world",
      ),
    );
  const moved =
    ref.kind === "event" &&
    was !== undefined &&
    position(was) !== position(story);
  if (!refExists(story, ref)) {
    return err({
      kind: "unknown_ref",
      message: `${describeRef(ref)} does not exist`,
    });
  }
  const suspects = new Map<string, Suspect>();
  const suspect = (
    target: SuspectTarget,
    score: number,
    reason: string,
    inText: boolean,
  ) => {
    if (target.kind === "record" && sameRef(target.ref, ref)) return;
    const key = targetKey(target);
    const found = suspects.get(key);
    if (found === undefined) {
      suspects.set(key, { target, score, reasons: [reason], inText });
    } else if (!found.reasons.includes(reason)) {
      found.score += score;
      found.reasons.push(reason);
      found.inText ||= inText;
    }
  };
  const record = (r: Ref): SuspectTarget => ({ kind: "record", ref: r });

  // Links, and one step on.
  const touched = whatThisTouches(story, ref);
  if (touched.isOk()) {
    for (const kind of TOUCH_KINDS) {
      for (const t of touched.value.direct[kind]) {
        suspect(
          record(t.ref),
          WEIGHT.direct,
          `linked: ${t.how.join("; ")}`,
          false,
        );
      }
      for (const t of touched.value.further[kind]) {
        suspect(
          record(t.ref),
          WEIGHT.further,
          `one step on: ${t.how.join("; ")}`,
          false,
        );
      }
    }
  }
  // Knowledge of an event's versions depends on the event too.
  if (ref.kind === "event") {
    for (const v of story.versions.filter((x) => x.event === ref.id)) {
      for (const k of story.knowledge) {
        if (k.what.kind === "version" && k.what.id === v.id) {
          suspect(
            record({ kind: "knowledge", id: k.id }),
            WEIGHT.direct,
            `knowledge of its version ${v.id}`,
            false,
          );
        }
      }
    }
  }

  // Names, holders, years and spans in free text.
  const mentioned = nameChanged
    ? whatMentions(story, ref, before).unwrapOr([])
    : [];
  for (const m of mentioned) {
    suspect(
      record(m.ref),
      WEIGHT.mention[m.match],
      `${m.field} "${m.text}" ${m.how}`,
      true,
    );
  }

  // Shared distinctive words, in free text and prose.
  const texts: { target: SuspectTarget; field: string; value: string }[] = [
    ...storyTexts(story)
      .filter((t: Text) => !sameRef(t.ref, ref))
      .map((t) => ({ target: record(t.ref), field: t.field, value: t.value })),
    ...prose.flatMap((p) =>
      paragraphs(p).map((para) => ({
        target: {
          kind: "prose" as const,
          scene: p.scene,
          line: para.line,
          text: para.text,
        },
        field: "prose",
        value: para.text,
      })),
    ),
  ];
  const now = contentStems(sourceText(story, ref));
  const source = new Set(
    [...contentStems(sourceText(before, ref))].filter(
      // Text about a moved event may imply its time in any of its words.
      (s) => was === undefined || moved || !now.has(s),
    ),
  );
  const stemsOf = texts.map((t) => contentStems(t.value));
  const documents = new Map<string, number>();
  for (const stems of stemsOf) {
    for (const s of stems) documents.set(s, (documents.get(s) ?? 0) + 1);
  }
  const rarity = (s: string) =>
    Math.log((texts.length + 1) / ((documents.get(s) ?? 0) + 1)) + 1;
  for (const [i, t] of texts.entries()) {
    const shared = [...(stemsOf[i] ?? [])].filter((s) => source.has(s));
    if (shared.length < MIN_SHARED) continue;
    const score = shared.reduce((sum, s) => sum + rarity(s), 0) / 2;
    suspect(
      t.target,
      score,
      `${t.field} shares words: ${shared.sort().join(", ")}`,
      true,
    );
  }

  // Prose: names and years as `mentions` looks for them, and the scenes that
  // touch the record, with any span in them for an event.
  const lookFor = nameChanged ? terms(before, ref) : [];
  const touching = new Map(
    scenesTouching(story, ref)
      .unwrapOr([])
      .map(({ scene, how }) => [scene.id, how]),
  );
  for (const p of prose) {
    const how = touching.get(p.scene);
    if (how !== undefined) {
      suspect(
        { kind: "prose", scene: p.scene, line: 0, text: "" },
        WEIGHT.scene,
        `the scene ${how.join("; ")}`,
        true,
      );
    }
    for (const para of paragraphs(p)) {
      const target: SuspectTarget = {
        kind: "prose",
        scene: p.scene,
        line: para.line,
        text: para.text,
      };
      for (const term of lookFor) {
        for (const found of para.text.match(term.pattern) ?? []) {
          suspect(
            target,
            WEIGHT.mention[term.match],
            `"${found}" ${term.how}`,
            true,
          );
        }
      }
      // A span is stale only if the event moved.
      if (
        ref.kind === "event" &&
        how !== undefined &&
        (was === undefined || moved)
      ) {
        for (const found of para.text.match(TIME_PHRASE) ?? []) {
          const gap = gapStated(before, ref.id, found);
          suspect(
            target,
            gap === undefined ? WEIGHT.mention.near : WEIGHT.mention.direct,
            gap === undefined
              ? `"${found}" may state when this happened`
              : `"${found}" matches the ${gap}`,
            true,
          );
        }
      }
    }
  }

  // A scene that reveals an answer the question no longer has.
  const questionId =
    ref.kind === "openQuestion"
      ? ref.id
      : ref.kind === "candidate"
        ? ref.questionId
        : undefined;
  const question = story.openQuestions.find((q) => q.id === questionId);
  if (question !== undefined) {
    const replaced = (question.superseded ?? [])
      .map((old) => old.candidate)
      .filter((id) => !(isAnswered(question) && id === question.answer));
    for (const scene of story.scenes) {
      for (const linked of scene.reveals) {
        if (
          linked.kind === "candidate" &&
          linked.questionId === question.id &&
          replaced.includes(linked.id)
        ) {
          suspect(
            record({ kind: "scene", id: scene.id }),
            WEIGHT.replaced,
            `reveals ${linked.id}, an answer since replaced`,
            true,
          );
          if (prose.some((p) => p.scene === scene.id)) {
            suspect(
              { kind: "prose", scene: scene.id, line: 0, text: "" },
              WEIGHT.replaced,
              `the scene reveals ${linked.id}, an answer since replaced`,
              true,
            );
          }
        }
      }
    }
  }

  return ok(
    [...suspects.values()].sort(
      (a, b) =>
        b.score - a.score ||
        targetKey(a.target).localeCompare(targetKey(b.target)),
    ),
  );
}
