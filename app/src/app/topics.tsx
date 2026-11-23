/**
 * Talk pages in the Night Edition (DESIGN.md, Topics): the rail's Topics
 * view, the World inbox and the resolved-and-archived ledger sheets, and the
 * topic sheet with its turns and composer. Every topic is about one thing;
 * there is no conversation without a topic, and no composer anywhere but at
 * the foot of an open topic's sheet.
 */

import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AgentTurn, Reference } from "~/agent/inspect";
import { nextTurnDraft, nextTurnEdits } from "~/generate/agent-slip";
import { ContextViewer } from "~/generate/context-viewer";
import { storyContradictions } from "~/story/contradictions";
import { parseRef } from "~/story/refs";
import type { Story } from "~/story/story";
import { refLabel } from "~/story/touches";
import { type InboxItem, worldInbox } from "~/talk/inbox";
import type {
  ModelAuthor,
  TalkAuthor,
  TalkMessage,
  Topic,
  TopicScope,
  TopicScopeKind,
  TurnCall,
} from "~/talk/records";
import { SCOPE_GROUPS, scopeLine, scopeName } from "~/talk/scope";
import type { TopicView, TurnStop } from "~/talk/talk";
import { useServices, useStore } from "./hooks";
import { Empty, LedgerGroup, LedgerRow, ViewLink } from "./inspector";
import { contradictionKind } from "./inspector-model";
import { CLOSED_TOPICS_TAB, INBOX_TAB, topicTab } from "./tab-routes";
import type { NextTurn, RunningTurn } from "./talk";

// ------------------------------------------------------------------ shared

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const formatDate = (ms: number) => DATE.format(ms);
const formatTime = (ms: number) => TIME.format(ms);

/** `You`, or `Model · Planner`. */
export const authorLabel = (author: TalkAuthor) =>
  author.kind === "human" ? "You" : `Model · ${author.profile}`;

/** The topics and the inbox, read from the talk service. */
function useTalk() {
  const { talk } = useServices();
  const topics = useStore(talk.topics);
  const story = useStore(talk.story);
  const inbox = useMemo(
    () => worldInbox(topics, story === null ? [] : storyContradictions(story)),
    [topics, story],
  );
  return { talk, topics, story, inbox };
}

/** The scope a topic's about line and head name. */
const aboutLine = (story: Story | null, scope: TopicScope) =>
  story === null
    ? scope.kind === "world"
      ? "World"
      : SCOPE_GROUPS[scope.kind]
    : scopeLine(story, scope);

/** Opens a new world topic in a tab of its own. */
function useNewTopic() {
  const { talk, workspace } = useServices();
  const navigate = useNavigate();
  return async () => {
    const id = talk.draft({ kind: "world" });
    workspace.commands.openSheet(topicTab(id));
    await navigate({ to: "/topic/$topicId", params: { topicId: id } });
  };
}

/** Keeps a sheet's tab open and in front while its route shows. */
function useSheetTab(tab: string) {
  const { workspace } = useServices();
  useEffect(() => {
    workspace.commands.openSheet(tab);
  }, [workspace, tab]);
}

// -------------------------------------------------------------------- rail

/** The open-topic row: a title, then the about line. */
function TopicRow({
  title,
  about,
  to,
  active,
}: {
  title: string;
  about: string;
  to: string | null;
  active: boolean;
}) {
  const body = (
    <>
      <span className="topic-title">{title}</span>
      <span className="topic-about">{about}</span>
    </>
  );
  return (
    <li>
      {to === null ? (
        <span className="topic-row">{body}</span>
      ) : (
        <Link
          to="/topic/$topicId"
          params={{ topicId: to }}
          className="topic-row"
          aria-current={active ? "page" : undefined}
        >
          {body}
        </Link>
      )}
    </li>
  );
}

function inboxRow(item: InboxItem, story: Story | null, active: string | null) {
  if (item.kind === "topic") {
    const { topic } = item;
    return (
      <TopicRow
        key={item.key}
        title={topic.title}
        about={`${aboutLine(story, topic.scope)} · raised by model`}
        to={topic.id}
        active={active === topicTab(topic.id)}
      />
    );
  }
  return (
    <TopicRow
      key={item.key}
      title={item.contradiction.message}
      about={`Contradiction · ${contradictionKind(item.contradiction)}`}
      to={null}
      active={false}
    />
  );
}

/** The rail's Topics view: the World inbox, then open topics by scope. */
export function TopicsPanel({ active }: { active: string | null }) {
  const { talk, topics, story, inbox } = useTalk();
  const problem = useStore(talk.problem);
  const newTopic = useNewTopic();
  const open = topics.filter((topic) => topic.status === "open");
  const groups = (Object.keys(SCOPE_GROUPS) as TopicScopeKind[]).map(
    (kind) => ({
      kind,
      topics: open.filter((topic) => topic.scope.kind === kind),
    }),
  );
  return (
    <>
      {problem && (
        <p className="rail-empty" role="alert">
          {problem}
        </p>
      )}
      <section className="rail-section" aria-labelledby="rail-inbox">
        <div className="rail-label">
          <h2 id="rail-inbox">World inbox</h2>
          <span className="rail-count">{inbox.length}</span>
        </div>
        {inbox.length === 0 ? (
          <p className="rail-empty">Nothing is waiting on you.</p>
        ) : (
          <ul className="topic-list">
            {inbox.slice(0, 3).map((item) => inboxRow(item, story, active))}
          </ul>
        )}
        <p className="rail-more">
          <Link to="/inbox" className="rail-action">
            Open the inbox
          </Link>
        </p>
      </section>
      {groups.map(({ kind, topics: listed }) =>
        kind !== "world" && listed.length === 0 ? null : (
          <section
            key={kind}
            className="rail-section"
            aria-labelledby={`rail-topics-${kind}`}
          >
            <div className="rail-label">
              <h2 id={`rail-topics-${kind}`}>{SCOPE_GROUPS[kind]}</h2>
              {kind === "world" && (
                <button
                  type="button"
                  className="rail-action"
                  onClick={() => void newTopic()}
                  disabled={talk.readOnly}
                >
                  New topic
                </button>
              )}
            </div>
            {listed.length === 0 ? (
              <p className="rail-empty">No open topics.</p>
            ) : (
              <ul className="topic-list">
                {listed.map((topic) => (
                  <TopicRow
                    key={topic.id}
                    title={topic.title}
                    about={`${aboutLine(story, topic.scope)}${
                      topic.startedBy.kind === "model"
                        ? " · raised by model"
                        : ""
                    }`}
                    to={topic.id}
                    active={active === topicTab(topic.id)}
                  />
                ))}
              </ul>
            )}
          </section>
        ),
      )}
      <p className="rail-more">
        <Link to="/topics/closed" className="rail-action">
          Resolved and archived
        </Link>
      </p>
    </>
  );
}

/** The rail foot's line about the inbox, a reference to its sheet. */
export function InboxFoot() {
  const { inbox } = useTalk();
  const count = inbox.length;
  return (
    <p>
      {count === 0 ? (
        <Link to="/inbox" className="rail-foot-link">
          Nothing in the world inbox
        </Link>
      ) : (
        <Link to="/inbox" className="rail-foot-link">
          <b>
            {count} {count === 1 ? "item" : "items"}
          </b>{" "}
          in the world inbox
        </Link>
      )}
    </p>
  );
}

// ----------------------------------------------------------------- ledgers

const startedLine = (topic: Topic) =>
  `${topic.startedBy.kind === "model" ? `Model · ${topic.startedBy.profile}` : "You"}, ${formatDate(topic.createdAt)}`;

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * A ledger sheet's head, in the inspector's form. Not the inspector's
 * `SheetHead`, which reports bible edits made on its sheet; nothing on these
 * sheets edits the bible.
 */
function SheetHead({ title, children }: { title: string; children: string }) {
  return (
    <header className="sheet-head inspector-head">
      <h1 className="sheet-title">{title}</h1>
      <p className="inspector-lede">{children}</p>
    </header>
  );
}

/** A topic's title as a reference to its topic tab. */
function TopicRef({ topic }: { topic: Topic }) {
  return (
    <Link to="/topic/$topicId" params={{ topicId: topic.id }} className="ref">
      {topic.title}
    </Link>
  );
}

/** Everything waiting on the writer (DESIGN.md, World inbox sheet). */
export function InboxPage() {
  useSheetTab(INBOX_TAB);
  const { story, inbox } = useTalk();
  const topics = inbox.filter((item) => item.kind === "topic").length;
  const kept = inbox.length - topics;
  return (
    <article className="sheet ledger-sheet" aria-label="World inbox">
      <SheetHead title="World inbox">
        {`${plural(topics, "topic")} the model raised, ${plural(kept, "contradiction")} kept.`}
      </SheetHead>
      <div className="ledger">
        {inbox.length === 0 ? (
          <Empty>
            Nothing is waiting on you. Topics the model raises and
            contradictions the story keeps gather here.
          </Empty>
        ) : (
          <LedgerGroup label="Waiting" count={inbox.length}>
            {inbox.map((item) =>
              item.kind === "topic" ? (
                <li key={item.key} className="ledger-row">
                  <div className="ledger-body">
                    <p className="ledger-kind">Topic</p>
                    <p className="ledger-lead">
                      <TopicRef topic={item.topic} />
                    </p>
                    <p className="ledger-line">
                      {aboutLine(story, item.topic.scope)}
                    </p>
                  </div>
                  <span className="ledger-meta">{startedLine(item.topic)}</span>
                </li>
              ) : (
                <li key={item.key} className="ledger-row">
                  <div className="ledger-body">
                    <p className="ledger-kind">Contradiction</p>
                    <p className="ledger-lead">
                      <ViewLink view="contradictions">
                        {item.contradiction.message}
                      </ViewLink>
                    </p>
                    <p className="ledger-line">
                      {contradictionKind(item.contradiction)}
                    </p>
                  </div>
                  <span className="ledger-meta">kept</span>
                </li>
              ),
            )}
          </LedgerGroup>
        )}
      </div>
    </article>
  );
}

/** Topics no longer open, grouped by status. */
export function ClosedTopicsPage() {
  useSheetTab(CLOSED_TOPICS_TAB);
  const { story, topics } = useTalk();
  const resolved = topics.filter((topic) => topic.status === "resolved");
  const archived = topics.filter((topic) => topic.status === "archived");
  const groups = [
    { label: "Resolved", topics: resolved },
    { label: "Archived", topics: archived },
  ];
  return (
    <article className="sheet ledger-sheet" aria-label="Resolved and archived">
      <SheetHead title="Resolved and archived">
        {`${resolved.length} resolved, ${archived.length} archived.`}
      </SheetHead>
      <div className="ledger">
        {resolved.length + archived.length === 0 ? (
          <Empty>
            No topics are resolved or archived yet. Topics you settle are kept
            here.
          </Empty>
        ) : (
          groups.map(({ label, topics: listed }) =>
            listed.length === 0 ? null : (
              <LedgerGroup key={label} label={label} count={listed.length}>
                {listed.map((topic) => (
                  <LedgerRow
                    key={topic.id}
                    lead={<TopicRef topic={topic} />}
                    lines={[aboutLine(story, topic.scope)]}
                    meta={formatDate(topic.closedAt ?? topic.updatedAt)}
                  />
                ))}
              </LedgerGroup>
            ),
          )
        )}
      </div>
    </article>
  );
}

// ------------------------------------------------------------- topic sheet

/** A talk page: a stored topic, or one drafted with "New topic". */
export function TopicPage() {
  const { topicId } = useParams({ from: "/topic/$topicId" });
  useSheetTab(topicTab(topicId));
  const { talk } = useServices();
  const views = useStore(talk.views);
  const drafts = useStore(talk.drafts);
  const draft = drafts.get(topicId);
  const view = views.get(topicId);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (draft !== undefined) return;
    let current = true;
    setMissing(false);
    void talk.open(topicId).then(() => {
      if (current && !talk.views.get().has(topicId)) setMissing(true);
    });
    return () => {
      current = false;
    };
  }, [talk, topicId, draft]);

  if (draft !== undefined && view === undefined) {
    return <DraftSheet key={topicId} id={topicId} scope={draft} />;
  }
  if (view === undefined) {
    return missing ? (
      <div className="page-empty" role="alert">
        <p>This topic doesn't exist (any more).</p>
      </div>
    ) : null;
  }
  return <TopicSheet key={topicId} view={view} />;
}

/** The scope line at a topic's head, the scope itself a reference. */
function ScopeLine({ scope }: { scope: TopicScope }) {
  const { talk } = useServices();
  const story = useStore(talk.story);
  if (story === null) {
    return <p className="topic-scope">{aboutLine(null, scope)}</p>;
  }
  const { kind, name, removed } = scopeName(story, scope);
  const scene =
    scope.kind === "scene" || scope.kind === "passage"
      ? story.scenes.find((s) => s.id === scope.scene)
      : undefined;
  return (
    <p className="topic-scope">
      {kind}
      {name !== "" && (
        <>
          {" · "}
          {removed ? (
            <span className="ref-removed">{name} (removed)</span>
          ) : scene?.documentId !== undefined ? (
            <Link
              to="/doc/$documentId"
              params={{ documentId: scene.documentId }}
              className="ref"
            >
              {name}
            </Link>
          ) : (
            <Link
              to="/world"
              search={{
                at:
                  scope.kind === "record"
                    ? scope.ref
                    : `scene:${scene?.id ?? ""}`,
              }}
              className="ref"
            >
              {name}
            </Link>
          )}
        </>
      )}
    </p>
  );
}

/** A passage topic's anchor, quoted, and whether it has gone stale. */
function PassageQuote({ scope }: { scope: TopicScope }) {
  const { talk } = useServices();
  const [stale, setStale] = useState(false);
  useEffect(() => {
    let current = true;
    void talk.passageStale(scope).then((value) => {
      if (current) setStale(value);
    });
    return () => {
      current = false;
    };
  }, [talk, scope]);
  if (scope.kind !== "passage") return null;
  return (
    <>
      <blockquote className="excerpt">{scope.quote}</blockquote>
      {stale && (
        <p className="topic-stale">
          The passage has changed; this topic now follows the scene.
        </p>
      )}
    </>
  );
}

/** What the model is given for a scope, said before the composer. */
function seesLine(scope: TopicScope): string {
  switch (scope.kind) {
    case "world":
      return "The model sees the premise, the scenes, the open questions and the contradictions, and this topic.";
    case "scene":
      return "The model sees this scene, what the reader knows before it, its events and people, and this topic.";
    case "passage":
      return "The model sees this passage, its scene, what the reader knows before it, and this topic.";
    case "record":
      return "The model sees this record, what it touches, the scenes that touch it, and this topic.";
  }
}

function TopicTitleField({
  value,
  onChange,
  onCommit,
  readOnly,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onCommit?: () => void;
  readOnly: boolean;
  autoFocus?: boolean;
}) {
  return (
    <input
      className="topic-title-field"
      aria-label="Topic title"
      placeholder="Name this topic"
      value={value}
      readOnly={readOnly}
      // The writer names a new topic first (DESIGN.md, Topics).
      // biome-ignore lint/a11y/noAutofocus: focus starts in a new topic's title
      autoFocus={autoFocus}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onCommit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

/** A topic named but not stored: nothing is kept until its first Send. */
function DraftSheet({ id, scope }: { id: string; scope: TopicScope }) {
  const { talk } = useServices();
  const title = useStore(talk.unsent).get(id)?.title ?? "";
  const running = useStore(talk.running).get(id);
  const label = useModelLabel();
  return (
    <div className="topic-sheet">
      <header className="topic-head">
        <ScopeLine scope={scope} />
        <PassageQuote scope={scope} />
        <div className="topic-title-row">
          <TopicTitleField
            value={title}
            onChange={(value) => talk.setUnsent(id, { title: value })}
            readOnly={talk.readOnly}
            autoFocus
          />
          <span className="topic-status">Open</span>
        </div>
      </header>
      {running ? (
        <ol className="turns">
          <RunningTurnView id={id} turn={running} label={label} shown={0} />
        </ol>
      ) : (
        <p className="turns-empty">
          No turns yet. Say what this topic should settle.
        </p>
      )}
      <TopicError id={id} />
      <Composer
        id={id}
        scope={scope}
        titled={title.trim() !== ""}
        send={(text) => talk.start(id, title, text)}
      />
    </div>
  );
}

/** `Model · <profile label>` for the model set up now, if one is. */
function useModelLabel(): string | null {
  const { generation } = useServices();
  const profile = useStore(generation.profile);
  return profile ? `Model · ${profile.label ?? profile.name}` : null;
}

function TopicSheet({ view }: { view: TopicView }) {
  const { talk } = useServices();
  const { topic, messages, stop } = view;
  const label = useModelLabel();
  const running = useStore(talk.running).get(topic.id);
  const [title, setTitle] = useState(topic.title);
  useEffect(() => setTitle(topic.title), [topic.title]);
  const open = topic.status === "open";
  const commit = () => {
    if (title.trim() !== topic.title) void talk.rename(topic.id, title);
  };
  return (
    <div className="topic-sheet">
      <header className="topic-head">
        <ScopeLine scope={topic.scope} />
        <PassageQuote scope={topic.scope} />
        <div className="topic-title-row">
          {open ? (
            <TopicTitleField
              value={title}
              onChange={setTitle}
              onCommit={commit}
              readOnly={talk.readOnly}
            />
          ) : (
            <h1 className="sheet-title">{topic.title}</h1>
          )}
          <span className="topic-status">
            {open
              ? "Open"
              : topic.status === "resolved"
                ? "Resolved"
                : "Archived"}
          </span>
          <StatusActions topic={topic} running={running !== undefined} />
        </div>
        <p className="topic-started">
          {topic.startedBy.kind === "model"
            ? `Raised by the model (${topic.startedBy.profile})`
            : "Started by you"}{" "}
          on {formatDate(topic.createdAt)}.
        </p>
      </header>
      <ol className="turns">
        {messages.map((message) => (
          <Turn key={message.id} topicId={topic.id} message={message} />
        ))}
        {running && (
          <RunningTurnView
            id={topic.id}
            turn={running}
            label={label}
            shown={messages.length}
          />
        )}
        {!running && stop && <StoppedTurn id={topic.id} stop={stop} />}
      </ol>
      <TopicError id={topic.id} />
      {open ? (
        <Composer
          id={topic.id}
          scope={topic.scope}
          titled={topic.title.trim() !== ""}
          send={(text) => talk.send(topic.id, text)}
        />
      ) : (
        <p className="topic-closed">
          {topic.status === "resolved" ? "Resolved" : "Archived"} on{" "}
          {formatDate(topic.closedAt ?? topic.updatedAt)}.{" "}
          <button
            type="button"
            className="text-action"
            disabled={talk.readOnly}
            onClick={() => void talk.setStatus(topic.id, "open")}
          >
            Reopen
          </button>
        </p>
      )}
    </div>
  );
}

function StatusActions({ topic, running }: { topic: Topic; running: boolean }) {
  const { talk } = useServices();
  const disabled = talk.readOnly || running;
  if (topic.status !== "open") {
    return (
      <span className="topic-actions">
        <button
          type="button"
          className="text-action"
          disabled={disabled}
          onClick={() => void talk.setStatus(topic.id, "open")}
        >
          Reopen
        </button>
      </span>
    );
  }
  return (
    <span className="topic-actions">
      <button
        type="button"
        className="text-action"
        disabled={disabled}
        onClick={() => void talk.setStatus(topic.id, "resolved")}
      >
        Resolve
      </button>
      <button
        type="button"
        className="text-action"
        disabled={disabled}
        onClick={() => void talk.setStatus(topic.id, "archived")}
      >
        Archive
      </button>
    </span>
  );
}

/** A turn's body in the Talk setting: paragraphs at blank lines. */
function TalkBody({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p !== "");
  return (
    <div className="turn-body">
      {paragraphs.map((paragraph, i) => (
        // Paragraphs of a stored message never reorder.
        // biome-ignore lint/suspicious/noArrayIndexKey: see above
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}

/** The fold under a model turn: its tool calls, by name, with one-line results. */
function ToolCalls({ calls }: { calls: readonly TurnCall[] }) {
  if (calls.length === 0) return null;
  const names = [...new Set(calls.map((call) => call.name))].join(", ");
  return (
    <details className="turn-calls">
      <summary>
        {calls.length} tool {calls.length === 1 ? "call" : "calls"} · {names}
      </summary>
      <ol>
        {calls.map((call, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: calls are a fixed record
          <li key={i}>
            <code className="code">{call.name}</code>{" "}
            <span className="turn-call-result">
              {call.ok ? call.summary : `Failed: ${call.summary}`}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}

function Turn({ topicId, message }: { topicId: string; message: TalkMessage }) {
  const { talk } = useServices();
  const slip = useStore(talk.slips).get(topicId);
  const { author } = message;
  const model = author.kind === "model";
  const requested = model && author.requestId !== null;
  const open = slip?.kind === "turn" && slip.message === message.index;
  return (
    <li className="turn-entry">
      <div className={model ? "turn turn-model" : "turn"}>
        <div className="turn-head">
          <span className="turn-author">{authorLabel(author)}</span>
          <time
            className="turn-time"
            dateTime={new Date(message.createdAt).toISOString()}
          >
            {formatTime(message.createdAt)}
          </time>
          {requested && (
            <button
              type="button"
              className="text-action"
              aria-expanded={open}
              onClick={() =>
                talk.showSlip(
                  topicId,
                  open ? null : { kind: "turn", message: message.index },
                )
              }
            >
              Request
            </button>
          )}
        </div>
        <TalkBody text={message.body} />
        <ToolCalls calls={message.calls} />
      </div>
      {open && author.kind === "model" && (
        <TurnSlip
          author={author}
          onClose={() => talk.showSlip(topicId, null)}
        />
      )}
    </li>
  );
}

// ------------------------------------------------------------- agent slip

/**
 * The gloss column's one note on a topic sheet: the agent slip, beside the
 * turn it explains on a leader, or beside the composer for the next turn.
 * At 860px and below it follows its turn (or comes before the composer)
 * under a hairline instead (DESIGN.md, Topics).
 */
function SlipHost({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.scrollIntoView?.({ block: "nearest" });
    element.focus({ preventScroll: true });
  }, []);
  return (
    <div ref={ref} className="topic-slip" tabIndex={-1}>
      {children}
    </div>
  );
}

/**
 * Following a reference from the slip: a record's detail in the World tab,
 * or a scene's document tab. The topic's tab and its slip stay as they are.
 */
function useReferences() {
  const { talk, workspace } = useServices();
  const story = useStore(talk.story);
  const documents = useStore(workspace.documents);
  const navigate = useNavigate();
  const sceneOf = (id: string) => story?.scenes.find((s) => s.id === id);
  const sceneName = (id: string) => {
    if (story === null) return `scene:${id}`;
    const index = story.scenes.findIndex((s) => s.id === id);
    return index === -1
      ? `scene:${id}`
      : `${index + 1} ${refLabel(story, { kind: "scene", id })}`;
  };
  const describe = (reference: Reference): string => {
    if (reference.kind === "prose") {
      const words = reference.text.trim().split(/\s+/);
      const excerpt =
        words.length <= 6
          ? reference.text.trim()
          : `${words.slice(0, 6).join(" ")}…`;
      const name = sceneName(reference.scene);
      return excerpt === "" ? name : `${name} · “${excerpt}”`;
    }
    const ref = parseRef(reference.ref);
    if (ref.isErr() || story === null) return reference.ref;
    return ref.value.kind === "scene"
      ? sceneName(ref.value.id)
      : refLabel(story, ref.value);
  };
  const openDocument = (documentId: string | null | undefined) =>
    documentId != null && documents.some((d) => d.id === documentId)
      ? documentId
      : null;
  const open = (reference: Reference) => {
    const scene =
      reference.kind === "prose"
        ? reference.scene
        : parseRef(reference.ref).match(
            (ref) => (ref.kind === "scene" ? ref.id : null),
            () => null,
          );
    const documentId =
      reference.kind === "prose"
        ? openDocument(
            reference.documentId ?? sceneOf(reference.scene)?.documentId,
          )
        : scene === null
          ? null
          : openDocument(sceneOf(scene)?.documentId);
    if (documentId !== null) {
      void navigate({ to: "/doc/$documentId", params: { documentId } });
      return;
    }
    const at =
      reference.kind === "prose" ? `scene:${reference.scene}` : reference.ref;
    void navigate({ to: "/world", search: { at } });
  };
  return { describe, open };
}

/** A past model turn's slip: what it sent, and the tool calls it made. */
function TurnSlip({
  author,
  onClose,
}: {
  author: ModelAuthor;
  onClose: () => void;
}) {
  const { talk } = useServices();
  const references = useReferences();
  const [turn, setTurn] = useState<
    { ok: true; turn: AgentTurn } | { ok: false; problem: string } | null
  >(null);
  useEffect(() => {
    let current = true;
    void talk.loadTurn(author).then((loaded) => {
      if (!current) return;
      setTurn(
        loaded.isOk()
          ? { ok: true, turn: loaded.value }
          : { ok: false, problem: loaded.error },
      );
    });
    return () => {
      current = false;
    };
  }, [talk, author]);
  if (turn === null) return null;
  return (
    <SlipHost>
      {turn.ok ? (
        <ContextViewer
          kind="turn"
          title={`Turn ${turn.turn.run.index}`}
          turn={turn.turn}
          profileLabel={author.profile}
          onOpen={references.open}
          describe={references.describe}
          onClose={onClose}
        />
      ) : (
        <SlipProblem title="Request" problem={turn.problem} onClose={onClose} />
      )}
    </SlipHost>
  );
}

/** A slip that can't show its request: why, with Close. */
function SlipProblem({
  title,
  problem,
  onClose,
}: {
  title: string;
  problem: string;
  onClose: () => void;
}) {
  return (
    <section className="context-viewer agent-slip" aria-label={title}>
      <header className="context-viewer-header">
        <div className="request-slip-head">
          <h2 className="request-slip-title">{title}</h2>
          <button
            type="button"
            className="request-slip-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </header>
      <p className="context-viewer-note">{problem}</p>
    </section>
  );
}

/** The next turn's slip, beside the composer whose Send sends its edits. */
function NextSlip({ id, next }: { id: string; next: NextTurn | undefined }) {
  const { talk } = useServices();
  const running = useStore(talk.running).has(id);
  const close = () => talk.showSlip(id, null);
  if (next === undefined) return null;
  return (
    <SlipHost>
      {next.kind === "ready" ? (
        <ContextViewer
          kind="next"
          target={next.target}
          base={next.base}
          draft={next.draft}
          onDraftChange={(draft) => talk.setNextDraft(id, draft)}
          disabled={running || talk.readOnly}
          onClose={close}
        />
      ) : (
        <SlipProblem title="Next turn" problem={next.message} onClose={close} />
      )}
    </SlipHost>
  );
}

/** Whether the writer has edited the next turn's request. */
export function nextEdited(next: NextTurn | undefined): boolean {
  if (next?.kind !== "ready") return false;
  return (
    JSON.stringify(next.draft) !== JSON.stringify(nextTurnDraft(next.base))
  );
}

/**
 * "Context": shows or puts away the next turn's slip. On the composer line
 * and in the masthead.
 */
export function NextTurnAction({
  id,
  className,
}: {
  id: string;
  className: string;
}) {
  const { talk } = useServices();
  const shown = useStore(talk.slips).get(id)?.kind === "next";
  const edited = nextEdited(useStore(talk.nextTurns).get(id));
  const stored = useStore(talk.views).get(id)?.topic;
  // Only an open topic has a composer, and so a next turn.
  const closed = stored !== undefined && stored.status !== "open";
  return (
    <button
      type="button"
      className={className}
      aria-expanded={shown && !closed}
      disabled={closed}
      title={closed ? "Reopen this topic to talk in it." : undefined}
      onClick={() => talk.showSlip(id, shown ? null : { kind: "next" })}
    >
      {edited ? "Context · edited" : "Context"}
    </button>
  );
}

function RunningTurnView({
  id,
  turn,
  label,
  shown,
}: {
  id: string;
  turn: RunningTurn;
  label: string | null;
  /** How many stored messages the sheet shows above the running turn. */
  shown: number;
}) {
  const { talk } = useServices();
  return (
    <>
      {turn.message !== null && shown <= turn.after && (
        <li className="turn-entry">
          <div className="turn">
            <div className="turn-head">
              <span className="turn-author">You</span>
            </div>
            <TalkBody text={turn.message} />
          </div>
        </li>
      )}
      <li className="turn-entry">
        <div className="turn turn-model" aria-busy="true">
          <div className="turn-head">
            <span className="turn-author">{label ?? "Model"}</span>
            <button
              type="button"
              className="text-action"
              onClick={() => talk.stop(id)}
            >
              Stop
            </button>
          </div>
          <output className="turn-status">{turn.status}</output>
          {turn.text !== "" && <TalkBody text={turn.text} />}
          <ToolCalls calls={turn.calls} />
        </div>
      </li>
    </>
  );
}

/** A turn that stopped before the model answered. */
function StoppedTurn({ id, stop }: { id: string; stop: TurnStop }) {
  const { talk } = useServices();
  const [text, action] =
    stop.reason === "model_error"
      ? [
          `The model call failed: ${stop.error ?? "no reason given"}.`,
          "Try again",
        ]
      : stop.reason === "step_limit"
        ? ["The model made as many calls as one turn may.", "Go on"]
        : ["The turn stopped before the model answered.", "Go on"];
  return (
    <li className="turn-entry">
      <div className="turn turn-model">
        <div className="turn-head">
          <span className="turn-author">Model</span>
        </div>
        <p className="notice notice-error turn-failure" role="alert">
          {text}{" "}
          <button
            type="button"
            className="notice-dismiss"
            disabled={talk.readOnly}
            onClick={() => void talk.resume(id)}
          >
            {action}
          </button>
        </p>
      </div>
    </li>
  );
}

function TopicError({ id }: { id: string }) {
  const { talk } = useServices();
  const error = useStore(talk.errors).get(id);
  if (error === undefined) return null;
  return (
    <p className="notice notice-error topic-error" role="alert">
      {error}{" "}
      <button
        type="button"
        className="notice-dismiss"
        onClick={() => talk.dismissError(id)}
      >
        Dismiss
      </button>
    </p>
  );
}

/** The one composer: at the foot of an open topic's turns. */
function Composer({
  id,
  scope,
  titled,
  send,
}: {
  id: string;
  scope: TopicScope;
  titled: boolean;
  send: (text: string) => Promise<boolean>;
}) {
  const { talk } = useServices();
  const running = useStore(talk.running).has(id);
  const text = useStore(talk.unsent).get(id)?.text ?? "";
  const next = useStore(talk.nextTurns).get(id);
  const slipShown = useStore(talk.slips).get(id)?.kind === "next";
  const setText = (value: string) => talk.setUnsent(id, { text: value });
  const field = useId();
  const edits =
    next?.kind === "ready" ? nextTurnEdits(next.base, next.draft) : null;
  const blocked = talk.readOnly
    ? "This tab is read-only."
    : running
      ? "A turn is running."
      : !titled
        ? "Name this topic first."
        : text.trim() === ""
          ? "Write something to send."
          : edits?.isErr()
            ? "Fix the next turn's request first."
            : null;
  // The talk service clears what is sent, and keeps what wasn't taken.
  const submit = async () => {
    if (!blocked) await send(text);
  };
  return (
    <div className="composer-entry">
      {slipShown && <NextSlip id={id} next={next} />}
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="composer-sees">
          {seesLine(scope)} <NextTurnAction id={id} className="text-action" />
        </p>
        <label htmlFor={field} className="visually-hidden">
          Your message
        </label>
        <textarea
          id={field}
          value={text}
          readOnly={talk.readOnly}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              void submit();
            }
          }}
        />
        <div className="composer-actions">
          <button
            type="submit"
            className="button button-primary"
            disabled={blocked !== null}
            title={blocked ?? "Send (Ctrl+Enter)"}
            aria-keyshortcuts="Control+Enter Meta+Enter"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
