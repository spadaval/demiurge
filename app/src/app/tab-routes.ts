/**
 * Where each kind of tab lives in the URL, both ways: a document's tab is
 * `/doc/<id>`, and a sheet's tab (`workspace/tabs.ts`) is its own route.
 */

import { useRouterState } from "@tanstack/react-router";
import { sheetName, sheetTab } from "~/workspace/tabs";

export const INBOX_TAB = sheetTab("inbox");
export const CLOSED_TOPICS_TAB = sheetTab("topics/closed");
export const topicTab = (topicId: string) => sheetTab(`topic/${topicId}`);

/** The topic a tab holds, if it holds one. */
export function topicOfTab(tab: string): string | null {
  const name = sheetName(tab);
  return name?.startsWith("topic/") ? name.slice("topic/".length) : null;
}

/** A tab's route, as `navigate` and `redirect` take it. */
export function tabRoute(tab: string) {
  const topicId = topicOfTab(tab);
  if (topicId !== null) {
    return { to: "/topic/$topicId", params: { topicId } } as const;
  }
  if (tab === INBOX_TAB) return { to: "/inbox" } as const;
  if (tab === CLOSED_TOPICS_TAB) return { to: "/topics/closed" } as const;
  return { to: "/doc/$documentId", params: { documentId: tab } } as const;
}

/** The tab of a path, or null for a path that isn't one (`/`, `/model`). */
export function tabOfPath(path: string): string | null {
  const [, first, second] = path.split("/").map(decodeURIComponent);
  if (first === "doc" && second) return second;
  if (first === "topic" && second) return topicTab(second);
  if (first === "inbox") return INBOX_TAB;
  if (first === "topics" && second === "closed") return CLOSED_TOPICS_TAB;
  return null;
}

/** The tab the URL shows. */
export const useActiveTab = (): string | null =>
  useRouterState({ select: (state) => tabOfPath(state.location.pathname) });
