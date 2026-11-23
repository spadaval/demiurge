import {
  createHashHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
  redirect,
} from "@tanstack/react-router";
import type { Workspace } from "~/workspace/workspace";
import { ModelSettingsPage } from "./model-settings";
import { DocumentPage, HomePage } from "./pages";
import { Shell } from "./shell";
import { tabRoute } from "./tab-routes";
import { ClosedTopicsPage, InboxPage, TopicPage } from "./topics";

interface RouterContext {
  readonly workspace: Workspace;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Shell,
});

/** With no document in the URL, return to the last active tab, if any. */
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: ({ context }) => {
    const active = context.workspace.tabs.get().active;
    if (active) throw redirect(tabRoute(active));
  },
  component: HomePage,
});

/** The active tab is the document in the URL. */
export const documentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/doc/$documentId",
  component: DocumentPage,
});

/** A talk page. */
const topicRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/topic/$topicId",
  component: TopicPage,
});

/** The World inbox. */
const inboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inbox",
  component: InboxPage,
});

/** Resolved and archived topics. */
const closedTopicsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/topics/closed",
  component: ClosedTopicsPage,
});

/** The world's model settings. */
const modelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/model",
  component: ModelSettingsPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  documentRoute,
  topicRoute,
  inboxRoute,
  closedTopicsRoute,
  modelRoute,
]);

export function createAppRouter(
  workspace: Workspace,
  history: RouterHistory = createHashHistory(),
) {
  return createRouter({ routeTree, history, context: { workspace } });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
