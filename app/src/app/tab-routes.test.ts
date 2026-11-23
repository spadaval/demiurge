import { expect, test } from "bun:test";
import {
  CLOSED_TOPICS_TAB,
  INBOX_TAB,
  tabOfPath,
  tabRoute,
  topicOfTab,
  topicTab,
} from "./tab-routes";

test("each kind of tab has a route, and each route path names its tab", () => {
  expect(tabRoute("doc1")).toEqual({
    to: "/doc/$documentId",
    params: { documentId: "doc1" },
  });
  expect(tabRoute(topicTab("t1"))).toEqual({
    to: "/topic/$topicId",
    params: { topicId: "t1" },
  });
  expect(tabRoute(INBOX_TAB)).toEqual({ to: "/inbox" });
  expect(tabRoute(CLOSED_TOPICS_TAB)).toEqual({ to: "/topics/closed" });

  expect(tabOfPath("/doc/doc1")).toBe("doc1");
  expect(tabOfPath("/topic/t%201")).toBe(topicTab("t 1"));
  expect(tabOfPath("/inbox")).toBe(INBOX_TAB);
  expect(tabOfPath("/topics/closed")).toBe(CLOSED_TOPICS_TAB);
  expect(tabOfPath("/")).toBeNull();
  expect(tabOfPath("/model")).toBeNull();

  expect(topicOfTab(topicTab("t1"))).toBe("t1");
  expect(topicOfTab(INBOX_TAB)).toBeNull();
  expect(topicOfTab("doc1")).toBeNull();
});
