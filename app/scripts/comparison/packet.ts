/**
 * Writes one run up as a packet for the blind reading. Both arms go through
 * exactly the same layout: the step-1 sketch as readable text, each rework as
 * a line diff of the readable text with the session's own note, then the
 * scene. Nothing is truncated.
 */

import { wordCount } from "../../src/story/render";

export type PacketInputs = {
  premiseTitle: string;
  /** For example "Thukker, pair 1, packet A". */
  label: string;
  /** The readable text after steps 1, 2 and 3; undefined if missing. */
  readable: Record<1 | 2 | 3, string | undefined>;
  /** Line diffs of the readable text: step 1 to 2, and 2 to 3. */
  diffs: Record<2 | 3, string | undefined>;
  notes: Record<2 | 3, string | undefined>;
  scene: string | undefined;
};

export const SECTION_TITLES = [
  "1. The sketch",
  "2. First rework: a core motivation",
  "3. Second rework: an event moved in time",
  "4. The scene",
] as const;

const MISSING = "_(Missing: this step didn't produce it.)_";

/** Pushes the text's own Markdown headings below the packet's. */
function demote(text: string): string {
  return text.replace(/^(#{1,4}) /gm, "##$1 ");
}

function fenced(text: string, lang: string): string {
  const longest = Math.max(
    0,
    ...[...text.matchAll(/`+/g)].map((m) => m[0].length),
  );
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}${lang}\n${text.replace(/\n$/, "")}\n${fence}`;
}

const words = (text: string) => `_(${wordCount(text)} words)_`;

function rework(
  title: string,
  note: string | undefined,
  diff: string | undefined,
  after: string | undefined,
): string[] {
  return [
    `## ${title}`,
    "",
    "What the session said it changed:",
    "",
    note === undefined || note.trim() === ""
      ? MISSING
      : note
          .trim()
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n"),
    "",
    "The readable text, before and after (`-` removed, `+` added):",
    "",
    diff === undefined
      ? MISSING
      : diff.trim() === ""
        ? "_(No change to the readable text.)_"
        : fenced(diff, "diff"),
    "",
    after === undefined ? "" : `Length after this rework: ${words(after)}`,
    "",
  ];
}

export function packetMarkdown(p: PacketInputs): string {
  const sketch = p.readable[1];
  const lines = [
    `# ${p.label}`,
    "",
    `Premise: ${p.premiseTitle}`,
    "",
    `## ${SECTION_TITLES[0]}`,
    "",
    sketch === undefined
      ? MISSING
      : `${demote(sketch.trim())}\n\n${words(sketch)}`,
    "",
    ...rework(SECTION_TITLES[1], p.notes[2], p.diffs[2], p.readable[2]),
    ...rework(SECTION_TITLES[2], p.notes[3], p.diffs[3], p.readable[3]),
    `## ${SECTION_TITLES[3]}`,
    "",
    p.scene === undefined || p.scene.trim() === ""
      ? MISSING
      : `${demote(p.scene.trim())}\n\n${words(p.scene)}`,
    "",
  ];
  return lines.join("\n");
}

/**
 * The hunks of a `git diff --no-index` between two texts, without the header
 * lines that name the files.
 */
export function diffHunks(gitDiff: string): string {
  const start = gitDiff.search(/^@@/m);
  return start === -1 ? "" : gitDiff.slice(start);
}
