/**
 * Generation's keyboard shortcuts, in the open document (prose and request
 * slip):
 *
 * - Mod+Enter generates: it opens the request for what comes next, and with
 *   that request open, sends it (edits included). So pressing it twice
 *   generates.
 * - Escape stops the running generation, keeping what arrived.
 * - Mod+Shift+Enter accepts the AI text holding the caret.
 *
 * Mod is Ctrl, or Cmd on a Mac; either is taken anywhere. None of them is an
 * editing key in the editor (Enter alone splits a block, Shift+Enter breaks
 * a line), so they never reach a generating segment as an edit.
 */

export type GenerationShortcut = "generate" | "stop" | "accept";

/** The parts of a keyboard event a shortcut is read from. */
export interface KeyPress {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  /** Mid-composition (an IME), keys belong to the composition. */
  readonly isComposing?: boolean;
}

export function shortcutOf(press: KeyPress): GenerationShortcut | null {
  if (press.isComposing || press.altKey) return null;
  const mod = press.ctrlKey || press.metaKey;
  if (press.key === "Enter" && mod) {
    return press.shiftKey ? "accept" : "generate";
  }
  if (press.key === "Escape" && !mod && !press.shiftKey) return "stop";
  return null;
}

/** `aria-keyshortcuts` values (WAI-ARIA names), for the controls they press. */
export const ARIA_SHORTCUTS: Readonly<Record<GenerationShortcut, string>> = {
  generate: "Control+Enter Meta+Enter",
  stop: "Escape",
  accept: "Control+Shift+Enter Meta+Shift+Enter",
};

const isMac = (): boolean =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** How a shortcut is written for the writer, on this platform. */
export function shortcutLabel(
  shortcut: GenerationShortcut,
  mac: boolean = isMac(),
): string {
  const mod = mac ? "⌘" : "Ctrl+";
  switch (shortcut) {
    case "generate":
      return `${mod}Enter`;
    case "stop":
      return "Esc";
    case "accept":
      return mac ? "⇧⌘Enter" : "Ctrl+Shift+Enter";
  }
}
