/**
 * Writer notes: `[[ like this ]]`, typed into the prose in Fountain's note
 * syntax. They stay literal text in the content tree (they are the writer's
 * own words, and an export keeps them), the workspace paints them as
 * apparatus, and the `prose` projection cuts them so a model never reads
 * them. Both use `writerNotes`, so what the writer sees as a note is exactly
 * what the model doesn't get.
 *
 * A note opens with `[[` and runs to the first `]]` with no `]` between.
 * Brackets that never close are prose, so a stray `[[` costs the model
 * nothing more than the characters themselves.
 */

/** `[start, end)` within a block's text. */
export type TextRange = { start: number; end: number };

/** The writer notes in `text`, brackets included, with each note's trimmed words. */
export function writerNotes(text: string): (TextRange & { note: string })[] {
  const found: (TextRange & { note: string })[] = [];
  for (const match of text.matchAll(/\[\[([^\]]*)\]\]/g)) {
    const start = match.index;
    found.push({
      start,
      end: start + match[0].length,
      note: (match[1] ?? "").trim(),
    });
  }
  return found;
}

/**
 * The ranges of `text` to cut so it reads as if its notes were never typed:
 * each note, and the whitespace that would otherwise double up around it.
 * Sorted and disjoint.
 *
 * - Between words, the whitespace before the note goes: `a [[x]] b` → `a b`.
 * - At the end of the text, so does the whitespace before: `a. [[x]]` → `a.`.
 * - With nothing kept before it, the whitespace on both sides goes:
 *   `[[x]] a` → `a`.
 * - Against a word, only the note goes: `a [[x]]b` → `a b`, `a[[x]]b` → `ab`.
 */
export function writerNoteCuts(text: string): TextRange[] {
  // Notes with only whitespace between them are cut as one.
  const groups: TextRange[] = [];
  for (const { start, end } of writerNotes(text)) {
    const last = groups.at(-1);
    if (last && /^\s*$/.test(text.slice(last.end, start))) last.end = end;
    else groups.push({ start, end });
  }

  const cuts: TextRange[] = [];
  const isSpace = (at: number) => /\s/.test(text.charAt(at));
  for (const group of groups) {
    let before = group.start;
    while (before > 0 && isSpace(before - 1)) before--;
    let after = group.end;
    while (after < text.length && isSpace(after)) after++;

    // Text before a group never ends in a note, so `before` is never inside
    // an earlier cut; the kept text before it is all text after that cut.
    const keptBefore = cuts.length > 0 || /\S/.test(text.slice(0, before));
    if (!keptBefore) cuts.push({ start: before, end: after });
    else if (after > group.end || group.end === text.length) {
      cuts.push({ start: before, end: group.end });
    } else cuts.push({ start: group.start, end: group.end });
  }
  return cuts;
}
