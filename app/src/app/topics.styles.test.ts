/**
 * The Topics styles as the stylesheet sets them. Component tests render
 * without `styles.css`, so this loads it into happy-dom and checks the rules
 * the topic surfaces depend on: the active topic's bar in the rail, inset
 * rail actions, and turns set as a record rather than a numbered list.
 */

import { afterAll, beforeAll, expect, test } from "bun:test";

const css = await Bun.file(new URL("./styles.css", import.meta.url)).text();
let style: HTMLStyleElement;

beforeAll(() => {
  style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);
});

afterAll(() => style.remove());

/** The declarations of the style rule whose selector is exactly `selector`. */
function rule(selector: string): CSSStyleDeclaration | undefined {
  const sheet = style.sheet;
  if (!sheet) return undefined;
  for (const r of [...sheet.cssRules]) {
    if (r instanceof CSSStyleRule && r.selectorText === selector) {
      return r.style;
    }
  }
  return undefined;
}

function element(tag: string, className: string, parent = document.body) {
  const node = document.createElement(tag);
  node.className = className;
  parent.append(node);
  return node;
}

test("the active topic in the rail carries the 3px bar", () => {
  const bar = rule('.topic-row[aria-current="page"]::before');
  expect(bar?.getPropertyValue("width")).toBe("3px");
  expect(bar?.getPropertyValue("background")).toContain("var(--ink)");
  expect(bar?.getPropertyValue("position")).toBe("absolute");
  expect(rule(".topic-row")?.getPropertyValue("position")).toBe("relative");
});

test("the rail's topic rows, counts and actions keep their settings", () => {
  const more = element("p", "rail-more");
  expect(getComputedStyle(more).paddingLeft).toBe("20px");
  expect(getComputedStyle(more).marginTop).toBe("6px");
  expect(rule(".rail-count")?.getPropertyValue("font-variant-numeric")).toBe(
    "tabular-nums",
  );
  expect(rule(".rail-foot-link")).toBeDefined();
  expect(rule(".topic-title")?.getPropertyValue("font-size")).toBe("14px");
  more.remove();
});

test("turns are a record: no numbers and no indent", () => {
  const turns = element("ol", "turns");
  const computed = getComputedStyle(turns);
  // happy-dom doesn't compute the list-style shorthand; read the rule.
  expect(rule(".turns")?.getPropertyValue("list-style")).toBe("none");
  expect(computed.paddingLeft).toBe("0px");
  expect(computed.marginTop).toBe("0px");
  turns.remove();
});
