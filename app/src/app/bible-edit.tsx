/**
 * Direct edits to the story bible from the World inspector: the few edits
 * where a click is faster than asking the agent (DESIGN.md, World
 * Inspector, Direct edits). Each runs a story command through
 * `Bible.edit`, the path the story agent's tool calls take, and the sheet
 * then shows what the edit kept (contradictions, timeline problems) and what
 * may still state what it changed, as the agent is told (`EditReport` in
 * `./inspector.tsx`).
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { StoryCommand } from "~/story/commands";
import type { StoryStoreError } from "~/story/store";
import type { ProseNotRead } from "~/story/stored-prose";
import type { EditWarnings } from "~/story/tools";
import { describeStorageError } from "./environment";
import { useServices } from "./hooks";

/** What the last direct edit on the sheet came to. */
export type EditOutcome =
  /**
   * Saved. `warnings` are what it kept and what may still state what it
   * changed, as the agent's tool result has them.
   */
  | {
      readonly kind: "saved";
      readonly done: string;
      readonly warnings: EditWarnings | null;
      /**
       * Linked scenes whose prose the trace couldn't read, so may still
       * state what changed though no suspect names them.
       */
      readonly proseNotRead: readonly ProseNotRead[];
    }
  /** The story refused the command; nothing changed. */
  | {
      readonly kind: "refused";
      readonly done: string;
      readonly message: string;
    }
  /** Storage failed, or the stored bible didn't load; nothing changed. */
  | { readonly kind: "failed"; readonly message: string };

export interface BibleEdits {
  /** False on a read-only tab: the controls aren't shown. */
  readonly writable: boolean;
  /** Whether an edit is being saved; controls wait for it. */
  readonly pending: boolean;
  readonly outcome: EditOutcome | null;
  /**
   * Runs `command`; `done` says what it does, in the past tense ("Chose
   * …"). Resolves true when the edit was saved.
   */
  edit(command: StoryCommand, done: string): Promise<boolean>;
  dismiss(): void;
}

const EditsContext = createContext<BibleEdits | null>(null);

export function useBibleEdits(): BibleEdits {
  const edits = useContext(EditsContext);
  if (!edits) throw new Error("useBibleEdits outside BibleEditsProvider");
  return edits;
}

/**
 * Direct edits for one sheet. A different `sheet` (another view or record)
 * clears the last outcome, which belongs to the sheet it was made on.
 */
export function BibleEditsProvider({
  sheet,
  children,
}: {
  sheet: string;
  children: ReactNode;
}) {
  const { bible, workspace } = useServices();
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<EditOutcome | null>(null);
  const shown = useRef(sheet);
  shown.current = sheet;
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new sheet clears the outcome
  useEffect(() => setOutcome(null), [sheet]);

  const edit = useCallback(
    async (command: StoryCommand, done: string) => {
      const on = shown.current;
      setPending(true);
      const result = await bible.edit(command);
      setPending(false);
      // Left the sheet while it saved: the outcome isn't this sheet's.
      if (shown.current !== on) return result.isOk() && result.value.ok;
      if (result.isErr()) {
        setOutcome({
          kind: "failed",
          message: describeEditError(result.error),
        });
        return false;
      }
      const answer = result.value;
      if (!answer.ok) {
        setOutcome({ kind: "refused", done, message: answer.error.message });
        return false;
      }
      setOutcome({
        kind: "saved",
        done,
        warnings: answer.kind === "mutation" ? answer.warnings : null,
        proseNotRead: answer.proseNotRead ?? [],
      });
      return true;
    },
    [bible],
  );

  const value = useMemo(
    (): BibleEdits => ({
      writable: !workspace.readOnly,
      pending,
      outcome,
      edit,
      dismiss: () => setOutcome(null),
    }),
    [workspace.readOnly, pending, outcome, edit],
  );
  return <EditsContext value={value}>{children}</EditsContext>;
}

function describeEditError(error: StoryStoreError): string {
  switch (error.kind) {
    case "failure":
    case "read_only":
    case "not_found":
      return `The edit wasn't saved. ${describeStorageError(error)}`;
    default:
      return `The edit wasn't saved: ${error.message}`;
  }
}
