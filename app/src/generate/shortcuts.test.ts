import { describe, expect, test } from "bun:test";
import { type KeyPress, shortcutLabel, shortcutOf } from "./shortcuts";

const press = (key: string, mods: Partial<KeyPress> = {}): KeyPress => ({
  key,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe("generation shortcuts", () => {
  test("Mod+Enter generates, with Ctrl or Cmd", () => {
    expect(shortcutOf(press("Enter", { ctrlKey: true }))).toBe("generate");
    expect(shortcutOf(press("Enter", { metaKey: true }))).toBe("generate");
  });

  test("Mod+Shift+Enter accepts", () => {
    expect(shortcutOf(press("Enter", { ctrlKey: true, shiftKey: true }))).toBe(
      "accept",
    );
    expect(shortcutOf(press("Enter", { metaKey: true, shiftKey: true }))).toBe(
      "accept",
    );
  });

  test("Escape stops", () => {
    expect(shortcutOf(press("Escape"))).toBe("stop");
  });

  test("editing keys and other chords are left to the editor", () => {
    for (const key of [
      press("Enter"),
      press("Enter", { shiftKey: true }),
      press("Enter", { ctrlKey: true, altKey: true }),
      press("Escape", { shiftKey: true }),
      press("Escape", { ctrlKey: true }),
      press("e", { ctrlKey: true }),
      press("Enter", { ctrlKey: true, isComposing: true }),
    ]) {
      expect(shortcutOf(key)).toBeNull();
    }
  });

  test("labels follow the platform", () => {
    expect(shortcutLabel("generate", false)).toBe("Ctrl+Enter");
    expect(shortcutLabel("generate", true)).toBe("⌘Enter");
    expect(shortcutLabel("accept", false)).toBe("Ctrl+Shift+Enter");
    expect(shortcutLabel("accept", true)).toBe("⇧⌘Enter");
    expect(shortcutLabel("stop", true)).toBe("Esc");
  });
});
