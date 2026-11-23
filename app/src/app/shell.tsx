import {
  Link,
  Outlet,
  useNavigate,
  useParams,
  useRouterState,
} from "@tanstack/react-router";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { textBlocks } from "~/editor/layer-plugin";
import {
  ARIA_SHORTCUTS,
  shortcutLabel,
  shortcutOf,
} from "~/generate/shortcuts";
import { bibleScene } from "~/layers/bible";
import { LAYER_LABELS, LAYERS, layersForScene, mentions } from "~/layers/model";
import { createStore } from "~/workspace/store";
import { isSheetTab } from "~/workspace/tabs";
import type { CommandError } from "~/workspace/workspace";
import { KIND_DEFINITIONS } from "~/world/kinds";
import { describeCommandError, describeReadOnly } from "./environment";
import { useEnvironment, useServices, useStore, useWorkspace } from "./hooks";
import { worldTabTitle } from "./inspector";
import { parseAt } from "./inspector-model";
import { formatStoryTime } from "./manuscript";
import { Rail } from "./rail";
import {
  CLOSED_TOPICS_TAB,
  INBOX_TAB,
  tabRoute,
  topicOfTab,
  useActiveTab,
} from "./tab-routes";
import { entryNames } from "./world";

/** A message for the writer: an error, or a note about what isn't built yet. */
type Message =
  | { readonly kind: "error"; readonly error: CommandError }
  | { readonly kind: "info"; readonly text: string };

/**
 * The workspace frame, to the Night Edition direction
 * (.impeccable/surfaces/writing-workspace.md): a 300px left rail, a 56px
 * header with the tab strip, story-time stamp, layer toggles and generation
 * controls, and the page (prose column plus gloss column).
 */
export function Shell() {
  const [message, setMessage] = useState<Message | null>(null);
  // Narrow screens only: the rail opens over the page.
  const [railOpen, setRailOpen] = useState(false);
  const active = useActiveDocumentId();
  // Any navigation (a document, an inspector view or record) closes it.
  const href = useRouterState({ select: (router) => router.location.href });
  // biome-ignore lint/correctness/useExhaustiveDependencies: following a link closes the rail
  useEffect(() => setRailOpen(false), [href]);
  const onError = (error: CommandError) => setMessage({ kind: "error", error });
  const info = (text: string) => setMessage({ kind: "info", text });
  return (
    <div className="workspace" data-rail-open={railOpen ? "" : undefined}>
      <Rail active={active} onError={onError} />
      <header className="masthead">
        <button
          type="button"
          className="rail-toggle"
          aria-expanded={railOpen}
          aria-label="Manuscript and world"
          onClick={() => setRailOpen((open) => !open)}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M1 3h12M1 7h12M1 11h7"
              stroke="currentColor"
              strokeWidth="1.25"
            />
          </svg>
        </button>
        <TabStrip onMessage={setMessage} />
        <StoryTimeStamp active={active} />
        <div className="masthead-controls">
          {active && <LayerToggles documentId={active} />}
          {active && (
            <>
              <ContextButton active={active} onInfo={info} />
              <GenerateNext active={active} onInfo={info} />
              <GenerationShortcuts active={active} onInfo={info} />
            </>
          )}
        </div>
      </header>
      <div className="notices" aria-live="polite">
        <Notices />
        <BibleNotice />
        <GenerationNotice />
        {message && (
          <p
            className={
              message.kind === "error" ? "notice notice-error" : "notice"
            }
            role={message.kind === "error" ? "alert" : "status"}
          >
            {message.kind === "error"
              ? describeCommandError(message.error)
              : message.text}{" "}
            <button
              type="button"
              className="notice-dismiss"
              onClick={() => setMessage(null)}
            >
              Dismiss
            </button>
          </p>
        )}
      </div>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}

const useActiveDocumentId = () =>
  useParams({ strict: false }).documentId ?? null;

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

/** True for the error of a close of `id` that failed with unsaved changes. */
const isFailedClose = (message: Message | null, id: string) =>
  message?.kind === "error" &&
  message.error.kind === "unsaved" &&
  message.error.documentId === id;

function TabStrip({
  onMessage,
}: {
  onMessage: Dispatch<SetStateAction<Message | null>>;
}) {
  const { workspace, manuscript, worldIndex, generation, talk } = useServices();
  const active = useActiveTab();
  const entries = useStore(worldIndex.entries);
  const topics = useStore(talk.topics);
  const tabs = useStore(workspace.tabs);
  const documents = useStore(workspace.documents);
  const state = useStore(manuscript.state);
  const navigate = useNavigate();
  // Documents whose last close failed with unsaved changes.
  const failedCloses = useRef(new Set<string>());
  const titleOf = (id: string) => {
    if (id === INBOX_TAB) return "World inbox";
    if (id === CLOSED_TOPICS_TAB) return "Resolved and archived";
    const topic = topicOfTab(id);
    if (topic !== null) {
      return topics.find((t) => t.id === topic)?.title ?? "New topic";
    }
    return documents.find((document) => document.id === id)?.title ?? "…";
  };
  const sceneOf = (id: string) =>
    state.kind === "ready" ? state.view.scenes.get(id) : undefined;

  const closeSheet = async (id: string) => {
    const topic = topicOfTab(id);
    if (topic !== null) {
      // A topic never sent is discarded with its tab; a running turn stops.
      talk.stop(topic);
      talk.discardDraft(topic);
    }
    const closed = await workspace.commands.closeTab(id);
    if (closed.isErr() || id !== active) return;
    const next = closed.value.active;
    await (next ? navigate(tabRoute(next)) : navigate({ to: "/" }));
  };

  const close = async (id: string, retried = false): Promise<void> => {
    if (isSheetTab(id)) return closeSheet(id);
    // A generation writes into the document until it ends: end it first,
    // keeping what arrived, so closing saves all of it.
    await generation.stop(id);
    if (generation.slip.get()?.documentId === id) generation.closeSlip();
    const closed = await workspace.commands.closeTab(id);
    if (closed.isErr() && closed.error.kind === "still_open") {
      // Saved, but an earlier failed close gave the tab its lease back: its
      // error is stale now, and this close can finish. Reopened by the
      // writer meanwhile: nothing to tell them.
      // Known edge: if the writer reopens the document while this close is
      // saving after a failed one, the retry closes the tab they reopened.
      // Nothing is lost (closing saves first); they reopen it from the rail.
      if (failedCloses.current.delete(id)) {
        onMessage((current) => (isFailedClose(current, id) ? null : current));
        if (!retried) return close(id, true);
      }
      return;
    }
    if (closed.isErr()) {
      if (closed.error.kind === "unsaved") failedCloses.current.add(id);
      onMessage({ kind: "error", error: closed.error });
      return;
    }
    failedCloses.current.delete(id);
    onMessage((current) => (isFailedClose(current, id) ? null : current));
    if (id !== active) return;
    const next = closed.value.active;
    await (next ? navigate(tabRoute(next)) : navigate({ to: "/" }));
  };

  return (
    <nav className="tab-strip" aria-label="Open tabs">
      {tabs.open.map((id) => {
        const scene = sceneOf(id);
        const isActive = id === active;
        const kind = entries.get(id)?.kind;
        const crumb = isSheetTab(id)
          ? "Topics"
          : scene
            ? scene.chapterTitle
            : kind
              ? `World › ${KIND_DEFINITIONS[kind].label}`
              : "";
        return (
          <div key={id} className="tab" data-active={isActive}>
            <Link
              {...tabRoute(id)}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && crumb && <span className="crumb">{crumb} › </span>}
              <span className="tab-title">
                {scene && isActive ? `${scene.position} ` : ""}
                {titleOf(id)}
              </span>
            </Link>
            <button
              type="button"
              className="tab-close"
              aria-label={`Close ${titleOf(id)}`}
              onClick={() => void close(id)}
            >
              <CloseIcon />
            </button>
          </div>
        );
      })}
      <WorldTabItem />
    </nav>
  );
}

/**
 * The World tab (DESIGN.md, Sheets): every inspector view and bible record
 * shows in this one tab, after the document tabs. It opens when a view or
 * record is shown and stays until closed.
 */
function WorldTabItem() {
  const { worldTab, bible } = useServices();
  const tab = useStore(worldTab);
  const state = useStore(bible.state);
  const onWorld = useRouterState({
    select: (router) => router.location.pathname === "/world",
  });
  const navigate = useNavigate();
  if (!tab.open) return null;
  const title = worldTabTitle(
    state.kind === "ready" ? state.story : null,
    parseAt(tab.at),
  );
  const close = async () => {
    // Home returns to the last active document, if any.
    if (onWorld) await navigate({ to: "/" });
    worldTab.set({ ...worldTab.get(), open: false });
  };
  return (
    <div className="tab" data-active={onWorld}>
      <Link
        to="/world"
        search={{ at: tab.at }}
        aria-current={onWorld ? "page" : undefined}
      >
        {onWorld && <span className="crumb">World › </span>}
        <span className="tab-title">{title}</span>
      </Link>
      <button
        type="button"
        className="tab-close"
        aria-label={`Close ${title}`}
        onClick={() => void close()}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

/**
 * When the scene is: from the story bible when the document is a bible
 * scene's prose and the bible places it, else from the outline's timeline.
 */
function StoryTimeStamp({ active }: { active: string | null }) {
  const { manuscript, bible } = useServices();
  const state = useStore(manuscript.state);
  const bibleState = useStore(bible.state);
  const fromBible = useMemo(
    () =>
      active !== null && bibleState.kind === "ready"
        ? bibleScene(bibleState.story, active)
        : null,
    [bibleState, active],
  );
  if (!active) return null;
  const scene =
    state.kind === "ready" ? state.view.scenes.get(active) : undefined;
  if (fromBible?.stamp) {
    return (
      <p className="stamp">
        <span className="visually-hidden">Story time: </span>
        {fromBible.stamp.text}
        {fromBible.stamp.inferred && (
          <span className="stamp-inferred">inferred</span>
        )}
      </p>
    );
  }
  if (!fromBible && !scene) return null;
  if (!scene?.time) {
    return (
      <p className="stamp stamp-undated">
        <span className="visually-hidden">Story time: </span>Not yet placed in
        time
      </p>
    );
  }
  return (
    <p className="stamp">
      <span className="visually-hidden">Story time: </span>
      {formatStoryTime(scene.time)}
      {scene.time.authority.level === "inferred" && (
        <span className="stamp-inferred">inferred</span>
      )}
    </p>
  );
}

function LayerToggles({ documentId }: { documentId: string }) {
  const { layers } = useServices();
  const state = useStore(layers);
  const on = layersForScene(state.on, state.subtextScenes, documentId);
  return (
    <fieldset className="layer-toggles">
      <legend className="visually-hidden">Layers</legend>
      {LAYERS.map((layer) => (
        <button
          key={layer}
          type="button"
          aria-pressed={on.has(layer)}
          data-layer={layer}
          title={
            layer === "subtext"
              ? "Subtext is turned on for this scene only"
              : undefined
          }
          onClick={() => {
            performance.mark(`layer-toggle:${layer}`);
            layers.toggle(layer, documentId);
          }}
        >
          {LAYER_LABELS[layer]}
        </button>
      ))}
    </fieldset>
  );
}

const NO_STATUS = createStore<unknown>(null);

/**
 * Opens the request for what comes next in the active document, or with
 * no model set up, the model settings. Re-renders with the tabs, so it sees
 * a session once it has loaded.
 */
function useOpenRequest(active: string | null) {
  const { workspace, generation } = useServices();
  const navigate = useNavigate();
  useStore(workspace.tabs);
  const session = active ? workspace.session(active) : undefined;
  const running = useStore(generation.active(active ?? "")) !== null;
  const [preparing, setPreparing] = useState(false);
  const open = async () => {
    if (!active || !session) return;
    if (!generation.profile.get()) {
      await generation.openRequest(active);
      await navigate({ to: "/model" });
      return;
    }
    setPreparing(true);
    await generation.openRequest(active);
    setPreparing(false);
  };
  return {
    open,
    /** Why it can't open now, if it can't. */
    unavailable: !session
      ? "Open a document to generate in it."
      : session.readOnlyReason
        ? describeReadOnly(session.readOnlyReason)
        : running
          ? "A generation is running. Stop it or let it finish first."
          : preparing
            ? "Assembling the request…"
            : null,
  };
}

/**
 * The context control: how many world entries this scene names, which is
 * what generation would draw on. Shows or puts away the request slip.
 */
function ContextButton({
  active,
  onInfo,
}: {
  active: string | null;
  onInfo: (text: string) => void;
}) {
  const { workspace, worldIndex, generation } = useServices();
  const entries = useStore(worldIndex.entries);
  const documents = useStore(workspace.documents);
  const slip = useStore(generation.slip);
  const { open, unavailable } = useOpenRequest(active);
  const session = active ? workspace.session(active) : undefined;
  const status = useStore<unknown>(session?.status ?? NO_STATUS);
  const count = useMemo(() => {
    void status;
    if (!session) return 0;
    const names = entryNames(
      entries,
      (id) => documents.find((d) => d.id === id)?.title,
    );
    const found = new Set<string>();
    for (const block of textBlocks(session.editor.children)) {
      for (const mention of mentions(block.text, names)) {
        if (mention.entryId !== active) found.add(mention.entryId);
      }
    }
    return found.size;
  }, [session, status, entries, documents, active]);
  const shown = slip !== null && slip.documentId === active;
  return (
    <button
      type="button"
      className="button"
      aria-expanded={shown}
      aria-disabled={!shown && unavailable ? "true" : undefined}
      title={!shown ? (unavailable ?? undefined) : undefined}
      onClick={() => {
        if (shown) generation.closeSlip();
        else if (unavailable) onInfo(unavailable);
        else void open();
      }}
    >
      Context · {count} {count === 1 ? "card" : "cards"}
    </button>
  );
}

/** Opens the request slip for what comes next; with it open, goes to its Send. */
function GenerateNext({
  active,
  onInfo,
}: {
  active: string | null;
  onInfo: (text: string) => void;
}) {
  const { generation } = useServices();
  const slip = useStore(generation.slip);
  const { open, unavailable } = useOpenRequest(active);
  return (
    <button
      type="button"
      className="button button-primary"
      aria-disabled={unavailable ? "true" : undefined}
      aria-keyshortcuts={ARIA_SHORTCUTS.generate}
      title={unavailable ?? shortcutLabel("generate")}
      onClick={() => {
        if (unavailable) return onInfo(unavailable);
        if (slip?.documentId === active) {
          // Assembling again would discard edits not yet sent.
          const send = document.querySelector<HTMLElement>(
            ".request-slip .context-viewer-send",
          );
          send?.scrollIntoView?.({ block: "nearest" });
          send?.focus();
          return;
        }
        void open();
      }}
    >
      Generate next
    </button>
  );
}

/**
 * Generation's shortcuts (`generate/shortcuts.ts`) in the open document:
 * keys pressed in its prose or its request slip. Renders nothing.
 */
function GenerationShortcuts({
  active,
  onInfo,
}: {
  active: string;
  onInfo: (text: string) => void;
}) {
  const { generation } = useServices();
  const { open, unavailable } = useOpenRequest(active);
  // The listener stays; what it acts on is read when a key is pressed.
  const latest = useRef({ open, unavailable, onInfo });
  latest.current = { open, unavailable, onInfo };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const shortcut = shortcutOf(event);
      const sheet =
        event.target instanceof Element ? event.target.closest(".sheet") : null;
      if (!shortcut || !sheet) return;
      const { open, unavailable, onInfo } = latest.current;
      const slip = generation.slip.get();
      const slipShown = slip?.documentId === active;
      switch (shortcut) {
        case "generate": {
          event.preventDefault();
          if (slipShown) {
            // Send it as shown, edits included, as Send would.
            if (!slip.sending) {
              sheet
                .querySelector<HTMLFormElement>(
                  ".request-slip form.context-viewer-form",
                )
                ?.requestSubmit();
            }
            return;
          }
          if (unavailable) return onInfo(unavailable);
          void open();
          return;
        }
        case "stop": {
          if (generation.active(active).get() === null) return;
          event.preventDefault();
          void generation.stop(active);
          return;
        }
        case "accept": {
          event.preventDefault();
          if (generation.active(active).get() !== null) {
            return onInfo(
              "A generation is running. Stop it or let it finish first.",
            );
          }
          void generation.acceptAtCaret(active);
          return;
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [generation, active]);
  return null;
}

/**
 * Why the story bible could not be read, while it can't. After a good read
 * the inspector keeps showing that, so this says it may be out of date.
 */
function BibleNotice() {
  const { bible } = useServices();
  const error = useStore(bible.error);
  const state = useStore(bible.state);
  if (error === null) return null;
  return (
    <p className="notice notice-error" role="alert">
      {error}
      {state.kind === "ready" &&
        " The World inspector shows the bible as last read."}{" "}
      <button
        type="button"
        className="notice-dismiss"
        onClick={() => void bible.refresh()}
      >
        Try again
      </button>
    </p>
  );
}

/** What the last generation command came to, when there is something to say. */
function GenerationNotice() {
  const { generation } = useServices();
  const notice = useStore(generation.notice);
  if (!notice) return null;
  if (notice.kind === "announce") {
    return <output className="visually-hidden">{notice.text}</output>;
  }
  return (
    <p
      className={notice.kind === "error" ? "notice notice-error" : "notice"}
      role={notice.kind === "error" ? "alert" : "status"}
    >
      {notice.text}{" "}
      <button
        type="button"
        className="notice-dismiss"
        onClick={generation.dismissNotice}
      >
        Dismiss
      </button>
    </p>
  );
}

/** Conditions the writer must know about: they affect whether work is kept. */
function Notices() {
  const workspace = useWorkspace();
  const { role, persistence, storage } = useEnvironment();
  const connection = useStore(workspace.connection.status);
  return (
    <>
      {role === "reader" && (
        <p className="notice">
          Demiurge is open in another tab, so this tab is read-only. Close the
          other tab and reload to edit here.
        </p>
      )}
      {role === "unguarded" && (
        <p className="notice">
          This browser can't stop two tabs editing at once. Keep Demiurge open
          in one tab only, or one tab's changes will overwrite the other's.
        </p>
      )}
      {storage === "indexeddb" && persistence !== "granted" && (
        <p className="notice">
          {persistence === "refused"
            ? "The browser refused persistent storage."
            : "This browser doesn't offer persistent storage."}{" "}
          It may delete this world when the disk is low.
        </p>
      )}
      {connection.kind === "lost" && (
        <p className="notice notice-error" role="alert">
          Storage is unavailable ({connection.error.message}). Your changes are
          kept in this tab and retried; don't close it. Reloading may help once
          other Demiurge tabs are closed.
        </p>
      )}
    </>
  );
}
