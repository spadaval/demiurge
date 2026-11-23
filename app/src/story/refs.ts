/**
 * Refs as text, as the CLI and the story tools write them: `drive:shut`,
 * `candidate:why/ferryman`. Also the short descriptions of a ref that the
 * read queries print.
 */

import { err, ok, type Result } from "neverthrow";
import {
  type GapKind,
  type Ref,
  type RefKind,
  refExists,
  type Story,
} from "./story";
import { refLabel } from "./touches";

export const KIND_NAMES: Record<Ref["kind"], string> = {
  actor: "actor",
  drive: "drive",
  fact: "fact",
  readerQuestion: "reader-question",
  event: "event",
  scene: "scene",
  openQuestion: "open-question",
  candidate: "candidate",
  version: "version",
  knowledge: "knowledge",
  object: "object",
  count: "count",
};

const REF_KIND_BY_NAME = new Map(
  Object.entries(KIND_NAMES).map(([kind, name]) => [name, kind]),
);

const isRefKind = (kind: string | undefined): kind is RefKind =>
  kind !== undefined && kind !== "candidate" && kind in KIND_NAMES;

export function formatRef(ref: Ref): string {
  const name = KIND_NAMES[ref.kind];
  return ref.kind === "candidate"
    ? `${name}:${ref.questionId}/${ref.id}`
    : `${name}:${ref.id}`;
}

export function parseRef(text: string): Result<Ref, string> {
  const colon = text.indexOf(":");
  const kind = REF_KIND_BY_NAME.get(text.slice(0, colon));
  const id = text.slice(colon + 1);
  if (colon === -1 || kind === undefined || id === "") {
    return err(
      `"${text}" is not a ref: write kind:id, with kind one of ${Object.values(KIND_NAMES).join(", ")} (a candidate is candidate:question/candidate)`,
    );
  }
  if (kind === "candidate") {
    const slash = id.indexOf("/");
    return slash <= 0 || slash === id.length - 1
      ? err(
          `"${text}" is not a candidate ref: write candidate:question/candidate`,
        )
      : ok({
          kind: "candidate",
          questionId: id.slice(0, slash),
          id: id.slice(slash + 1),
        });
  }
  return isRefKind(kind) ? ok({ kind, id }) : err(`unknown kind in "${text}"`);
}

// ---------------------------------------------------------------------------

/** `drive_without_origin` as refs and the CLI write it: `drive-without-origin`. */
export const gapName = (kind: GapKind) => kind.replaceAll("_", "-");

/** `drive:find-sender ("Learn who wrote the letter")`. */
export function describe(story: Story, ref: Ref): string {
  if (!refExists(story, ref)) return `${formatRef(ref)} (missing)`;
  const label = refLabel(story, ref);
  return label === ref.id ? formatRef(ref) : `${formatRef(ref)} ("${label}")`;
}

const EXCERPT_LENGTH = 60;

/** The text cut to a short excerpt, with `…` when it was cut. */
export const excerpt = (text: string) =>
  text.length <= EXCERPT_LENGTH
    ? text
    : `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…`;

/** A ref with its label cut short: `fact:reef ("Nobody fishes the…")`. */
export function shortDescribe(story: Story, ref: Ref): string {
  const label = refLabel(story, ref);
  return label === ref.id
    ? formatRef(ref)
    : `${formatRef(ref)} ("${excerpt(label)}")`;
}
