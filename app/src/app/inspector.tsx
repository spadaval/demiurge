/**
 * The World inspector (DESIGN.md, World Inspector): the story bible read as
 * the edition's appendix, five ledgers and a detail sheet per record, in the
 * World tab. It reads; editing records is out of its scope.
 */

import { Link, useSearch } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import {
  type Contradiction,
  storyContradictions,
} from "~/story/contradictions";
import { countSeries, seriesTexts } from "~/story/counts";
import { deliberateGaps } from "~/story/gaps";
import { membershipsInStoryOrder } from "~/story/order";
import { formatRef } from "~/story/refs";
import { describePosition } from "~/story/render";
import {
  type Actor,
  type Drive,
  isAnswered,
  type Membership,
  type OpenQuestion,
  type Ref,
  refExists,
  SCENE_LINK_KINDS,
  SCENE_LINK_WORDS,
  type Story,
} from "~/story/story";
import { refLabel, type Touch } from "~/story/touches";
import type { Position } from "~/time/timeline";
import { useServices, useStore } from "./hooks";
import {
  atText,
  breaksOrder,
  contradictionKind,
  contradictionRefs,
  eventRows,
  type InspectorAt,
  type InspectorView,
  parseAt,
  positionYear,
  questionStatus,
  reach,
  readerQuestionRows,
  recordTouches,
  type SceneRowData,
  scenePosition,
  sceneRows,
  type TouchList,
  viewTitle,
  worldPosition,
} from "./inspector-model";

// ── The World tab ────────────────────────────────────────────────────────

/** The World tab's sheet: the view or record in the URL's `at`. */
export function WorldPage() {
  const { at: text } = useSearch({ from: "/world" });
  const { bible, worldTab } = useServices();
  const state = useStore(bible.state);
  const at = parseAt(text);
  // biome-ignore lint/correctness/useExhaustiveDependencies: each visit reads the bible again
  useEffect(() => {
    void bible.refresh();
  }, [bible, text]);
  // Showing a view or record opens the World tab, if it was closed.
  const shown = atText(at);
  useEffect(() => {
    const tab = worldTab.get();
    if (!tab.open || tab.at !== shown) worldTab.set({ open: true, at: shown });
  }, [worldTab, shown]);
  // A failed read is a Notice under the masthead (`BibleNotice`), not
  // the sheet's to say.
  if (state.kind !== "ready") return null;
  return <Inspector story={state.story} at={at} />;
}

/** The World tab's title: the view's or the record's name. */
export function worldTabTitle(story: Story | null, at: InspectorAt): string {
  if (at.kind === "view") return viewTitle(at.view);
  if (at.kind === "unknown" || story === null) return "World";
  return refExists(story, at.ref)
    ? recordName(story, at.ref)
    : "Removed record";
}

type InspectorData = {
  readonly story: Story;
  readonly contradictions: readonly Contradiction[];
};

const InspectorContext = createContext<InspectorData | null>(null);

function useInspector(): InspectorData {
  const data = useContext(InspectorContext);
  if (!data) throw new Error("useInspector outside Inspector");
  return data;
}

function Inspector({ story, at }: { story: Story; at: InspectorAt }) {
  const data = useMemo(
    () => ({ story, contradictions: storyContradictions(story) }),
    [story],
  );
  return (
    <InspectorContext value={data}>
      <article className="sheet inspector-sheet" aria-label="World inspector">
        {at.kind === "view" && <ViewSheet view={at.view} />}
        {at.kind === "record" && <RecordSheet subject={at.ref} />}
        {at.kind === "unknown" && (
          <SheetHead title="Not in the bible">
            “{at.text}” names no view or record of the story bible.
          </SheetHead>
        )}
      </article>
    </InspectorContext>
  );
}

export function SheetHead({
  title,
  kind,
  authority,
  children,
}: {
  title: string;
  kind?: string;
  authority?: string | undefined;
  children?: ReactNode;
}) {
  return (
    <header className="sheet-head inspector-head">
      {kind && (
        <p className="inspector-kind">
          <span>{kind}</span>
          {authority && (
            <span className="inspector-authority">{authority}</span>
          )}
        </p>
      )}
      <h1 className="sheet-title">{title}</h1>
      {children && <p className="inspector-lede">{children}</p>}
    </header>
  );
}

// ── References ───────────────────────────────────────────────────────────

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/** A record's name as the inspector says it: a scene with its position. */
function recordName(story: Story, ref: Ref): string {
  if (ref.kind === "scene") {
    const index = story.scenes.findIndex((s) => s.id === ref.id);
    return `${index + 1} ${refLabel(story, ref)}`;
  }
  return refLabel(story, ref);
}

/** A link to an inspector view, in the World tab. */
export function ViewLink({
  view,
  children,
  className,
}: {
  view: InspectorView;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link to="/world" search={{ at: view }} className={className ?? "ref"}>
      {children}
    </Link>
  );
}

/**
 * A reference to a record (DESIGN.md, References): a scene with prose opens
 * its document tab, and any other record its detail in the World tab. A
 * record that no longer exists is plain text marked "(removed)".
 */
function RecordRef({
  subject,
  children,
  record = false,
}: {
  subject: Ref;
  children?: ReactNode;
  /** Open the record's detail even for a scene with prose. */
  record?: boolean;
}) {
  const { story } = useInspector();
  const { workspace } = useServices();
  const documents = useStore(workspace.documents);
  if (!refExists(story, subject)) {
    return (
      <span className="ref-removed">{children ?? subject.id} (removed)</span>
    );
  }
  const label = children ?? <RefLabel subject={subject} />;
  const scene =
    subject.kind === "scene"
      ? story.scenes.find((s) => s.id === subject.id)
      : undefined;
  const documentId = scene?.documentId;
  if (
    !record &&
    documentId !== undefined &&
    documents.some((d) => d.id === documentId)
  ) {
    return (
      <Link to="/doc/$documentId" params={{ documentId }} className="ref">
        {label}
      </Link>
    );
  }
  return (
    <Link to="/world" search={{ at: formatRef(subject) }} className="ref">
      {label}
    </Link>
  );
}

/** A record's label; a scene's with its tabular position and year. */
function RefLabel({ subject }: { subject: Ref }) {
  const { story } = useInspector();
  if (subject.kind !== "scene") return <>{refLabel(story, subject)}</>;
  const index = story.scenes.findIndex((s) => s.id === subject.id);
  const scene = story.scenes[index];
  const time = scene && scenePosition(story, scene);
  return (
    <>
      <span className="num">{index + 1}</span> {refLabel(story, subject)}
      {time && (
        <>
          {" "}
          <span className="time num">{positionYear(time)}</span>
        </>
      )}
    </>
  );
}

/** References in a run: "a, b and c". */
function Refs({ refs }: { refs: readonly Ref[] }) {
  return (
    <>
      {refs.map((ref, i) => (
        <span key={formatRef(ref)}>
          {i === 0 ? "" : i === refs.length - 1 ? " and " : ", "}
          <RecordRef subject={ref} />
        </span>
      ))}
    </>
  );
}

const event = (id: string): Ref => ({ kind: "event", id });
const actor = (id: string): Ref => ({ kind: "actor", id });
const drive = (id: string): Ref => ({ kind: "drive", id });

/** A story-time value, in time blue. */
function TimeValue({ position }: { position: Position }) {
  const { story } = useInspector();
  return <span className="time num">{describePosition(story, position)}</span>;
}

// ── Ledger ───────────────────────────────────────────────────────────────

export function LedgerGroup({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: ReactNode;
}) {
  const id = `ledger-${label.toLowerCase().replaceAll(/[^a-z]+/g, "-")}`;
  return (
    <section className="ledger-group" aria-labelledby={id}>
      <div className="ledger-label">
        <h2 id={id}>{label}</h2>
        {count !== undefined && <span className="num">{count}</span>}
      </div>
      <ol className="ledger-rows">{children}</ol>
    </section>
  );
}

export function LedgerRow({
  number,
  numberClass,
  lead,
  lines,
  meta,
  sub = false,
  rowKey,
}: {
  number?: ReactNode;
  numberClass?: string;
  lead: ReactNode;
  lines?: readonly ReactNode[];
  meta?: ReactNode;
  sub?: boolean;
  rowKey?: string;
}) {
  return (
    <li className="ledger-row" data-sub={sub || undefined} data-key={rowKey}>
      <div className="ledger-body">
        <p className="ledger-lead">
          {number !== undefined && (
            <span className={`ledger-number num ${numberClass ?? ""}`}>
              {number}
            </span>
          )}
          {lead}
        </p>
        {lines
          ?.filter((line) => line !== null && line !== false)
          .map((line, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: lines are fixed per row
            <p key={i} className="ledger-line">
              {line}
            </p>
          ))}
      </div>
      {meta !== undefined && <span className="ledger-meta">{meta}</span>}
    </li>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="ledger-empty">{children}</p>;
}

/** Items joined by middle dots, the ledger's separator. */
function Dotted({ items }: { items: readonly ReactNode[] }) {
  const shown = items.filter((item) => item !== null && item !== false);
  return (
    <>
      {shown.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: items are fixed per line
        <span key={i}>
          {i > 0 && " · "}
          {item}
        </span>
      ))}
    </>
  );
}

// ── The five views ───────────────────────────────────────────────────────

function ViewSheet({ view }: { view: InspectorView }) {
  switch (view) {
    case "cast":
      return <CastView />;
    case "questions":
      return <QuestionsView />;
    case "timeline":
      return <TimelineView />;
    case "reader-order":
      return <ReaderOrderView />;
    case "contradictions":
      return <ContradictionsView />;
  }
}

function CastView() {
  const { story } = useInspector();
  const people = story.actors.filter((a) => a.kind === "person");
  const groups = story.actors.filter((a) => a.kind === "organization");
  const orphans = story.drives.filter(
    (d) => d.actorId === null || !refExists(story, actor(d.actorId)),
  );
  const driveless = story.actors.filter(
    (a) => !story.drives.some((d) => d.actorId === a.id),
  ).length;
  return (
    <>
      <SheetHead title={viewTitle("cast")}>
        {plural(story.actors.length, "actor")},{" "}
        {plural(story.drives.length, "drive")}.
        {driveless > 0 &&
          ` ${plural(driveless, "actor has", "actors have")} no drive yet.`}
      </SheetHead>
      <div className="ledger">
        {story.actors.length === 0 && story.drives.length === 0 && (
          <Empty>
            No actors yet. People and organisations with wants appear here with
            their drives.
          </Empty>
        )}
        {people.length > 0 && (
          <LedgerGroup label="Characters" count={people.length}>
            {people.map((a) => (
              <ActorRows key={a.id} actor={a} />
            ))}
          </LedgerGroup>
        )}
        {groups.length > 0 && (
          <LedgerGroup label="Organisations" count={groups.length}>
            {groups.map((a) => (
              <ActorRows key={a.id} actor={a} />
            ))}
          </LedgerGroup>
        )}
        {orphans.length > 0 && (
          <LedgerGroup label="Drives with no actor yet" count={orphans.length}>
            {orphans.map((d) => (
              <DriveRow key={d.id} drive={d} sub={false} />
            ))}
          </LedgerGroup>
        )}
      </div>
    </>
  );
}

function ActorRows({ actor: a }: { actor: Actor }) {
  const { story } = useInspector();
  const drives = story.drives.filter((d) => d.actorId === a.id);
  const relations = drives.reduce((n, d) => n + d.relations.length, 0);
  const turns = drives.reduce((n, d) => n + d.turns.length, 0);
  const memberships = story.memberships.filter(
    (m) => m.member === a.id || m.group === a.id,
  ).length;
  const counts = [
    relations > 0 && plural(relations, "relation"),
    memberships > 0 && plural(memberships, "membership"),
    turns > 0 && plural(turns, "turn"),
  ].filter((c): c is string => typeof c === "string");
  const self = actor(a.id);
  return (
    <>
      <LedgerRow
        lead={<RecordRef subject={self} />}
        lines={[
          counts.length > 0 ? (
            <Dotted
              key="counts"
              items={counts.map((c) => (
                <RecordRef key={c} subject={self}>
                  {c}
                </RecordRef>
              ))}
            />
          ) : null,
        ]}
        meta={drives.length === 0 ? "no drive yet" : undefined}
      />
      {drives.map((d) => (
        <DriveRow key={d.id} drive={d} sub />
      ))}
    </>
  );
}

const RELATION_WORDS = {
  opposes: "opposes",
  allies: "allies with",
  competes: "competes with",
} as const;

const TURN_WORDS = {
  satisfied: "satisfied",
  renounced: "renounced",
  replaced: "replaced by",
  flipped: "flips into",
} as const;

function DriveRow({ drive: d, sub }: { drive: Drive; sub: boolean }) {
  const { story } = useInspector();
  const kept = deliberateGaps(story).find(
    ({ gap }) =>
      gap.kind === "drive_without_origin" &&
      gap.ref?.kind === "drive" &&
      gap.ref.id === d.id,
  );
  const links: ReactNode[] = [
    d.origins.length > 0 ? (
      <>
        from <Refs refs={d.origins.map(event)} />
      </>
    ) : kept ? (
      <span key="origin" className="gap">
        gap kept · {kept.reason}
      </span>
    ) : (
      <span key="origin" className="gap">
        no origin
      </span>
    ),
    ...d.relations.map((r) => (
      <>
        {RELATION_WORDS[r.type]} <RecordRef subject={drive(r.to)} />
      </>
    )),
    ...d.turns.map((t) => (
      <>
        {TURN_WORDS[t.how]}
        {t.into !== undefined && (
          <>
            {" "}
            <RecordRef subject={drive(t.into)} />
          </>
        )}
        {t.at !== undefined && (
          <>
            {" "}
            at <RecordRef subject={event(t.at)} />
          </>
        )}
      </>
    )),
  ];
  const stakes = [d.stakes, d.method].filter((s) => s.trim() !== "");
  return (
    <LedgerRow
      sub={sub}
      lead={<RecordRef subject={drive(d.id)} />}
      lines={[
        stakes.length > 0 ? stakes.join(" · ") : null,
        <Dotted key="links" items={links} />,
      ]}
    />
  );
}

function QuestionsView() {
  const { story } = useInspector();
  const leftOpen = story.openQuestions.filter((q) => q.leftOpen !== undefined);
  const rest = story.openQuestions.filter((q) => q.leftOpen === undefined);
  const statuses = story.openQuestions.map((q) => questionStatus(story, q));
  const tally = (status: string) => statuses.filter((s) => s === status).length;
  return (
    <>
      <SheetHead title={viewTitle("questions")}>
        {plural(story.openQuestions.length, "question")}: {tally("open")} open,{" "}
        {tally("answered")} answered, {tally("left open")} left open.
      </SheetHead>
      <div className="ledger">
        {story.openQuestions.length === 0 && (
          <Empty>
            No open questions. What the story hasn't decided yet is held here,
            with its candidate answers.
          </Empty>
        )}
        {rest.length > 0 && (
          <LedgerGroup label="Questions" count={rest.length}>
            {rest.map((q) => (
              <QuestionRows key={q.id} question={q} />
            ))}
          </LedgerGroup>
        )}
        {leftOpen.length > 0 && (
          <LedgerGroup label="Left open" count={leftOpen.length}>
            {leftOpen.map((q) => (
              <QuestionRows key={q.id} question={q} />
            ))}
          </LedgerGroup>
        )}
      </div>
    </>
  );
}

function QuestionRows({ question: q }: { question: OpenQuestion }) {
  const { story } = useInspector();
  const superseded = q.superseded ?? [];
  const candidate = (id: string): Ref => ({
    kind: "candidate",
    questionId: q.id,
    id,
  });
  return (
    <>
      <LedgerRow
        lead={<RecordRef subject={{ kind: "openQuestion", id: q.id }} />}
        lines={[
          q.leftOpen !== undefined ? `Left open · ${q.leftOpen}` : null,
          q.candidates.length === 0 ? (
            <span key="none" className="gap">
              no candidates yet
            </span>
          ) : null,
        ]}
        meta={questionStatus(story, q)}
      />
      {q.candidates.map((c) => {
        const chosen = isAnswered(q) && q.answer === c.id;
        const touches = reach(story, candidate(c.id));
        return (
          <li
            key={c.id}
            className="ledger-row"
            data-sub
            data-candidate={
              chosen ? "chosen" : c.rejected !== undefined ? "rejected" : "live"
            }
          >
            <div className="ledger-body">
              <p className="ledger-lead">
                {chosen && <span className="ledger-chosen">Chosen</span>}
                <RecordRef subject={candidate(c.id)} />
              </p>
              {c.rejected !== undefined && (
                <p className="ledger-line">Rejected · {c.rejected}</p>
              )}
            </div>
            <span className="ledger-meta">
              <RecordRef subject={candidate(c.id)}>touches {touches}</RecordRef>
            </span>
          </li>
        );
      })}
      {superseded.length > 0 && (
        <li className="ledger-row" data-sub>
          <details className="ledger-fold">
            <summary>› {superseded.length} superseded</summary>
            <ul>
              {superseded.map((s) => (
                <li key={`${s.candidate}-${s.by ?? ""}`}>
                  {s.answer}{" "}
                  <span className="ledger-meta-inline">
                    {s.by === undefined ? (
                      "withdrawn"
                    ) : (
                      <>
                        replaced by <RecordRef subject={candidate(s.by)} />
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </li>
      )}
    </>
  );
}

function TimelineView() {
  const { story, contradictions } = useInspector();
  const { placed, unplaced } = eventRows(story, contradictions);
  const row = (r: (typeof placed)[number]) => (
    <LedgerRow
      key={r.event.id}
      rowKey={r.event.id}
      number={r.position ? positionYear(r.position) : undefined}
      numberClass="time"
      lead={<RecordRef subject={event(r.event.id)} />}
      lines={[
        <Dotted
          key="links"
          items={[
            r.position ? <TimeValue key="time" position={r.position} /> : null,
            r.depictedBy.length > 0 ? (
              <>
                depicted in{" "}
                <Refs
                  refs={r.depictedBy.map((s) => ({ kind: "scene", id: s.id }))}
                />
              </>
            ) : null,
            r.causes.length > 0 ? (
              <>
                caused by <Refs refs={r.causes.map(event)} />
              </>
            ) : null,
          ]}
        />,
      ]}
      meta={
        r.contradictions > 0 ? (
          <ViewLink view="contradictions">
            {plural(r.contradictions, "contradiction")}
          </ViewLink>
        ) : undefined
      }
    />
  );
  return (
    <>
      <SheetHead title={viewTitle("timeline")}>
        {plural(story.timeline.events.length, "event")}, {placed.length} placed
        in time. {plural(story.counts.length, "count")}.
      </SheetHead>
      <div className="ledger">
        {story.timeline.events.length === 0 && (
          <Empty>
            No events yet. What happens in the story's world appears here in
            story order.
          </Empty>
        )}
        {placed.length > 0 && (
          <LedgerGroup label="Timeline" count={placed.length}>
            {placed.map(row)}
          </LedgerGroup>
        )}
        {unplaced.length > 0 && (
          <LedgerGroup label="Not placed in time" count={unplaced.length}>
            {unplaced.map(row)}
          </LedgerGroup>
        )}
        <CountsLedger />
      </div>
    </>
  );
}

function CountsLedger() {
  const { story } = useInspector();
  if (story.counts.length === 0) {
    return (
      <LedgerGroup label="Counts" count={0}>
        <li>
          <Empty>
            No counts. Numbers that change at events, such as hands aboard or
            oil left, are tallied here.
          </Empty>
        </li>
      </LedgerGroup>
    );
  }
  return (
    <LedgerGroup label="Counts" count={story.counts.length}>
      {story.counts.map((c) => {
        const series = countSeries(story, c);
        const texts = seriesTexts(c, series);
        const last = series.at(-1);
        return (
          <LedgerRow
            key={c.id}
            lead={<RecordRef subject={{ kind: "count", id: c.id }} />}
            lines={[
              series.length > 0 ? (
                <Dotted
                  key="series"
                  items={series.map((step, i) => (
                    <>
                      {texts[i]} at <RecordRef subject={event(step.at)} />
                    </>
                  ))}
                />
              ) : (
                <span key="none" className="gap">
                  no values yet
                </span>
              ),
            ]}
            meta={
              last && (
                <span className="num count-value">
                  {last.value}
                  {last.total === undefined ? "" : ` of ${last.total}`}
                </span>
              )
            }
          />
        );
      })}
    </LedgerGroup>
  );
}

function ReaderOrderView() {
  const { story } = useInspector();
  const rows = sceneRows(story);
  const questions = readerQuestionRows(story);
  const breaks = questions.filter(breaksOrder);
  const scene = (position: number | undefined): ReactNode => {
    const s = position === undefined ? undefined : story.scenes[position - 1];
    return s === undefined ? null : (
      <RecordRef subject={{ kind: "scene", id: s.id }}>
        <span className="num">{position}</span>
      </RecordRef>
    );
  };
  return (
    <>
      <SheetHead title={viewTitle("reader-order")}>
        {plural(rows.length, "scene")} in reading order,{" "}
        {rows.filter((r) => r.flashback).length} going back in time.{" "}
        {plural(questions.length, "reader question")}.
      </SheetHead>
      <div className="ledger reader-order">
        {rows.length === 0 ? (
          <Empty>
            No scenes yet. Scenes appear here in the order the reader meets
            them, beside where each falls in story time.
          </Empty>
        ) : (
          <LedgerGroup label="Reading order" count={rows.length}>
            {rows.map((r) => (
              <SceneLedgerRow key={r.scene.id} row={r} />
            ))}
          </LedgerGroup>
        )}
        {rows.length > 0 && <SheetSpark rows={rows} />}
        <div className="reader-questions">
          {questions.length === 0 ? (
            <LedgerGroup label="Reader questions" count={0}>
              <li>
                <Empty>
                  No reader questions. What the reader is waiting to learn is
                  listed here with the scenes that open and answer it.
                </Empty>
              </li>
            </LedgerGroup>
          ) : (
            <LedgerGroup label="Reader questions" count={questions.length}>
              {questions.map((q) => (
                <LedgerRow
                  key={q.id}
                  lead={
                    <RecordRef subject={{ kind: "readerQuestion", id: q.id }} />
                  }
                  lines={[
                    <Dotted
                      key="at"
                      items={[
                        q.opens === undefined ? (
                          <span key="opens" className="gap">
                            never opens
                          </span>
                        ) : (
                          <>opens in {scene(q.opens)}</>
                        ),
                        q.answered === undefined ? (
                          "not answered"
                        ) : (
                          <>answered in {scene(q.answered)}</>
                        ),
                      ]}
                    />,
                  ]}
                />
              ))}
            </LedgerGroup>
          )}
          {breaks.length > 0 && (
            <LedgerGroup label="Breaks" count={breaks.length}>
              {breaks.map((q) => (
                <LedgerRow
                  key={q.id}
                  lead={
                    <>
                      Answered in {scene(q.answered)} before it opens in{" "}
                      {scene(q.opens)}
                    </>
                  }
                  lines={[
                    <RecordRef
                      key="q"
                      subject={{ kind: "readerQuestion", id: q.id }}
                    />,
                  ]}
                />
              ))}
            </LedgerGroup>
          )}
        </div>
      </div>
    </>
  );
}

function SceneLedgerRow({ row }: { row: SceneRowData }) {
  const { story } = useInspector();
  const subject: Ref = { kind: "scene", id: row.scene.id };
  return (
    <li className="ledger-row scene-ledger-row">
      <div className="ledger-body">
        <p className="ledger-lead">
          <span className="ledger-number num">{row.position}</span>
          <RecordRef subject={subject}>{refLabel(story, subject)}</RecordRef>
        </p>
      </div>
      <span className="ledger-meta">
        <RecordRef subject={subject} record>
          touches {reach(story, subject)}
        </RecordRef>
        {row.time && (
          <span className="time num">
            {row.flashback && (
              <span className="visually-hidden">flashback to </span>
            )}
            {positionYear(row.time)}
          </span>
        )}
      </span>
    </li>
  );
}

/**
 * The chronology spark at sheet scale, in the gutter and gloss column: one
 * point per scene row, world time left to right, so a flashback reads as a
 * jump to the left. Scenes not placed in time break the line.
 */
function SheetSpark({ rows }: { rows: readonly SceneRowData[] }) {
  const placed = rows.flatMap((r) => (r.time ? [r.time.start] : []));
  if (placed.length === 0) return null;
  const min = Math.min(...placed);
  const max = Math.max(...placed);
  // Percentages, so the spark fills the gloss column at any width.
  const x = (start: number) =>
    max === min ? 50 : 4 + ((start - min) / (max - min)) * 92;
  const ROW = 32;
  // Below the group's Label: its 22px margin and its own line.
  const top = 40;
  const y = (i: number) => top + i * ROW + ROW / 2;
  const height = top + rows.length * ROW;
  const segments = rows.flatMap((r, i) => {
    const next = rows[i + 1];
    return r.time && next?.time
      ? [{ from: x(r.time.start), to: x(next.time.start), i }]
      : [];
  });
  return (
    <svg
      className="sheet-spark"
      height={height}
      role="img"
      aria-label="Chronology: where each scene falls in story time, in reading order"
    >
      {segments.map((s) => (
        <line
          key={s.i}
          className="spark-line"
          x1={`${s.from}%`}
          x2={`${s.to}%`}
          y1={y(s.i)}
          y2={y(s.i + 1)}
        />
      ))}
      {rows.map((r, i) =>
        r.time ? (
          <circle
            key={r.scene.id}
            className={
              r.flashback ? "spark-point spark-flashback" : "spark-point"
            }
            cx={`${x(r.time.start)}%`}
            cy={y(i)}
            r={r.flashback ? 3.5 : 2.5}
          />
        ) : null,
      )}
    </svg>
  );
}

function ContradictionsView() {
  const { story, contradictions } = useInspector();
  return (
    <>
      <SheetHead title={viewTitle("contradictions")}>
        {contradictions.length === 0
          ? "None kept."
          : `${plural(contradictions.length, "contradiction")} kept. Each is story material to work on, not an error.`}
      </SheetHead>
      <div className="ledger">
        {contradictions.length === 0 ? (
          <Empty>
            No contradictions kept. When two records disagree, they are held
            here.
          </Empty>
        ) : (
          <LedgerGroup label="Kept" count={contradictions.length}>
            {contradictions.map((c) => {
              const refs = contradictionRefs(story, c);
              return (
                <li key={c.message} className="ledger-row">
                  <div className="ledger-body">
                    <p className="ledger-kind">{contradictionKind(c)}</p>
                    <p className="ledger-line">{c.message}</p>
                    {refs.length > 0 && (
                      <p className="ledger-line">
                        About <Refs refs={refs} />
                      </p>
                    )}
                  </div>
                  <span className="ledger-meta">kept</span>
                </li>
              );
            })}
          </LedgerGroup>
        )}
      </div>
    </>
  );
}

// ── Record detail ────────────────────────────────────────────────────────

const KIND_LABELS: Record<Ref["kind"], string> = {
  actor: "Actor",
  drive: "Drive",
  fact: "Fact",
  readerQuestion: "Reader question",
  event: "Event",
  scene: "Scene",
  openQuestion: "Open question",
  candidate: "Candidate answer",
  version: "Version",
  knowledge: "Knowledge",
  object: "Object",
  count: "Count",
};

const KIND_GROUPS: Record<Ref["kind"], string> = {
  actor: "Actors",
  drive: "Drives",
  fact: "Facts",
  readerQuestion: "Reader questions",
  event: "Events",
  scene: "Scenes",
  openQuestion: "Open questions",
  candidate: "Candidate answers",
  version: "Versions",
  knowledge: "Knowledge",
  object: "Objects",
  count: "Counts",
};

type Field = { label: string; value: ReactNode; wide?: boolean };

function RecordSheet({ subject }: { subject: Ref }) {
  const { story } = useInspector();
  if (!refExists(story, subject)) {
    return (
      <SheetHead title="Removed record" kind={KIND_LABELS[subject.kind]}>
        {formatRef(subject)} is no longer in the story bible.
      </SheetHead>
    );
  }
  const touches = recordTouches(story, subject);
  const position =
    subject.kind === "event" ? worldPosition(story, subject.id) : undefined;
  return (
    <>
      <SheetHead
        title={recordName(story, subject)}
        kind={kindLabel(story, subject)}
        authority={
          position?.authority.level === "inferred" ? "inferred" : undefined
        }
      />
      <div className="record-fields">
        {recordFields(story, subject).map((group, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: groups are fixed per kind
          <dl key={i} className="record-group">
            {group.map((field) => (
              <div
                key={field.label}
                className="record-field"
                data-wide={field.wide || undefined}
              >
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        ))}
        <RecordActions subject={subject} />
      </div>
      {touches && (
        <aside className="record-touches" aria-label="Touches">
          <TouchSection
            title="Touches"
            list={touches.touches}
            empty="It names no other record."
          />
          <TouchSection
            title="Touched by"
            list={touches.touchedBy}
            empty="No record names it."
          />
        </aside>
      )}
    </>
  );
}

function kindLabel(story: Story, ref: Ref): string {
  if (ref.kind !== "actor") return KIND_LABELS[ref.kind];
  return story.actors.find((a) => a.id === ref.id)?.kind === "organization"
    ? "Organisation"
    : "Character";
}

function TouchSection({
  title,
  list,
  empty,
}: {
  title: string;
  list: TouchList;
  empty: string;
}) {
  const id = `touches-${title.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <section className="touch-section" aria-labelledby={id}>
      <h2 id={id} className="touch-title">
        {title}
      </h2>
      {list.length === 0 && <p className="ledger-empty">{empty}</p>}
      {list.map(({ kind, touches }) => (
        <div key={kind} className="touch-group">
          <h3 className="touch-kind">
            {KIND_GROUPS[kind]} <span className="num">{touches.length}</span>
          </h3>
          <ul>
            {touches.map((t: Touch) => (
              <li key={formatRef(t.ref)}>
                <RecordRef subject={t.ref} />
                <span className="touch-how">{t.how.join("; ")}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** Links out of the bible: an actor's entry, a scene's prose. */
function RecordActions({ subject }: { subject: Ref }) {
  const { story } = useInspector();
  const { workspace, worldIndex } = useServices();
  const documents = useStore(workspace.documents);
  const entries = useStore(worldIndex.entries);
  if (subject.kind === "actor") {
    const name = refLabel(story, subject).trim().toLowerCase();
    // Actors stay entries: the entry whose title is the actor's name.
    const entry = documents.find(
      (d) =>
        entries.get(d.id)?.kind !== undefined &&
        entries.get(d.id)?.kind !== "scene" &&
        d.title.trim().toLowerCase() === name,
    );
    return entry ? (
      <p className="record-actions">
        <Link
          to="/doc/$documentId"
          params={{ documentId: entry.id }}
          className="ref"
        >
          Open entry
        </Link>
      </p>
    ) : null;
  }
  if (subject.kind === "scene") {
    const documentId = story.scenes.find(
      (s) => s.id === subject.id,
    )?.documentId;
    if (documentId === undefined) {
      return (
        <p className="record-actions ledger-empty">No prose linked yet.</p>
      );
    }
    return documents.some((d) => d.id === documentId) ? (
      <p className="record-actions">
        <Link to="/doc/$documentId" params={{ documentId }} className="ref">
          Open prose
        </Link>
      </p>
    ) : (
      <p className="record-actions ref-removed">Prose document (removed)</p>
    );
  }
  return null;
}

const text = (value: string): ReactNode =>
  value.trim() === "" ? <span className="gap">not written</span> : value;

const refList = (refs: readonly Ref[]): ReactNode =>
  refs.length === 0 ? <span className="gap">none</span> : <Refs refs={refs} />;

/**
 * Memberships, one per line: the other actor, then the events it holds
 * from and to, or that it always has or still does.
 */
function MembershipList({
  memberships,
  other,
}: {
  memberships: readonly Membership[];
  other: (m: Membership) => string;
}) {
  return (
    <ul className="record-list">
      {memberships.map((m) => (
        <li key={m.id}>
          <RecordRef subject={actor(other(m))} /> ·{" "}
          {m.since === undefined ? (
            "from the start"
          ) : (
            <>
              from <RecordRef subject={event(m.since)} />
            </>
          )}{" "}
          ·{" "}
          {m.until === undefined ? (
            "still"
          ) : (
            <>
              until <RecordRef subject={event(m.until)} />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

/** A record's fields in groups, each group set off by a hairline. */
function recordFields(story: Story, ref: Ref): Field[][] {
  switch (ref.kind) {
    case "actor": {
      const a = story.actors.find((x) => x.id === ref.id);
      if (!a) return [];
      // In story order, so leaving and rejoining reads as two spans.
      const ordered = membershipsInStoryOrder(story);
      const memberOf = ordered.filter((m) => m.member === a.id);
      const members = ordered.filter((m) => m.group === a.id);
      return [
        [{ label: "Notes", value: text(a.notes), wide: true }],
        [
          {
            label: "Drives",
            value: refList(
              story.drives
                .filter((d) => d.actorId === a.id)
                .map((d) => drive(d.id)),
            ),
          },
          ...(memberOf.length > 0
            ? [
                {
                  label: "Belongs to",
                  value: (
                    <MembershipList
                      memberships={memberOf}
                      other={(m) => m.group}
                    />
                  ),
                },
              ]
            : []),
          ...(members.length > 0
            ? [
                {
                  label: "Members",
                  value: (
                    <MembershipList
                      memberships={members}
                      other={(m) => m.member}
                    />
                  ),
                },
              ]
            : []),
        ],
      ];
    }
    case "drive": {
      const d = story.drives.find((x) => x.id === ref.id);
      if (!d) return [];
      return [
        [
          {
            label: "Actor",
            value:
              d.actorId === null ? (
                <span className="gap">no actor yet</span>
              ) : (
                <RecordRef subject={actor(d.actorId)} />
              ),
          },
          { label: "Wants", value: text(d.want) },
          { label: "Stakes", value: text(d.stakes) },
          { label: "Method", value: text(d.method) },
        ],
        [
          { label: "Origins", value: refList(d.origins.map(event)) },
          ...d.relations.map((r) => ({
            label: RELATION_WORDS[r.type].replace(/^./, (c) => c.toUpperCase()),
            value: <RecordRef subject={drive(r.to)} />,
          })),
        ],
        d.turns.map((t, i) => ({
          label: `Turn ${i + 1} · ${t.how}`,
          value: (
            <>
              <Dotted
                items={[
                  t.into !== undefined ? (
                    <>
                      {TURN_WORDS[t.how]} <RecordRef subject={drive(t.into)} />
                    </>
                  ) : null,
                  t.at !== undefined ? (
                    <>
                      at <RecordRef subject={event(t.at)} />
                    </>
                  ) : null,
                  t.note.trim() !== "" ? t.note : null,
                ]}
              />
            </>
          ),
        })),
      ].filter((group) => group.length > 0);
    }
    case "event": {
      const e = story.timeline.events.find((x) => x.id === ref.id);
      if (!e) return [];
      const position = worldPosition(story, e.id);
      const versions = story.versions.filter((v) => v.event === e.id);
      return [
        [
          { label: "Summary", value: text(e.summary), wide: true },
          {
            label: "Story time",
            value: position ? (
              <TimeValue position={position} />
            ) : (
              <span className="gap">not placed in time</span>
            ),
          },
        ],
        [
          {
            label: "Depicted in",
            value: refList(
              story.scenes
                .filter((s) => s.depicts.includes(e.id))
                .map((s) => ({ kind: "scene", id: s.id })),
            ),
          },
          {
            label: "Caused by",
            value: refList(
              story.causes
                .filter((c) => c.effect === e.id)
                .map((c) => event(c.cause)),
            ),
          },
          {
            label: "Causes",
            value: refList(
              story.causes
                .filter((c) => c.cause === e.id)
                .map((c) => event(c.effect)),
            ),
          },
        ],
        versions.map((v) => ({
          label: "Version",
          value: <RecordRef subject={{ kind: "version", id: v.id }} />,
        })),
      ].filter((group) => group.length > 0);
    }
    case "scene": {
      const index = story.scenes.findIndex((x) => x.id === ref.id);
      const s = story.scenes[index];
      if (!s) return [];
      const position = scenePosition(story, s);
      return [
        [
          { label: "Summary", value: text(s.summary), wide: true },
          {
            label: "Packaging",
            value:
              s.book || s.chapter ? (
                [s.book, s.chapter].filter(Boolean).join(" › ")
              ) : (
                <span className="gap">no book or chapter</span>
              ),
          },
          {
            label: "Story time",
            value: position ? (
              <TimeValue position={position} />
            ) : (
              <span className="gap">not placed in time</span>
            ),
          },
        ],
        [
          {
            label: "Viewpoint",
            value:
              s.viewpoint === undefined ? (
                <span className="gap">not set</span>
              ) : (
                <RecordRef subject={actor(s.viewpoint)} />
              ),
          },
          { label: "Actors", value: refList(s.actors.map(actor)) },
          { label: "Depicts", value: refList(s.depicts.map(event)) },
          { label: "Pressures", value: refList(s.pressures.map(drive)) },
        ],
        SCENE_LINK_KINDS.filter((how) => s[how].length > 0).map((how) => ({
          label: SCENE_LINK_WORDS[how].replace(/^./, (c) => c.toUpperCase()),
          value: refList(s[how]),
        })),
      ].filter((group) => group.length > 0);
    }
    case "fact": {
      const f = story.facts.find((x) => x.id === ref.id);
      if (!f) return [];
      return [
        [
          { label: "Text", value: text(f.text), wide: true },
          { label: "About", value: refList(f.about) },
        ],
      ];
    }
    case "readerQuestion": {
      const q = story.readerQuestions.find((x) => x.id === ref.id);
      if (!q) return [];
      const at = (scene: string | undefined, none: string) =>
        scene === undefined ? (
          <span className="gap">{none}</span>
        ) : (
          <RecordRef subject={{ kind: "scene", id: scene }} />
        );
      return [
        [
          { label: "Question", value: text(q.question), wide: true },
          { label: "Opens in", value: at(q.opensAt, "never opens") },
          { label: "Answered in", value: at(q.answeredAt, "not answered") },
        ],
      ];
    }
    case "openQuestion": {
      const q = story.openQuestions.find((x) => x.id === ref.id);
      if (!q) return [];
      return [
        [
          { label: "Status", value: questionStatus(story, q) },
          ...(q.leftOpen !== undefined
            ? [{ label: "Left open because", value: text(q.leftOpen) }]
            : []),
          ...(q.conflict
            ? [
                {
                  label: "Conflict",
                  value: "Records a contradiction someone noticed",
                },
              ]
            : []),
          { label: "About", value: refList(q.about) },
        ],
        q.candidates.map((c) => ({
          label:
            isAnswered(q) && q.answer === c.id
              ? "Chosen"
              : c.rejected !== undefined
                ? `Rejected · ${c.rejected}`
                : "Candidate",
          value: (
            <RecordRef
              subject={{ kind: "candidate", questionId: q.id, id: c.id }}
            />
          ),
        })),
        (q.superseded ?? []).map((s, i) => ({
          label: `Superseded ${i + 1}`,
          value: (
            <>
              {s.answer}
              {s.by !== undefined && (
                <>
                  {" "}
                  · replaced by{" "}
                  <RecordRef
                    subject={{ kind: "candidate", questionId: q.id, id: s.by }}
                  />
                </>
              )}
            </>
          ),
        })),
      ].filter((group) => group.length > 0);
    }
    case "candidate": {
      const q = story.openQuestions.find((x) => x.id === ref.questionId);
      const c = q?.candidates.find((x) => x.id === ref.id);
      if (!q || !c) return [];
      return [
        [
          { label: "Answer", value: text(c.answer), wide: true },
          {
            label: "Question",
            value: <RecordRef subject={{ kind: "openQuestion", id: q.id }} />,
          },
          {
            label: "Standing",
            value:
              isAnswered(q) && q.answer === c.id
                ? "Chosen"
                : c.rejected !== undefined
                  ? `Rejected · ${c.rejected}`
                  : "In the running",
          },
          { label: "Would touch", value: refList(c.touches) },
        ],
      ];
    }
    case "version": {
      const v = story.versions.find((x) => x.id === ref.id);
      if (!v) return [];
      const e = story.timeline.events.find((x) => x.id === v.event);
      return [
        [
          { label: "Account", value: text(v.text), wide: true },
          { label: "Told by", value: refList(v.by.map(actor)) },
          { label: "Of", value: <RecordRef subject={event(v.event)} /> },
          ...(e
            ? [
                {
                  label: "What really happened",
                  value: text(e.summary),
                  wide: true,
                },
              ]
            : []),
        ],
      ];
    }
    case "knowledge": {
      const k = story.knowledge.find((x) => x.id === ref.id);
      if (!k) return [];
      return [
        [
          { label: "Who", value: <RecordRef subject={actor(k.actor)} /> },
          {
            label: k.how === "knows" ? "Knows" : "Believes",
            value: <RecordRef subject={k.what} />,
          },
          {
            label: "Since",
            value:
              k.since === undefined ? (
                "always"
              ) : (
                <RecordRef subject={event(k.since)} />
              ),
          },
          {
            label: "Until",
            value:
              k.until === undefined ? (
                "never stops"
              ) : (
                <RecordRef subject={event(k.until)} />
              ),
          },
        ],
      ];
    }
    case "object": {
      const o = story.objects.find((x) => x.id === ref.id);
      if (!o) return [];
      return [[{ label: "Notes", value: text(o.notes), wide: true }]];
    }
    case "count": {
      const c = story.counts.find((x) => x.id === ref.id);
      if (!c) return [];
      const series = countSeries(story, c);
      const texts = seriesTexts(c, series);
      return [
        [
          { label: "Notes", value: text(c.notes), wide: true },
          ...(c.total !== undefined
            ? [
                {
                  label: "Out of",
                  value: <span className="num">{c.total}</span>,
                },
              ]
            : []),
          ...(c.of !== undefined
            ? [
                {
                  label: "Out of",
                  value: <RecordRef subject={{ kind: "count", id: c.of }} />,
                },
              ]
            : []),
          ...(c.threshold !== undefined
            ? [
                {
                  label: "Matters at",
                  value:
                    c.threshold === "more_than_half" ? (
                      "more than half"
                    ) : (
                      <span className="num">{c.threshold}</span>
                    ),
                },
              ]
            : []),
          ...(c.direction !== undefined
            ? [{ label: "Only", value: c.direction }]
            : []),
        ],
        series.map((step, i) => ({
          label: `Value ${i + 1}`,
          value: (
            <>
              <span className="num">{texts[i]}</span> at{" "}
              <RecordRef subject={event(step.at)} />
              {step.note.trim() !== "" && ` · ${step.note}`}
            </>
          ),
        })),
      ].filter((group) => group.length > 0);
    }
  }
}
